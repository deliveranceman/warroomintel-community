import { createClient } from '@supabase/supabase-js'
import { requireAdmin2 } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('intel_posts')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(10)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ posts: data }), { status: 200, headers })
  }

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  if (req.method === 'POST') {
    const { title, body: postBody, scripture, post_type } = await req.json()
    if (!title || !postBody) return new Response(JSON.stringify({ error: 'title and body required' }), { status: 400, headers })
    const { data, error } = await supabase.from('intel_posts')
      .insert({ title, body: postBody, scripture: scripture || null, post_type: post_type || 'briefing' })
      .select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ post: data }), { status: 201, headers })
  }

  if (req.method === 'PATCH') {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })
    const body = await req.json()
    const { data, error } = await supabase
      .from('intel_posts')
      .update({ title: body.title, body: body.body, scripture: body.scripture, post_type: body.post_type })
      .eq('id', id)
      .select()
      .single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ post: data }), { status: 200, headers })
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })
    await supabase.from('intel_posts').delete().eq('id', id)
    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/intel-posts' }
