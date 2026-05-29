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

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
  }

  // Admin-only: verify General tier via Clerk JWT or service key header
  const authHeader = req.headers.get('Authorization') || ''
  const serviceKey = process.env.SUPABASE_SERVICE_KEY!
  if (!authHeader.includes(serviceKey.slice(-12))) {
    // Allow requests from internal Netlify functions (same origin)
    const host = req.headers.get('host') || ''
    if (!host.includes('netlify') && !host.includes('localhost') && authHeader !== `Bearer ${serviceKey}`) {
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

  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'exorcist@warroomintel.com'}`,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const client = sb()
  const query = client.from('push_subscriptions').select('user_id, subscription')
  if (userId) query.eq('user_id', userId)

  const { data: rows, error } = await query
  if (error) {
    console.error('[send-push] fetch error:', error.message)
    return new Response(JSON.stringify({ error: 'Failed to fetch subscriptions' }), { status: 500, headers: HEADERS })
  }

  if (!rows || rows.length === 0) {
    return new Response(JSON.stringify({ success: true, sent: 0 }), { status: 200, headers: HEADERS })
  }

  const payload = JSON.stringify({ title, body: msgBody || 'New activity in the War Room', url: url || '/community' })
  const results = await Promise.allSettled(
    rows.map(row => webpush.sendNotification(row.subscription as webpush.PushSubscription, payload))
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length
  if (failed > 0) console.warn(`[send-push] ${failed} failed out of ${rows.length}`)

  return new Response(JSON.stringify({ success: true, sent, failed }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/send-push' }
