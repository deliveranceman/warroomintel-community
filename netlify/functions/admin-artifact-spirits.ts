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
      .from('artifact_spirits')
      .select('id, artifact_id, spirit_id, relevance, notes, confidence, created_at, spirits(id, name, aka, hierarchy_category)')
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
      const { error } = await client.from('artifact_spirits').delete().eq('id', id)
      if (error) return json({ error: error.message }, 500)
      return json({ deleted: true })
    }

    const artifactId = typeof body.artifactId === 'string' ? body.artifactId.trim() : ''
    const spiritId   = typeof body.spiritId   === 'string' ? body.spiritId.trim()   : ''
    if (!artifactId || !spiritId) return json({ error: 'artifactId and spiritId required' }, 400)

    const conf = typeof body.confidence === 'number' ? body.confidence : 5
    const row = {
      artifact_id: artifactId,
      spirit_id:   spiritId,
      relevance:   typeof body.relevance === 'string' ? body.relevance.trim() || null : null,
      notes:       typeof body.notes     === 'string' ? body.notes.trim()     || null : null,
      confidence:  Math.min(5, Math.max(1, conf)),
    }

    const { data, error } = await client
      .from('artifact_spirits')
      .insert(row)
      .select('id, artifact_id, spirit_id, relevance, notes, confidence, created_at, spirits(id, name, aka, hierarchy_category)')
      .single()

    if (error) return json({ error: error.message }, 500)
    return json({ link: data }, 201)
  }

  return json({ error: 'method_not_allowed' }, 405)
}

export const config = { path: '/api/admin-artifact-spirits' }
