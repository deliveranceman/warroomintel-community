import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
function sb() { return createClient(sbUrl, sbKey) }
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

type SourceTable = 'cultural_dossiers' | 'secret_societies' | 'curses' | 'library_chunks'
const VALID_SOURCE_TABLES = new Set<SourceTable>(['cultural_dossiers', 'secret_societies', 'curses', 'library_chunks'])

// Search each source table by name/title for the picker
async function searchSourceTable(client: ReturnType<typeof sb>, table: SourceTable, q: string) {
  const limit = 10
  switch (table) {
    case 'cultural_dossiers': {
      const { data } = await client
        .from('cultural_dossiers')
        .select('id, name')
        .ilike('name', `%${q}%`)
        .limit(limit)
      return (data ?? []).map((r: any) => ({ id: r.id, label: r.name, table }))
    }
    case 'secret_societies': {
      const { data } = await client
        .from('secret_societies')
        .select('id, name')
        .ilike('name', `%${q}%`)
        .limit(limit)
      return (data ?? []).map((r: any) => ({ id: r.id, label: r.name, table }))
    }
    case 'curses': {
      const { data } = await client
        .from('curses')
        .select('id, name')
        .ilike('name', `%${q}%`)
        .limit(limit)
      return (data ?? []).map((r: any) => ({ id: r.id, label: r.name, table }))
    }
    case 'library_chunks': {
      const { data } = await client
        .from('library_chunks')
        .select('id, book_title, chunk_text')
        .ilike('book_title', `%${q}%`)
        .limit(limit)
      return (data ?? []).map((r: any) => ({ id: r.id, label: `${r.book_title} — ${(r.chunk_text || '').slice(0, 80)}`, table }))
    }
    default:
      return []
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const client = sb()
  const url = new URL(req.url)

  // ── GET — list links or search source tables ────────────────────────────────
  if (req.method === 'GET') {
    const artifactId = url.searchParams.get('artifactId')
    const search     = url.searchParams.get('search')?.trim()

    // Search mode — cross-table search for the picker
    if (search) {
      const tables: SourceTable[] = ['cultural_dossiers', 'secret_societies', 'curses', 'library_chunks']
      const results = await Promise.all(tables.map(t => searchSourceTable(client, t, search)))
      return json({ results: results.flat() })
    }

    if (!artifactId) return json({ error: 'artifactId or search required' }, 400)

    const { data, error } = await client
      .from('artifact_extraction_sources')
      .select('id, artifact_id, source_table, source_row_id, relevance, notes, created_at')
      .eq('artifact_id', artifactId)
      .order('created_at', { ascending: true })

    if (error) return json({ error: error.message }, 500)
    return json({ sources: data ?? [] })
  }

  // ── POST — add or remove ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    let body: Record<string, unknown>
    try { body = await req.json() } catch { return json({ error: 'invalid_json' }, 400) }

    if (body.action === 'delete') {
      const id = typeof body.id === 'string' ? body.id.trim() : ''
      if (!id) return json({ error: 'id required' }, 400)
      const { error } = await client.from('artifact_extraction_sources').delete().eq('id', id)
      if (error) return json({ error: error.message }, 500)
      return json({ deleted: true })
    }

    const artifactId  = typeof body.artifactId  === 'string' ? body.artifactId.trim()  : ''
    const sourceTable = typeof body.sourceTable  === 'string' ? body.sourceTable.trim() : ''
    const sourceRowId = typeof body.sourceRowId  === 'string' ? body.sourceRowId.trim() : ''

    if (!artifactId)  return json({ error: 'artifactId required' }, 400)
    if (!VALID_SOURCE_TABLES.has(sourceTable as SourceTable)) return json({ error: 'invalid source_table' }, 400)
    if (!sourceRowId) return json({ error: 'sourceRowId required' }, 400)

    // Verify source row exists before inserting link
    const verifyTable = sourceTable as SourceTable
    const { data: sourceRow } = await client
      .from(verifyTable)
      .select('id')
      .eq('id', sourceRowId)
      .single()

    if (!sourceRow) return json({ error: `Row ${sourceRowId} not found in ${sourceTable}` }, 404)

    const row = {
      artifact_id:   artifactId,
      source_table:  sourceTable,
      source_row_id: sourceRowId,
      relevance:     typeof body.relevance === 'string' ? body.relevance.trim() || null : null,
      notes:         typeof body.notes     === 'string' ? body.notes.trim()     || null : null,
    }

    const { data, error } = await client
      .from('artifact_extraction_sources')
      .insert(row)
      .select()
      .single()

    if (error) return json({ error: error.message }, 500)
    return json({ source: data }, 201)
  }

  return json({ error: 'method_not_allowed' }, 405)
}

export const config = { path: '/api/admin-artifact-sources' }
