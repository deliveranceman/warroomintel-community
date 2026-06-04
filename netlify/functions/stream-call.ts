import { StreamClient } from '@stream-io/node-sdk'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json' }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}

function extractPayload(authHeader: string | null) {
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString())
  } catch { return null }
}

function sbBase(): string {
  const { url } = JSON.parse(process.env.SUPABASE || '{}')
  return `${url}/rest/v1`
}

function sbHeaders() {
  const { serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }
}

function streamClient(): StreamClient {
  const { apiKey, apiSecret } = JSON.parse(process.env.STREAM || '{}')
  return new StreamClient(apiKey, apiSecret)
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const payload = extractPayload(req.headers.get('Authorization'))
  if (!payload?.sub) return json({ error: 'Unauthorized' }, 401)

  const userId     = payload.sub as string
  const meta       = payload?.publicMetadata || payload?.public_metadata || {}
  const first      = (payload.firstName || payload.first_name || meta.first_name || '') as string
  const last       = (payload.lastName  || payload.last_name  || meta.last_name  || '') as string
  const callerName = [first, last].filter(Boolean).join(' ') || (payload.name as string) || 'Soldier'

  const url    = new URL(req.url)
  const action = url.searchParams.get('action') ?? ''

  // ── GET action=status — check for incoming calls ───────────────────────────
  if (req.method === 'GET' && action === 'status') {
    const cutoff = new Date(Date.now() - 2 * 60_000).toISOString()
    const res    = await fetch(
      `${sbBase()}/stream_calls?recipient_id=eq.${encodeURIComponent(userId)}&status=eq.ringing&created_at=gte.${cutoff}&select=*&order=created_at.desc`,
      { headers: sbHeaders() },
    )
    const calls: any[] = await res.json().catch(() => [])
    return json({ calls: Array.isArray(calls) ? calls : [] })
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const body = await req.json().catch(() => ({}))

  // ── POST action=create ─────────────────────────────────────────────────────
  if (action === 'create') {
    const { channelId, targetUserId } = body ?? {}
    if (!channelId)    return json({ error: 'channelId required' }, 400)
    if (!targetUserId) return json({ error: 'targetUserId required' }, 400)
    if (targetUserId === userId) return json({ error: 'Cannot call yourself' }, 400)

    // Verify the DM channel is accepted with both parties
    const dmRes  = await fetch(
      `${sbBase()}/dm_requests?channel_id=eq.${encodeURIComponent(channelId)}&status=eq.accepted&select=requester_id,recipient_id`,
      { headers: sbHeaders() },
    )
    const dms: any[] = await dmRes.json().catch(() => [])
    if (!Array.isArray(dms) || dms.length === 0) {
      return json({ error: 'DM channel not found or not accepted' }, 403)
    }
    const dm      = dms[0]
    const members = [dm.requester_id, dm.recipient_id]
    if (!members.includes(userId) || !members.includes(targetUserId)) {
      return json({ error: 'Not a member of this DM' }, 403)
    }

    const callId   = `prayer-${channelId}-${Date.now()}`
    const callType = 'audio_room'

    // Create Stream Video call
    const client = streamClient()
    const call   = client.video.call(callType, callId)
    await call.getOrCreate({
      data: {
        created_by_id: userId,
        members: [
          { user_id: userId,       role: 'call_member' },
          { user_id: targetUserId, role: 'call_member' },
        ],
        custom: { channelId, mode: 'audio', purpose: 'prayer_call' },
      },
      ring: true,
    })

    // Record in Supabase
    await fetch(`${sbBase()}/stream_calls`, {
      method: 'POST',
      headers: sbHeaders(),
      body: JSON.stringify({
        call_id: callId, call_type: callType,
        channel_id: channelId,
        caller_id: userId, caller_name: callerName,
        recipient_id: targetUserId,
        status: 'ringing',
      }),
    }).catch(() => {})

    return json({ ok: true, callId, callType })
  }

  // ── POST action=answer ─────────────────────────────────────────────────────
  if (action === 'answer') {
    const { callId } = body ?? {}
    if (!callId) return json({ error: 'callId required' }, 400)

    await fetch(
      `${sbBase()}/stream_calls?call_id=eq.${encodeURIComponent(callId)}`,
      {
        method: 'PATCH',
        headers: sbHeaders(),
        body: JSON.stringify({ status: 'active', answered_at: new Date().toISOString() }),
      },
    ).catch(() => {})

    return json({ ok: true })
  }

  // ── POST action=end ────────────────────────────────────────────────────────
  if (action === 'end') {
    const { callId } = body ?? {}
    if (!callId) return json({ error: 'callId required' }, 400)

    // Mark ended in Supabase
    await fetch(
      `${sbBase()}/stream_calls?call_id=eq.${encodeURIComponent(callId)}`,
      {
        method: 'PATCH',
        headers: sbHeaders(),
        body: JSON.stringify({ status: 'ended', ended_at: new Date().toISOString() }),
      },
    ).catch(() => {})

    // End on Stream side (fire-and-forget)
    try {
      const rowRes = await fetch(
        `${sbBase()}/stream_calls?call_id=eq.${encodeURIComponent(callId)}&select=call_type`,
        { headers: sbHeaders() },
      )
      const rows: any[] = await rowRes.json().catch(() => [])
      const ct = (Array.isArray(rows) && rows[0]?.call_type) ? rows[0].call_type : 'audio_room'
      await streamClient().video.call(ct, callId).end()
    } catch {}

    return json({ ok: true })
  }

  return json({ error: 'Unknown action' }, 400)
}

export const config = { path: '/api/stream-call' }
