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
  const { status, data } = await streamFetch(`/channels/messaging/${channelId}`, 'POST', token, {
    get_or_create: true,
    members: sorted,
    data: { created_by_id: userA, is_dm: true },
  })
  if (status >= 400) {
    console.error('[createStreamChannel] Stream error:', status, JSON.stringify(data).slice(0, 500))
    return { error: 'Stream channel creation failed', detail: data }
  }
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

function extractTierFromJWT(authHeader: string | null): string {
  if (!authHeader) return 'watchman'
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return 'watchman'
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return (payload?.publicMetadata?.tier || payload?.public_metadata?.tier || 'watchman') as string
  } catch {
    return 'watchman'
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
    console.log('[list-conv] channel', r.channel_id, 'stream status:', cs, 'data:', JSON.stringify(cd).slice(0, 400))
    if (cs >= 200 && cs < 300) {
      const d = cd as any
      const chMembers: any[] = d.members ?? []
      const chMessages: any[] = d.messages ?? []
      const chRead: any[] = d.read ?? []
      const otherM = chMembers.find((m: any) => m.user?.id !== userId && m.user_id !== userId)?.user ?? null
      console.log('[list-conv] otherMember:', otherM?.name, 'members count:', chMembers.length)
      const otherName = otherM?.name || (r.requester_id === userId ? r.recipient_name : r.requester_name) || 'Member'
      const lastMsg = chMessages[0]
        ? { text: chMessages[0].text ?? '', type: chMessages[0].type ?? 'regular', created_at: chMessages[0].created_at, user: { id: chMessages[0].user?.id ?? '', name: chMessages[0].user?.name ?? '' } }
        : null
      const unread = chRead.find((x: any) => x.user?.id === userId)?.unread_messages ?? 0
      conversations.push({
        channelId: r.channel_id,
        channelType: 'messaging',
        members: chMembers.map((m: any) => ({ id: m.user?.id ?? '', name: m.user?.name ?? '', image: m.user?.image ?? '', online: m.user?.online ?? false })),
        otherMember: otherM
          ? { id: otherM.id, name: otherName, image: otherM.image ?? '', online: otherM.online ?? false }
          : { id: r.requester_id === userId ? r.recipient_id : r.requester_id, name: otherName, image: '', online: false },
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
          ? { id: r.recipient_id, name: r.recipient_name ?? 'Member', image: '', online: false }
          : { id: r.requester_id, name: r.requester_name ?? 'Member', image: '', online: false },
        lastMessage: null,
        unreadCount: 0,
      })
    }
  }

  console.log('[list-conv] final conversations count:', conversations.length)
  return json({ conversations })
}

async function getMessages(userId: string, channelId: string): Promise<Response> {
  if (!channelId) return json({ error: 'channelId required' }, 400)
  console.log('[get-messages] channelId:', channelId, 'userId:', userId)

  const { status, data } = await streamFetch(
    `/channels/messaging/${encodeURIComponent(channelId)}/query`,
    'POST',
    serverToken(),
    { messages: { limit: 50 }, state: true, watch: false },
  )

  console.log('[get-messages] Stream status:', status)
  if (status < 200 || status >= 300) {
    console.log('[get-messages] Stream error:', JSON.stringify(data).slice(0, 300))
    return json({ error: 'Stream error', detail: data }, status)
  }

  const d = data as any
  console.log('[get-messages] message count:', d.messages?.length ?? 0)
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

  // Check recipient Clerk tier + extract their name
  let recipientName = otherUserName || 'Member'
  if (clerkSecretKey) {
    const clerkRes = await fetch(`https://api.clerk.com/v1/users/${otherUserId}`, {
      headers: { Authorization: `Bearer ${clerkSecretKey}` },
    })
    if (clerkRes.ok) {
      const clerkUser = await clerkRes.json()
      recipientName = [clerkUser.first_name, clerkUser.last_name].filter(Boolean).join(' ') || clerkUser.username || recipientName
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
      recipient_name: recipientName,
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
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    console.error('[pending-requests] Supabase error:', res.status, errText.slice(0, 200))
    return json({ requests: [] })
  }
  const rows = await res.json().catch((e: any) => {
    console.error('[pending-requests] JSON parse error:', e)
    return []
  })
  if (!Array.isArray(rows)) {
    console.error('[pending-requests] Unexpected response shape:', JSON.stringify(rows).slice(0, 200))
    return json({ requests: [] })
  }
  const requests = rows.map(r => ({
    id: r.id,
    requesterId: r.requester_id,
    requesterName: r.requester_name,
    requesterTier: r.requester_tier,
    createdAt: r.created_at,
  }))
  console.log(`[pending-requests] userId=${userId} found=${requests.length}`)
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

// ── Fire Team actions ─────────────────────────────────────────────────────────

async function createFireTeam(userId: string, body: any): Promise<Response> {
  const { name, assignmentType, description, inviteUserIds } = body ?? {}

  if (!name || name.length > 50) return json({ error: 'name required, max 50 chars' }, 400)
  const validTypes = ['intercession', 'warfare', 'assignment', 'coordination', 'prayer']
  if (!validTypes.includes(assignmentType)) return json({ error: 'invalid assignmentType' }, 400)
  if (!Array.isArray(inviteUserIds) || inviteUserIds.length === 0) return json({ error: 'inviteUserIds required' }, 400)
  if (inviteUserIds.length > 7) return json({ error: 'max 7 invited members' }, 400)

  // Soldier+ tier check
  const clerkSecretKey = process.env.CLERK_SECRET_KEY ?? ''
  let userName = userId
  if (clerkSecretKey) {
    const myRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${clerkSecretKey}` },
    })
    if (myRes.ok) {
      const myUser = await myRes.json()
      const tier = (myUser.public_metadata?.tier as string) || 'watchman'
      const tl = ({ watchman: 0, free: 0, soldier: 1, commander: 2, general: 3, minister: 4 } as Record<string, number>)[tier] ?? 0
      if (tl < 1) return json({ error: 'Soldier+ tier required to create Fire Teams' }, 403)
      userName = [myUser.first_name, myUser.last_name].filter(Boolean).join(' ') || myUser.username || userId
    }
  }

  const channelId = `ft-${Date.now()}-${userId.slice(-6)}`
  const allMembers = [userId, ...inviteUserIds]

  const chanRes = await fetch(streamUrl(`/channels/messaging/${channelId}`), {
    method: 'POST',
    headers: streamHeaders(serverToken()),
    body: JSON.stringify({
      get_or_create: true,
      members: allMembers,
      data: { created_by_id: userId, name, is_fire_team: true, assignment_type: assignmentType, description: description || '' },
    }),
  })
  if (!chanRes.ok) {
    const err = await chanRes.text()
    return json({ error: 'Stream channel creation failed', detail: err }, 500)
  }

  const ftRes = await fetch(SB('/fire_teams'), {
    method: 'POST',
    headers: sbH,
    body: JSON.stringify({
      name, assignment_type: assignmentType, leader_id: userId, leader_name: userName,
      stream_channel_id: channelId, description: description || '',
      member_count: 1 + inviteUserIds.length, active: true,
    }),
  })
  const ftRows: any[] = await ftRes.json().catch(() => [])
  const fireTeamId = Array.isArray(ftRows) && ftRows[0]?.id ? ftRows[0].id : null

  if (fireTeamId) {
    await fetch(SB('/fire_team_members'), {
      method: 'POST',
      headers: sbH,
      body: JSON.stringify({ fire_team_id: fireTeamId, team_id: fireTeamId, user_id: userId, user_name: userName, role: 'leader', status: 'active' }),
    }).catch(() => {})

    const siteUrl = (process.env.URL || 'https://warroomintel.com').replace(/\/$/, '')
    for (const inviteId of inviteUserIds) {
      fetch(`${siteUrl}/api/send-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({
          title: '⚔ Fire Team Invitation',
          body: `${userName} invited you to join "${name}" Fire Team`,
          userId: inviteId,
          url: '/community',
        }),
      }).catch(() => {})
    }
  }

  return json({ ok: true, channelId, fireTeamId })
}

async function listFireTeams(userId: string): Promise<Response> {
  const membRes = await fetch(
    SB(`/fire_team_members?user_id=eq.${encodeURIComponent(userId)}&status=eq.active&select=fire_team_id`),
    { headers: sbH },
  )
  const membRows: any[] = await membRes.json().catch(() => [])
  if (!Array.isArray(membRows) || membRows.length === 0) return json({ fireTeams: [] })

  const ids = membRows.map(r => r.fire_team_id).filter(Boolean)
  if (ids.length === 0) return json({ fireTeams: [] })

  const teamsRes = await fetch(
    SB(`/fire_teams?id=in.(${ids.join(',')})&active=eq.true&select=*`),
    { headers: sbH },
  )
  const teams: any[] = await teamsRes.json().catch(() => [])
  if (!Array.isArray(teams) || teams.length === 0) return json({ fireTeams: [] })

  const fireTeams: any[] = []
  for (const team of teams) {
    let lastMessage = ''
    let updatedAt = team.created_at
    if (team.stream_channel_id) {
      const { status, data } = await streamFetch(
        `/channels/messaging/${encodeURIComponent(team.stream_channel_id)}/query`,
        'POST', serverToken(),
        { state: true, messages: { limit: 1 }, watch: false, presence: false },
      )
      if (status >= 200 && status < 300) {
        const latestMsg = (data as any).messages?.[0] ?? null
        lastMessage = latestMsg?.text || ''
        updatedAt = latestMsg?.created_at || team.created_at
      }
    }
    fireTeams.push({
      channelId: team.stream_channel_id || '',
      teamName: team.name,
      leaderName: team.leader_name || '',
      assignmentType: team.assignment_type || team.focus || 'intercession',
      memberCount: team.member_count || 1,
      lastMessage, updatedAt,
      isFireTeam: true,
      fireTeamId: team.id,
    })
  }

  return json({ fireTeams })
}

async function getFireTeamMembers(fireTeamId: string): Promise<Response> {
  if (!fireTeamId) return json({ error: 'fireTeamId required' }, 400)
  const res = await fetch(
    SB(`/fire_team_members?fire_team_id=eq.${encodeURIComponent(fireTeamId)}&status=eq.active&select=*`),
    { headers: sbH },
  )
  const members: any[] = await res.json().catch(() => [])
  return json({ members: Array.isArray(members) ? members : [] })
}

async function leaveFireTeam(userId: string, body: any): Promise<Response> {
  const { fireTeamId } = body ?? {}
  if (!fireTeamId) return json({ error: 'fireTeamId required' }, 400)
  await fetch(
    SB(`/fire_team_members?fire_team_id=eq.${encodeURIComponent(fireTeamId)}&user_id=eq.${encodeURIComponent(userId)}`),
    { method: 'PATCH', headers: sbH, body: JSON.stringify({ status: 'left' }) },
  ).catch(() => {})
  return json({ ok: true })
}

// ── Sentinel actions ──────────────────────────────────────────────────────────

async function requestSentinel(userId: string, body: any): Promise<Response> {
  const { recipientId, recipientName } = body ?? {}
  if (!recipientId) return json({ error: 'recipientId required' }, 400)
  if (recipientId === userId) return json({ error: 'Cannot request yourself' }, 400)

  const clerkSecretKey = process.env.CLERK_SECRET_KEY ?? ''
  let userName = userId
  if (clerkSecretKey) {
    try {
      const myRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: { Authorization: `Bearer ${clerkSecretKey}` },
      })
      if (myRes.ok) {
        const u = await myRes.json()
        const full = [u.first_name, u.last_name].filter((x: any) => x && x.trim()).join(' ')
        userName = full || u.username || u.email_addresses?.[0]?.email_address?.split('@')[0] || userId
      }
    } catch {}
  }

  const countRes = await fetch(
    SB(`/sentinel_pairs?or=(requester_id.eq.${encodeURIComponent(userId)},recipient_id.eq.${encodeURIComponent(userId)})&status=eq.active&select=id`),
    { headers: sbH },
  )
  const activeRows: any[] = await countRes.json().catch(() => [])
  if (Array.isArray(activeRows) && activeRows.length >= 4) return json({ error: 'Max 4 active sentinels' }, 400)

  const existRes = await fetch(
    SB(`/sentinel_pairs?or=(and(requester_id.eq.${encodeURIComponent(userId)},recipient_id.eq.${encodeURIComponent(recipientId)}),and(requester_id.eq.${encodeURIComponent(recipientId)},recipient_id.eq.${encodeURIComponent(userId)}))&status=in.(active,pending)&select=id`),
    { headers: sbH },
  )
  const existRows: any[] = await existRes.json().catch(() => [])
  if (Array.isArray(existRows) && existRows.length > 0) return json({ error: 'Sentinel relationship already exists' }, 400)

  const insertRes = await fetch(SB('/sentinel_pairs'), {
    method: 'POST',
    headers: sbH,
    body: JSON.stringify({
      requester_id: userId, requester_name: userName,
      recipient_id: recipientId, recipient_name: recipientName || 'Member',
      status: 'pending',
    }),
  }).catch(() => null)
  if (insertRes && !insertRes.ok) {
    const errBody = await insertRes.text().catch(() => '')
    console.error('[sentinel] INSERT failed', insertRes.status, errBody)
    return json({ error: 'Failed to create sentinel request' }, 500)
  }

  const siteUrl = (process.env.URL || 'https://warroomintel.com').replace(/\/$/, '')
  fetch(`${siteUrl}/api/send-push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceRoleKey}` },
    body: JSON.stringify({
      title: '⚔ Sentinel Request',
      body: `${userName} wants to covenant with you as a Sentinel partner`,
      userId: recipientId,
      url: '/community',
    }),
  }).catch(() => {})

  return json({ ok: true, message: 'Sentinel request sent' })
}

async function acceptSentinel(userId: string, body: any): Promise<Response> {
  const { sentinelId } = body ?? {}
  if (!sentinelId) return json({ error: 'sentinelId required' }, 400)

  const rowRes = await fetch(
    SB(`/sentinel_pairs?id=eq.${encodeURIComponent(sentinelId)}&recipient_id=eq.${encodeURIComponent(userId)}&select=*`),
    { headers: sbH },
  )
  const rows: any[] = await rowRes.json().catch(() => [])
  const row = Array.isArray(rows) ? rows[0] : null
  if (!row) return json({ error: 'Request not found' }, 404)
  if (row.status !== 'pending') return json({ error: 'Request already resolved' }, 400)

  const channelId = `sentinel-${sentinelId.slice(0, 8)}`
  const allMembers = [row.requester_id, userId].sort()
  const now = new Date()
  const endsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const chanRes = await fetch(streamUrl(`/channels/messaging/${channelId}`), {
    method: 'POST',
    headers: streamHeaders(serverToken()),
    body: JSON.stringify({
      get_or_create: true,
      members: allMembers,
      data: { created_by_id: userId, is_sentinel: true, name: 'Sentinel Channel' },
    }),
  })
  if (!chanRes.ok) {
    const errText = await chanRes.text()
    console.error('[accept-sentinel] Stream error:', chanRes.status, errText)
    return json({ error: 'Stream channel creation failed', detail: errText }, 500)
  }

  await fetch(SB(`/sentinel_pairs?id=eq.${encodeURIComponent(sentinelId)}`), {
    method: 'PATCH',
    headers: sbH,
    body: JSON.stringify({ status: 'active', started_at: now.toISOString(), ends_at: endsAt.toISOString(), stream_channel_id: channelId }),
  }).catch(() => {})

  const clerkSecretKey = process.env.CLERK_SECRET_KEY ?? ''
  let recipientName = userId
  if (clerkSecretKey) {
    try {
      const myRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: { Authorization: `Bearer ${clerkSecretKey}` },
      })
      if (myRes.ok) {
        const u = await myRes.json()
        recipientName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || userId
      }
    } catch {}
  }

  const siteUrl = (process.env.URL || 'https://warroomintel.com').replace(/\/$/, '')
  fetch(`${siteUrl}/api/send-push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceRoleKey}` },
    body: JSON.stringify({
      title: '⚔ Sentinel Activated',
      body: `${recipientName} accepted your Sentinel covenant. 30-day sprint begins now.`,
      userId: row.requester_id,
      url: '/community',
    }),
  }).catch(() => {})

  return json({ ok: true, channelId })
}

async function listSentinels(userId: string): Promise<Response> {
  const res = await fetch(
    SB(`/sentinel_pairs?or=(requester_id.eq.${encodeURIComponent(userId)},recipient_id.eq.${encodeURIComponent(userId)})&status=eq.active&select=*`),
    { headers: sbH },
  )
  const rows: any[] = await res.json().catch(() => [])
  if (!Array.isArray(rows) || rows.length === 0) return json({ sentinels: [] })

  const sentinels: any[] = []
  for (const r of rows) {
    let lastMessage = ''
    let updatedAt = r.started_at || r.created_at
    if (r.stream_channel_id) {
      try {
        const { status, data } = await streamFetch(
          `/channels/messaging/${encodeURIComponent(r.stream_channel_id)}/query`,
          'POST', serverToken(),
          { state: true, messages: { limit: 1 }, watch: false, presence: false },
        )
        if (status >= 200 && status < 300) {
          const latestMsg = (data as any).messages?.[0] ?? null
          lastMessage = latestMsg?.text || ''
          updatedAt = latestMsg?.created_at || updatedAt
        }
      } catch {}
    }
    const partnerName = r.requester_id === userId ? r.recipient_name : r.requester_name
    const partnerId   = r.requester_id === userId ? r.recipient_id  : r.requester_id
    sentinels.push({
      id: r.id,
      channelId: r.stream_channel_id || '',
      partnerName: partnerName || 'Partner',
      partnerId,
      endsAt: r.ends_at,
      startedAt: r.started_at,
      lastMessage,
      updatedAt,
      sprintNumber: r.sprint_number || 1,
    })
  }
  return json({ sentinels })
}

async function getSentinelRequests(userId: string): Promise<Response> {
  const res = await fetch(
    SB(`/sentinel_pairs?recipient_id=eq.${encodeURIComponent(userId)}&status=eq.pending&select=*&order=created_at.desc`),
    { headers: sbH },
  )
  const rows: any[] = await res.json().catch(() => [])
  if (!Array.isArray(rows) || rows.length === 0) return json({ requests: [] })

  // Resolve full names from Clerk for any row where stored name is missing or incomplete
  const clerkSecretKey = process.env.CLERK_SECRET_KEY ?? ''
  const needsLookup = rows.filter(r => !r.requester_name || r.requester_name.startsWith('user_') || !r.requester_name.includes(' '))
  const clerkNames: Record<string, string> = {}
  if (clerkSecretKey && needsLookup.length > 0) {
    await Promise.all(needsLookup.map(async r => {
      try {
        const cr = await fetch(`https://api.clerk.com/v1/users/${r.requester_id}`, {
          headers: { Authorization: `Bearer ${clerkSecretKey}` },
        })
        if (cr.ok) {
          const u = await cr.json()
          const full = [u.first_name, u.last_name].filter((x: any) => x && x.trim()).join(' ')
          clerkNames[r.requester_id] = full || u.username || u.email_addresses?.[0]?.email_address?.split('@')[0] || r.requester_id
        }
      } catch {}
    }))
  }

  const requests = rows.map(r => ({
    id: r.id,
    requesterId: r.requester_id,
    requesterName: clerkNames[r.requester_id] || r.requester_name || 'Member',
    createdAt: r.created_at,
  }))
  return json({ requests })
}

// ── Cover All actions ─────────────────────────────────────────────────────────

async function createCoverAll(userId: string, body: any, authHeader: string | null): Promise<Response> {
  const { name, territory, inviteUserIds } = body ?? {}
  if (!name) return json({ error: 'name required' }, 400)
  if (!Array.isArray(inviteUserIds)) return json({ error: 'inviteUserIds required' }, 400)
  if (1 + inviteUserIds.length > 20) return json({ error: 'max 20 members total' }, 400)

  // Tier check — read from JWT first, fall back to Clerk API
  const TIER_MAP: Record<string, number> = { watchman: 0, free: 0, soldier: 1, commander: 2, general: 3, minister: 4 }
  const jwtTier = extractTierFromJWT(authHeader)
  let userTierLevel = TIER_MAP[jwtTier] ?? 0
  let userName = userId

  const clerkSecretKey = process.env.CLERK_SECRET_KEY ?? ''
  if (clerkSecretKey) {
    try {
      const myRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: { Authorization: `Bearer ${clerkSecretKey}` },
      })
      if (myRes.ok) {
        const u = await myRes.json()
        const clerkTier = (u.public_metadata?.tier as string) || jwtTier
        const clerkLevel = TIER_MAP[clerkTier] ?? 0
        // Use the higher of JWT tier vs Clerk tier (Clerk is authoritative if available)
        userTierLevel = Math.max(userTierLevel, clerkLevel)
        userName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || userId
      }
    } catch {}
  }

  if (userTierLevel < 2) return json({ error: 'Commander+ tier required to create Cover All groups', debug: { jwtTier, userTierLevel } }, 403)

  const channelId = `ca-${Date.now()}-${userId.slice(-6)}`
  const allMembers = [userId, ...inviteUserIds]

  const chanRes = await fetch(streamUrl(`/channels/messaging/${channelId}`), {
    method: 'POST',
    headers: streamHeaders(serverToken()),
    body: JSON.stringify({
      get_or_create: true,
      members: allMembers,
      data: { created_by_id: userId, name, is_cover_all: true, territory: territory || '' },
    }),
  })
  if (!chanRes.ok) return json({ error: 'Stream channel creation failed' }, 500)

  const grpRes = await fetch(SB('/cover_all_groups'), {
    method: 'POST',
    headers: sbH,
    body: JSON.stringify({
      name, territory: territory || '', leader_id: userId, leader_name: userName,
      stream_channel_id: channelId, member_count: allMembers.length, active: true,
    }),
  })
  if (!grpRes.ok) {
    const errBody = await grpRes.text().catch(() => '')
    console.error('[cover-all] groups INSERT failed', grpRes.status, errBody)
    return json({ error: 'Failed to save group — please try again' }, 500)
  }
  const grpRows: any[] = await grpRes.json().catch(() => [])
  const groupId = Array.isArray(grpRows) && grpRows[0]?.id ? grpRows[0].id : null
  if (!groupId) {
    console.error('[cover-all] groups INSERT returned no id', JSON.stringify(grpRows))
    return json({ error: 'Failed to save group — please try again' }, 500)
  }

  // Insert leader + all invited members into cover_all_members so everyone sees the group
  const memberInserts = [
    { group_id: groupId, user_id: userId, user_name: userName, role: 'leader', status: 'active' },
    ...inviteUserIds.map((id: string) => ({ group_id: groupId, user_id: id, user_name: '', role: 'member', status: 'active' })),
  ]
  await fetch(SB('/cover_all_members'), {
    method: 'POST',
    headers: sbH,
    body: JSON.stringify(memberInserts),
  }).catch(e => console.error('[cover-all] members INSERT failed', e))

  const siteUrl = (process.env.URL || 'https://warroomintel.com').replace(/\/$/, '')
  for (const inviteId of inviteUserIds) {
    fetch(`${siteUrl}/api/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({
        title: '🛡 Cover All Invitation',
        body: `${userName} invited you to join "${name}" Cover All group`,
        userId: inviteId,
        url: '/community',
      }),
    }).catch(() => {})
  }

  return json({ ok: true, channelId, groupId })
}

async function listCoverAll(userId: string): Promise<Response> {
  const membRes = await fetch(
    SB(`/cover_all_members?user_id=eq.${encodeURIComponent(userId)}&status=eq.active&select=group_id`),
    { headers: sbH },
  )
  const membRows: any[] = await membRes.json().catch(() => [])
  if (!Array.isArray(membRows) || membRows.length === 0) return json({ groups: [] })

  const ids = membRows.map(r => r.group_id).filter(Boolean)
  if (ids.length === 0) return json({ groups: [] })

  const grpsRes = await fetch(
    SB(`/cover_all_groups?id=in.(${ids.join(',')})&active=eq.true&select=*`),
    { headers: sbH },
  )
  const grps: any[] = await grpsRes.json().catch(() => [])
  if (!Array.isArray(grps) || grps.length === 0) return json({ groups: [] })

  const groups: any[] = []
  for (const g of grps) {
    let lastMessage = ''
    let updatedAt = g.created_at
    if (g.stream_channel_id) {
      try {
        const { status, data } = await streamFetch(
          `/channels/messaging/${encodeURIComponent(g.stream_channel_id)}/query`,
          'POST', serverToken(),
          { state: true, messages: { limit: 1 }, watch: false, presence: false },
        )
        if (status >= 200 && status < 300) {
          const latestMsg = (data as any).messages?.[0] ?? null
          lastMessage = latestMsg?.text || ''
          updatedAt = latestMsg?.created_at || g.created_at
        }
      } catch {}
    }
    groups.push({
      id: g.id,
      channelId: g.stream_channel_id || '',
      name: g.name,
      territory: g.territory || '',
      leaderName: g.leader_name || '',
      memberCount: g.member_count || 1,
      lastMessage,
      updatedAt,
    })
  }
  return json({ groups })
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

  if (action === 'create-fire-team') {
    const body = await req.json().catch(() => ({}))
    return createFireTeam(userId, body)
  }

  if (action === 'list-fire-teams') {
    return listFireTeams(userId)
  }

  if (action === 'get-fire-team-members') {
    return getFireTeamMembers(url.searchParams.get('fireTeamId') ?? '')
  }

  if (action === 'leave-fire-team') {
    const body = await req.json().catch(() => ({}))
    return leaveFireTeam(userId, body)
  }

  if (action === 'request-sentinel') {
    const body = await req.json().catch(() => ({}))
    return requestSentinel(userId, body)
  }

  if (action === 'accept-sentinel') {
    const body = await req.json().catch(() => ({}))
    return acceptSentinel(userId, body)
  }

  if (action === 'list-sentinels') {
    return listSentinels(userId)
  }

  if (action === 'get-sentinel-requests') {
    return getSentinelRequests(userId)
  }

  if (action === 'create-cover-all') {
    const body = await req.json().catch(() => ({}))
    return createCoverAll(userId, body, req.headers.get('Authorization'))
  }

  if (action === 'list-cover-all') {
    return listCoverAll(userId)
  }

  return json({ error: `Unknown action: ${action}` }, 405)
}

export const config = { path: '/api/stream-messages' }
