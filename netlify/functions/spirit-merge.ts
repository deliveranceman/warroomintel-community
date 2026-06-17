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

  const { keepId, deleteId, mergedFields } = body
  if (!keepId || !deleteId || !mergedFields) {
    return json({ error: 'keepId, deleteId, and mergedFields required' }, 400)
  }

  const client = sb()

  // ── 1. Resolve legacy_airtable_id → Supabase UUID ────────────────────────
  const [{ data: keepRow, error: keepErr }, { data: deleteRow, error: delErr }] = await Promise.all([
    client.from('spirits').select('*').eq('id', keepId).single(),
    client.from('spirits').select('id, name').eq('id', deleteId).single(),
  ])

  if (keepErr || !keepRow) {
    console.error('[spirit-merge] keep spirit not found for airtable id:', keepId, keepErr?.message)
    return json({ error: `Keep spirit not found (airtable id: ${keepId})` }, 404)
  }
  if (delErr || !deleteRow) {
    console.error('[spirit-merge] delete spirit not found for airtable id:', deleteId, delErr?.message)
    return json({ error: `Delete spirit not found (airtable id: ${deleteId})` }, 404)
  }

  const keepUUID   = keepRow.id   as string
  const deleteUUID = deleteRow.id as string

  // ── 2. Translate merged fields to snake_case columns ─────────────────────
  const cols = toColumns(mergedFields as Record<string, any>)

  // ── 3. Write per-field snapshots (before state = current keepRow) ─────────
  const snapErr = await insertFieldSnapshots(client, keepRow, cols, {
    jobId:     null,
    appliedBy: userId,
    source:    'merge',
  })
  if (snapErr) {
    console.error('[spirit-merge] snapshot insert failed:', snapErr)
    return json({ error: `Snapshot failed — aborting to protect data: ${snapErr}` }, 500)
  }

  // ── 4. UPDATE the kept spirit with merged values ──────────────────────────
  const { error: updateErr } = await client
    .from('spirits')
    .update(cols)
    .eq('id', keepUUID)

  if (updateErr) {
    console.error('[spirit-merge] spirits update failed:', updateErr.message)
    return json({ error: `Failed to update kept spirit: ${updateErr.message}` }, 500)
  }

  // ── 5. Re-point FK references from deleteUUID → keepUUID ─────────────────

  // spirit_companions.spirit_id — unique (spirit_id, companion_name_raw, kind)
  // Delete conflicting rows on deleteId first, then reparent survivors.
  const { data: keepCompanions } = await client
    .from('spirit_companions')
    .select('companion_name_raw, kind')
    .eq('spirit_id', keepUUID)

  if (keepCompanions && keepCompanions.length > 0) {
    for (const kc of keepCompanions) {
      await client
        .from('spirit_companions')
        .delete()
        .eq('spirit_id', deleteUUID)
        .eq('companion_name_raw', kc.companion_name_raw)
        .eq('kind', kc.kind)
    }
  }
  await client.from('spirit_companions').update({ spirit_id: keepUUID }).eq('spirit_id', deleteUUID)

  // spirit_companions.companion_spirit_id — no unique constraint on this column alone
  await client.from('spirit_companions').update({ companion_spirit_id: keepUUID }).eq('companion_spirit_id', deleteUUID)

  // spirit_hierarchy.child_spirit_id — unique (child_spirit_id, parent_name_raw, relation)
  // Delete conflicting rows on deleteId first, then reparent survivors.
  const { data: keepChildLinks } = await client
    .from('spirit_hierarchy')
    .select('parent_name_raw, relation')
    .eq('child_spirit_id', keepUUID)

  if (keepChildLinks && keepChildLinks.length > 0) {
    for (const kl of keepChildLinks) {
      await client
        .from('spirit_hierarchy')
        .delete()
        .eq('child_spirit_id', deleteUUID)
        .eq('parent_name_raw', kl.parent_name_raw)
        .eq('relation', kl.relation)
    }
  }
  await client.from('spirit_hierarchy').update({ child_spirit_id: keepUUID }).eq('child_spirit_id', deleteUUID)

  // spirit_hierarchy.parent_spirit_id — no unique constraint on this column alone
  await client.from('spirit_hierarchy').update({ parent_spirit_id: keepUUID }).eq('parent_spirit_id', deleteUUID)

  // ── 6. DELETE the duplicate spirit ───────────────────────────────────────
  const { error: deleteErr } = await client
    .from('spirits')
    .delete()
    .eq('id', deleteUUID)

  if (deleteErr) {
    console.error('[spirit-merge] spirits delete failed:', deleteErr.message)
    return json({ error: `Failed to delete duplicate spirit: ${deleteErr.message}` }, 500)
  }

  console.log(`[spirit-merge] merged ${deleteRow.name} (${deleteUUID}) → ${keepRow.name} (${keepUUID}) by ${userId}`)

  return json({ success: true, keepId: keepUUID, deletedId: deleteUUID })
}

export const config = { path: '/api/spirit-merge' }
