import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
  }

  // Accept: service key header OR Clerk JWT with minister role
  const authHeader = req.headers.get('Authorization') || ''
  const serviceKey = process.env.SUPABASE_SERVICE_KEY!
  const token = authHeader.replace('Bearer ', '').trim()
  const isServiceKey = token === serviceKey || authHeader.includes(serviceKey.slice(-12))
  const host = req.headers.get('host') || ''
  const isInternal = host.includes('netlify') || host.includes('localhost')

  if (!isServiceKey && !isInternal) {
    const minister = await isMinisterToken(token)
    if (!minister) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
    }
  }

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS })
  }

  const { userId, title, body: msgBody, url } = body || {}

  if (!title) {
    return new Response(JSON.stringify({ error: 'title is required' }), { status: 400, headers: HEADERS })
  }

  const vapidPub = process.env.VAPID_PUBLIC_KEY
  const vapidPriv = process.env.VAPID_PRIVATE_KEY
  console.log('[send-push] vapid:', {
    publicKeyLoaded: !!vapidPub,
    privateKeyLoaded: !!vapidPriv,
    publicKeyPrefix: vapidPub ? vapidPub.slice(0, 8) + '…' : 'MISSING',
  })
  if (!vapidPub || !vapidPriv) {
    return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), { status: 500, headers: HEADERS })
  }
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'exorcist@warroomintel.com'}`,
    vapidPub,
    vapidPriv,
  )

  const client = sb()
  const query = client.from('push_subscriptions').select('user_id, subscription, endpoint')
  if (userId) query.eq('user_id', userId)

  const { data: rows, error } = await query
  if (error) {
    console.error('[send-push] fetch error:', error.message)
    return new Response(JSON.stringify({ error: 'Failed to fetch subscriptions' }), { status: 500, headers: HEADERS })
  }

  if (!rows || rows.length === 0) {
    return new Response(JSON.stringify({ success: true, sent: 0 }), { status: 200, headers: HEADERS })
  }

  const payloadStr = JSON.stringify({ title, body: msgBody || 'New activity in the War Room', url: url || '/community' })

  let sent = 0, failed = 0
  const errorDetails: any[] = []

  await Promise.allSettled(
    rows.map(async (row) => {
      const pushSub: webpush.PushSubscription =
        typeof row.subscription === 'string'
          ? JSON.parse(row.subscription)
          : row.subscription as webpush.PushSubscription

      const endpoint = (row.endpoint as string) || pushSub.endpoint
      let endpointHost = '?'
      try { endpointHost = new URL(endpoint).host } catch {}

      try {
        await webpush.sendNotification(pushSub, payloadStr)
        sent++
      } catch (err: any) {
        failed++
        const detail = {
          user_id:      row.user_id,
          statusCode:   err.statusCode ?? null,
          body:         err.body ?? err.message,
          headers:      err.headers ?? null,
          endpointHost,
        }
        console.error('[send-push] Push failed:', detail)
        errorDetails.push(detail)

        if ((err.statusCode === 404 || err.statusCode === 410) && endpoint) {
          await client.from('push_subscriptions').delete().eq('endpoint', endpoint)
          console.log('[send-push] Deleted expired subscription:', endpoint.slice(-40))
        }
      }
    })
  )

  const firstError = errorDetails[0]?.body ?? null

  // Record in-app notifications for each targeted user
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

  return new Response(JSON.stringify({ success: true, sent, failed, ...(firstError ? { error: firstError } : {}), ...(errorDetails.length ? { errorDetails } : {}) }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/send-push' }
