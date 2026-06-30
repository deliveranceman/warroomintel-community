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
      .from('artifact_resources')
      .select('id, artifact_id, resource_id, relevance, created_at, resources(id, title, author, topic, file_type)')
      .eq('artifact_id', artifactId)
      .order('created_at', { ascending: true })

    if (error) return json({ error: error.message }, 500)
    return json({ links: data ?? [] })
  }

  if (req.method === 'POST') {
    let body: Record<string, unknown>
    try { body = await req.json() } catch { return json({ error: 'invalid_json' }, 400) }

    if (body.action === 'delete') {
      const id = typeof body.id === 'string' ? body.id.trim() : ''
      if (!id) return json({ error: 'id required' }, 400)
      const { error } = await client.from('artifact_resources').delete().eq('id', id)
      if (error) return json({ error: error.message }, 500)
      return json({ deleted: true })
    }

    const artifactId = typeof body.artifactId === 'string' ? body.artifactId.trim() : ''
    const resourceId = typeof body.resourceId === 'string' ? body.resourceId.trim() : ''
    if (!artifactId || !resourceId) return json({ error: 'artifactId and resourceId required' }, 400)

    // Verify resource exists
    const { data: res } = await client.from('resources').select('id').eq('id', resourceId).single()
    if (!res) return json({ error: 'resource not found' }, 404)

    const row = {
      artifact_id: artifactId,
      resource_id: resourceId,
      relevance:   typeof body.relevance === 'string' ? body.relevance.trim() || null : null,
    }

    const { data, error } = await client
      .from('artifact_resources')
      .insert(row)
      .select('id, artifact_id, resource_id, relevance, created_at, resources(id, title, author, topic, file_type)')
      .single()

    if (error) return json({ error: error.message }, 500)
    return json({ link: data }, 201)
  }

  return json({ error: 'method_not_allowed' }, 405)
}

export const config = { path: '/api/admin-artifact-resources' }
