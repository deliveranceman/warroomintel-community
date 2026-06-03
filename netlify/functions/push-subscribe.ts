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

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })

  if (req.method === 'POST') {
    let body: any
    try { body = await req.json() } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS })
    }

    const { userId, subscription } = body || {}
    if (!userId || !subscription) {
      return new Response(JSON.stringify({ error: 'userId and subscription required' }), { status: 400, headers: HEADERS })
    }

    // Parse if stored as string
    const sub = typeof subscription === 'string' ? JSON.parse(subscription) : subscription
    const endpoint = sub.endpoint
    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Subscription missing endpoint' }), { status: 400, headers: HEADERS })
    }
    if (!sub.keys?.auth || !sub.keys?.p256dh) {
      return new Response(JSON.stringify({ error: 'Subscription missing keys.auth or keys.p256dh — subscription is incomplete' }), { status: 400, headers: HEADERS })
    }

    const { error } = await sb()
      .from('push_subscriptions')
      .upsert(
        { user_id: userId, endpoint, subscription: sub, updated_at: new Date().toISOString() },
        { onConflict: 'endpoint' }
      )

    if (error) {
      console.error('[push-subscribe] upsert error:', error.message)
      return new Response(JSON.stringify({ error: 'Failed to save subscription' }), { status: 500, headers: HEADERS })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: HEADERS })
  }

  if (req.method === 'DELETE') {
    let body: any
    try { body = await req.json() } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS })
    }

    const { userId } = body || {}
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: HEADERS })
    }

    const { error } = await sb()
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.error('[push-subscribe] delete error:', error.message)
      return new Response(JSON.stringify({ error: 'Failed to remove subscription' }), { status: 500, headers: HEADERS })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: HEADERS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
}

export const config = { path: '/api/push-subscribe' }
