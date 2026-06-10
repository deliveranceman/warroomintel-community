import { createClient } from '@supabase/supabase-js'
import { requireAuth, requireTier } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })

  const client = sb()
  const url = new URL(req.url)

  // ── GET — no auth required ───────────────────────────────────────────────
  if (req.method === 'GET') {
    const postId = url.searchParams.get('postId')
    if (!postId) return new Response(JSON.stringify({ error: 'postId required' }), { status: 400, headers: HEADERS })

    const { data, error } = await client
      .from('forum_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })

    // Voted status for logged-in user (optional auth)
    let myVotes: string[] = []
    if ((data || []).length > 0) {
      const authRes = await requireAuth(req)
      if (!(authRes instanceof Response)) {
        const ids = (data || []).map((c: any) => c.id)
        const { data: votes } = await client
          .from('forum_comment_votes')
          .select('comment_id')
          .eq('user_id', authRes.userId)
          .in('comment_id', ids)
        myVotes = (votes || []).map((v: any) => v.comment_id)
      }
    }

    return new Response(JSON.stringify({ comments: (data || []).map(c => ({ ...c, voted: myVotes.includes(c.id) })) }), { status: 200, headers: HEADERS })
  }

  // Auth required for POST / DELETE — Soldier+ tier
  const auth = await requireTier(req, 1)
  if (auth instanceof Response) return auth

  // ── POST — add comment ───────────────────────────────────────────────────
  if (req.method === 'POST') {
    let body: any
    try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS }) }

    const { postId, body: commentBody } = body
    if (!postId || !commentBody?.trim()) {
      return new Response(JSON.stringify({ error: 'postId and body required' }), { status: 400, headers: HEADERS })
    }

    const { data, error } = await client.from('forum_comments').insert({
      post_id:     postId,
      user_id:     auth.userId,
      author_name: auth.displayName,
      author_tier: auth.tier,
      body:        commentBody.trim().slice(0, 5000),
    }).select().single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })

    // Increment comment_count on post
    void client.rpc('increment_comment_count' as any, { post_id: postId })
    const { data: p } = await client.from('forum_posts').select('comment_count').eq('id', postId).single()
    if (p) await client.from('forum_posts').update({ comment_count: (p.comment_count || 0) + 1 }).eq('id', postId)

    return new Response(JSON.stringify({ comment: { ...data, voted: false } }), { status: 200, headers: HEADERS })
  }

  // ── DELETE ───────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const id = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: HEADERS })

    const { data: existing } = await client.from('forum_comments').select('user_id, post_id').eq('id', id).single()
    if (!existing) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: HEADERS })

    if (existing.user_id !== auth.userId && !auth.isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: HEADERS })
    }

    await client.from('forum_comments').delete().eq('id', id)

    const { data: p } = await client.from('forum_posts').select('comment_count').eq('id', existing.post_id).single()
    if (p) await client.from('forum_posts').update({ comment_count: Math.max(0, (p.comment_count || 1) - 1) }).eq('id', existing.post_id)

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: HEADERS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
}

export const config = { path: '/api/forum-comments' }
