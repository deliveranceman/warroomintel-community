import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

function hotScore(post: any): number {
  const ageHours = (Date.now() - new Date(post.created_at).getTime()) / 3600000
  const recencyBoost = ageHours < 168 ? Math.max(0, 1 - ageHours / 168) : 0
  return (post.upvotes * 2 + post.comment_count) + recencyBoost * 20
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })

  const client = sb()
  const url = new URL(req.url)

  // ── GET ─────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const type   = url.searchParams.get('type') || 'all'
    const tag    = url.searchParams.get('tag') || ''
    const sort   = url.searchParams.get('sort') || 'hot'
    const page   = Math.max(0, Number(url.searchParams.get('page')) || 0)
    const limit  = Math.min(Number(url.searchParams.get('limit')) || 20, 50)
    const offset = page * limit

    let query = client.from('forum_posts').select('*', { count: 'exact' })
    if (type !== 'all') query = query.eq('post_type', type) as any
    if (tag)            query = query.contains('tags', [tag]) as any

    if (sort === 'new') {
      query = query.order('pinned', { ascending: false }).order('created_at', { ascending: false })
    } else if (sort === 'top') {
      query = query.order('pinned', { ascending: false }).order('upvotes', { ascending: false })
    } else {
      query = query.order('pinned', { ascending: false }).order('created_at', { ascending: false })
    }

    query = query.range(sort === 'hot' ? 0 : offset, sort === 'hot' ? offset + limit * 5 : offset + limit - 1)

    const { data: rawPosts, count, error } = await query
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })

    let posts = rawPosts || []
    if (sort === 'hot') {
      posts = posts.sort((a: any, b: any) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return hotScore(b) - hotScore(a)
      }).slice(offset, offset + limit)
    }

    // Voted status (optional auth — skip if unauthenticated)
    let myVotes: string[] = []
    if (posts.length > 0) {
      const authRes = await requireAuth(req)
      if (!(authRes instanceof Response)) {
        const postIds = posts.map((p: any) => p.id)
        const { data: votes } = await client
          .from('forum_votes')
          .select('post_id')
          .eq('user_id', authRes.userId)
          .in('post_id', postIds)
        myVotes = (votes || []).map((v: any) => v.post_id)
      }
    }

    const enriched = posts.map((p: any) => ({ ...p, voted: myVotes.includes(p.id) }))

    return new Response(JSON.stringify({
      posts: enriched,
      total: count ?? 0,
      hasMore: (offset + limit) < (count ?? 0),
      page,
    }), { status: 200, headers: HEADERS })
  }

  // Auth required for all mutations
  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  // ── POST ─────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    if (auth.level < 1 && !auth.isAdmin) {
      return new Response(JSON.stringify({ error: 'Soldier+ required to post' }), { status: 403, headers: HEADERS })
    }
    let body: any
    try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS }) }

    const { title, body: postBody, post_type, tags, resource_url, resource_title, resource_thumbnail, resource_description } = body
    if (!title?.trim()) return new Response(JSON.stringify({ error: 'title required' }), { status: 400, headers: HEADERS })

    const validTypes = ['discussion', 'question', 'revelation', 'field_report', 'prayer', 'resource']
    const ptype = validTypes.includes(post_type) ? post_type : 'discussion'

    const row: any = {
      user_id:     auth.userId,
      author_name: auth.displayName,
      author_tier: auth.tier,
      title:       title.trim().slice(0, 200),
      post_type:   ptype,
      tags:        Array.isArray(tags) ? tags.slice(0, 10).map((t: string) => String(t).trim().slice(0, 40)).filter(Boolean) : [],
    }
    if (postBody)             row.body                 = postBody.trim().slice(0, 20000)
    if (resource_url)         row.resource_url         = resource_url.trim().slice(0, 2000)
    if (resource_title)       row.resource_title       = resource_title.trim().slice(0, 200)
    if (resource_thumbnail)   row.resource_thumbnail   = resource_thumbnail.trim().slice(0, 2000)
    if (resource_description) row.resource_description = resource_description.trim().slice(0, 500)

    const { data, error } = await client.from('forum_posts').insert(row).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ post: { ...data, voted: false } }), { status: 200, headers: HEADERS })
  }

  // ── PATCH ─────────────────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    let body: any
    try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS }) }
    const { id, ...fields } = body
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: HEADERS })

    const { data: existing } = await client.from('forum_posts').select('user_id').eq('id', id).single()
    if (!existing) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: HEADERS })

    const isOwner = existing.user_id === auth.userId
    if (!isOwner && !auth.isAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: HEADERS })

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    for (const k of ['title', 'body', 'tags', 'resource_url', 'resource_title', 'resource_thumbnail', 'resource_description']) {
      if (k in fields) updates[k] = fields[k]
    }
    if (auth.isAdmin) {
      if ('pinned'  in fields) updates.pinned  = fields.pinned
      if ('flagged' in fields) updates.flagged = fields.flagged
    }

    const { data, error } = await client.from('forum_posts').update(updates).eq('id', id).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ post: data }), { status: 200, headers: HEADERS })
  }

  // ── DELETE ─────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const id = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: HEADERS })

    const { data: existing } = await client.from('forum_posts').select('user_id').eq('id', id).single()
    if (!existing) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: HEADERS })

    const isOwner = existing.user_id === auth.userId
    if (!isOwner && !auth.isAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: HEADERS })

    const { error } = await client.from('forum_posts').delete().eq('id', id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: HEADERS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
}

export const config = { path: '/api/forum-posts' }
