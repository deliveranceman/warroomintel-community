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

function extractUserId(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return payload.sub || null
  } catch { return null }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  const userId = extractUserId(token)
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })

  const url = new URL(req.url)

  // GET — fetch recent notifications + unread count
  if (req.method === 'GET') {
    const client = sb()
    const { data, error } = await client
      .from('user_notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    const unread = (data || []).filter((n: any) => !n.read).length
    return new Response(JSON.stringify({ notifications: data || [], unread }), { status: 200, headers: HEADERS })
  }

  // PATCH — mark all as read, or single by ?id=
  if (req.method === 'PATCH') {
    const id = url.searchParams.get('id')
    const client = sb()
    const query = client.from('user_notifications').update({ read: true }).eq('user_id', userId)
    if (id) query.eq('id', id)
    const { error } = await query
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: HEADERS })
  }

  // DELETE — soft-delete: ?id=UUID for single, ?all=true for all
  if (req.method === 'DELETE') {
    const id = url.searchParams.get('id')
    const all = url.searchParams.get('all')
    const client = sb()

    if (all === 'true') {
      const { error } = await client
        .from('user_notifications')
        .update({ is_deleted: true })
        .eq('user_id', userId)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: HEADERS })
    }

    if (id) {
      const { error } = await client
        .from('user_notifications')
        .update({ is_deleted: true })
        .eq('id', id)
        .eq('user_id', userId)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: HEADERS })
    }

    return new Response(JSON.stringify({ error: 'id or all=true required' }), { status: 400, headers: HEADERS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
}

export const config = { path: '/api/user-notifications' }
