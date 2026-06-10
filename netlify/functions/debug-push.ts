import { createClient } from '@supabase/supabase-js'
import { requireAdmin2 } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')
const { publicKey: vapidPublicKey, privateKey: vapidPrivateKey, email: vapidEmail } = JSON.parse(process.env.VAPID || '{}')

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

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const { data: rows, error } = await sb()
    .from('push_subscriptions')
    .select('id, user_id, endpoint, subscription, created_at, updated_at')

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
  }

  const subscriptions = (rows || []).map(row => {
    let sub: any = row.subscription
    if (typeof sub === 'string') {
      try { sub = JSON.parse(sub) } catch { sub = null }
    }
    const hasKeys = !!(sub?.keys?.auth && sub?.keys?.p256dh)
    return {
      id: row.id,
      user_id: row.user_id,
      endpoint: row.endpoint ? (row.endpoint as string).slice(0, 50) : null,
      hasKeys,
      keyAuthLength: sub?.keys?.auth ? (sub.keys.auth as string).length : 0,
      keyP256dhLength: sub?.keys?.p256dh ? (sub.keys.p256dh as string).length : 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  })

  const vapidPub = vapidPublicKey
  const vapidPriv = vapidPrivateKey

  return new Response(JSON.stringify({
    subscriptionCount: subscriptions.length,
    subscriptions,
    vapidPublicKeySet: !!vapidPub,
    vapidPrivateKeySet: !!vapidPriv,
    vapidPublicKeyPrefix: vapidPub ? vapidPub.slice(0, 12) + '…' : 'NOT SET',
    vapidEmail: vapidEmail || 'NOT SET',
  }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/debug-push' }
