import crypto from 'crypto'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const { apiKey: streamApiKey, apiSecret } = JSON.parse(process.env.STREAM || '{}')
const { publicKey: vapidPublicKey, privateKey: vapidPrivateKey, email: vapidEmail } = JSON.parse(process.env.VAPID || '{}')
const { url: supabaseUrl, serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? ''

const HEADERS = { 'Content-Type': 'application/json' }
const NOTIFIED_CHANNELS = new Set(['war-room-general', 'commanders-room', 'generals-table'])
const SOL_BOT_ID = 'sol-bot'

webpush.setVapidDetails(`mailto:${vapidEmail}`, vapidPublicKey, vapidPrivateKey)

// ── Stream JWT helpers ────────────────────────────────────────────────────────

function streamJWT(payload: Record<string, unknown>): string {
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body    = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig     = crypto.createHmac('sha256', apiSecret ?? '').update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

const serverToken  = () => streamJWT({ server: true })
const userToken    = (userId: string) => streamJWT({ user_id: userId })

function streamHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: token, 'stream-auth-type': 'jwt' }
}

// Upsert sol-bot in Stream so it can post messages
async function ensureSolBot(): Promise<void> {
  const url = `https://chat.stream-io-api.com/users?api_key=${streamApiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: streamHeaders(serverToken()),
    body: JSON.stringify({ users: { [SOL_BOT_ID]: { id: SOL_BOT_ID, name: 'SOL', role: 'user' } } }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ensureSolBot failed ${res.status}: ${text}`)
  }
}

// Post a message to a Stream channel on behalf of sol-bot
async function postStreamMessage(channelType: string, channelId: string, text: string): Promise<void> {
  const url = `https://chat.stream-io-api.com/channels/${channelType}/${channelId}/message?api_key=${streamApiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: streamHeaders(userToken(SOL_BOT_ID)),
    body: JSON.stringify({ message: { text } }),
  })

  if (!res.ok) {
    const text = await res.text()
    // User not found — create sol-bot then retry once
    if (res.status === 400 && text.includes('user')) {
      await ensureSolBot()
      const retry = await fetch(url, {
        method: 'POST',
        headers: streamHeaders(userToken(SOL_BOT_ID)),
        body: JSON.stringify({ message: { text } }),
      })
      if (!retry.ok) {
        const retryText = await retry.text()
        throw new Error(`postStreamMessage retry failed ${retry.status}: ${retryText}`)
      }
      return
    }
    throw new Error(`postStreamMessage failed ${res.status}: ${text}`)
  }
}

// ── SOL Anthropic reply ───────────────────────────────────────────────────────

async function solReply(messageText: string, channelType: string, channelId: string): Promise<void> {
  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 300,
      system: 'You are SOL, the AI intelligence agent of War Room Intel — a spiritual warfare ministry platform. You are brief, direct, and speak with authority. You help deliverance ministers identify spirits, understand manifestations, and pray with precision. Keep responses under 200 words.',
      messages: [{ role: 'user', content: messageText }],
    }),
  })

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text()
    throw new Error(`Anthropic API error ${anthropicRes.status}: ${err}`)
  }

  const data = await anthropicRes.json() as { content?: Array<{ type: string; text: string }> }
  const reply = data.content?.find(b => b.type === 'text')?.text ?? ''
  if (!reply) throw new Error('Empty Anthropic response')

  await postStreamMessage(channelType, channelId, reply)
  console.log(`[stream-webhook] SOL replied to channel=${channelId}`)
}

// ── Main handler ──────────────────────────────────────────────────────────────

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

  let body: {
    type?: string
    channel_id?: string
    channel_type?: string
    user?: { id?: string }
    message?: { text?: string }
    [key: string]: unknown
  }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS })
  }

  const { type } = body

  if (type === 'message.new') {
    const channelId    = body.channel_id ?? ''
    const channelType  = body.channel_type ?? 'messaging'
    const senderUserId = body.user?.id ?? ''
    const messageText  = body.message?.text ?? ''

    // Never process sol-bot's own messages (avoid infinite loop)
    if (senderUserId === SOL_BOT_ID) {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: HEADERS })
    }

    // SOL @-mention autoreply (war-room-general only)
    if (channelId === 'war-room-general' && /@sol\b/i.test(messageText)) {
      solReply(messageText, channelType, channelId).catch(err =>
        console.error('[stream-webhook] solReply error:', err)
      )
    }

    // Push notifications for community channels
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
    }
  } else if (type === 'user.created') {
    console.log('[stream-webhook] user.created', JSON.stringify(body))
  } else {
    console.log(`[stream-webhook] unhandled type: ${type}`)
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/stream-webhook' }
