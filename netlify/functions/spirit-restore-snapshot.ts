import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'
import { COL_TO_CAMEL } from './_shared/spiritWrite'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')

// Reverse map: camelCase field_name → snake column.
const CAMEL_TO_COL: Record<string, string> = Object.fromEntries(
  Object.entries(COL_TO_CAMEL).map(([col, camel]) => [camel, col])
)

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  let body: any
  try { body = await req.json() } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { snapshotId } = body || {}
  if (!snapshotId) return json({ error: 'snapshotId required' }, 400)

  const client = createClient(sbUrl!, sbKey!)

  const { data: snapshot, error: snapErr } = await client
    .from('spirit_apply_snapshots')
    .select('*')
    .eq('id', snapshotId)
    .single()

  if (snapErr || !snapshot) return json({ error: 'Snapshot not found' }, 404)
  if (snapshot.restored_at) {
    return json({ error: `Already restored at ${snapshot.restored_at}` }, 409)
  }

  const col = CAMEL_TO_COL[snapshot.field_name]
  if (!col) return json({ error: `Unknown field: ${snapshot.field_name}` }, 422)

  const { error: writeErr } = await client
    .from('spirits')
    .update({ [col]: snapshot.prior_value })
    .eq('id', snapshot.spirit_id)

  if (writeErr) {
    console.error('[spirit-restore-snapshot] write failed:', writeErr.message)
    return json({ error: writeErr.message }, 500)
  }

  await client
    .from('spirit_apply_snapshots')
    .update({ restored_at: new Date().toISOString() })
    .eq('id', snapshotId)

  console.log(`[spirit-restore-snapshot] restored "${snapshot.field_name}" on spirit "${snapshot.spirit_id}" by ${auth.userId}`)

  return json({ success: true, restoredField: snapshot.field_name, restoredValue: snapshot.prior_value })
}

export const config = { path: '/api/spirit-restore-snapshot' }
