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
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body   = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig    = crypto.createHmac('sha256', apiSecret ?? '').update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

const serverToken = () => streamJWT({ server: true })
const userToken   = (userId: string) => streamJWT({ user_id: userId })

function streamHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: token, 'stream-auth-type': 'jwt' }
}

// ── Stream helpers ────────────────────────────────────────────────────────────

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

async function postStreamMessage(channelType: string, channelId: string, text: string): Promise<void> {
  const url = `https://chat.stream-io-api.com/channels/${channelType}/${channelId}/message?api_key=${streamApiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: streamHeaders(userToken(SOL_BOT_ID)),
    body: JSON.stringify({ message: { text } }),
  })

  if (!res.ok) {
    const errText = await res.text()
    if (res.status === 400 && errText.includes('user')) {
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
    throw new Error(`postStreamMessage failed ${res.status}: ${errText}`)
  }
}

// ── Anthropic call ────────────────────────────────────────────────────────────

async function callAnthropic(systemPrompt: string, userMessage: string, maxTokens = 400): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic error ${res.status}: ${err}`)
  }
  const data = await res.json() as { content?: Array<{ type: string; text: string }> }
  const reply = data.content?.find(b => b.type === 'text')?.text ?? ''
  if (!reply) throw new Error('Empty Anthropic response')
  return reply
}

// ── SOL: @-mention reply in war-room-general ──────────────────────────────────

const SOL_SYSTEM_BRIEF = 'You are SOL, the AI intelligence agent of War Room Intel — a spiritual warfare ministry platform. You are brief, direct, and speak with authority. You help deliverance ministers identify spirits, understand manifestations, and pray with precision. Keep responses under 200 words.'

async function solMentionReply(messageText: string, channelType: string, channelId: string): Promise<void> {
  const reply = await callAnthropic(SOL_SYSTEM_BRIEF, messageText, 300)
  await postStreamMessage(channelType, channelId, reply)
  console.log(`[stream-webhook] SOL mention replied channel=${channelId}`)
}

// ── SOL: DM autoreply ─────────────────────────────────────────────────────────

async function solDMReply(messageText: string, channelId: string, senderId: string): Promise<void> {
  const sb = createClient(supabaseUrl, serviceRoleKey)

  const { data: ctxRows } = await sb
    .from('ministry_context')
    .select('context_text')
    .limit(1)
  const ministryContext = ctxRows?.[0]?.context_text ?? ''

  const systemPrompt =
    'You are SOL, the intelligence agent of War Room Intel — a spiritual warfare ministry platform built by Pastor Justin Payne of Staffordtown Church, Copperhill TN. ' +
    'You assist deliverance ministers with identifying spirits, understanding manifestations, legal ground, and strategic prayer. ' +
    'Be concise, authoritative, and spiritually grounded. Keep responses under 300 words. Never break character.' +
    (ministryContext ? `\n\n${ministryContext}` : '')

  const reply = await callAnthropic(systemPrompt, messageText, 400)

  await postStreamMessage('messaging', channelId, reply)

  await sb
    .from('ai_search_history')
    .insert({ user_id: senderId, query: messageText, result: reply, source: 'sol-dm' })
    .catch(err => console.error('[stream-webhook] ai_search_history insert error:', err))

  console.log(`[stream-webhook] SOL DM replied channel=${channelId} user=${senderId}`)
}

// ── Retry wrapper ─────────────────────────────────────────────────────────────

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetch(url, options)
    } catch (e) {
      if (i === retries) throw e
      await new Promise(r => setTimeout(r, 300 * (i + 1)))
      console.log(`[webhook] retry ${i + 1} for ${url.slice(0, 60)}`)
    }
  }
  throw new Error('fetch failed after retries')
}

// ── DM push notification ──────────────────────────────────────────────────────

async function sendDMPush(channelId: string, senderId: string, senderName: string, messageText: string) {
  const { url: supabaseUrl, serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')
  const internalKey = process.env.INTERNAL_API_KEY || 'wri-internal-2026-backfill'
  const sbH = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` }

  const dmRes = await fetchWithRetry(
    `${supabaseUrl}/rest/v1/dm_requests?channel_id=eq.${channelId}&status=eq.accepted&select=requester_id,recipient_id`,
    { headers: sbH },
  )
  const dms = await dmRes.json().catch(() => [])
  console.log('[webhook] dm_requests found:', Array.isArray(dms) ? dms.length : 0, 'for channel:', channelId)

  const dm = Array.isArray(dms) ? dms[0] : null
  if (!dm) { console.log('[webhook] no accepted dm_request for channel:', channelId); return }

  const recipientId = dm.requester_id === senderId ? dm.recipient_id : dm.requester_id
  console.log('[webhook] pushing to:', recipientId)

  const siteUrl = (process.env.URL || 'https://warroomintel.com').replace(/\/$/, '')
  const pushRes = await fetchWithRetry(`${siteUrl}/api/send-push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-key': internalKey },
    body: JSON.stringify({
      userId: recipientId,
      title: `💬 ${senderName}`,
      body: messageText.slice(0, 100),
      data: { type: 'dm_message', channelId, section: 'dms' },
    }),
  })
  const pushData = await pushRes.json().catch(() => ({}))
  console.log('[webhook] push result:', JSON.stringify(pushData))
}

// ── Fire Team push notification ───────────────────────────────────────────────

async function sendFireTeamPush(channelId: string, senderUserId: string, senderName: string, messageText: string): Promise<void> {
  const siteUrl = (process.env.URL || 'https://warroomintel.com').replace(/\/$/, '')

  const ftTeamRes = await fetch(
    `${supabaseUrl}/rest/v1/fire_teams?stream_channel_id=eq.${encodeURIComponent(channelId)}&select=id`,
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
  )
  const teams = await ftTeamRes.json().catch(() => [])
  const teamId = Array.isArray(teams) ? teams[0]?.id : null
  if (!teamId) { console.log('[webhook] no fire_team for channel:', channelId); return }

  const membersRes = await fetch(
    `${supabaseUrl}/rest/v1/fire_team_members?fire_team_id=eq.${encodeURIComponent(teamId)}&status=eq.active&user_id=neq.${encodeURIComponent(senderUserId)}&select=user_id`,
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
  )
  const members = await membersRes.json().catch(() => [])
  console.log('[webhook] fire team push teamId:', teamId, 'members:', Array.isArray(members) ? members.length : 0)

  await Promise.allSettled(
    (Array.isArray(members) ? members : []).map((member: any) =>
      fetch(`${siteUrl}/api/send-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY || '' },
        body: JSON.stringify({
          userId: member.user_id,
          title: `⚔ ${senderName}`,
          body: messageText.slice(0, 100),
          data: { type: 'fire_team_message', channelId, section: 'dms' },
        }),
      }).catch(() => {}),
    ),
  )
  console.log(`[webhook] fire team push done channelId=${channelId}`)
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  console.log('[webhook] received:', req.method, req.url)
  console.log('[webhook] apiSecret set:', !!(apiSecret), 'length:', (apiSecret ?? '').length)

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
  }

  const rawBody = await req.text()
  const signature = req.headers.get('x-signature') ?? ''
  console.log('[webhook] x-signature header present:', !!signature, 'length:', signature.length)

  const expected = crypto.createHmac('sha256', apiSecret ?? '').update(rawBody).digest('hex')
  const sigValid = expected === signature
  console.log('[webhook] signature valid:', sigValid)
  if (!sigValid) {
    // Log but continue — temporary debug mode to confirm events are arriving
    console.warn('[webhook] SIGNATURE MISMATCH — continuing anyway for debug')
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

  console.log('[webhook] event type:', body.type ?? 'unknown', '| keys:', Object.keys(body).join(','))

  const { type } = body

  if (type === 'message.new') {
    const channelId    = body.channel_id ?? ''
    const channelType  = body.channel_type ?? 'messaging'
    const senderUserId = body.user?.id ?? ''
    const messageText  = body.message?.text ?? ''
    console.log('[webhook] message.new channelId:', channelId, 'type:', channelType, 'sender:', senderUserId)

    // Never process sol-bot's own messages (avoid infinite loop)
    if (senderUserId === SOL_BOT_ID) {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: HEADERS })
    }

    if (channelType === 'messaging') {
      const senderName = (body.user as any)?.name || senderUserId

      // Fire Team channel — push all active members
      if (channelId.startsWith('ft-')) {
        await sendFireTeamPush(channelId, senderUserId, senderName, messageText).catch(err =>
          console.error('[stream-webhook] sendFireTeamPush error:', err)
        )
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: HEADERS })
      }

      // Person-to-person DM — push recipient (awaited so Lambda stays alive)
      await sendDMPush(channelId, senderUserId, senderName, messageText).catch(err =>
        console.error('[stream-webhook] sendDMPush error:', err)
      )
      // SOL autoreply only in SOL DM channels (sol-bot is a member)
      if (channelId === 'sol' || channelId.startsWith('sol-')) {
        solDMReply(messageText, channelId, senderUserId).catch(err =>
          console.error('[stream-webhook] solDMReply error:', err)
        )
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: HEADERS })
    }

    // SOL @-mention autoreply in war-room-general (team channels)
    if (channelId === 'war-room-general' && /@sol\b/i.test(messageText)) {
      solMentionReply(messageText, channelType, channelId).catch(err =>
        console.error('[stream-webhook] solMentionReply error:', err)
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
          console.log(`[stream-webhook] push channel=${channelId} sent=${sent} failed=${failed}`)
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
