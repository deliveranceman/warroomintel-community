import { solCall } from './solClient'
import { buildWindows } from './patristicScan'
import { BUDGET_MS, SCAN_CONCURRENCY, ConditionsDropCheckpoint } from './researchDropTypes'
import {
  CONDITIONS_DISCIPLINE_SYSTEM,
  fillConditionsPrompt,
  type ConditionCandidate,
} from './prompts/conditionsExtraction'

// ── Window constants for conditions extraction ────────────────────────────────
// Conditions need whole-condition context (symptoms, root thesis, tagged items
// all on one disease), so windows are 2× the spirit scan size.
// Hard cap of 200 gives ~3.2M char coverage — proportional to spirits 400 × 8000.
const COND_WINDOW_SIZE    = 16000
const COND_WINDOW_OVERLAP = 800
const COND_HARD_CAP       = 200

// Refusal patterns — model refusals must never reach staging.
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

// ── Per-window extraction ─────────────────────────────────────────────────────
// Returns null on refusal or parse failure — per-window failures do not kill
// the job; the caller accumulates a windowsFailed count for the sanity floor.
async function extractWindow(
  windowText: string,
  sourceName: string | undefined,
  existingConditionKeys: string[],
  meta: { userId: string; userTier: string; callType: string },
): Promise<{ candidates: ConditionCandidate[]; inputTokens: number; outputTokens: number; costUsd: number } | null> {
  const prompt = fillConditionsPrompt({ sourceText: windowText, sourceName, existingConditionKeys })

  const res = await solCall({
    tier:      'standard',  // NEVER 'cheap' — Haiku refuses on charged content
    system:    CONDITIONS_DISCIPLINE_SYSTEM,
    messages:  [{ role: 'user', content: prompt }],
    maxTokens: 8000,
    timeoutMs: 120000,
    meta,
  })

  // Refusal guard — treat as per-window failure, not a job failure
  if (isRefusal(res.text)) {
    console.warn('[research-drop-conditions] refusal detected on window, skipping')
    return null
  }

  let parsed: any
  try {
    parsed = JSON.parse(stripJsonFences(res.text))
  } catch {
    try {
      const m = res.text.match(/\{[\s\S]*\}/)
      if (m) parsed = JSON.parse(m[0])
    } catch {}
  }

  const candidates = Array.isArray(parsed?.candidates) ? (parsed.candidates as ConditionCandidate[]) : []
  return { candidates, inputTokens: res.inputTokens, outputTokens: res.outputTokens, costUsd: res.costUsd }
}

// ── In-memory candidate merge ─────────────────────────────────────────────────
// Merge strategy: on condition_key collision, union tagged_items (dedup by
// type+content), proposed_region_links (dedup by region_label), and
// proposed_spirit_links (dedup by spirit_name). Top-level narrative fields
// (symptoms, author_conclusion, etc.) are taken from the candidate with more
// tagged_items — more items = richer source window.
function mergeCandidates(map: Map<string, ConditionCandidate>, incoming: ConditionCandidate[]): void {
  for (const c of incoming) {
    if (!c?.condition_key) continue
    const k = c.condition_key
    const existing = map.get(k)

    if (!existing) {
      map.set(k, {
        ...c,
        tagged_items:          [...(c.tagged_items || [])],
        proposed_region_links: [...(c.proposed_region_links || [])],
        proposed_spirit_links: [...(c.proposed_spirit_links || [])],
      })
      continue
    }

    // Union tagged_items — dedup by type+content
    const existItems: any[] = existing.tagged_items || []
    const incomItems: any[] = c.tagged_items || []
    const seenItems = new Set(existItems.map((ti: any) => `${ti.type}::${ti.content}`))
    const mergedItems = [...existItems]
    for (const ti of incomItems) {
      const tiKey = `${ti.type}::${ti.content}`
      if (!seenItems.has(tiKey)) { mergedItems.push(ti); seenItems.add(tiKey) }
    }

    // Union proposed_region_links — dedup by region_label
    const existRegions: any[] = existing.proposed_region_links || []
    const incomRegions: any[] = c.proposed_region_links || []
    const seenRegions = new Set(existRegions.map((r: any) => r.region_label))
    const mergedRegions = [...existRegions]
    for (const r of incomRegions) {
      if (!seenRegions.has(r.region_label)) { mergedRegions.push(r); seenRegions.add(r.region_label) }
    }

    // Union proposed_spirit_links — dedup by spirit_name
    const existSpirits: any[] = existing.proposed_spirit_links || []
    const incomSpirits: any[] = c.proposed_spirit_links || []
    const seenSpirits = new Set(existSpirits.map((s: any) => s.spirit_name))
    const mergedSpirits = [...existSpirits]
    for (const s of incomSpirits) {
      if (!seenSpirits.has(s.spirit_name)) { mergedSpirits.push(s); seenSpirits.add(s.spirit_name) }
    }

    // Take top-level fields from the richer candidate (more tagged_items)
    const base = incomItems.length > existItems.length ? { ...c } : { ...existing }
    map.set(k, {
      ...base,
      tagged_items:          mergedItems,
      proposed_region_links: mergedRegions,
      proposed_spirit_links: mergedSpirits,
    })
  }
}

export async function runResearchDropConditions(client: any, job: any): Promise<void> {
  const jobId      = job.id as string
  const params     = (job.input_params as any) || {}
  const resourceId = (job.resource_id as string) || (params.resourceId as string) || ''
  const userId     = (job.user_id as string) || ''
  const userTier   = (job.tier as string) || ''
  const meta       = { userId, userTier, callType: 'research_drop_conditions' }

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

    const fullText   = resource.extracted_text as string
    const sourceName = (resource.title || resource.author || undefined) as string | undefined

    // ── Step 3: Mark running ─────────────────────────────────────────────────
    await client.from('ai_jobs').update({
      status:     'running',
      stage:      'extracting',
      started_at: new Date().toISOString(),
    }).eq('id', jobId)

    const runStartedAt = Date.now()

    // ── Step 4: Read checkpoint (resumption) ─────────────────────────────────
    const priorJson           = (job.result_json as Partial<ConditionsDropCheckpoint>) || {}
    const isResumption        = priorJson._is_resumption === true
    const resumeCursor        = typeof priorJson._cursor === 'number' ? priorJson._cursor : 0
    const resumeInputTokens   = typeof priorJson._total_input_tokens  === 'number' ? priorJson._total_input_tokens  : 0
    const resumeOutputTokens  = typeof priorJson._total_output_tokens === 'number' ? priorJson._total_output_tokens : 0
    const resumeCostUsd       = typeof priorJson._total_cost_usd      === 'number' ? priorJson._total_cost_usd      : 0
    const resumeWindowsFailed = typeof priorJson._windows_failed      === 'number' ? priorJson._windows_failed      : 0
    const resumeStagingCursor = typeof priorJson._staging_cursor      === 'number' ? priorJson._staging_cursor      : 0

    // Rehydrate merged candidate map from prior checkpoint
    const byKey = new Map<string, ConditionCandidate>()
    if (Array.isArray(priorJson._partial_candidates)) {
      for (const c of priorJson._partial_candidates) {
        if (c?.condition_key) byKey.set(c.condition_key as string, c as ConditionCandidate)
      }
    }

    if (isResumption) {
      console.log(`[research-drop-conditions] ${jobId} resuming from cursor=${resumeCursor}, candidates=${byKey.size}`)
    }

    // ── Step 5: Load existing condition keys ─────────────────────────────────
    // Passed per-window so the model can set is_enrichment=true and reuse
    // an existing condition_key rather than coining a duplicate.
    const { data: existing } = await client
      .from('conditions')
      .select('condition_key')
    const existingConditionKeys: string[] = (existing || [])
      .map((r: any) => r.condition_key as string)
      .filter(Boolean)

    // ── Step 6: Build windows ─────────────────────────────────────────────────
    await client.from('ai_jobs').update({ stage: 'scanning', progress: 10 }).eq('id', jobId)

    const COND_STRIDE  = COND_WINDOW_SIZE - COND_WINDOW_OVERLAP
    const idealWindows = Math.max(1, Math.ceil(fullText.length / COND_STRIDE))
    const maxWindows   = Math.min(idealWindows, COND_HARD_CAP)
    const { windows, truncated } = buildWindows(fullText, maxWindows, COND_WINDOW_SIZE, COND_WINDOW_OVERLAP)
    const total = windows.length

    let done              = resumeCursor
    let totalInputTokens  = resumeInputTokens
    let totalOutputTokens = resumeOutputTokens
    let totalCostUsd      = resumeCostUsd
    let windowsFailed     = resumeWindowsFailed

    // ── Step 7: Windowed extraction loop ─────────────────────────────────────
    for (let i = resumeCursor; i < windows.length; i += SCAN_CONCURRENCY) {
      const batch = windows.slice(i, i + SCAN_CONCURRENCY)

      // Run up to SCAN_CONCURRENCY windows in parallel.
      // Promise.allSettled isolates per-window failures — one bad window does
      // not kill the job.
      const settled = await Promise.allSettled(
        batch.map(w => extractWindow(w, sourceName, existingConditionKeys, meta))
      )

      // Accumulate results. Cost is captured before merge (spine §7 discipline:
      // token counts come from the solCall return value, not the parsed JSON).
      settled.forEach((outcome, idxInBatch) => {
        const windowIndex = i + idxInBatch
        if (outcome.status === 'fulfilled' && outcome.value !== null) {
          const result = outcome.value
          totalInputTokens  += result.inputTokens
          totalOutputTokens += result.outputTokens
          totalCostUsd      += result.costUsd
          mergeCandidates(byKey, result.candidates)
        } else {
          const reason = outcome.status === 'rejected'
            ? (outcome.reason?.message || String(outcome.reason)).slice(0, 200)
            : 'refusal_or_parse_error'
          windowsFailed++
          console.error(`[research-drop-conditions] window ${windowIndex + 1}/${total} failed:`, reason)
        }
      })

      done += batch.length

      // Live flush — cost + progress visible in UI while job runs
      await client.from('ai_jobs').update({
        progress:      10 + Math.round(done / total * 50),
        tokens_used:   totalInputTokens + totalOutputTokens,
        cost_estimate: totalCostUsd,
      }).eq('id', jobId)

      // Budget guard — checkpoint and requeue before hitting the 15-min ceiling
      if (Date.now() - runStartedAt > BUDGET_MS) {
        const cp: ConditionsDropCheckpoint = {
          _cursor:              done,
          _partial_candidates:  Array.from(byKey.values()),
          _total_input_tokens:  totalInputTokens,
          _total_output_tokens: totalOutputTokens,
          _total_cost_usd:      totalCostUsd,
          _windows_failed:      windowsFailed,
          _windows_total:       total,
          _staging_cursor:      0,
          _is_resumption:       true,
        }
        await client.from('ai_jobs').update({
          status:      'queued',
          stage:       'resuming',
          result_json: cp,
        }).eq('id', jobId)
        console.log(`[research-drop-conditions] ${jobId} budget hit at window ${done}/${total} — checkpointed and requeued`)
        return
      }
    }

    // Sanity floor — if more than half the windows failed, surface it so the job
    // ends in `failed` with a useful message rather than staging near-empty output.
    if (windowsFailed > total / 2) {
      throw new Error(`Scanning failed on ${windowsFailed}/${total} windows.`)
    }

    // ── Step 8: Staging ───────────────────────────────────────────────────────
    // Iterate the MERGED MAP (not raw per-window arrays) — all cross-window
    // duplicates have been resolved by condition_key before any DB write.
    await client.from('ai_jobs').update({ stage: 'staging', progress: 62 }).eq('id', jobId)

    const candidates = Array.from(byKey.values())
    let inserted          = 0
    let skipped           = 0
    let enrichCount       = 0
    let regionLinksParked = 0

    for (let stagingIdx = resumeStagingCursor; stagingIdx < candidates.length; stagingIdx++) {
      const c = candidates[stagingIdx]

      // Partition region links: literal stays with the conditions candidate;
      // inferred links are removed and parked separately for human placement.
      const allRegionLinks: any[] = Array.isArray(c.proposed_region_links) ? c.proposed_region_links : []
      const literalLinks   = allRegionLinks.filter((l: any) => l.inferred !== true)
      const inferredLinks  = allRegionLinks.filter((l: any) => l.inferred === true)

      const condPayload = { ...c, proposed_region_links: literalLinks }
      const { error: insErr } = await client.from('extraction_candidates').insert({
        target_table: 'conditions',
        payload:      condPayload,
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

        // Stage each inferred region link as its own extraction_candidates row
        for (const link of inferredLinks) {
          const { error: linkErr } = await client.from('extraction_candidates').insert({
            target_table: 'condition_region_links',
            payload: {
              condition_key:          c.condition_key,
              condition_display_name: c.display_name,
              region_label:           link.region_label,
              placement_confidence:   link.placement_confidence,
              reasoning:              link.reasoning,
              relevance:              link.relevance,
              source_excerpt:         link.source_excerpt,
            },
            source_id:   resourceId,
            source_name: sourceName ?? null,
            job_id:      jobId,
            confidence:  link.placement_confidence ?? 'medium',
            status:      'pending',
          })

          if (linkErr) {
            console.error(`[research-drop-conditions] region link insert error:`, linkErr.message)
          } else {
            regionLinksParked++
          }
        }
      }

      // Budget guard in staging stage
      if (Date.now() - runStartedAt > BUDGET_MS) {
        const cp: ConditionsDropCheckpoint = {
          _cursor:              done,             // scanning complete; full array in _partial_candidates
          _partial_candidates:  candidates,
          _total_input_tokens:  totalInputTokens,
          _total_output_tokens: totalOutputTokens,
          _total_cost_usd:      totalCostUsd,
          _windows_failed:      windowsFailed,
          _windows_total:       total,
          _staging_cursor:      stagingIdx + 1,
          _is_resumption:       true,
        }
        await client.from('ai_jobs').update({
          status:      'queued',
          stage:       'resuming',
          result_json: cp,
        }).eq('id', jobId)
        console.log(`[research-drop-conditions] ${jobId} budget hit in staging at candidate ${stagingIdx + 1}/${candidates.length} — checkpointed and requeued`)
        return
      }
    }

    // ── Step 9: Finalize ──────────────────────────────────────────────────────
    await client.from('ai_jobs').update({
      status:       'complete',
      stage:        'finalized',
      progress:     100,
      completed_at: new Date().toISOString(),
      result_json:  {
        candidate_count:     inserted,
        by_target:           { conditions: inserted, condition_region_links: regionLinksParked },
        enrichment_count:    enrichCount,
        region_links_parked: regionLinksParked,
        skipped,
        windows_processed:   total,
        windows_failed:      windowsFailed,
        truncated,
        hard_cap_hit:        idealWindows > COND_HARD_CAP,
      },
    }).eq('id', jobId)

    console.log(`[research-drop-conditions] ${jobId} complete: ${inserted} candidates staged (${enrichCount} enrichments), ${regionLinksParked} region links parked, ${skipped} skipped, ${total} windows (${windowsFailed} failed)`)

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
