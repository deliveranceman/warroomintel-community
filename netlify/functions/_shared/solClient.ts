import { costUsd, logAiUsage } from '../../lib/ai-cost'

export type SolTier = 'cheap' | 'standard' | 'heavy'

// Single source-of-truth model map. Swap HEAVY_MODEL when ready.
const CHEAP_MODEL    = 'claude-haiku-4-5'
const STANDARD_MODEL = 'claude-sonnet-4-5'
const HEAVY_MODEL    = 'claude-sonnet-4-5'  // reserved — swap to a future model here

const MODEL_MAP: Record<SolTier, string> = {
  cheap:    CHEAP_MODEL,
  standard: STANDARD_MODEL,
  heavy:    HEAVY_MODEL,
}

export interface SolCallOpts {
  tier: SolTier
  system?: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  maxTokens?: number    // default 4096
  timeoutMs?: number    // default 60000
  meta: { userId: string; userTier: string; callType: string }
}

export interface SolResult {
  text: string
  inputTokens: number
  outputTokens: number
  costUsd: number
  model: string
}

// Exponential backoff delays (ms) between retries 1, 2, 3.
const RETRY_DELAYS_MS = [1000, 4000, 10000]
const MAX_ATTEMPTS    = 4  // 1 original + 3 retries

export async function solCall(opts: SolCallOpts): Promise<SolResult> {
  const model     = MODEL_MAP[opts.tier]
  const maxTokens = opts.maxTokens ?? 4096
  const timeoutMs = opts.timeoutMs ?? 60000

  const bodyStr = JSON.stringify({
    model,
    max_tokens: maxTokens,
    ...(opts.system ? { system: opts.system } : {}),
    messages: opts.messages,
  })

  let lastErr: Error | null = null

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let res: Response
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: {
          'Content-Type':    'application/json',
          'x-api-key':       process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
        },
        body:   bodyStr,
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (e: any) {
      // Network error or AbortSignal timeout — not retryable
      throw e
    }

    if (res.ok) {
      const data         = await res.json()
      const text         = (data.content?.[0]?.text as string) || ''
      const inputTokens  = (data.usage?.input_tokens  as number) || 0
      const outputTokens = (data.usage?.output_tokens as number) || 0
      const cost         = costUsd(model, inputTokens, outputTokens)

      // Fire-and-forget metering — never let this reject the call
      try {
        logAiUsage({
          userId:       opts.meta.userId,
          tier:         opts.meta.userTier,
          callType:     opts.meta.callType,
          model,
          inputTokens,
          outputTokens,
        })
      } catch (e: any) {
        console.warn('[solClient] logAiUsage threw synchronously:', e?.message || e)
      }

      return { text, inputTokens, outputTokens, costUsd: cost, model }
    }

    const status  = res.status
    const errBody = await res.text().catch(() => '')

    // 4xx other than 429 — fail immediately, no retry
    if (status >= 400 && status < 500 && status !== 429) {
      throw new Error(`Anthropic ${status}: ${errBody.slice(0, 200)}`)
    }

    // 429, 529, or any 5xx — will retry (or throw on last attempt)
    lastErr = new Error(`Anthropic ${status}: ${errBody.slice(0, 200)}`)

    if (attempt === MAX_ATTEMPTS - 1) break

    // Compute delay: exponential base, but respect Retry-After if longer
    let delayMs = RETRY_DELAYS_MS[attempt]
    const retryAfterHdr = res.headers.get('Retry-After')
    if (retryAfterHdr) {
      const retryAfterMs = parseFloat(retryAfterHdr) * 1000
      if (Number.isFinite(retryAfterMs) && retryAfterMs > delayMs && retryAfterMs < 30_000) {
        delayMs = retryAfterMs
      }
    }
    await new Promise<void>(r => setTimeout(r, delayMs))
  }

  throw lastErr ?? new Error('solCall: exhausted retries')
}
