import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

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
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  const ok = await isMinisterToken(token)
  if (!ok) return new Response(JSON.stringify({ error: 'Minister role required' }), { status: 403, headers: HEADERS })

  let body: any = {}
  try { body = await req.json() } catch {}
  const { dryRun } = body

  const { data: rows, error } = await sb()
    .from('push_subscriptions')
    .select('user_id, subscription, endpoint')
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })

  const total = rows?.length || 0

  if (dryRun || !total) {
    return new Response(JSON.stringify({ sent: 0, failed: 0, total, errors: [], dryRun: true }), { status: 200, headers: HEADERS })
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    return new Response(JSON.stringify({ error: 'VAPID keys not configured', total }), { status: 500, headers: HEADERS })
  }

  const vapidPub = vapidPublicKey
  const vapidPriv = vapidPrivateKey
  console.log('[test-push] vapid:', {
    publicKeyLoaded: !!vapidPub,
    privateKeyLoaded: !!vapidPriv,
    publicKeyPrefix: vapidPub ? vapidPub.slice(0, 8) + '…' : 'MISSING',
  })
  webpush.setVapidDetails(
    `mailto:${vapidEmail || 'exorcist@warroomintel.com'}`,
    vapidPub!,
    vapidPriv!,
  )

  const payload = JSON.stringify({
    title: 'War Room Intel — Test',
    body: 'Push notifications are working correctly.',
    url: '/community',
  })

  const client = sb()
  let sent = 0, failed = 0
  const errorDetails: any[] = []

  await Promise.allSettled(
    rows!.map(async (row) => {
      // Safely parse subscription whether stored as string or object
      const pushSub: webpush.PushSubscription =
        typeof row.subscription === 'string'
          ? JSON.parse(row.subscription)
          : row.subscription as webpush.PushSubscription

      const endpoint = (row.endpoint as string) || pushSub.endpoint
      let endpointHost = '?'
      try { endpointHost = new URL(endpoint).host } catch {}

      try {
        await webpush.sendNotification(pushSub, payload)
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
        console.error('[test-push] Failed:', detail)
        errorDetails.push(detail)

        if ((err.statusCode === 404 || err.statusCode === 410) && endpoint) {
          await client.from('push_subscriptions').delete().eq('endpoint', endpoint)
          console.log('[test-push] Deleted expired subscription:', endpoint.slice(-40))
        }
      }
    })
  )

  console.log(`[test-push] sent=${sent} failed=${failed} total=${total}`)
  return new Response(JSON.stringify({ sent, failed, total, errors: errorDetails }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/test-push' }
