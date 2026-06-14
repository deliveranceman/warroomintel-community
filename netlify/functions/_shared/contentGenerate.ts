import { solCall } from './solClient'

export type ContentType = 'daily_brief' | 'field_manual' | 'weekly_intel' | 'fringe_article'

export interface ContentGenInput {
  contentType: ContentType
  title: string
  date?: string
}

// Preserved verbatim from admin-content-ai.ts — behavior parity is the goal.
const SYSTEM_PROMPT = 'You are SOL, the AI ministry intelligence engine for War Room Intel — a spiritual warfare and deliverance ministry platform operated by Pastor Justin Payne at Staffordtown Church in Copperhill, TN. Always respond with valid JSON only. No markdown code blocks, no preamble, no explanation — just the raw JSON object.'

function buildPrompt(title: string, contentType: ContentType): string {
  switch (contentType) {
    case 'daily_brief':
      return `You are SOL, the AI ministry intelligence engine for War Room Intel, built by Pastor Justin Payne of Staffordtown Church, Copperhill TN. Generate a complete Daily Brief entry for ministers.
Title: ${title}
Return JSON only with these exact keys:
{
  "morningPrayer": "150-200 words, militaristic prayer tone, addresses the theme, references blood of Jesus and authority",
  "scripture": "book chapter:verse format, most relevant verse",
  "scriptureText": "the verse text",
  "devotional": "400-500 words markdown, tactical ministry tone, practical application, 2-3 subheadings",
  "eveningPrayer": "100-150 words, closing prayer, thanksgiving and protection declaration"
}`

    case 'field_manual':
      return `Generate a complete Field Manual entry for War Room Intel ministers.
Title: ${title}
Return JSON only:
{
  "summary": "2-3 sentence overview",
  "draft": "full markdown, 700+ words, includes: theological framework, key scriptures with references, manifestations, legal ground, ministry protocol steps, assessment questions, prayer declarations"
}`

    case 'weekly_intel':
      return `Generate a Weekly Intel briefing for War Room Intel.
Title: ${title}
Return JSON only:
{
  "summary": "compelling 1-2 sentence hook",
  "body": "markdown, 300-500 words, ministry intelligence briefing tone, actionable intel for ministers",
  "tags": ["3-5 relevant tags as array of strings"]
}`

    case 'fringe_article':
      return `Generate a Fringe Intelligence article for War Room Intel.
Title: ${title}
Return JSON only:
{
  "category": "one of: open-intel, classified, the-feed, intel-faq",
  "body": "markdown, 400-600 words, investigative tone, covers occult/spiritual warfare intelligence"
}`
  }
}

export async function runContentGeneration(client: any, job: any): Promise<void> {
  const jobId     = job.id as string
  const params    = (job.input_params as ContentGenInput) || {}
  const { contentType, title, date } = params
  const userId    = (job.user_id as string) || ''
  const userTier  = (job.tier    as string) || ''
  const meta      = { userId, userTier, callType: 'content_gen' }

  try {
    // ── Stage 1: preparing ────────────────────────────────────────────────
    await client.from('ai_jobs').update({
      status:     'running',
      started_at: new Date().toISOString(),
      stage:      'preparing',
      progress:   5,
    }).eq('id', jobId)

    const validTypes: ContentType[] = ['daily_brief', 'field_manual', 'weekly_intel', 'fringe_article']
    if (!contentType || !validTypes.includes(contentType)) {
      throw new Error(`Invalid contentType: ${contentType}`)
    }
    if (!title?.trim()) throw new Error('title is required')

    // ── Stage 2: generating ───────────────────────────────────────────────
    await client.from('ai_jobs').update({ stage: 'generating', progress: 10 }).eq('id', jobId)

    const result = await solCall({
      tier:      'standard',
      system:    SYSTEM_PROMPT,
      messages:  [{ role: 'user', content: buildPrompt(title.trim(), contentType) }],
      maxTokens: 3000,
      timeoutMs: 90000,
      meta,
    })

    await client.from('ai_jobs').update({ progress: 90 }).eq('id', jobId)

    // Parse — strip ```json fences (same as admin-content-ai.ts)
    const rawText = result.text.trim()
    let parsed: Record<string, any> | null = null
    try {
      const clean = rawText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      const m = rawText.match(/\{[\s\S]*\}/)
      if (m) try { parsed = JSON.parse(m[0]) } catch {}
    }
    if (!parsed) throw new Error('AI returned non-JSON response')

    // ── Stage 3: finalizing ───────────────────────────────────────────────
    await client.from('ai_jobs').update({ stage: 'finalizing', progress: 95 }).eq('id', jobId)

    await client.from('ai_jobs').update({
      status:        'complete',
      progress:      100,
      completed_at:  new Date().toISOString(),
      model_used:    'claude-sonnet-4-5',
      tokens_used:   result.inputTokens + result.outputTokens,
      cost_estimate: result.costUsd,
      result_json:   {
        content_type: contentType,
        title:        title.trim(),
        date:         date || null,
        generated:    parsed,
        model_used:   'claude-sonnet-4-5',
        generated_at: new Date().toISOString(),
      },
    }).eq('id', jobId)

    console.log(`[content-gen] ${jobId} complete: ${contentType} "${title}"`)

  } catch (e: any) {
    const errMsg = (e.message || String(e)).slice(0, 2000)
    console.error(`[content-gen] ${jobId} failed:`, errMsg)
    await client.from('ai_jobs').update({
      status:        'failed',
      error_message: errMsg,
      completed_at:  new Date().toISOString(),
    }).eq('id', jobId).then(undefined, () => {})
  }
}
