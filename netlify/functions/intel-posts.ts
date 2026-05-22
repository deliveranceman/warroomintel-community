import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
const CLERK_SECRET = process.env.CLERK_SECRET_KEY!

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
  const cors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('intel_posts')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(10)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors })
    return new Response(JSON.stringify({ posts: data }), { status: 200, headers: cors })
  }

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors })
  const auth = await resolveUser(token)
  if (!auth || auth.userData?.public_metadata?.role !== 'minister') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: cors })
  }

  if (req.method === 'POST') {
    const { title, body: postBody, scripture, post_type } = await req.json()
    if (!title || !postBody) return new Response(JSON.stringify({ error: 'title and body required' }), { status: 400, headers: cors })
    const { data, error } = await supabase.from('intel_posts')
      .insert({ title, body: postBody, scripture: scripture || null, post_type: post_type || 'briefing' })
      .select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors })
    return new Response(JSON.stringify({ post: data }), { status: 201, headers: cors })
  }

  if (req.method === 'PATCH') {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: cors })
    const body = await req.json()
    const { data, error } = await supabase
      .from('intel_posts')
      .update({ title: body.title, body: body.body, scripture: body.scripture, post_type: body.post_type })
      .eq('id', id)
      .select()
      .single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors })
    return new Response(JSON.stringify({ post: data }), { status: 200, headers: cors })
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: cors })
    await supabase.from('intel_posts').delete().eq('id', id)
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: cors })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/intel-posts' }
