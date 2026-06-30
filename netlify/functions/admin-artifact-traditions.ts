import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
function sb() { return createClient(sbUrl, sbKey) }
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const client = sb()

  if (req.method === 'GET') {
    const url        = new URL(req.url)
    const artifactId = url.searchParams.get('artifactId')
    if (!artifactId) return json({ error: 'artifactId required' }, 400)

    const { data, error } = await client
      .from('artifact_traditions')
      .select('id, artifact_id, tradition, role, notes, created_at')
      .eq('artifact_id', artifactId)
      .order('tradition', { ascending: true })

    if (error) return json({ error: error.message }, 500)
    return json({ traditions: data ?? [] })
  }

  if (req.method === 'POST') {
    let body: Record<string, unknown>
    try { body = await req.json() } catch { return json({ error: 'invalid_json' }, 400) }

    if (body.action === 'delete') {
      const id = typeof body.id === 'string' ? body.id.trim() : ''
      if (!id) return json({ error: 'id required' }, 400)
      const { error } = await client.from('artifact_traditions').delete().eq('id', id)
      if (error) return json({ error: error.message }, 500)
      return json({ deleted: true })
    }

    if (body.action === 'update') {
      const id = typeof body.id === 'string' ? body.id.trim() : ''
      if (!id) return json({ error: 'id required' }, 400)
      const upd: Record<string, any> = {}
      if (typeof body.tradition === 'string') upd.tradition = body.tradition.trim()
      if (typeof body.role      === 'string') upd.role      = body.role.trim()   || null
      if (typeof body.notes     === 'string') upd.notes     = body.notes.trim()  || null
      const { data, error } = await client.from('artifact_traditions').update(upd).eq('id', id).select().single()
      if (error) return json({ error: error.message }, 500)
      return json({ tradition: data })
    }

    const artifactId = typeof body.artifactId === 'string' ? body.artifactId.trim() : ''
    const tradition  = typeof body.tradition  === 'string' ? body.tradition.trim()  : ''
    if (!artifactId) return json({ error: 'artifactId required' }, 400)
    if (!tradition)  return json({ error: 'tradition required' }, 400)

    const row = {
      artifact_id: artifactId,
      tradition,
      role:  typeof body.role  === 'string' ? body.role.trim()  || null : null,
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
    }

    const { data, error } = await client
      .from('artifact_traditions')
      .insert(row)
      .select()
      .single()

    if (error) return json({ error: error.message }, 500)
    return json({ tradition: data }, 201)
  }

  return json({ error: 'method_not_allowed' }, 405)
}

export const config = { path: '/api/admin-artifact-traditions' }
