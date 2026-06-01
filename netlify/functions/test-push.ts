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
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  const ok = await isMinisterToken(token)
  if (!ok) return new Response(JSON.stringify({ error: 'Minister role required' }), { status: 403, headers: HEADERS })

  let body: any = {}
  try { body = await req.json() } catch {}
  const { dryRun } = body

  const { data: rows, error } = await sb().from('push_subscriptions').select('user_id, subscription')
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })

  const total = rows?.length || 0

  if (dryRun || !total) {
    return new Response(JSON.stringify({ sent: 0, failed: 0, total, errors: [], dryRun: true }), { status: 200, headers: HEADERS })
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return new Response(JSON.stringify({ error: 'VAPID keys not configured', total }), { status: 500, headers: HEADERS })
  }

  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'exorcist@warroomintel.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )

  const payload = JSON.stringify({
    title: 'War Room Intel — Test',
    body: 'Push notifications are working correctly.',
    url: '/community',
  })

  const results = await Promise.allSettled(
    rows!.map(r => webpush.sendNotification(r.subscription as webpush.PushSubscription, payload))
  )

  const errors: string[] = []
  let sent = 0, failed = 0
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      sent++
    } else {
      failed++
      const msg = (r as PromiseRejectedResult).reason?.message || 'unknown'
      errors.push(`${rows![i].user_id}: ${msg}`)
      console.warn('[test-push] failed for', rows![i].user_id, msg)
    }
  })

  console.log(`[test-push] sent=${sent} failed=${failed} total=${total}`)
  return new Response(JSON.stringify({ sent, failed, total, errors }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/test-push' }
