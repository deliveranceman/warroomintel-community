import { createClient } from '@supabase/supabase-js'
import { sendWebPushToUser } from './_shared/sendWebPush.js'

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
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: HEADERS })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
  }

  // Auth: accept service key (internal) or Clerk minister JWT
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()
  const serviceKey = supabaseServiceKey!
  const isServiceKey = token === serviceKey
  const host = req.headers.get('host') || ''
  const isInternal = host.includes('netlify') || host.includes('localhost')

  if (!isServiceKey && !isInternal) {
    const minister = await isMinisterToken(token)
    if (!minister) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
    }
  }

  // Parse request body
  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS })
  }

  const { title, body: msgBody, url, userId } = body || {}

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
        [{ user_id: userId, title, body: msgBody || null, url: url || '/community' }]
      )
    } catch (e: any) {
      console.warn('[send-push] user_notifications insert failed:', e.message)
    }
  }

  return new Response(JSON.stringify(pushResult), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/send-push' }
