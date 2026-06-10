import { createClient } from '@supabase/supabase-js'
import { requireTier } from './_shared/access'

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
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  const auth = await requireTier(req, 1)
  if (auth instanceof Response) return auth

  let body: any
  try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS }) }

  const { postId } = body
  if (!postId) return new Response(JSON.stringify({ error: 'postId required' }), { status: 400, headers: HEADERS })

  const client = sb()

  // Check existing vote
  const { data: existing } = await client
    .from('forum_votes')
    .select('post_id')
    .eq('user_id', auth.userId)
    .eq('post_id', postId)
    .maybeSingle()

  const { data: post } = await client.from('forum_posts').select('upvotes').eq('id', postId).single()
  if (!post) return new Response(JSON.stringify({ error: 'Post not found' }), { status: 404, headers: HEADERS })

  if (existing) {
    // Remove vote
    await client.from('forum_votes').delete().eq('user_id', auth.userId).eq('post_id', postId)
    const newCount = Math.max(0, (post.upvotes || 1) - 1)
    await client.from('forum_posts').update({ upvotes: newCount }).eq('id', postId)
    return new Response(JSON.stringify({ voted: false, upvotes: newCount }), { status: 200, headers: HEADERS })
  } else {
    // Add vote
    await client.from('forum_votes').insert({ user_id: auth.userId, post_id: postId })
    const newCount = (post.upvotes || 0) + 1
    await client.from('forum_posts').update({ upvotes: newCount }).eq('id', postId)
    return new Response(JSON.stringify({ voted: true, upvotes: newCount }), { status: 200, headers: HEADERS })
  }
}

export const config = { path: '/api/forum-vote' }
