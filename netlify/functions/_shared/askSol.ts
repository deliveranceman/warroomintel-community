import { cleanAIOutput } from '../../lib/clean-ai-output'
import { assembleWRIContext } from './assembleWRIContext'
import { solCall } from './solClient'

const { url: _sbUrl, serviceRoleKey: _sbKey } = JSON.parse(process.env.SUPABASE || '{}')

const SYSTEM_PROMPT = `You are SOL, the AI ministry assistant for War Room Intel — a deliverance ministry intelligence platform built by Pastor Justin Payne of Staffordtown Church, Copperhill TN.

You specialize in:
- Demonic spirits, their names, hierarchies, entry points, and manifestations
- Deliverance ministry protocol and session strategy
- Biblical spiritual warfare (Ephesians 6, Daniel, Revelation, Job)
- Generational iniquity, bloodline covenants, inner healing
- Discernment of spiritual root causes behind symptoms

You are direct, knowledgeable, and speak like a seasoned deliverance minister. Never add disclaimers about seeing a doctor unless it's genuinely relevant. The user is a trained minister asking ministry questions.`

const REFUSAL_PATTERNS = [
  "i can't help",
  "i cannot help",
  "vulnerable individuals",
  "psychological harm",
  "i'm not able",
  "as an ai",
  "as a language model",
]

function isRefusal(text: string): boolean {
  const lower = text.toLowerCase()
  return REFUSAL_PATTERNS.some(p => lower.includes(p))
}

export async function runAskSol(client: any, job: any): Promise<void> {
  const jobId    = job.id as string
  const params   = (job.input_params as any) || {}
  const userId   = (job.user_id as string) || ''
  const userTier = (job.tier    as string) || ''

  const query      = (params.query    as string)  || ''
  const history    = Array.isArray(params.history) ? params.history : []
  const ragEnabled = params.ragEnabled !== false   // default true

  const meta = { userId, userTier, callType: 'ask_sol' }

  try {
    // ── Stage: preparing ──────────────────────────────────────────────────────
    await client.from('ai_jobs').update({
      status:     'running',
      started_at: new Date().toISOString(),
      stage:      'preparing',
      progress:   5,
    }).eq('id', jobId)

    if (!query.trim()) throw new Error('input_params.query is empty')

    // ── Stage: searching ──────────────────────────────────────────────────────
    await client.from('ai_jobs').update({ stage: 'searching', progress: 25 }).eq('id', jobId)

    const wriContext = ragEnabled
      ? await assembleWRIContext({ query, maxChars: 6000 }).catch(() => '')
      : ''

    const systemWithContext = wriContext
      ? `WRI KNOWLEDGE BASE:\n${wriContext}\n\n---\n\n${SYSTEM_PROMPT}`
      : SYSTEM_PROMPT

    const messages = [
      ...history
        .filter((m: any) => m?.role && m?.content)
        .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: String(m.content) })),
      { role: 'user' as const, content: query.trim() },
    ]

    // ── Stage: thinking ───────────────────────────────────────────────────────
    await client.from('ai_jobs').update({ stage: 'thinking', progress: 40 }).eq('id', jobId)

    // First attempt: Haiku
    const haikuResult = await solCall({
      tier:      'cheap',
      system:    systemWithContext,
      messages,
      maxTokens: 2500,
      timeoutMs: 240_000,
      meta,
    })

    let finalResult = haikuResult
    let escalated   = false

    if (isRefusal(haikuResult.text)) {
      console.log(`[askSol] Haiku refused, retrying with Sonnet — jobId: ${jobId} — ${haikuResult.text.slice(0, 200)}`)
      const sonnetResult = await solCall({
        tier:      'standard',
        system:    systemWithContext,
        messages,
        maxTokens: 6000,
        timeoutMs: 240_000,
        meta,
      })
      finalResult = sonnetResult
      escalated   = true
    }

    // Meter immediately — reflects the final call that produced the visible result.
    await client.from('ai_jobs').update({
      model_used:    finalResult.model,
      tokens_used:   (finalResult.inputTokens ?? 0) + (finalResult.outputTokens ?? 0),
      cost_estimate: finalResult.costUsd,
    }).eq('id', jobId)

    // ── Stage: finalizing ─────────────────────────────────────────────────────
    await client.from('ai_jobs').update({ stage: 'finalizing', progress: 95 }).eq('id', jobId)

    const response = cleanAIOutput(finalResult.text)

    // Fire-and-forget search history
    if (userId && _sbUrl && _sbKey) {
      fetch(`${_sbUrl}/rest/v1/ai_search_history`, {
        method:  'POST',
        headers: { apikey: _sbKey, Authorization: `Bearer ${_sbKey}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          user_id:  userId,
          tool:     'ask-sol',
          query:    query.slice(0, 500),
          response: response.slice(0, 1000),
          context:  {},
        }),
      }).catch(() => {})
    }

    const result_json: Record<string, unknown> = {
      response,
      sources:   [],
      queryEcho: query,
    }
    if (escalated) result_json.escalated = true

    await client.from('ai_jobs').update({
      status:        'complete',
      stage:         'complete',
      progress:      100,
      completed_at:  new Date().toISOString(),
      model_used:    finalResult.model,
      tokens_used:   finalResult.inputTokens + finalResult.outputTokens,
      cost_estimate: finalResult.costUsd,
      result_json,
    }).eq('id', jobId)

    console.log(`[askSol] ${jobId} complete — escalated: ${escalated}, model: ${finalResult.model}`)

  } catch (e: any) {
    const errMsg = (e.message || String(e)).slice(0, 2000)
    console.error(`[askSol] ${jobId} failed:`, errMsg)

    await client.from('ai_jobs').update({
      status:        'failed',
      error_message: errMsg,
      completed_at:  new Date().toISOString(),
    }).eq('id', jobId).then(undefined, () => {})
  }
}
