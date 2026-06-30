import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
function sb() { return createClient(sbUrl, sbKey) }
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

const VALID_REL_TYPES = new Set([
  'member_of','founded','influenced_by','influenced','depicts','derived_from',
  'successor_of','predecessor_of','associated_with','authored','featured_in',
  'symbol_of','practice_of','connected_to',
])

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const client = sb()

  // ── GET — list relationships for an artifact ───────────────────────────────
  if (req.method === 'GET') {
    const url        = new URL(req.url)
    const artifactId = url.searchParams.get('artifactId')
    if (!artifactId) return json({ error: 'artifactId required' }, 400)

    const { data, error } = await client
      .from('artifact_relationships')
      .select(`
        id, relationship_type, notes, confidence, created_at,
        from_artifact_id, to_artifact_id,
        from:artifacts!artifact_relationships_from_artifact_id_fkey(id, name, artifact_type, slug),
        to:artifacts!artifact_relationships_to_artifact_id_fkey(id, name, artifact_type, slug)
      `)
      .or(`from_artifact_id.eq.${artifactId},to_artifact_id.eq.${artifactId}`)
      .order('created_at', { ascending: true })

    if (error) return json({ error: error.message }, 500)
    return json({ relationships: data ?? [] })
  }

  // ── POST — add or remove ───────────────────────────────────────────────────
  if (req.method === 'POST') {
    let body: Record<string, unknown>
    try { body = await req.json() } catch { return json({ error: 'invalid_json' }, 400) }

    // delete
    if (body.action === 'delete') {
      const id = typeof body.id === 'string' ? body.id.trim() : ''
      if (!id) return json({ error: 'id required' }, 400)
      const { error } = await client.from('artifact_relationships').delete().eq('id', id)
      if (error) return json({ error: error.message }, 500)
      return json({ deleted: true })
    }

    // create
    const fromId = typeof body.fromArtifactId === 'string' ? body.fromArtifactId.trim() : ''
    const toId   = typeof body.toArtifactId   === 'string' ? body.toArtifactId.trim()   : ''
    const relType = typeof body.relationshipType === 'string' ? body.relationshipType.trim() : ''

    if (!fromId || !toId)     return json({ error: 'fromArtifactId and toArtifactId required' }, 400)
    if (!VALID_REL_TYPES.has(relType)) return json({ error: 'invalid relationship_type' }, 400)
    if (fromId === toId)      return json({ error: 'from and to must be different artifacts' }, 400)

    const conf = typeof body.confidence === 'number' ? body.confidence : 5
    const row = {
      from_artifact_id:  fromId,
      to_artifact_id:    toId,
      relationship_type: relType,
      notes:      typeof body.notes === 'string' ? body.notes.trim() || null : null,
      confidence: Math.min(5, Math.max(1, conf)),
    }

    const { data, error } = await client
      .from('artifact_relationships')
      .insert(row)
      .select()
      .single()

    if (error) return json({ error: error.message }, 500)
    return json({ relationship: data }, 201)
  }

  return json({ error: 'method_not_allowed' }, 405)
}

export const config = { path: '/api/admin-artifact-relationships' }
