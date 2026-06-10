import { StreamClient } from '@stream-io/node-sdk'
import { requireAuth } from './_shared/access'
import { sendWebPushToUser } from './_shared/sendWebPush.js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json' }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
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

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const userId     = auth.userId
  const callerName = auth.displayName

  const url    = new URL(req.url)
  const action = url.searchParams.get('action') ?? ''

  // ── GET action=status — check for active/ringing calls (caller or recipient) ─
  if (req.method === 'GET' && action === 'status') {
    const cutoff = new Date(Date.now() - 2 * 60_000).toISOString()
    const res = await fetch(
      `${sbBase()}/stream_calls?or=(caller_id.eq.${encodeURIComponent(userId)},recipient_id.eq.${encodeURIComponent(userId)})&status=eq.ringing&created_at=gte.${cutoff}&select=*&order=created_at.desc`,
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
    const callType = 'default'

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
      ring: false,
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

    // Push notification to recipient
    sendWebPushToUser(
      targetUserId,
      `📞 ${callerName}`,
      'Calling you to prayer',
      {
        type: 'prayer_call',
        call_id: callId,
        caller_name: callerName,
        caller_id: userId,
        channel_id: channelId,
        url: '/community',
      },
    ).catch(() => {})

    return json({ ok: true, callId, callType })
  }

  // ── POST action=answer ─────────────────────────────────────────────────────
  if (action === 'answer') {
    const { callId } = body ?? {}
    if (!callId) return json({ error: 'callId required' }, 400)

    // Verify caller is the call's recipient
    const callRes = await fetch(
      `${sbBase()}/stream_calls?call_id=eq.${encodeURIComponent(callId)}&select=recipient_id`,
      { headers: sbHeaders() },
    )
    const callRows: any[] = await callRes.json().catch(() => [])
    if (!callRows.length) return json({ error: 'Call not found' }, 404)
    if (callRows[0].recipient_id !== userId) {
      return json({ error: 'Forbidden — you are not the recipient of this call' }, 403)
    }

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

    // Verify caller is a participant, and get call_type for Stream SDK
    const callRes = await fetch(
      `${sbBase()}/stream_calls?call_id=eq.${encodeURIComponent(callId)}&select=caller_id,recipient_id,call_type`,
      { headers: sbHeaders() },
    )
    const callRows: any[] = await callRes.json().catch(() => [])
    if (!callRows.length) return json({ error: 'Call not found' }, 404)
    const callRow = callRows[0]
    if (callRow.caller_id !== userId && callRow.recipient_id !== userId) {
      return json({ error: 'Forbidden — you are not a participant in this call' }, 403)
    }

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
      const ct = callRow.call_type || 'audio_room'
      await streamClient().video.call(ct, callId).end()
    } catch {}

    return json({ ok: true })
  }

  return json({ error: 'Unknown action' }, 400)
}

export const config = { path: '/api/stream-call' }
