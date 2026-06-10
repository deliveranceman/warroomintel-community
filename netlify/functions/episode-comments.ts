import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const url = new URL(req.url)
  const episodeId = url.searchParams.get('episodeId')
  const commentId = url.searchParams.get('id')

  // GET comments for episode
  if (req.method === 'GET' && episodeId) {
    const { data: comments } = await supabase
      .from('episode_comments')
      .select('*')
      .eq('episode_id', episodeId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    return new Response(JSON.stringify({ comments: comments || [] }), { status: 200, headers })
  }

  // POST new comment
  if (req.method === 'POST') {
    const { episodeId: eid, body, parentId } = await req.json()
    if (!eid || !body?.trim()) {
      return new Response(JSON.stringify({ error: 'episodeId and body required' }), { status: 400, headers })
    }

    const { data, error } = await supabase
      .from('episode_comments')
      .insert({
        episode_id: eid,
        user_id:    auth.userId,
        user_name:  auth.displayName,
        user_tier:  auth.tier,
        user_image: auth.imageUrl,
        is_founder: false,
        parent_id:  parentId || null,
        body:       body.trim(),
      })
      .select()
      .single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ comment: data }), { status: 201, headers })
  }

  // DELETE comment (owner or admin)
  if (req.method === 'DELETE' && commentId) {
    const { data: comment } = await supabase
      .from('episode_comments')
      .select('user_id')
      .eq('id', commentId)
      .single()

    if (!comment) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers })
    if (comment.user_id !== auth.userId && !auth.isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })
    }

    await supabase
      .from('episode_comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId)

    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
}

export const config = { path: '/api/episode-comments' }
