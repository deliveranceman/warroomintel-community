import { solCall } from './solClient'
import { buildWindows, normalizeName } from './patristicScan'
import { BUDGET_MS, SCAN_CONCURRENCY, BloodlineDropCheckpoint } from './researchDropTypes'
import {
  BLOODLINE_DISCIPLINE_SYSTEM,
  fillBloodlinePrompt,
} from './prompts/bloodlineExtraction'

// ── Window constants for bloodline extraction ─────────────────────────────────
// Bloodline curse/cultural narrative needs full-condition context like conditions,
// so windows match the conditions size (2× spirit scan size).
// Hard cap of 200 gives ~3.2M char coverage — proportional to spirits 400 × 8000.
const BL_WINDOW_SIZE    = 16000
const BL_WINDOW_OVERLAP = 800
const BL_HARD_CAP       = 200

// Completeness ordering for best-across-windows tracking.
const COMPLETENESS_ORDER = ['minimal', 'partial', 'substantial', 'comprehensive']

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

// ── Canonical name for per-target dedup key ───────────────────────────────────
// cultural_dossiers identify by culture_name; curses + secret_societies by name.
function candidateName(c: any): string {
  if (c?.target_table === 'cultural_dossiers') return (c.payload?.culture_name as string) || ''
  return (c.payload?.name as string) || ''
}

// ── Per-window extraction ─────────────────────────────────────────────────────
// Returns null on refusal or parse failure — per-window failures do not kill
// the job; the caller accumulates a windowsFailed count for the sanity floor.
async function extractWindow(
  windowText:   string,
  sourceName:   string | undefined,
  sourceAuthor: string | undefined,
  meta: { userId: string; userTier: string; callType: string },
): Promise<{
  candidates:   any[]
  completeness: string | null
  inputTokens:  number
  outputTokens: number
  costUsd:      number
} | null> {
  const prompt = fillBloodlinePrompt({
    sourceText:   windowText,
    sourceName,
    sourceBook:   sourceName,
    sourceAuthor,
  })

  const res = await solCall({
    tier:      'standard',  // NEVER 'cheap' — Haiku refuses on charged content
    system:    BLOODLINE_DISCIPLINE_SYSTEM,
    messages:  [{ role: 'user', content: prompt }],
    maxTokens: 8000,
    timeoutMs: 120000,
    meta,
  })

  // Refusal guard — treat as per-window failure, not a job failure
  if (isRefusal(res.text)) {
    console.warn('[research-drop-bloodline] refusal detected on window, skipping')
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

  const candidates   = Array.isArray(parsed?.candidates) ? parsed.candidates : []
  const completeness = (parsed?._meta?.extraction_completeness as string) || null
  return { candidates, completeness, inputTokens: res.inputTokens, outputTokens: res.outputTokens, costUsd: res.costUsd }
}

// ── In-memory candidate merge ─────────────────────────────────────────────────
// Dedup key: `${target_table}::${normalizeName(candidateName(c))}` — one entry
// per named entity per target table across all windows.
//
// Merge strategy on collision:
//   curses: union tagged_items (dedup by type+text); top-level narrative fields
//     taken from whichever window contributed more tagged_items (richer-wins).
//     source_excerpts objects are merged, incoming fields overwrite existing.
//   cultural_dossiers / secret_societies: flat text fields, no tagged_items.
//     Keep whichever candidate has more non-empty payload fields; union
//     source_excerpts. This is the flat-table equivalent of richer-wins.
function mergeBloodlineCandidates(map: Map<string, any>, incoming: any[]): void {
  for (const c of incoming) {
    const nameStr = candidateName(c)
    if (!nameStr.trim()) continue
    const k = `${c.target_table}::${normalizeName(nameStr)}`
    const existing = map.get(k)

    if (!existing) {
      const payload = c.target_table === 'curses'
        ? { ...c.payload, tagged_items: [...(c.payload?.tagged_items || [])] }
        : { ...c.payload }
      map.set(k, { ...c, payload, source_excerpts: { ...(c.source_excerpts || {}) } })
      continue
    }

    if (c.target_table === 'curses') {
      // Union tagged_items — dedup by type+text
      const existItems: any[] = existing.payload?.tagged_items || []
      const incomItems: any[] = c.payload?.tagged_items || []
      const seenItems = new Set(existItems.map((ti: any) => `${ti.type}::${ti.text}`))
      const mergedItems = [...existItems]
      for (const ti of incomItems) {
        const tiKey = `${ti.type}::${ti.text}`
        if (!seenItems.has(tiKey)) { mergedItems.push(ti); seenItems.add(tiKey) }
      }
      // Take top-level payload fields from the richer candidate (more tagged_items)
      const basePayload = incomItems.length > existItems.length ? { ...c.payload } : { ...existing.payload }
      map.set(k, {
        ...(incomItems.length > existItems.length ? c : existing),
        payload:         { ...basePayload, tagged_items: mergedItems },
        source_excerpts: { ...(existing.source_excerpts || {}), ...(c.source_excerpts || {}) },
      })
    } else {
      // cultural_dossiers / secret_societies: flat fields, no tagged_items.
      // Keep candidate with more populated payload fields; union source_excerpts.
      const existNonEmpty = Object.values(existing.payload || {}).filter(v => v != null && v !== '').length
      const incomNonEmpty = Object.values(c.payload || {}).filter(v => v != null && v !== '').length
      const base = incomNonEmpty > existNonEmpty ? c : existing
      map.set(k, {
        ...base,
        source_excerpts: { ...(existing.source_excerpts || {}), ...(c.source_excerpts || {}) },
      })
    }
  }
}

const VALID_TABLES = new Set(['curses', 'cultural_dossiers', 'secret_societies'])

export async function runResearchDropBloodline(client: any, job: any): Promise<void> {
  const jobId      = job.id as string
  const params     = (job.input_params as any) || {}
  const resourceId = (job.resource_id as string) || (params.resourceId as string) || ''
  const userId     = (job.user_id as string) || ''
  const userTier   = (job.tier as string) || ''
  const meta       = { userId, userTier, callType: 'research_drop_bloodline' }

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

    const fullText    = resource.extracted_text as string
    const sourceName  = (resource.title  || undefined) as string | undefined
    const sourceAuthor = (resource.author || undefined) as string | undefined

    // ── Step 3: Mark running ─────────────────────────────────────────────────
    await client.from('ai_jobs').update({
      status:     'running',
      stage:      'extracting',
      started_at: new Date().toISOString(),
    }).eq('id', jobId)

    const runStartedAt = Date.now()

    // ── Step 4: Read checkpoint (resumption) ─────────────────────────────────
    const priorJson           = (job.result_json as Partial<BloodlineDropCheckpoint>) || {}
    const isResumption        = priorJson._is_resumption === true
    const resumeCursor        = typeof priorJson._cursor === 'number' ? priorJson._cursor : 0
    const resumeInputTokens   = typeof priorJson._total_input_tokens  === 'number' ? priorJson._total_input_tokens  : 0
    const resumeOutputTokens  = typeof priorJson._total_output_tokens === 'number' ? priorJson._total_output_tokens : 0
    const resumeCostUsd       = typeof priorJson._total_cost_usd      === 'number' ? priorJson._total_cost_usd      : 0
    const resumeWindowsFailed = typeof priorJson._windows_failed      === 'number' ? priorJson._windows_failed      : 0
    const resumeStagingCursor = typeof priorJson._staging_cursor      === 'number' ? priorJson._staging_cursor      : 0

    // Rehydrate merged candidate map from prior checkpoint.
    // Key: `${target_table}::${normalizeName(candidateName(c))}` — rebuilds deterministically.
    const byKey = new Map<string, any>()
    if (Array.isArray(priorJson._partial_candidates)) {
      for (const c of priorJson._partial_candidates) {
        const nameStr = candidateName(c)
        if (nameStr.trim() && VALID_TABLES.has(c?.target_table)) {
          byKey.set(`${c.target_table}::${normalizeName(nameStr)}`, c)
        }
      }
    }

    if (isResumption) {
      console.log(`[research-drop-bloodline] ${jobId} resuming from cursor=${resumeCursor}, candidates=${byKey.size}`)
    }

    // ── Step 5: Build windows ─────────────────────────────────────────────────
    await client.from('ai_jobs').update({ stage: 'scanning', progress: 10 }).eq('id', jobId)

    const BL_STRIDE    = BL_WINDOW_SIZE - BL_WINDOW_OVERLAP
    const idealWindows = Math.max(1, Math.ceil(fullText.length / BL_STRIDE))
    const maxWindows   = Math.min(idealWindows, BL_HARD_CAP)
    const { windows, truncated } = buildWindows(fullText, maxWindows, BL_WINDOW_SIZE, BL_WINDOW_OVERLAP)
    const total = windows.length

    let done              = resumeCursor
    let totalInputTokens  = resumeInputTokens
    let totalOutputTokens = resumeOutputTokens
    let totalCostUsd      = resumeCostUsd
    let windowsFailed     = resumeWindowsFailed
    let bestCompleteness: string | null = null

    // ── Step 6: Windowed extraction loop ──────────────────────────────────────
    for (let i = resumeCursor; i < windows.length; i += SCAN_CONCURRENCY) {
      const batch = windows.slice(i, i + SCAN_CONCURRENCY)

      // Run up to SCAN_CONCURRENCY windows in parallel.
      // Promise.allSettled isolates per-window failures — one bad window does
      // not kill the job.
      const settled = await Promise.allSettled(
        batch.map(w => extractWindow(w, sourceName, sourceAuthor, meta))
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
          mergeBloodlineCandidates(byKey, result.candidates)
          // Track best completeness seen across all windows
          if (result.completeness) {
            const incomIdx = COMPLETENESS_ORDER.indexOf(result.completeness)
            const bestIdx  = COMPLETENESS_ORDER.indexOf(bestCompleteness || '')
            if (incomIdx > bestIdx) bestCompleteness = result.completeness
          }
        } else {
          const reason = outcome.status === 'rejected'
            ? (outcome.reason?.message || String(outcome.reason)).slice(0, 200)
            : 'refusal_or_parse_error'
          windowsFailed++
          console.error(`[research-drop-bloodline] window ${windowIndex + 1}/${total} failed:`, reason)
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
        const cp: BloodlineDropCheckpoint = {
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
        console.log(`[research-drop-bloodline] ${jobId} budget hit at window ${done}/${total} — checkpointed and requeued`)
        return
      }
    }

    // Sanity floor — if more than half the windows failed, surface it so the job
    // ends in `failed` with a useful message rather than staging near-empty output.
    if (windowsFailed > total / 2) {
      throw new Error(`Scanning failed on ${windowsFailed}/${total} windows.`)
    }

    // ── Step 7: Staging ───────────────────────────────────────────────────────
    // Iterate the MERGED MAP (not raw per-window arrays) — all cross-window
    // duplicates have been resolved by `${target_table}::${normalizeName(name)}`
    // before any DB write.
    await client.from('ai_jobs').update({ stage: 'staging', progress: 62 }).eq('id', jobId)

    const candidates = Array.from(byKey.values())
    let inserted = 0
    let skipped  = 0
    const counts: Record<string, number> = {
      curses:            0,
      cultural_dossiers: 0,
      secret_societies:  0,
    }

    for (let stagingIdx = resumeStagingCursor; stagingIdx < candidates.length; stagingIdx++) {
      const c = candidates[stagingIdx]

      if (!VALID_TABLES.has(c.target_table)) {
        skipped++
        console.warn(`[research-drop-bloodline] ${jobId} skipping unknown target_table: ${c.target_table}`)
        continue
      }

      const { error: insErr } = await client.from('extraction_candidates').insert({
        target_table: c.target_table,
        payload:      c.payload,
        source_id:    resourceId,
        source_name:  sourceName ?? null,
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

      // Budget guard in staging stage
      if (Date.now() - runStartedAt > BUDGET_MS) {
        const cp: BloodlineDropCheckpoint = {
          _cursor:              done,           // scanning complete; full array in _partial_candidates
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
        console.log(`[research-drop-bloodline] ${jobId} budget hit in staging at candidate ${stagingIdx + 1}/${candidates.length} — checkpointed and requeued`)
        return
      }
    }

    // ── Step 8: Finalize ──────────────────────────────────────────────────────
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
        windows_processed: total,
        windows_failed:    windowsFailed,
        truncated,
        hard_cap_hit:      idealWindows > BL_HARD_CAP,
        completeness:      bestCompleteness,
        skipped,
      },
    }).eq('id', jobId)

    console.log(`[research-drop-bloodline] ${jobId} complete: ${inserted} candidates staged, ${skipped} skipped, ${total} windows (${windowsFailed} failed)`)

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
