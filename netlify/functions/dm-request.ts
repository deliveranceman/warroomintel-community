import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_shared/access'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function getSupabase() {
  const { url, serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')
  return createClient(url, serviceRoleKey)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  if (action === 'list-sent') {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('dm_requests')
      .select('id, recipient_id, recipient_name, status, created_at')
      .eq('requester_id', auth.userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[dm-request] list-sent error:', error.message)
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    }
    return new Response(JSON.stringify({ requests: data ?? [] }), { headers: HEADERS })
  }

  if (action === 'cancel') {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })
    }
    const body = await req.json().catch(() => ({}))
    const { id } = body as { id?: string }
    if (!id) {
      return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: HEADERS })
    }

    const supabase = getSupabase()
    const { error } = await supabase
      .from('dm_requests')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('requester_id', auth.userId)

    if (error) {
      console.error('[dm-request] cancel error:', error.message)
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    }
    return new Response(JSON.stringify({ ok: true }), { headers: HEADERS })
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: HEADERS })
}

export const config = { path: '/api/dm-request' }
