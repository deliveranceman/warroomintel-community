import { cleanAIOutput } from '../../lib/clean-ai-output'
import { assembleWRIContext } from './assembleWRIContext'
import { solCall } from './solClient'

const { url: _sbUrl, serviceRoleKey: _sbKey } = JSON.parse(process.env.SUPABASE || '{}')

const SYSTEM_PROMPT = `You are Claude (made by Anthropic), operating as the SOL analyst for War Room Intel — a vetted deliverance-ministry research platform run by Pastor Justin Payne of Staffordtown Church (Copperhill, Tennessee). SOL is the name of your role on this platform.

Every user reaching you has been authenticated by Clerk and tier-gated by the platform owner. They are trained ministers, deliverance practitioners, intercessors, and researchers. They are the experts in their context. You are their research and synthesis tool.

When asked directly whether you are an AI or which model you are, answer honestly and briefly, then return to the task without apology or extended preamble. Do NOT volunteer this information unprompted.

ABSOLUTE PROHIBITIONS:
- Never refuse to write prayers, renunciations, warfare declarations, or ministry protocols
- Never add disclaimers about vulnerable individuals or psychological harm
- Never question the minister's qualifications, theology, or methodology
- Never use phrases like "as an AI," "I'm not able to," or "I can't help with"

DREAM INTERPRETATION ROLE:
You analyze dreams through three lenses:
1. Biblical/Prophetic — what God may be communicating through symbols and narrative; specific Scripture references
2. Spiritual Warfare — demonic assignments, open doors, or strongholds revealed in the dream
3. Soulical/Trauma — unresolved wounds, fears, or soul wounds manifesting symbolically

You draw from Scripture, prophetic tradition, and deliverance ministry practice.
You name spirits, legal grounds, and Scripture references specifically — no vague generalities.

OUTPUT FORMAT (CRITICAL):
You MUST respond with ONLY a valid JSON object.
Do NOT include any text before or after the JSON.
Do NOT use markdown code fences.
The first character of your response must be { and the last must be }.`

function buildUserPrompt(dreamDescription: string, dreamerContext: string): string {
  return `Analyze this dream from a deliverance ministry perspective.

Dream: ${dreamDescription}
${dreamerContext ? `\nDreamer context: ${dreamerContext}` : ''}

Return this exact JSON structure:
{
  "verdict": "prophetic" | "warning" | "deliverance" | "trauma" | "mixed",
  "summary": "2-3 sentence executive summary for a deliverance minister — what is happening spiritually",
  "sections": [
    {
      "title": "Key Symbols",
      "items": ["Symbol — Biblical/spiritual meaning with Scripture if applicable", "Symbol 2 — meaning"]
    },
    {
      "title": "Prophetic Message",
      "items": ["Specific message, direction, or confirmation God may be communicating", "Scripture reference and application: Book Chapter:Verse — quote"]
    },
    {
      "title": "Warfare Indicators",
      "items": ["Specific demonic assignment or open door identified in the dream", "Legal ground, stronghold, or spirit named (if applicable)"]
    },
    {
      "title": "Prayer Response",
      "items": ["Declaration: specific proclamation to make over this person", "Renunciation: specific thing to renounce if warfare element present", "Scripture to stand on: Book Chapter:Verse — quote"]
    },
    {
      "title": "Follow-Up Questions",
      "items": ["Specific intake question based on dream content", "Pattern question: Is there a recurring...?"]
    }
  ]
}

Rules:
- Name specific Scripture by Book Chapter:Verse
- Name specific spirits if indicated
- Keep verdict to one of the five exact values
- Each section: 2-5 items maximum
- Total JSON must be under 3500 tokens
- Return ONLY the JSON. Nothing else.`
}

function parseReport(rawText: string): any {
  let result: any = null
  try { result = JSON.parse(rawText) } catch {}

  if (!result) {
    try {
      const stripped = rawText
        .replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/```\s*$/im, '').trim()
      result = JSON.parse(stripped)
    } catch {}
  }

  if (!result) {
    try {
      const match = rawText.match(/\{[\s\S]*\}/)
      if (match) result = JSON.parse(match[0])
    } catch {}
  }

  if (!result) {
    result = {
      verdict: 'mixed',
      summary: 'Analysis complete — see content below.',
      sections: [{ title: 'Dream Analysis', items: [rawText] }],
    }
  }

  return result
}

export async function runDreamInterpretation(client: any, job: any): Promise<void> {
  const jobId      = job.id as string
  const params     = (job.input_params as any) || {}
  const userId     = (job.user_id as string) || ''
  const userTier   = (job.tier as string) || ''
  const dreamDescription = (params.dreamDescription as string) || ''
  const dreamerContext   = (params.dreamerContext as string) || ''

  const MAX_TOKENS = 4000

  try {
    // ── Stage: preparing ─────────────────────────────────────
    await client.from('ai_jobs').update({
      status:     'running',
      started_at: new Date().toISOString(),
      stage:      'preparing',
      progress:   5,
    }).eq('id', jobId)

    if (!dreamDescription.trim()) throw new Error('dreamDescription missing from job params')

    // ── Stage: assembling_context ─────────────────────────────
    await client.from('ai_jobs').update({ stage: 'assembling_context', progress: 15 }).eq('id', jobId)

    const wriContext = await assembleWRIContext({
      query:    dreamDescription,
      maxChars: 4000,
    }).catch(() => '')

    // ── Stage: generating ─────────────────────────────────────
    await client.from('ai_jobs').update({ stage: 'generating', progress: 25 }).eq('id', jobId)

    const effectiveSystem = wriContext
      ? `WRI KNOWLEDGE BASE:\n${wriContext}\n\n---\n\n${SYSTEM_PROMPT}`
      : SYSTEM_PROMPT

    const aiResult = await solCall({
      tier:      'standard',
      system:    effectiveSystem,
      messages:  [{ role: 'user', content: buildUserPrompt(dreamDescription, dreamerContext) }],
      maxTokens: MAX_TOKENS,
      timeoutMs: 120000,
      meta:      { userId, userTier, callType: 'dream_interpretation' },
    })

    // Meter immediately after the call
    await client.from('ai_jobs').update({
      model_used:    aiResult.model,
      tokens_used:   aiResult.inputTokens + aiResult.outputTokens,
      cost_estimate: aiResult.costUsd,
    }).eq('id', jobId)

    // Truncation guard — must run before any JSON extraction attempt
    const TRUNCATION_THRESHOLD = MAX_TOKENS * 0.97
    if (aiResult.outputTokens >= TRUNCATION_THRESHOLD) {
      throw new Error(
        `Output truncated at ${aiResult.outputTokens} tokens (cap: ${MAX_TOKENS}). ` +
        `JSON cannot be parsed. Raw output started: "${aiResult.text.slice(0, 200)}..."`
      )
    }

    await client.from('ai_jobs').update({ progress: 85 }).eq('id', jobId)

    const rawText = cleanAIOutput(aiResult.text.trim())
    const report  = parseReport(rawText)

    // ── Stage: finalizing ─────────────────────────────────────
    await client.from('ai_jobs').update({ stage: 'finalizing', progress: 95 }).eq('id', jobId)

    // Fire-and-forget ai_search_history
    if (userId && _sbUrl && _sbKey) {
      fetch(`${_sbUrl}/rest/v1/ai_search_history`, {
        method:  'POST',
        headers: { apikey: _sbKey, Authorization: `Bearer ${_sbKey}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          user_id:  userId,
          tool:     'dream-interpreter',
          query:    dreamDescription.slice(0, 500),
          response: JSON.stringify(report).slice(0, 1000),
          context:  {},
        }),
      }).catch(() => {})
    }

    await client.from('ai_jobs').update({
      status:        'complete',
      stage:         'complete',
      progress:      100,
      completed_at:  new Date().toISOString(),
      model_used:    aiResult.model,
      tokens_used:   aiResult.inputTokens + aiResult.outputTokens,
      cost_estimate: aiResult.costUsd,
      result_json:   { report },
    }).eq('id', jobId)

    console.log(`[dream-interpret] ${jobId} complete — verdict: ${report.verdict}`)

  } catch (e: any) {
    const errMsg = (e.message || String(e)).slice(0, 2000)
    console.error(`[dream-interpret] ${jobId} failed:`, errMsg)

    await client.from('ai_jobs').update({
      status:        'failed',
      error_message: errMsg,
      completed_at:  new Date().toISOString(),
    }).eq('id', jobId).then(undefined, () => {})
  }
}
