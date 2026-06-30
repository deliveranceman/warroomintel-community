import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
function sb() { return createClient(sbUrl, sbKey) }
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

const VALID_MEDIA_TYPES = new Set(['youtube', 'vimeo', 'audio', 'image', 'external_link'])

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
      .from('artifact_media')
      .select('id, artifact_id, media_type, url, embed_id, title, caption, caution_note, intelligence_only, sort_order, created_at')
      .eq('artifact_id', artifactId)
      .order('sort_order', { ascending: true })

    if (error) return json({ error: error.message }, 500)
    return json({ media: data ?? [] })
  }

  if (req.method === 'POST') {
    let body: Record<string, unknown>
    try { body = await req.json() } catch { return json({ error: 'invalid_json' }, 400) }

    if (body.action === 'delete') {
      const id = typeof body.id === 'string' ? body.id.trim() : ''
      if (!id) return json({ error: 'id required' }, 400)
      const { error } = await client.from('artifact_media').delete().eq('id', id)
      if (error) return json({ error: error.message }, 500)
      return json({ deleted: true })
    }

    if (body.action === 'update') {
      const id = typeof body.id === 'string' ? body.id.trim() : ''
      if (!id) return json({ error: 'id required' }, 400)
      const upd: Record<string, any> = {}
      if (typeof body.title           === 'string') upd.title            = body.title.trim()       || null
      if (typeof body.caption         === 'string') upd.caption          = body.caption.trim()     || null
      if (typeof body.cautionNote     === 'string') upd.caution_note     = body.cautionNote.trim() || null
      if (typeof body.intelligenceOnly === 'boolean') upd.intelligence_only = body.intelligenceOnly
      if (typeof body.sortOrder       === 'number') upd.sort_order       = body.sortOrder
      const { data, error } = await client.from('artifact_media').update(upd).eq('id', id).select().single()
      if (error) return json({ error: error.message }, 500)
      return json({ media: data })
    }

    const artifactId = typeof body.artifactId === 'string' ? body.artifactId.trim() : ''
    const mediaType  = typeof body.mediaType  === 'string' ? body.mediaType.trim()  : ''
    const url        = typeof body.url        === 'string' ? body.url.trim()        : ''

    if (!artifactId)                      return json({ error: 'artifactId required' }, 400)
    if (!VALID_MEDIA_TYPES.has(mediaType)) return json({ error: 'invalid media_type' }, 400)
    if (!url)                             return json({ error: 'url required' }, 400)

    // Auto-extract YouTube embed_id
    let embedId: string | null = null
    if (mediaType === 'youtube') {
      const m = url.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{11})/)
      embedId = m ? m[1] : null
    }

    const row = {
      artifact_id:       artifactId,
      media_type:        mediaType,
      url,
      embed_id:          embedId,
      title:             typeof body.title           === 'string' ? body.title.trim()       || null : null,
      caption:           typeof body.caption         === 'string' ? body.caption.trim()     || null : null,
      caution_note:      typeof body.cautionNote     === 'string' ? body.cautionNote.trim() || null : null,
      intelligence_only: typeof body.intelligenceOnly === 'boolean' ? body.intelligenceOnly : false,
      sort_order:        typeof body.sortOrder       === 'number' ? body.sortOrder : 100,
    }

    const { data, error } = await client
      .from('artifact_media')
      .insert(row)
      .select()
      .single()

    if (error) return json({ error: error.message }, 500)
    return json({ media: data }, 201)
  }

  return json({ error: 'method_not_allowed' }, 405)
}

export const config = { path: '/api/admin-artifact-media' }
