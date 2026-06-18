import { createClient } from '@supabase/supabase-js'
import { requireAdmin2 } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey, bucket: supabaseBucket } = JSON.parse(process.env.SUPABASE || '{}')

const SUPABASE_URL = supabaseUrl!
const SUPABASE_KEY = supabaseServiceKey!
const BUCKET       = supabaseBucket || 'resources'

export default async function handler(req: Request) {
  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('source_type', 'arsenal')
      .order('created_at', { ascending: false })

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    return new Response(JSON.stringify({ resources: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (req.method === 'PATCH') {
    let body: any
    try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }) }

    // Bulk update — { ids: string[], tier?, topic? }
    if (Array.isArray(body?.ids)) {
      const { ids, tier, topic } = body
      if (!ids.length) return new Response(JSON.stringify({ error: 'ids required' }), { status: 400 })
      const updates: Record<string, any> = {}
      if (tier  !== undefined && tier)  updates.tier  = tier
      if (topic !== undefined && topic) updates.topic = topic
      if (!Object.keys(updates).length) return new Response(JSON.stringify({ error: 'no updates provided' }), { status: 400 })
      const { error } = await supabase.from('resources').update(updates).in('id', ids)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      return new Response(JSON.stringify({ success: true, updated: ids.length }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    // Single update
    const { id, title, tier, topic, notes, tags, spirit_tags, content_tier, access_tier, draft, featured } = body || {}
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 })

    const updates: Record<string, any> = {}
    if (title        !== undefined) updates.title        = title
    if (tier         !== undefined) updates.tier         = tier
    if (topic        !== undefined) updates.topic        = topic
    if (notes        !== undefined) updates.notes        = notes
    if (tags         !== undefined) updates.tags         = Array.isArray(tags) ? tags : []
    if (spirit_tags  !== undefined) updates.spirit_tags  = Array.isArray(spirit_tags) ? spirit_tags : []
    if (content_tier !== undefined) updates.content_tier = content_tier === null ? null : Number(content_tier)
    if (access_tier  !== undefined) updates.access_tier  = access_tier
    if (draft        !== undefined) updates.draft        = draft === true || draft === 'true'
    if (featured     !== undefined) updates.featured     = featured === true || featured === 'true'

    const { data: row, error } = await supabase
      .from('resources')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    return new Response(JSON.stringify({ resource: row }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url)
    const idsParam = url.searchParams.get('ids')
    const id       = url.searchParams.get('id')

    // Bulk delete — ?ids=id1,id2,id3
    if (idsParam) {
      const ids = idsParam.split(',').filter(Boolean)
      if (!ids.length) return new Response(JSON.stringify({ error: 'ids required' }), { status: 400 })
      const { data: rows } = await supabase.from('resources').select('file_path').in('id', ids)
      const paths = (rows || []).map((r: any) => r.file_path).filter(Boolean)
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
      const { error } = await supabase.from('resources').delete().in('id', ids)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      return new Response(JSON.stringify({ success: true, deleted: ids.length }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    // Single delete
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 })

    const { data: row, error: fetchErr } = await supabase
      .from('resources')
      .select('file_path')
      .eq('id', id)
      .single()

    if (fetchErr || !row) return new Response(JSON.stringify({ error: 'Resource not found' }), { status: 404 })

    await supabase.storage.from(BUCKET).remove([row.file_path])

    const { error: deleteErr } = await supabase.from('resources').delete().eq('id', id)
    if (deleteErr) return new Response(JSON.stringify({ error: deleteErr.message }), { status: 500 })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/admin-resources' }
