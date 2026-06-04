import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const { apiKey, apiSecret } = JSON.parse(process.env.STREAM || '{}')
const { url: supabaseUrl, serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')

// ── Supabase helpers ──────────────────────────────────────────────────────────
const SB = (p: string) => `${supabaseUrl}/rest/v1${p}`
const sbH: Record<string, string> = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

function dmChannelId(userA: string, userB: string): string {
  const sorted = [userA, userB].sort()
  const hash = (s: string) => s.split('').reduce((a, c) => (Math.imul(31, a) + c.charCodeAt(0)) | 0, 0).toString(36).replace('-', 'z')
  return ('dm' + hash(sorted[0]) + hash(sorted[1])).slice(0, 64)
}

async function notifyRecipientOfDmRequest(recipientId: string, requesterName: string): Promise<void> {
  const siteUrl = (process.env.URL || 'https://warroomintel.com').replace(/\/$/, '')

  // Push notification (fire-and-forget — auth via service key)
  fetch(`${siteUrl}/api/send-push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceRoleKey}` },
    body: JSON.stringify({
      title: '💬 New Message Request',
      body: `${requesterName} wants to connect with you`,
      userId: recipientId,
      url: '/community',
    }),
  }).catch(e => console.error('[create-dm] push error:', e))

  // SOL in-app message — upsert sol-bot, ensure channel, post message
  try {
    await streamFetch('/users', 'POST', serverToken(), {
      users: { 'sol-bot': { id: 'sol-bot', name: 'SOL', role: 'user' } },
    })
    const solChanId = dmChannelId(recipientId, 'sol-bot')
    await streamFetch(`/channels/messaging/${solChanId}/query`, 'POST', serverToken(), {
      members: [recipientId, 'sol-bot'].sort(),
      data: { created_by_id: 'sol-bot', is_dm: true },
      state: true, watch: false, presence: false,
    })
    await streamFetch(`/channels/messaging/${solChanId}/message`, 'POST', userToken('sol-bot'), {
      message: { text: `📬 **Message Request** — ${requesterName} wants to connect with you. Open Messages to accept or decline.` },
    })
  } catch (e: any) {
    console.error('[create-dm] SOL notify error:', e.message)
  }
}

async function createStreamChannel(userA: string, userB: string): Promise<{ channelId: string } | { error: string; detail?: unknown }> {
  const channelId = dmChannelId(userA, userB)
  const sorted = [userA, userB].sort()
  const token = serverToken()
  const { status: s1, data: d1 } = await streamFetch(`/channels/messaging/${channelId}/query`, 'POST', token, {
    members: sorted,
    data: { created_by_id: userA, is_dm: true },
    state: true, watch: false, presence: false,
  })
  if (s1 >= 500) return { error: 'Stream query failed', detail: d1 }
  // force-add both members idempotently in case query didn't seat them
  const { status: s2, data: d2 } = await streamFetch(`/channels/messaging/${channelId}`, 'POST', token, {
    add_members: sorted.map(id => ({ user_id: id })),
  })
  if (s2 >= 400) return { error: 'Stream add_members failed', detail: d2 }
  return { channelId }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json' }

// ── JWT helpers ───────────────────────────────────────────────────────────────

function streamJWT(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body   = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig    = crypto.createHmac('sha256', apiSecret ?? '').update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

const serverToken = () => streamJWT({ server: true })
const userToken   = (userId: string) => streamJWT({ user_id: userId })

function streamHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: token,
    'stream-auth-type': 'jwt',
  }
}

// ── Auth: decode Clerk JWT to get userId ──────────────────────────────────────

function extractUserId(authHeader: string | null): string | null {
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return payload.sub ?? null
  } catch {
    return null
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}

function streamUrl(path: string): string {
  const sep = path.includes('?') ? '&' : '?'
  return `https://chat.stream-io-api.com${path}${sep}api_key=${apiKey}`
}

async function streamFetch(
  path: string,
  method: 'GET' | 'POST',
  token: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const res = await fetch(streamUrl(path), {
    method,
    headers: streamHeaders(token),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let data: unknown
  try { data = await res.json() } catch { data = await res.text() }
  return { status: res.status, data }
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function listConversations(userId: string): Promise<Response> {
  console.log('[list-conv] userId:', userId)
  console.log('[list-conv] querying Supabase for accepted DMs...')

  // Supabase is source of truth — query accepted dm_requests for this user
  const dmRes = await fetch(
    SB(`/dm_requests?or=(requester_id.eq.${encodeURIComponent(userId)},recipient_id.eq.${encodeURIComponent(userId)})&status=eq.accepted&channel_id=not.is.null&select=*&order=created_at.desc`),
    { headers: sbH },
  )
  const dmRows: any[] = await dmRes.json().catch(() => [])
  console.log('[list-conv] accepted DMs:', JSON.stringify(dmRows))

  if (!Array.isArray(dmRows) || dmRows.length === 0) {
    return json({ conversations: [] })
  }

  // For each accepted DM, fetch the channel from Stream to get live state
  const conversations: any[] = []
  for (const r of dmRows) {
    if (!r.channel_id) continue
    const { status: cs, data: cd } = await streamFetch(
      `/channels/messaging/${encodeURIComponent(r.channel_id)}/query`,
      'POST',
      serverToken(),
      { messages: { limit: 1 }, state: true, watch: false },
    )
    console.log('[list-conv] channel', r.channel_id, 'stream status:', cs)
    if (cs === 200) {
      const d = cd as any
      const chMembers: any[] = d.members ?? []
      const chMessages: any[] = d.messages ?? []
      const chRead: any[] = d.read ?? []
      const otherM = chMembers.find((m: any) => m.user?.id !== userId)?.user ?? null
      const lastMsg = chMessages[0]
        ? { text: chMessages[0].text ?? '', type: chMessages[0].type ?? 'regular', created_at: chMessages[0].created_at, user: { id: chMessages[0].user?.id ?? '', name: chMessages[0].user?.name ?? '' } }
        : null
      const unread = chRead.find((x: any) => x.user?.id === userId)?.unread_messages ?? 0
      conversations.push({
        channelId: r.channel_id,
        channelType: 'messaging',
        members: chMembers.map((m: any) => ({ id: m.user?.id ?? '', name: m.user?.name ?? '', image: m.user?.image ?? '', online: m.user?.online ?? false })),
        otherMember: otherM ? { id: otherM.id, name: otherM.name ?? '', image: otherM.image ?? '', online: otherM.online ?? false } : null,
        lastMessage: lastMsg,
        unreadCount: unread,
      })
    } else {
      // Stream can't return it — build stub from Supabase so conversation still appears
      const isRequester = r.requester_id === userId
      conversations.push({
        channelId: r.channel_id,
        channelType: 'messaging',
        members: [],
        otherMember: isRequester
          ? { id: r.recipient_id, name: 'Member', image: '', online: false }
          : { id: r.requester_id, name: r.requester_name ?? 'Member', image: '', online: false },
        lastMessage: null,
        unreadCount: 0,
      })
    }
  }

  return json({ conversations })
}

async function getMessages(userId: string, channelId: string): Promise<Response> {
  if (!channelId) return json({ error: 'channelId required' }, 400)

  const { status, data } = await streamFetch(
    `/channels/messaging/${encodeURIComponent(channelId)}/query`,
    'POST',
    userToken(userId),
    { messages: { limit: 50 }, state: true, watch: false },
  )

  if (status !== 200) return json({ error: 'Stream error', detail: data }, status)

  const d = data as any
  return json({
    messages: d.messages ?? [],
    members:  (d.members ?? []).map((m: any) => ({
      id:     m.user?.id ?? '',
      name:   m.user?.name ?? '',
      image:  m.user?.image ?? '',
      online: m.user?.online ?? false,
    })),
  })
}

async function sendMessage(userId: string, body: any): Promise<Response> {
  const { channelId, text, attachments } = body ?? {}
  if (!channelId || !text) return json({ error: 'channelId and text required' }, 400)

  const { status, data } = await streamFetch(
    `/channels/messaging/${encodeURIComponent(channelId)}/message`,
    'POST',
    userToken(userId),
    { message: { text, attachments: attachments ?? [] } },
  )

  if (status !== 200 && status !== 201) return json({ error: 'Stream error', detail: data }, status)
  return json({ ok: true, message: (data as any).message ?? null })
}

async function getStreamToken(userId: string): Promise<Response> {
  const token = userToken(userId)
  // Upsert current user into Stream on every token fetch (idempotent, fire-and-forget)
  fetch(streamUrl('/users'), {
    method: 'POST',
    headers: streamHeaders(serverToken()),
    body: JSON.stringify({
      users: { [userId]: { id: userId, name: userId, role: 'user' } },
    }),
  }).catch(e => console.error('Stream user upsert error:', e))
  return json({ token })
}

async function createDM(userId: string, body: any): Promise<Response> {
  const { otherUserId, otherUserName } = body ?? {}
  if (!otherUserId) return json({ error: 'otherUserId required' }, 400)

  // sol-bot always gets a direct channel — no request flow
  if (otherUserId === 'sol-bot') {
    const result = await createStreamChannel(userId, otherUserId)
    if ('error' in result) return json(result, 500)
    return json({ ok: true, channelId: result.channelId })
  }

  const clerkSecretKey = process.env.CLERK_SECRET_KEY ?? ''

  // Check recipient Clerk tier
  if (clerkSecretKey) {
    const clerkRes = await fetch(`https://api.clerk.com/v1/users/${otherUserId}`, {
      headers: { Authorization: `Bearer ${clerkSecretKey}` },
    })
    if (clerkRes.ok) {
      const clerkUser = await clerkRes.json()
      const tier = (clerkUser.public_metadata?.tier as string) || 'watchman'
      if (tier === 'watchman') {
        return json({ watchman: true, message: `${otherUserName || 'This user'} is on the free tier and cannot receive DMs.` })
      }
    }
  }

  // Check existing outbound request (userId → otherUserId)
  const outRes = await fetch(
    SB(`/dm_requests?requester_id=eq.${encodeURIComponent(userId)}&recipient_id=eq.${encodeURIComponent(otherUserId)}&select=*`),
    { headers: sbH },
  )
  const outRows: any[] = await outRes.json().catch(() => [])
  const existing = Array.isArray(outRows) ? outRows[0] : null

  if (existing) {
    if (existing.status === 'accepted' && existing.channel_id) return json({ ok: true, channelId: existing.channel_id })
    if (existing.status === 'declined') return json({ declined: true, message: 'Your DM request was declined.' })
    return json({ pending: true, message: 'Your DM request is pending acceptance.' })
  }

  // Check reverse direction — they may have sent us a request
  const revRes = await fetch(
    SB(`/dm_requests?requester_id=eq.${encodeURIComponent(otherUserId)}&recipient_id=eq.${encodeURIComponent(userId)}&select=*`),
    { headers: sbH },
  )
  const revRows: any[] = await revRes.json().catch(() => [])
  const reverse = Array.isArray(revRows) ? revRows[0] : null

  if (reverse && reverse.status === 'accepted' && reverse.channel_id) return json({ ok: true, channelId: reverse.channel_id })

  // Get requester info from Clerk
  let myTier = 'soldier'
  let myName = userId
  if (clerkSecretKey) {
    const myRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${clerkSecretKey}` },
    })
    if (myRes.ok) {
      const myUser = await myRes.json()
      myTier = (myUser.public_metadata?.tier as string) || 'soldier'
      myName = [myUser.first_name, myUser.last_name].filter(Boolean).join(' ') || myUser.username || userId
    }
  }

  // Insert pending request
  await fetch(SB('/dm_requests'), {
    method: 'POST',
    headers: sbH,
    body: JSON.stringify({
      requester_id: userId,
      requester_name: myName,
      requester_tier: myTier,
      recipient_id: otherUserId,
      status: 'pending',
    }),
  }).catch(() => {})

  // Notify recipient via push + SOL message (fire-and-forget)
  notifyRecipientOfDmRequest(otherUserId, myName).catch(() => {})

  return json({ pending: true, message: 'DM request sent. Waiting for their acceptance.' })
}

async function acceptDM(userId: string, body: any): Promise<Response> {
  const { requestId } = body ?? {}
  if (!requestId) return json({ error: 'requestId required' }, 400)

  const reqRes = await fetch(
    SB(`/dm_requests?id=eq.${encodeURIComponent(requestId)}&recipient_id=eq.${encodeURIComponent(userId)}&select=*`),
    { headers: sbH },
  )
  const reqRows: any[] = await reqRes.json().catch(() => [])
  const req = Array.isArray(reqRows) ? reqRows[0] : null

  if (!req) return json({ error: 'Request not found' }, 404)
  if (req.status !== 'pending') return json({ error: 'Request already resolved' }, 400)

  const result = await createStreamChannel(userId, req.requester_id)
  console.log('[accept-dm] channel result:', JSON.stringify(result).slice(0, 300))
  if ('error' in result) return json(result, 500)

  await fetch(SB(`/dm_requests?id=eq.${encodeURIComponent(requestId)}`), {
    method: 'PATCH',
    headers: sbH,
    body: JSON.stringify({ status: 'accepted', channel_id: result.channelId }),
  }).catch(() => {})

  // Return requester info so frontend can build the conversation row
  return json({ ok: true, channelId: result.channelId, requesterId: req.requester_id, requesterName: req.requester_name })
}

async function declineDM(userId: string, body: any): Promise<Response> {
  const { requestId } = body ?? {}
  if (!requestId) return json({ error: 'requestId required' }, 400)

  const reqRes = await fetch(
    SB(`/dm_requests?id=eq.${encodeURIComponent(requestId)}&recipient_id=eq.${encodeURIComponent(userId)}&select=id,status`),
    { headers: sbH },
  )
  const reqRows: any[] = await reqRes.json().catch(() => [])
  if (!Array.isArray(reqRows) || !reqRows[0]) return json({ error: 'Request not found' }, 404)

  await fetch(SB(`/dm_requests?id=eq.${encodeURIComponent(requestId)}`), {
    method: 'PATCH',
    headers: sbH,
    body: JSON.stringify({ status: 'declined' }),
  }).catch(() => {})

  return json({ ok: true })
}

async function pendingRequests(userId: string): Promise<Response> {
  const res = await fetch(
    SB(`/dm_requests?recipient_id=eq.${encodeURIComponent(userId)}&status=eq.pending&select=*&order=created_at.desc`),
    { headers: sbH },
  )
  const rows: any[] = await res.json().catch(() => [])
  const requests = Array.isArray(rows) ? rows.map(r => ({
    id: r.id,
    requesterId: r.requester_id,
    requesterName: r.requester_name,
    requesterTier: r.requester_tier,
    createdAt: r.created_at,
  })) : []
  return json({ requests })
}

async function markRead(userId: string, body: any): Promise<Response> {
  const { channelId } = body ?? {}
  if (!channelId) return json({ error: 'channelId required' }, 400)

  const { status, data } = await streamFetch(
    `/channels/messaging/${encodeURIComponent(channelId)}/read`,
    'POST',
    userToken(userId),
  )

  if (status !== 200 && status !== 201) return json({ error: 'Stream error', detail: data }, status)
  return json({ ok: true })
}

async function uploadVoice(userId: string, req: Request): Promise<Response> {
  const formData = await req.formData()
  const file = formData.get('audio')
  if (!file || typeof file === 'string') return json({ error: 'audio file required' }, 400)

  const arrayBuffer = await (file as File).arrayBuffer()
  const buffer      = Buffer.from(arrayBuffer)
  const fileName    = `${userId}/${Date.now()}.webm`

  const sb = createClient(supabaseUrl, serviceRoleKey)
  const { error } = await sb.storage
    .from('voice-messages')
    .upload(fileName, buffer, { contentType: 'audio/webm', upsert: false })

  if (error) return json({ error: error.message }, 500)

  const { data: { publicUrl } } = sb.storage.from('voice-messages').getPublicUrl(fileName)
  return json({ url: publicUrl, duration: 0 })
}

async function listMembers(currentUserId: string): Promise<Response> {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY ?? ''
  if (!clerkSecretKey) return json({ error: 'Clerk secret key not configured' }, 500)

  const res = await fetch('https://api.clerk.com/v1/users?limit=50', {
    headers: { Authorization: `Bearer ${clerkSecretKey}` },
  })
  if (!res.ok) {
    const err = await res.text()
    return json({ error: 'Clerk API error', detail: err }, res.status)
  }
  const users = await res.json() as any[]
  const members = users
    .filter((u: any) => u.id !== currentUserId)
    .map((u: any) => ({
      id: u.id,
      name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.id,
      tier: (u.public_metadata?.tier as string) || 'watchman',
      imageUrl: u.image_url || '',
      expertiseTags: (u.public_metadata?.expertiseTags as string[]) || [],
    }))
  return json(members)
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const url    = new URL(req.url)
  const action = url.searchParams.get('action') ?? ''

  const userId = extractUserId(req.headers.get('Authorization'))
  if (!userId) return json({ error: 'Unauthorized' }, 401)

  if (action === 'get-token') {
    return getStreamToken(userId)
  }

  if (action === 'list-conversations') {
    return listConversations(userId)
  }

  if (action === 'get-messages') {
    return getMessages(userId, url.searchParams.get('channelId') ?? '')
  }

  if (action === 'send-message') {
    const body = await req.json().catch(() => ({}))
    return sendMessage(userId, body)
  }

  if (action === 'create-dm') {
    const body = await req.json().catch(() => ({}))
    return createDM(userId, body)
  }

  if (action === 'mark-read') {
    const body = await req.json().catch(() => ({}))
    return markRead(userId, body)
  }

  if (action === 'upload-voice') {
    return uploadVoice(userId, req)
  }

  if (action === 'list-members') {
    return listMembers(userId)
  }

  if (action === 'accept-dm') {
    const body = await req.json().catch(() => ({}))
    return acceptDM(userId, body)
  }

  if (action === 'decline-dm') {
    const body = await req.json().catch(() => ({}))
    return declineDM(userId, body)
  }

  if (action === 'pending-requests') {
    return pendingRequests(userId)
  }

  return json({ error: `Unknown action: ${action}` }, 405)
}

export const config = { path: '/api/stream-messages' }
