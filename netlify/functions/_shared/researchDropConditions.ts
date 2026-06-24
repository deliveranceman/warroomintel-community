import { solCall } from './solClient'
import {
  CONDITIONS_DISCIPLINE_SYSTEM,
  fillConditionsPrompt,
  type ConditionsExtractionResult,
} from './prompts/conditionsExtraction'

// Refusal patterns — inlined (not a shared module; mirror of researchDropBloodline.ts).
// Model refusals must never reach staging.
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

function stripJsonFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
}

export async function runResearchDropConditions(client: any, job: any): Promise<void> {
  const jobId      = job.id as string
  const params     = (job.input_params as any) || {}
  const resourceId = (job.resource_id as string) || (params.resourceId as string) || ''
  const userId     = (job.user_id as string) || ''
  const userTier   = (job.tier as string) || ''

  // ── Step 1: Validate resourceId ─────────────────────────────────────────────
  if (!resourceId) {
    await client.from('ai_jobs').update({
      status:        'failed',
      error_message: 'missing resourceId',
      completed_at:  new Date().toISOString(),
    }).eq('id', jobId)
    return
  }

  try {
    // ── Step 2: Load resource ────────────────────────────────────────────────
    const { data: resource, error: fetchErr } = await client
      .from('resources')
      .select('id,title,author,extracted_text,source_type')
      .eq('id', resourceId)
      .single()

    if (fetchErr || !resource?.extracted_text?.trim()) {
      await client.from('ai_jobs').update({
        status:        'failed',
        error_message: `resource has no extracted_text (id: ${resourceId})`,
        completed_at:  new Date().toISOString(),
      }).eq('id', jobId)
      return
    }

    const sourceName = (resource.title || resource.author || undefined) as string | undefined

    // ── Step 3: Mark running ─────────────────────────────────────────────────
    await client.from('ai_jobs').update({
      status:     'running',
      stage:      'extracting',
      started_at: new Date().toISOString(),
    }).eq('id', jobId)

    // ── Deviation from bloodline: load existing condition keys ───────────────
    // Passed to the prompt so the model can set is_enrichment=true and reuse
    // an existing condition_key rather than coining a duplicate.
    const { data: existing } = await client
      .from('conditions')
      .select('condition_key')
    const existingConditionKeys: string[] = (existing || [])
      .map((r: any) => r.condition_key as string)
      .filter(Boolean)

    // ── Step 4: Call solClient ───────────────────────────────────────────────
    const prompt = fillConditionsPrompt({
      sourceText:            resource.extracted_text as string,
      sourceName,
      existingConditionKeys,
    })

    const res = await solCall({
      tier:   'standard',  // -> claude-sonnet-4-5. NEVER 'cheap' (Haiku refuses on charged content).
      system: CONDITIONS_DISCIPLINE_SYSTEM,
      messages: [{
        role:    'user',
        content: prompt,
      }],
      maxTokens: 8000,
      timeoutMs: 180000,  // large extraction; well within 15-min background limit
      meta: { userId, userTier, callType: 'research_drop_conditions' },
    })

    // ── Step 5: Write cost BEFORE parsing (spine §7 discipline) ─────────────
    await client.from('ai_jobs').update({
      model_used:    res.model,
      tokens_used:   res.inputTokens + res.outputTokens,
      cost_estimate: res.costUsd,
      stage:         'parsing',
    }).eq('id', jobId)

    // ── Step 6: Refusal guard ────────────────────────────────────────────────
    if (isRefusal(res.text)) {
      await client.from('ai_jobs').update({
        status:        'failed',
        error_message: 'refusal_detected',
        completed_at:  new Date().toISOString(),
      }).eq('id', jobId)
      return
    }

    // ── Step 7: Parse JSON ───────────────────────────────────────────────────
    let parsed: ConditionsExtractionResult
    try {
      parsed = JSON.parse(stripJsonFences(res.text))
    } catch (parseErr: any) {
      await client.from('ai_jobs').update({
        status:        'failed',
        error_message: `parse_error: ${(parseErr?.message || String(parseErr)).slice(0, 500)}`,
        completed_at:  new Date().toISOString(),
      }).eq('id', jobId)
      return
    }

    // ── Step 8: Stage candidates ─────────────────────────────────────────────
    await client.from('ai_jobs').update({ stage: 'staging' }).eq('id', jobId)

    const candidates   = Array.isArray(parsed.candidates) ? parsed.candidates : []
    let inserted       = 0
    let skipped        = 0
    let enrichCount    = 0

    for (const c of candidates) {
      const { error: insErr } = await client.from('extraction_candidates').insert({
        target_table: 'conditions',
        payload:      c,
        source_id:    resourceId,
        source_name:  sourceName ?? null,
        job_id:       jobId,
        confidence:   c.confidence ?? null,
        status:       'pending',
      })

      if (insErr) {
        console.error(`[research-drop-conditions] candidate insert error:`, insErr.message)
        skipped++
      } else {
        inserted++
        if (c.is_enrichment === true) enrichCount++
      }
    }

    // ── Step 9: Finalize ─────────────────────────────────────────────────────
    await client.from('ai_jobs').update({
      status:       'complete',
      stage:        'finalized',
      progress:     100,
      completed_at: new Date().toISOString(),
      result_json:  {
        candidate_count:  inserted,
        by_target:        { conditions: inserted },
        enrichment_count: enrichCount,
        skipped,
        completeness:     parsed._meta?.extraction_completeness ?? null,
      },
    }).eq('id', jobId)

    console.log(`[research-drop-conditions] ${jobId} complete: ${inserted} candidates staged (${enrichCount} enrichments), ${skipped} skipped`)

  } catch (err: any) {
    const errMsg = (err?.message || String(err)).slice(0, 2000)
    console.error(`[research-drop-conditions] ${jobId} failed:`, errMsg)

    await client.from('ai_jobs').update({
      status:        'failed',
      error_message: errMsg,
      completed_at:  new Date().toISOString(),
    }).eq('id', jobId).then(undefined, () => {})
  }
}
