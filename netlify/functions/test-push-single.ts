import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { requireAuth } from './_shared/access'

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
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth
  const userId = auth.userId

  if (!vapidPublicKey || !vapidPrivateKey) {
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
    `mailto:${vapidEmail || 'exorcist@warroomintel.com'}`,
    vapidPublicKey,
    vapidPrivateKey,
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
