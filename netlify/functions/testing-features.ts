import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

async function resolveUser(token: string): Promise<{ userId: string; name: string; tier: string } | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return null
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.username || 'Anonymous'
    const tier = (data.public_metadata?.tier as string) || 'watchman'
    return { userId, name, tier }
  } catch { return null }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  const user = await resolveUser(token)
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })

  const supabase = sb()

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('feature_requests')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ features: data }), { headers: HEADERS })
  }

  if (req.method === 'POST') {
    let body: any = {}
    try { body = await req.json() } catch {}
    const { title, description, expected_behavior } = body
    if (!title || !description) {
      return new Response(JSON.stringify({ error: 'title and description required' }), { status: 400, headers: HEADERS })
    }
    const { data, error } = await supabase
      .from('feature_requests')
      .insert({
        title, description,
        expected_behavior: expected_behavior || null,
        submitted_by: user.userId,
        submitted_by_name: user.name,
        submitted_by_tier: user.tier,
      })
      .select()
      .single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ feature: data }), { status: 201, headers: HEADERS })
  }

  if (req.method === 'PATCH') {
    // admin: update status / admin_note
    let body: any = {}
    try { body = await req.json() } catch {}
    const { id, status, admin_note } = body
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: HEADERS })
    const update: any = {}
    if (status) update.status = status
    if (admin_note !== undefined) update.admin_note = admin_note
    const { error } = await supabase.from('feature_requests').update(update).eq('id', id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ ok: true }), { headers: HEADERS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
}

export const config = { path: '/api/testing-features' }
