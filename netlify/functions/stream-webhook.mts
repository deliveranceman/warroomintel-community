import crypto from 'crypto'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const { apiSecret } = JSON.parse(process.env.STREAM || '{}')
const { publicKey: vapidPublicKey, privateKey: vapidPrivateKey, email: vapidEmail } = JSON.parse(process.env.VAPID || '{}')
const { url: supabaseUrl, serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')

const HEADERS = { 'Content-Type': 'application/json' }

const NOTIFIED_CHANNELS = new Set(['war-room-general', 'commanders-room', 'generals-table'])

webpush.setVapidDetails(
  `mailto:${vapidEmail}`,
  vapidPublicKey,
  vapidPrivateKey,
)

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
  }

  const rawBody = await req.text()
  const signature = req.headers.get('x-signature') ?? ''

  const expected = crypto.createHmac('sha256', apiSecret ?? '').update(rawBody).digest('hex')
  if (expected !== signature) {
    console.warn('[stream-webhook] signature mismatch')
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  }

  let body: { type?: string; channel_id?: string; channel_type?: string; user?: { id?: string }; message?: { text?: string }; [key: string]: unknown }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS })
  }

  const { type } = body

  if (type === 'message.new') {
    const channelId    = body.channel_id ?? ''
    const senderUserId = body.user?.id ?? ''
    const messageText  = body.message?.text ?? ''

    if (NOTIFIED_CHANNELS.has(channelId)) {
      try {
        const sb = createClient(supabaseUrl, serviceRoleKey)
        const { data: subs, error } = await sb
          .from('push_subscriptions')
          .select('*')
          .neq('user_id', senderUserId)

        if (error) {
          console.error('[stream-webhook] supabase error:', error.message)
        } else {
          const payload = JSON.stringify({
            title: 'War Room Intel',
            body: messageText.length > 100 ? messageText.slice(0, 100) + '…' : messageText,
          })

          let sent = 0, failed = 0
          await Promise.allSettled(
            (subs ?? []).map(async (row: any) => {
              try {
                await webpush.sendNotification(row.subscription, payload)
                sent++
              } catch (err: any) {
                failed++
                // 410 Gone = subscription expired; clean it up
                if (err.statusCode === 410) {
                  await sb.from('push_subscriptions').delete().eq('id', row.id).catch(() => {})
                }
              }
            })
          )
          console.log(`[stream-webhook] message.new channel=${channelId} sent=${sent} failed=${failed}`)
        }
      } catch (err) {
        console.error('[stream-webhook] push error:', err)
      }
    } else {
      console.log(`[stream-webhook] message.new skipped channel=${channelId}`)
    }
  } else if (type === 'user.created') {
    console.log('[stream-webhook] user.created', JSON.stringify(body))
  } else {
    console.log(`[stream-webhook] unhandled type: ${type}`)
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/stream-webhook' }
