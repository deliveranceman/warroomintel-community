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

// Embedding columns (embedding, embedding_source_text, embedding_updated_at) are
// Phase E territory — never touched here.
const TEXT_FIELDS = [
  'history', 'known_oaths', 'known_symbols', 'known_degrees',
  'scriptures', 'ministry_considerations',
  'source_book', 'source_author', 'source_page',
] as const

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const client = sb()

  // ── GET — list all societies ─────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await client
      .from('secret_societies')
      .select('id, name, source_book, source_author, created_at, updated_at')
      .order('name', { ascending: true })

    if (error) return json({ error: error.message }, 500)
    return json({ societies: data ?? [] })
  }

  // ── POST / DELETE — upsert or delete ────────────────────────────────────────
  if (req.method === 'POST' || req.method === 'DELETE') {
    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return json({ error: 'invalid_json' }, 400)
    }

    const action = req.method === 'DELETE'
      ? 'delete'
      : (typeof body.action === 'string' ? body.action : 'upsert')

    // ── DELETE ──────────────────────────────────────────────────────────────────
    if (action === 'delete') {
      const id = typeof body.id === 'string' ? body.id.trim() : ''
      if (!id) return json({ error: 'id required' }, 400)
      const { error } = await client.from('secret_societies').delete().eq('id', id)
      if (error) return json({ error: error.message }, 500)
      return json({ deleted: true, id })
    }

    // ── UPSERT ──────────────────────────────────────────────────────────────────
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return json({ error: 'validation', message: 'name required' }, 400)
    }
    if (name.length > 200) {
      return json({ error: 'validation', message: 'name max 200 chars' }, 400)
    }

    const row: Record<string, unknown> = { name }
    for (const f of TEXT_FIELDS) {
      if (body[f] !== undefined) {
        row[f] = typeof body[f] === 'string' ? (body[f] as string).trim() || null : null
      }
    }

    const id = typeof body.id === 'string' ? body.id.trim() : ''

    if (id) {
      row.updated_at = new Date().toISOString()
      const { data, error } = await client
        .from('secret_societies')
        .update(row)
        .eq('id', id)
        .select()
        .single()
      if (error) return json({ error: error.message }, 500)
      return json({ society: data })
    } else {
      const { data, error } = await client
        .from('secret_societies')
        .insert(row)
        .select()
        .single()
      if (error) return json({ error: error.message }, 500)
      return json({ society: data }, 201)
    }
  }

  return json({ error: 'method_not_allowed' }, 405)
}

export const config = { path: '/api/admin-secret-societies' }
