import crypto from 'crypto'
import { requireAuth, CORS } from './_shared/access'
import { notifyDmReaction } from './_shared/notifyDmReaction'

// ── Stream helpers ────────────────────────────────────────────────────────────

const { apiKey, apiSecret } = JSON.parse(process.env.STREAM || '{}')

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

function streamUrl(path: string): string {
  const sep = path.includes('?') ? '&' : '?'
  return `https://chat.stream-io-api.com${path}${sep}api_key=${apiKey}`
}

async function streamFetch(
  path: string,
  method: 'GET' | 'POST' | 'DELETE',
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

// ── Server-side allowlist ─────────────────────────────────────────────────────
// Mirrors WRI_REACTION_TYPES in src/lib/wri-reactions.ts. Never trust client type.

const WRI_REACTION_TYPES = new Set([
  'wri_strike', 'wri_cover', 'wri_burn', 'wri_amen', 'wri_blood', 'wri_watch',
  'wri_sound', 'wri_anchor', 'wri_crown', 'wri_break', 'wri_intercede', 'wri_seal',
])

const WRI_LABELS: Record<string, string> = {
  wri_strike: 'STRIKE', wri_cover: 'COVER', wri_burn: 'BURN', wri_amen: 'AMEN',
  wri_blood: 'BLOOD', wri_watch: 'WATCH', wri_sound: 'SOUND', wri_anchor: 'ANCHOR',
  wri_crown: 'CROWN', wri_break: 'BREAK', wri_intercede: 'INTERCEDE', wri_seal: 'SEAL',
}

// ── Handler ───────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return json({ error: 'POST or DELETE required' }, 405)
  }

  // Auth — identity from verified Clerk record; never trust request body userId
  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth
  const verifiedUserId = auth.userId

  let body: any
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { channelType = 'messaging', channelId, messageId, type } = body ?? {}

  if (!channelId || !messageId) return json({ error: 'channelId and messageId required' }, 400)
  if (!type || !WRI_REACTION_TYPES.has(type)) return json({ error: 'invalid reaction type' }, 400)

  // Channel membership check — caller must be a member of the DM channel
  const { status: chanStatus, data: chanData } = await streamFetch(
    `/channels/${encodeURIComponent(channelType)}/${encodeURIComponent(channelId)}/query`,
    'POST',
    serverToken(),
    { state: true, watch: false, presence: false },
  )
  if (chanStatus < 200 || chanStatus >= 300) {
    return json({ error: 'stream_failed', detail: chanData }, 502)
  }
  const chanMembers: any[] = (chanData as any).members ?? []
  const isMember = chanMembers.some(
    (m: any) => (m.user?.id ?? m.user_id) === verifiedUserId,
  )
  if (!isMember) return json({ error: 'Forbidden: not a member of this channel' }, 403)

  // DELETE = remove reaction
  if (req.method === 'DELETE') {
    const { status, data } = await streamFetch(
      `/messages/${encodeURIComponent(messageId)}/reaction/${encodeURIComponent(type)}?user_id=${encodeURIComponent(verifiedUserId)}`,
      'DELETE',
      userToken(verifiedUserId),
    )
    if (!res_ok(status)) return json({ error: 'stream_failed', detail: data }, 502)
    return json({ ok: true })
  }

  // POST = add reaction
  const { status: rxStatus, data: rxData } = await streamFetch(
    `/messages/${encodeURIComponent(messageId)}/reaction`,
    'POST',
    userToken(verifiedUserId),
    { reaction: { type, score: 1 } },
  )
  if (!res_ok(rxStatus)) return json({ error: 'stream_failed', detail: rxData }, 502)

  // Push notification — fire-and-forget on ADD only; never on remove
  // Recipient = the other party in the DM (not the sender)
  const recipientMember = chanMembers.find(
    (m: any) => (m.user?.id ?? m.user_id) !== verifiedUserId,
  )
  if (recipientMember) {
    const recipientUserId: string = recipientMember.user?.id ?? recipientMember.user_id ?? ''
    if (recipientUserId) {
      notifyDmReaction({
        senderUserId: verifiedUserId,
        recipientUserId,
        channelId,
        reactionType: type,
        reactionLabel: WRI_LABELS[type] ?? type,
        senderDisplayName: auth.displayName || verifiedUserId,
      }).catch(e => console.error('[api-dm-reaction] push error:', e?.message))
    }
  }

  return json({ ok: true })
}

function res_ok(status: number): boolean {
  return status >= 200 && status < 300
}

export const config = { path: '/api/dm-reaction' }
