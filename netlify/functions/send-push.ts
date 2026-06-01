import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
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
  const serviceKey = process.env.SUPABASE_SERVICE_KEY!
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

  // Configure VAPID
  const vapidPub = process.env.VAPID_PUBLIC_KEY
  const vapidPriv = process.env.VAPID_PRIVATE_KEY
  console.log('[send-push] VAPID check:', {
    publicKeySet: !!vapidPub,
    privateKeySet: !!vapidPriv,
    publicKeyLength: vapidPub?.length ?? 0,
    privateKeyLength: vapidPriv?.length ?? 0,
    publicKeyPrefix: vapidPub ? vapidPub.slice(0, 12) + '…' : 'MISSING',
    email: process.env.VAPID_EMAIL || 'NOT SET',
  })

  if (!vapidPub || !vapidPriv) {
    return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), { status: 500, headers: HEADERS })
  }

  try {
    webpush.setVapidDetails(
      "mailto:exorcist@warroomintel.com",
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )
    console.log('[send-push] VAPID configured successfully')
  } catch (err: any) {
    console.error('[send-push] VAPID setup failed:', err.message)
    return new Response(JSON.stringify({ error: 'VAPID config error', detail: err.message }), { status: 500, headers: HEADERS })
  }

  // Fetch subscriptions
  const client = sb()
  let query = client.from('push_subscriptions').select('id, user_id, endpoint, subscription')
  if (userId) query = (query as any).eq('user_id', userId)

  const { data: rows, error: dbErr } = await query
  if (dbErr) {
    console.error('[send-push] DB error:', dbErr.message)
    return new Response(JSON.stringify({ error: 'Failed to fetch subscriptions' }), { status: 500, headers: HEADERS })
  }

  console.log('[send-push] Subscriptions found:', rows?.length ?? 0)

  if (!rows || rows.length === 0) {
    return new Response(JSON.stringify({ sent: 0, failed: 0, total: 0, message: 'No subscriptions found' }), { status: 200, headers: HEADERS })
  }

  const payload = JSON.stringify({
    title,
    body: msgBody || 'New activity in the War Room',
    url: url || '/community',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
  })

  let sent = 0
  let failed = 0
  const errorDetails: any[] = []

  for (const row of rows) {
    // Parse subscription
    let pushSub: webpush.PushSubscription
    try {
      pushSub = typeof row.subscription === 'string'
        ? JSON.parse(row.subscription)
        : row.subscription as webpush.PushSubscription
    } catch (err) {
      console.error('[send-push] Failed to parse subscription for row id:', row.id)
      failed++
      errorDetails.push({ id: row.id, user_id: row.user_id, error: 'Invalid subscription JSON' })
      continue
    }

    const endpoint = (row.endpoint as string) || pushSub.endpoint
    let endpointHost = '?'
    try { endpointHost = new URL(endpoint).host } catch {}

    console.log('[send-push] Sending to:', {
      user_id: row.user_id,
      endpointHost,
      hasAuth: !!pushSub.keys?.auth,
      hasP256dh: !!pushSub.keys?.p256dh,
    })

    try {
      await webpush.sendNotification(pushSub, payload)
      console.log('[send-push] Success:', row.user_id)
      sent++
    } catch (err: any) {
      console.error('[send-push] FULL ERROR:', JSON.stringify(err, null, 2))
      console.error('[send-push] statusCode:', err.statusCode)
      console.error('[send-push] body:', err.body)
      console.error('[send-push] Failed:', {
        user_id: row.user_id,
        statusCode: err.statusCode,
        body: err.body,
        message: err.message,
        endpointHost,
      })

      failed++
      errorDetails.push({
        user_id: row.user_id,
        statusCode: err.statusCode ?? null,
        body: err.body ?? err.message,
        headers: err.headers ?? null,
        endpointHost,
      })

      // Auto-cleanup expired subscriptions
      if ((err.statusCode === 404 || err.statusCode === 410) && endpoint) {
        await client.from('push_subscriptions').delete().eq('endpoint', endpoint)
        console.log('[send-push] Deleted expired subscription:', endpoint.slice(-40))
      }
    }
  }

  // Record in-app notifications
  try {
    const userIds = userId
      ? [userId]
      : [...new Set((rows as any[]).map((r: any) => r.user_id).filter(Boolean))]

    if (userIds.length > 0) {
      await client.from('user_notifications').insert(
        userIds.map((uid: string) => ({ user_id: uid, title, body: msgBody || null, url: url || '/community' }))
      )
    }
  } catch (e: any) {
    console.warn('[send-push] user_notifications insert failed:', e.message)
  }

  const result = { sent, failed, total: rows.length, errors: errorDetails }
  console.log('[send-push] Done:', { sent, failed, total: rows.length })

  return new Response(JSON.stringify(result), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/send-push' }
