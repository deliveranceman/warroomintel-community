import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
function sb() { return createClient(sbUrl, sbKey) }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// Apply the candidate payload to the real typed table. Returns new row id.
// NEVER touches embedding columns. FK linkage fields left null on curses
// (resolved via the curse edit form post-approval).
async function applyCandidate(
  client: ReturnType<typeof sb>,
  targetTable: string,
  payload: Record<string, any>,
  sourceName: string | null,
): Promise<string> {

  if (targetTable === 'curses') {
    const row: Record<string, any> = {}
    if (payload.name)                    row.name                    = payload.name
    if (payload.aka)                     row.aka                     = payload.aka || null
    if (payload.origin_description)      row.origin_description      = payload.origin_description || null
    if (payload.how_it_enters)           row.how_it_enters           = payload.how_it_enters || null
    if (payload.manifestations)          row.manifestations          = payload.manifestations || null
    if (payload.scripture_refs)          row.scripture_refs          = payload.scripture_refs || null
    if (payload.breaking_prayer)         row.breaking_prayer         = payload.breaking_prayer || null
    if (payload.generational_depth_note) row.generational_depth_note = payload.generational_depth_note || null
    if (payload.forgiveness_focus)       row.forgiveness_focus       = payload.forgiveness_focus || null
    if (Array.isArray(payload.tagged_items)) row.tagged_items        = payload.tagged_items
    // source_book: prefer candidate source_name (the book title), fall back to payload
    row.source_book   = sourceName ?? payload.source_book ?? null
    row.source_author = payload.source_author ?? null
    row.source_page   = payload.source_page   ?? null
    // cultural_dossier_id / secret_society_id: left null — resolved via curses edit form
    // suggested_cultural_root / suggested_society: NOT columns; not written here
    const { data, error } = await client.from('curses').insert(row).select('id').single()
    if (error) throw new Error(`curses insert: ${error.message}`)
    return (data as any).id as string

  } else if (targetTable === 'cultural_dossiers') {
    const row: Record<string, any> = {}
    const FIELDS = [
      'culture_name', 'description', 'historical_practices', 'religious_influences',
      'folk_magic', 'secret_societies', 'pagan_practices', 'known_oaths', 'known_rituals',
      'source_book', 'source_author', 'source_page',
    ]
    for (const f of FIELDS) row[f] = payload[f] ?? null
    const { data, error } = await client.from('cultural_dossiers').insert(row).select('id').single()
    if (error) throw new Error(`cultural_dossiers insert: ${error.message}`)
    return (data as any).id as string

  } else if (targetTable === 'secret_societies') {
    const row: Record<string, any> = {}
    const FIELDS = [
      'name', 'history', 'known_oaths', 'known_symbols', 'known_degrees',
      'scriptures', 'ministry_considerations', 'source_book', 'source_author', 'source_page',
    ]
    for (const f of FIELDS) row[f] = payload[f] ?? null
    const { data, error } = await client.from('secret_societies').insert(row).select('id').single()
    if (error) throw new Error(`secret_societies insert: ${error.message}`)
    return (data as any).id as string

  } else {
    throw new Error(`unsupported target_table: ${targetTable}`)
  }
}

const VALID_TABLES = new Set(['curses', 'cultural_dossiers', 'secret_societies'])

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const client = sb()

  // ── GET — list pending candidates ──────────────────────────────────────────
  if (req.method === 'GET') {
    const url         = new URL(req.url)
    const targetTable = url.searchParams.get('target_table')

    let query = client
      .from('extraction_candidates')
      .select('id, target_table, confidence, status, source_name, source_id, payload, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (targetTable) query = (query as any).eq('target_table', targetTable)

    const { data, error } = await query
    if (error) return json({ error: error.message }, 500)
    return json({ candidates: data ?? [] })
  }

  // ── POST — approve or reject ────────────────────────────────────────────────
  if (req.method === 'POST') {
    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return json({ error: 'invalid_json' }, 400)
    }

    const action = typeof body.action === 'string' ? body.action : ''
    const id     = typeof body.id     === 'string' ? body.id.trim() : ''
    if (!id) return json({ error: 'id required' }, 400)

    // ── APPROVE ───────────────────────────────────────────────────────────────
    if (action === 'approve') {
      const { data: candidate, error: loadErr } = await client
        .from('extraction_candidates')
        .select('id, target_table, payload, source_name, status')
        .eq('id', id)
        .single()

      if (loadErr || !candidate) return json({ error: 'candidate not found' }, 404)
      if ((candidate as any).status !== 'pending') return json({ error: 'not_pending' }, 409)

      const targetTable = (candidate as any).target_table as string
      if (!VALID_TABLES.has(targetTable)) {
        return json({ error: `unsupported target_table: ${targetTable}` }, 400)
      }

      let appliedRecordId: string
      try {
        appliedRecordId = await applyCandidate(
          client, targetTable,
          (candidate as any).payload as Record<string, any>,
          (candidate as any).source_name as string | null,
        )
      } catch (err: any) {
        return json({ error: err.message }, 500)
      }

      const { error: stampErr } = await client
        .from('extraction_candidates')
        .update({
          status:            'approved',
          applied_record_id: appliedRecordId,
          reviewed_at:       new Date().toISOString(),
          reviewed_by:       auth.userId,
        })
        .eq('id', id)

      if (stampErr) return json({ error: stampErr.message }, 500)
      return json({ ok: true, applied_record_id: appliedRecordId })
    }

    // ── REJECT ────────────────────────────────────────────────────────────────
    if (action === 'reject') {
      const rejectionReason = typeof body.rejection_reason === 'string'
        ? body.rejection_reason.trim() : ''

      const { error: rejectErr } = await client
        .from('extraction_candidates')
        .update({
          status:           'rejected',
          rejection_reason: rejectionReason || null,
          reviewed_at:      new Date().toISOString(),
          reviewed_by:      auth.userId,
        })
        .eq('id', id)

      if (rejectErr) return json({ error: rejectErr.message }, 500)
      return json({ ok: true })
    }

    return json({ error: 'unknown action' }, 400)
  }

  return json({ error: 'method_not_allowed' }, 405)
}

export const config = { path: '/api/admin-extraction-candidates' }
