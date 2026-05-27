import { createClient } from '@supabase/supabase-js'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

async function resolveUserId(token: string): Promise<string | null> {
  try {
    if (!token || token.split('.').length !== 3) return null
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    return payload.sub || null
  } catch { return null }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })

  const userId = await resolveUserId(token)
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })

  let body: any
  try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS }) }

  const { postId } = body
  if (!postId) return new Response(JSON.stringify({ error: 'postId required' }), { status: 400, headers: HEADERS })

  const client = sb()

  // Check existing vote
  const { data: existing } = await client
    .from('forum_votes')
    .select('post_id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .maybeSingle()

  const { data: post } = await client.from('forum_posts').select('upvotes').eq('id', postId).single()
  if (!post) return new Response(JSON.stringify({ error: 'Post not found' }), { status: 404, headers: HEADERS })

  if (existing) {
    // Remove vote
    await client.from('forum_votes').delete().eq('user_id', userId).eq('post_id', postId)
    const newCount = Math.max(0, (post.upvotes || 1) - 1)
    await client.from('forum_posts').update({ upvotes: newCount }).eq('id', postId)
    return new Response(JSON.stringify({ voted: false, upvotes: newCount }), { status: 200, headers: HEADERS })
  } else {
    // Add vote
    await client.from('forum_votes').insert({ user_id: userId, post_id: postId })
    const newCount = (post.upvotes || 0) + 1
    await client.from('forum_posts').update({ upvotes: newCount }).eq('id', postId)
    return new Response(JSON.stringify({ voted: true, upvotes: newCount }), { status: 200, headers: HEADERS })
  }
}

export const config = { path: '/api/forum-vote' }
