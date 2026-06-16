import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'
import { toColumns, insertFieldSnapshots } from './_shared/spiritWrite'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')

function sb() { return createClient(sbUrl, sbKey) }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405)

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth
  const { userId } = auth

  let body: any
  try { body = await req.json() } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  // candidateId: spirit_candidates.id (UUID)
  // targetSlug:  spirits.slug of the existing spirit to merge INTO
  // mergedFields: camelCase field map (winning values, from the modal)
  const { candidateId, targetSlug, mergedFields } = body
  if (!candidateId || !targetSlug || !mergedFields) {
    return json({ error: 'candidateId, targetSlug, and mergedFields required' }, 400)
  }

  const client = sb()

  // ── 1. Fetch the target spirit row ────────────────────────────────────────
  const { data: targetRow, error: targetErr } = await client
    .from('spirits')
    .select('*')
    .eq('slug', targetSlug)
    .single()

  if (targetErr || !targetRow) {
    console.error('[spirit-candidate-merge] target spirit not found:', targetSlug, targetErr?.message)
    return json({ error: `Target spirit not found (slug: ${targetSlug})` }, 404)
  }

  // ── 2. Translate merged fields to snake_case columns ──────────────────────
  const cols = toColumns(mergedFields as Record<string, any>)

  // ── 3. Write per-field snapshots (before state = current targetRow) ───────
  const snapErr = await insertFieldSnapshots(client, targetRow, cols, {
    jobId:     null,
    appliedBy: userId,
    source:    'merge_from_candidate',
  })
  if (snapErr) {
    console.error('[spirit-candidate-merge] snapshot insert failed:', snapErr)
    return json({ error: `Snapshot failed — aborting to protect data: ${snapErr}` }, 500)
  }

  // ── 4. UPDATE the target spirit with merged values ────────────────────────
  const { error: updateErr } = await client
    .from('spirits')
    .update(cols)
    .eq('slug', targetSlug)

  if (updateErr) {
    console.error('[spirit-candidate-merge] spirits update failed:', updateErr.message)
    return json({ error: `Failed to update target spirit: ${updateErr.message}` }, 500)
  }

  // ── 5. Mark candidate as approved (duplicate resolved via merge) ──────────
  const { error: candidateErr } = await client
    .from('spirit_candidates')
    .update({
      status:           'approved',
      duplicate_of:     targetSlug,
      reviewed_at:      new Date().toISOString(),
      reviewed_by:      userId,
      rejection_reason: null,
    })
    .eq('id', candidateId)

  if (candidateErr) {
    console.error('[spirit-candidate-merge] candidate status update failed:', candidateErr.message)
    console.warn('[spirit-candidate-merge] spirit updated but candidate status not updated')
  }

  // ── 6. Fetch candidate name to key the LES update ────────────────────────
  const { data: candidateRow } = await client
    .from('spirit_candidates')
    .select('name')
    .eq('id', candidateId)
    .single()

  // ── 7. Mark related LES rows applied (non-blocking) ──────────────────────
  if (candidateRow?.name) {
    const { error: lesErr } = await client
      .from('library_enrichment_suggestions')
      .update({
        status:             'applied',
        applied_at:         new Date().toISOString(),
        existing_record_id: targetRow.id as string,
      })
      .ilike('spirit_name', candidateRow.name as string)
      .eq('status', 'pending')
    if (lesErr) {
      console.warn('[spirit-candidate-merge] LES update warning (non-blocking):', lesErr.message)
    }
  }

  console.log(
    `[spirit-candidate-merge] candidate ${candidateId} (${candidateRow?.name}) merged into ${targetSlug} (${targetRow.id}) by ${userId}`
  )

  return json({
    success:    true,
    targetSlug,
    targetId:   targetRow.id as string,
    candidateId,
  })
}

export const config = { path: '/api/spirit-candidate-merge-into-existing' }
