import { createClient } from '@supabase/supabase-js'

const CLERK_SECRET = process.env.CLERK_SECRET_KEY!
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!
const BUCKET       = process.env.SUPABASE_BUCKET || 'resources'

async function resolveUser(token: string): Promise<{ userId: string; userData: any } | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      console.error('Token is not a JWT — parts:', parts.length)
      return null
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    console.log('JWT payload sub:', payload.sub)
    console.log('JWT payload azp:', payload.azp)

    const userId = payload.sub
    if (!userId) {
      console.error('No sub in JWT payload')
      return null
    }

    const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${CLERK_SECRET}` },
    })
    console.log('User fetch status:', userRes.status)
    if (!userRes.ok) return null
    const userData = await userRes.json()
    console.log('publicMetadata:', JSON.stringify(userData?.public_metadata))
    return { userId, userData }
  } catch (e) {
    console.error('resolveUser error:', e)
    return null
  }
}

export default async function handler(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const auth = await resolveUser(token)
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized — invalid session' }), { status: 401 })
  if (auth.userData?.public_metadata?.role !== 'minister') {
    return new Response(JSON.stringify({
      error: 'Forbidden — minister role required',
      debug: { userId: auth.userId, role: auth.userData?.public_metadata?.role, allMetadata: auth.userData?.public_metadata },
    }), { status: 403 })
  }
  const { userId } = auth

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    return new Response(JSON.stringify({ resources: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (req.method === 'PATCH') {
    let body: any
    try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }) }
    const { id, title, tier, topic, notes, tags, spirit_tags } = body || {}
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 })

    const updates: Record<string, any> = {}
    if (title      !== undefined) updates.title      = title
    if (tier       !== undefined) updates.tier        = tier
    if (topic      !== undefined) updates.topic       = topic
    if (notes      !== undefined) updates.notes       = notes
    if (tags       !== undefined) updates.tags        = Array.isArray(tags) ? tags : []
    if (spirit_tags !== undefined) updates.spirit_tags = Array.isArray(spirit_tags) ? spirit_tags : []

    const { data: row, error } = await supabase
      .from('resources')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    return new Response(JSON.stringify({ resource: row }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url)
    const id  = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 })

    // Get file path before deleting row
    const { data: row, error: fetchErr } = await supabase
      .from('resources')
      .select('file_path')
      .eq('id', id)
      .single()

    if (fetchErr || !row) return new Response(JSON.stringify({ error: 'Resource not found' }), { status: 404 })

    // Delete from storage
    await supabase.storage.from(BUCKET).remove([row.file_path])

    // Delete row
    const { error: deleteErr } = await supabase.from('resources').delete().eq('id', id)
    if (deleteErr) return new Response(JSON.stringify({ error: deleteErr.message }), { status: 500 })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/admin-resources' }
