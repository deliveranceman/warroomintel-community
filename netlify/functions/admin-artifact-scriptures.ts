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
      .from('artifact_scriptures')
      .select('id, artifact_id, reference, application, sort_order, created_at')
      .eq('artifact_id', artifactId)
      .order('sort_order', { ascending: true })

    if (error) return json({ error: error.message }, 500)
    return json({ scriptures: data ?? [] })
  }

  if (req.method === 'POST') {
    let body: Record<string, unknown>
    try { body = await req.json() } catch { return json({ error: 'invalid_json' }, 400) }

    if (body.action === 'delete') {
      const id = typeof body.id === 'string' ? body.id.trim() : ''
      if (!id) return json({ error: 'id required' }, 400)
      const { error } = await client.from('artifact_scriptures').delete().eq('id', id)
      if (error) return json({ error: error.message }, 500)
      return json({ deleted: true })
    }

    if (body.action === 'update') {
      const id = typeof body.id === 'string' ? body.id.trim() : ''
      if (!id) return json({ error: 'id required' }, 400)
      const upd: Record<string, any> = {}
      if (typeof body.reference   === 'string') upd.reference   = body.reference.trim()
      if (typeof body.application === 'string') upd.application = body.application.trim() || null
      if (typeof body.sortOrder   === 'number') upd.sort_order  = body.sortOrder
      const { data, error } = await client.from('artifact_scriptures').update(upd).eq('id', id).select().single()
      if (error) return json({ error: error.message }, 500)
      return json({ scripture: data })
    }

    // create
    const artifactId = typeof body.artifactId === 'string' ? body.artifactId.trim() : ''
    const reference  = typeof body.reference  === 'string' ? body.reference.trim()  : ''
    if (!artifactId) return json({ error: 'artifactId required' }, 400)
    if (!reference)  return json({ error: 'reference required' }, 400)

    const row = {
      artifact_id: artifactId,
      reference,
      application: typeof body.application === 'string' ? body.application.trim() || null : null,
      sort_order:  typeof body.sortOrder   === 'number' ? body.sortOrder : 100,
    }

    const { data, error } = await client
      .from('artifact_scriptures')
      .insert(row)
      .select()
      .single()

    if (error) return json({ error: error.message }, 500)
    return json({ scripture: data }, 201)
  }

  return json({ error: 'method_not_allowed' }, 405)
}

export const config = { path: '/api/admin-artifact-scriptures' }
