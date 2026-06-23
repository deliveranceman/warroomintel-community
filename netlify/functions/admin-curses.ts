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
  'aka', 'origin_description', 'how_it_enters', 'manifestations',
  'scripture_refs', 'breaking_prayer',
  'source_book', 'source_author', 'source_page',
] as const

const FK_FIELDS = ['cultural_dossier_id', 'secret_society_id'] as const

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const client = sb()

  // ── GET — list all curses ────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await client
      .from('curses')
      .select('id, name, aka, cultural_dossier_id, secret_society_id, source_book, source_author, created_at, updated_at')
      .order('name', { ascending: true })

    if (error) return json({ error: error.message }, 500)
    return json({ curses: data ?? [] })
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
      const { error } = await client.from('curses').delete().eq('id', id)
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
    for (const f of FK_FIELDS) {
      if (body[f] !== undefined) {
        const val = typeof body[f] === 'string' ? (body[f] as string).trim() : ''
        row[f] = val || null
      }
    }

    const id = typeof body.id === 'string' ? body.id.trim() : ''

    if (id) {
      row.updated_at = new Date().toISOString()
      const { data, error } = await client
        .from('curses')
        .update(row)
        .eq('id', id)
        .select()
        .single()
      if (error) return json({ error: error.message }, 500)
      return json({ curse: data })
    } else {
      const { data, error } = await client
        .from('curses')
        .insert(row)
        .select()
        .single()
      if (error) return json({ error: error.message }, 500)
      return json({ curse: data }, 201)
    }
  }

  return json({ error: 'method_not_allowed' }, 405)
}

export const config = { path: '/api/admin-curses' }
