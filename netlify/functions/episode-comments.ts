import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
const CLERK_SECRET = process.env.CLERK_SECRET_KEY!

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

async function resolveUser(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return null
    const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${CLERK_SECRET}` },
    })
    if (!userRes.ok) return null
    const userData = await userRes.json()
    return { userId, userData }
  } catch { return null }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const auth = await resolveUser(token)
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

  const { userId, userData } = auth
  const url = new URL(req.url)
  const episodeId = url.searchParams.get('episodeId')
  const commentId = url.searchParams.get('id')
  const role = userData?.public_metadata?.role
  const userName = `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || 'Warrior'
  const userTier = (userData?.public_metadata?.tier as string || 'free')
  const userImage = userData?.image_url || ''

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
        user_id: userId,
        user_name: userName,
        user_tier: userTier,
        user_image: userImage,
        parent_id: parentId || null,
        body: body.trim(),
      })
      .select()
      .single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ comment: data }), { status: 201, headers })
  }

  // DELETE comment (owner or minister)
  if (req.method === 'DELETE' && commentId) {
    const { data: comment } = await supabase
      .from('episode_comments')
      .select('user_id')
      .eq('id', commentId)
      .single()

    if (!comment) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers })
    if (comment.user_id !== userId && role !== 'minister') {
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
