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

async function resolveUserId(token: string): Promise<string | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return null
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return null
    return userId
  } catch { return null }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })

  const userId = await resolveUserId(token)
  if (!userId) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: HEADERS })

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return new Response(JSON.stringify({ error: 'VAPID keys not configured on server' }), { status: 500, headers: HEADERS })
  }

  const { data: row, error } = await sb()
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
  if (!row) return new Response(JSON.stringify({ error: 'No push subscription found for your account. Subscribe first.' }), { status: 404, headers: HEADERS })

  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'exorcist@warroomintel.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )

  try {
    await webpush.sendNotification(row.subscription as webpush.PushSubscription, JSON.stringify({
      title: 'War Room Intel — Test',
      body: 'Your push notifications are working correctly.',
      url: '/community',
    }))
    return new Response(JSON.stringify({ sent: true }), { status: 200, headers: HEADERS })
  } catch (e: any) {
    console.error('[test-push-single] send failed:', e.message)
    return new Response(JSON.stringify({ error: `Send failed: ${e.message}` }), { status: 500, headers: HEADERS })
  }
}

export const config = { path: '/api/test-push-single' }
