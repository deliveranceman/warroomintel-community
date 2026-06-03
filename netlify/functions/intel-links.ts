import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const supabase = createClient(
  supabaseUrl!,
  supabaseServiceKey!
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
  const headers = { 'Content-Type': 'application/json' }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('intel_links')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(10)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ links: data }), { status: 200, headers })
  }

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const auth = await resolveUser(token)
  if (!auth || auth.userData?.public_metadata?.role !== 'minister') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })
  }

  if (req.method === 'POST') {
    const { title, url, note, source, tier_required } = await req.json()
    if (!title || !url) return new Response(JSON.stringify({ error: 'title and url required' }), { status: 400, headers })
    const { data, error } = await supabase.from('intel_links')
      .insert({ title, url, note: note || null, source: source || null, tier_required: tier_required || 'Free' })
      .select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ link: data }), { status: 201, headers })
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })
    await supabase.from('intel_links').update({ active: false }).eq('id', id)
    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/intel-links' }
