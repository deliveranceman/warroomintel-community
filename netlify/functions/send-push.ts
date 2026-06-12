import { createClient } from '@supabase/supabase-js'
import { sendWebPushToUser } from './_shared/sendWebPush.js'
import { requireAuth } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')
const _vapidJson = JSON.parse(process.env.VAPID || '{}')
const vapidPublicKey  = process.env.VAPID_PUBLIC_KEY  || _vapidJson.publicKey  || ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || _vapidJson.privateKey || ''

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}


export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: HEADERS })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
  }

  // Auth: x-internal-key (machine callers), Supabase service key (test-atmosphere-push), or verified Clerk JWT
  const receivedKey  = req.headers.get('x-internal-key') || req.headers.get('x-api-key') || ''
  const validKey     = process.env.INTERNAL_API_KEY || ''
  const authHeader   = req.headers.get('Authorization') || ''
  const token        = authHeader.replace('Bearer ', '').trim()
  const isServiceKey = !!(supabaseServiceKey && token === supabaseServiceKey)

  if (!(validKey && receivedKey === validKey) && !isServiceKey) {
    const auth = await requireAuth(req)
    if (auth instanceof Response) return auth
  }

  // Parse request body
  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS })
  }

  const { title, body: msgBody, url, userId, type: notifType, target: notifTarget } = body || {}

  if (!title) {
    return new Response(JSON.stringify({ error: 'title is required' }), { status: 400, headers: HEADERS })
  }

  console.log('[send-push] Request:', { title, userId: userId || 'all', url })

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('[send-push] VAPID keys not configured')
    return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), { status: 500, headers: HEADERS })
  }

  // Send push via shared VAPID helper (no self-call loopback)
  const pushResult = await sendWebPushToUser(
    userId,
    title,
    msgBody || 'New activity in the War Room',
    url ? { url } : undefined,
  )
  console.log('[send-push] Done:', { sent: pushResult.sent, failed: pushResult.failed, total: pushResult.total })

  // Record in-app notifications
  if (pushResult.total > 0) {
    try {
      const client = sb()
      await client.from('user_notifications').insert(
        [{ user_id: userId, title, body: msgBody || null, url: url || '/community', type: notifType || 'system', ...(notifTarget ? { target: notifTarget } : {}) }]
      )
    } catch (e: any) {
      console.warn('[send-push] user_notifications insert failed:', e.message)
    }
  }

  return new Response(JSON.stringify(pushResult), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/send-push' }
