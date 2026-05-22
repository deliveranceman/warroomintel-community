import { createClient } from '@supabase/supabase-js'

const supabase    = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
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
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

  const auth = await resolveUser(token)
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ feedback: data }), { status: 200, headers })
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const { type, title, description, priority, submitted_by_name, submitted_by_tier } = body
    if (!title || !description || !type) {
      return new Response(JSON.stringify({ error: 'type, title, description required' }), { status: 400, headers })
    }
    const { data, error } = await supabase.from('feedback').insert({
      type, title, description,
      priority: priority || 'medium',
      submitted_by_id:   auth.userId,
      submitted_by_name: submitted_by_name || 'Warrior',
      submitted_by_tier: submitted_by_tier || 'free',
      status: 'open',
    }).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ feedback: data }), { status: 201, headers })
  }

  if (req.method === 'PATCH') {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })
    const role = auth.userData?.public_metadata?.role
    if (role !== 'minister') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })
    const { status, admin_notes } = await req.json()
    const { data, error } = await supabase.from('feedback').update({ status, admin_notes }).eq('id', id).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ feedback: data }), { status: 200, headers })
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })
    const role = auth.userData?.public_metadata?.role
    if (role !== 'minister') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })
    await supabase.from('feedback').delete().eq('id', id)
    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/feedback' }
