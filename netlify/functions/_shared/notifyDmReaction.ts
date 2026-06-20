import crypto from 'crypto'
import { sendWebPushToUser } from './sendWebPush'

// ── Stream helpers (local — cannot import from stream-messages.mts) ──────────

const { apiKey, apiSecret } = JSON.parse(process.env.STREAM || '{}')

function streamJWT(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body   = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig    = crypto.createHmac('sha256', apiSecret ?? '').update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

const serverToken = () => streamJWT({ server: true })

async function streamFetch(
  path: string,
  method: 'GET' | 'POST',
  token: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const sep = path.includes('?') ? '&' : '?'
  const url = `https://chat.stream-io-api.com${path}${sep}api_key=${apiKey}`
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: token, 'stream-auth-type': 'jwt' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let data: unknown
  try { data = await res.json() } catch { data = await res.text() }
  return { status: res.status, data }
}

// ── Supabase REST helpers ────────────────────────────────────────────────────

const { url: supabaseUrl, serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')

const sbH = () => ({
  apikey: serviceRoleKey as string,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
})

// ── Public interface ─────────────────────────────────────────────────────────

export interface NotifyDmReactionArgs {
  senderUserId: string
  recipientUserId: string
  channelId: string
  reactionType: string
  reactionLabel: string
  senderDisplayName: string
}

/**
 * Fires a push notification when a DM reaction is added.
 * Runs four ordered checks; each must pass before push fires:
 *   1. Recipient ≠ sender
 *   2. Presence: skip if recipient is online (Stream member query)
 *   3. 60s debounce per (sender, recipient, channel) via dm_reaction_push_log
 *   4. Fire push with sender+label title
 */
export async function notifyDmReaction(args: NotifyDmReactionArgs): Promise<void> {
  const { senderUserId, recipientUserId, channelId, reactionLabel, senderDisplayName } = args

  // Rule 1 — never push to yourself
  if (recipientUserId === senderUserId) return

  // Rule 2 — presence: if recipient is online in this channel suppress the push.
  // active_thread_id is not server-tracked; online flag is the closest available signal.
  try {
    const { status, data } = await streamFetch(
      `/channels/messaging/${encodeURIComponent(channelId)}/query`,
      'POST',
      serverToken(),
      { state: true, watch: false, presence: false },
    )
    if (status >= 200 && status < 300) {
      const members: any[] = (data as any).members ?? []
      const recipient = members.find(
        (m: any) => (m.user?.id ?? m.user_id) === recipientUserId,
      )
      if (recipient?.user?.online === true) return
    }
  } catch {}

  // Rule 3 — 60s debounce via dm_reaction_push_log
  const h = sbH()
  const qs = [
    `sender_user_id=eq.${encodeURIComponent(senderUserId)}`,
    `recipient_user_id=eq.${encodeURIComponent(recipientUserId)}`,
    `channel_id=eq.${encodeURIComponent(channelId)}`,
    'select=id,last_push_at',
  ].join('&')
  const logRes = await fetch(`${supabaseUrl}/rest/v1/dm_reaction_push_log?${qs}`, { headers: h })
  const logRows: any[] = await logRes.json().catch(() => [])

  if (Array.isArray(logRows) && logRows.length > 0) {
    const lastPush = new Date(logRows[0].last_push_at).getTime()
    if (Date.now() - lastPush < 60_000) return // within debounce window, skip

    // Outside window — update timestamp
    await fetch(
      `${supabaseUrl}/rest/v1/dm_reaction_push_log?id=eq.${encodeURIComponent(logRows[0].id)}`,
      { method: 'PATCH', headers: h, body: JSON.stringify({ last_push_at: new Date().toISOString() }) },
    ).catch(() => {})
  } else {
    // First reaction from this sender to this recipient in this channel
    await fetch(`${supabaseUrl}/rest/v1/dm_reaction_push_log`, {
      method: 'POST',
      headers: { ...h, Prefer: 'return=minimal' },
      body: JSON.stringify({
        sender_user_id: senderUserId,
        recipient_user_id: recipientUserId,
        channel_id: channelId,
        last_push_at: new Date().toISOString(),
      }),
    }).catch(() => {})
  }

  // Rule 4 — fire push
  const siteUrl = (process.env.URL || 'https://warroomintel.com').replace(/\/$/, '')
  await sendWebPushToUser(
    recipientUserId,
    `${senderDisplayName} reacted with ${reactionLabel}`,
    '',
    { url: `${siteUrl}/community?dmChannel=${encodeURIComponent(channelId)}`, channelId, type: 'dm_reaction' },
  )
}
