import { solCall } from './solClient'
import {
  BLOODLINE_DISCIPLINE_SYSTEM,
  fillBloodlinePrompt,
  type BloodlineExtractionResult,
} from './prompts/bloodlineExtraction'

// Refusal patterns — inlined (not a shared module; mirror of askSol.ts).
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

export async function runResearchDropBloodline(client: any, job: any): Promise<void> {
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

    const bookTitle  = (resource.title || resource.author || 'Unknown') as string

    // ── Step 3: Mark running ─────────────────────────────────────────────────
    await client.from('ai_jobs').update({
      status:     'running',
      stage:      'extracting',
      started_at: new Date().toISOString(),
    }).eq('id', jobId)

    // ── Step 4: Call solClient ───────────────────────────────────────────────
    const res = await solCall({
      tier:   'standard',  // -> claude-sonnet-4-5. NEVER 'cheap' (Haiku refuses on charged content).
      system: BLOODLINE_DISCIPLINE_SYSTEM,
      messages: [{
        role:    'user',
        content: fillBloodlinePrompt({
          sourceText:   resource.extracted_text as string,
          sourceName:   resource.title   || undefined,
          sourceBook:   resource.title   || undefined,
          sourceAuthor: resource.author  || undefined,
        }),
      }],
      maxTokens: 8000,    // extraction output can be large (spine §7 lesson)
      timeoutMs: 180000,  // large extraction; well within 15-min background limit
      meta: { userId, userTier, callType: 'research_drop_bloodline' },
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
    let parsed: BloodlineExtractionResult
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

    const VALID_TABLES = new Set(['curses', 'cultural_dossiers', 'secret_societies'])
    const candidates   = Array.isArray(parsed.candidates) ? parsed.candidates : []
    let inserted       = 0
    let skipped        = 0

    const counts: Record<string, number> = {
      curses:             0,
      cultural_dossiers:  0,
      secret_societies:   0,
    }

    for (const c of candidates) {
      if (!VALID_TABLES.has(c.target_table)) {
        skipped++
        console.warn(`[research-drop-bloodline] ${jobId} skipping unknown target_table: ${c.target_table}`)
        continue
      }

      const { error: insErr } = await client.from('extraction_candidates').insert({
        target_table: c.target_table,
        payload:      c.payload,
        source_id:    resourceId,
        source_name:  bookTitle,
        job_id:       jobId,
        confidence:   c.confidence ?? null,
        status:       'pending',
      })

      if (insErr) {
        console.error(`[research-drop-bloodline] candidate insert error (${c.target_table}):`, insErr.message)
        skipped++
      } else {
        inserted++
        counts[c.target_table] = (counts[c.target_table] ?? 0) + 1
      }
    }

    // ── Step 9: Finalize ─────────────────────────────────────────────────────
    await client.from('ai_jobs').update({
      status:       'complete',
      stage:        'finalized',
      progress:     100,
      completed_at: new Date().toISOString(),
      result_json:  {
        candidate_count: inserted,
        by_target: {
          curses:            counts.curses,
          cultural_dossiers: counts.cultural_dossiers,
          secret_societies:  counts.secret_societies,
        },
        completeness: parsed._meta?.extraction_completeness ?? null,
        skipped,
      },
    }).eq('id', jobId)

    console.log(`[research-drop-bloodline] ${jobId} complete: ${inserted} candidates staged, ${skipped} skipped`)

  } catch (err: any) {
    const errMsg = (err?.message || String(err)).slice(0, 2000)
    console.error(`[research-drop-bloodline] ${jobId} failed:`, errMsg)

    await client.from('ai_jobs').update({
      status:        'failed',
      error_message: errMsg,
      completed_at:  new Date().toISOString(),
    }).eq('id', jobId).then(undefined, () => {})
  }
}
