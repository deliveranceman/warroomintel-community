import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'
import { createArtifact, updateArtifact, mapArtifactRow } from './_shared/artifactWrite'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
function sb() { return createClient(sbUrl, sbKey) }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

const LIST_COLS = 'id,slug,name,artifact_type,status,classification,intelligence_only,caution_level,published,compiled_by,created_at,updated_at,subject_image_url'
const FULL_COLS = `${LIST_COLS},aliases,summary,body,caution_note,first_appearance,origin,og_image_url,details,created_by,sources_count,share_count`

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth
  const { userId } = auth

  const client = sb()

  // ── GET — list artifacts or fetch single by id/slug ─────────────────────────
  if (req.method === 'GET') {
    const url   = new URL(req.url)
    const id    = url.searchParams.get('id')
    const slug  = url.searchParams.get('slug')

    // Single artifact fetch
    if (id || slug) {
      const q = client.from('artifacts').select(FULL_COLS)
      const { data, error } = id ? await q.eq('id', id).single() : await q.eq('slug', slug!).single()
      if (error || !data) return json({ error: error?.message || 'Not found' }, 404)
      return json({ artifact: mapArtifactRow(data) })
    }

    // List with optional filters
    const type      = url.searchParams.get('type') || ''
    const published = url.searchParams.get('published')
    const search    = (url.searchParams.get('search') || '').trim()
    const limit     = Math.min(200, parseInt(url.searchParams.get('limit') || '100', 10))
    const offset    = parseInt(url.searchParams.get('offset') || '0', 10)

    let q = client.from('artifacts').select(LIST_COLS, { count: 'exact' })
    if (type)               q = q.eq('artifact_type', type)
    if (published === '1')  q = q.eq('published', true)
    if (published === '0')  q = q.eq('published', false)
    if (search)             q = q.ilike('name', `%${search}%`)

    const { data, error, count } = await q
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) return json({ error: error.message }, 500)
    return json({ artifacts: (data ?? []).map(mapArtifactRow), total: count ?? 0 })
  }

  // ── POST — create / update / delete ─────────────────────────────────────────
  if (req.method === 'POST') {
    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return json({ error: 'invalid_json' }, 400)
    }

    const action = typeof body.action === 'string' ? body.action : 'save'

    // ── delete ───────────────────────────────────────────────────────────────
    if (action === 'delete') {
      const id = typeof body.id === 'string' ? body.id.trim() : ''
      if (!id) return json({ error: 'id required' }, 400)
      const { error } = await client.from('artifacts').delete().eq('id', id)
      if (error) return json({ error: error.message }, 500)
      return json({ deleted: true, id })
    }

    // ── create ───────────────────────────────────────────────────────────────
    if (action === 'create') {
      const { record, error, embedWarning } = await createArtifact(client, body as Record<string, any>, userId)
      if (error) return json({ error }, 400)
      return json({ artifact: record, embedWarning }, 201)
    }

    // ── update (default) ────────────────────────────────────────────────────
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    if (!id) return json({ error: 'id required for update' }, 400)
    const { record, error, embedWarning } = await updateArtifact(client, id, body as Record<string, any>)
    if (error) return json({ error }, 400)
    return json({ artifact: record, embedWarning })
  }

  return json({ error: 'method_not_allowed' }, 405)
}

export const config = { path: '/api/admin-artifacts' }
