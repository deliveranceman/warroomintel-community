import { createClient } from '@supabase/supabase-js'

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

async function isMinisterToken(token: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return false
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return false
    const data = await res.json()
    return data?.public_metadata?.role === 'minister'
  } catch { return false }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  const ok = await isMinisterToken(token)
  if (!ok) return new Response(JSON.stringify({ error: 'Minister role required' }), { status: 403, headers: HEADERS })

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
