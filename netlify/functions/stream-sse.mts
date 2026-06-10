import crypto from 'crypto'
import { verifyToken } from '@clerk/backend'

const { apiKey, apiSecret } = JSON.parse(process.env.STREAM || '{}')

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'Access-Control-Allow-Origin': '*',
}

function streamJWT(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body   = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig    = crypto.createHmac('sha256', apiSecret ?? '').update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

const serverToken = () => streamJWT({ server: true })

function streamHeaders(token: string): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: token, 'stream-auth-type': 'jwt' }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })

  const url = new URL(req.url)
  // EventSource cannot send an Authorization header, so the Clerk session JWT
  // arrives in the query string. Verify it cryptographically (verifyToken) and
  // derive the identity from the verified claims — never trust the raw value.
  const token = url.searchParams.get('token') || ''
  if (!token) return new Response('Unauthorized', { status: 401 })

  let userId: string | null = null
  try {
    const claims = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY })
    userId = (claims.sub as string) ?? null
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const encoder = new TextEncoder()
  const MAX_MS = 24_000
  const POLL_MS = 3_000
  const HEARTBEAT_MS = 20_000

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch { /* stream closed */ }
      }

      const lastSeen = new Map<string, string>()
      const startedAt = Date.now()
      let closed = false

      const close = () => {
        if (closed) return
        closed = true
        try { controller.close() } catch { /* already closed */ }
      }

      // Heartbeat
      const heartbeatId = setInterval(() => {
        if (closed) { clearInterval(heartbeatId); return }
        send({ type: 'ping' })
      }, HEARTBEAT_MS)

      // Poll Stream for new messages
      const pollId = setInterval(async () => {
        if (closed) { clearInterval(pollId); return }
        if (Date.now() - startedAt > MAX_MS) {
          clearInterval(pollId)
          clearInterval(heartbeatId)
          send({ type: 'reconnect' })
          close()
          return
        }
        try {
          const res = await fetch(`https://chat.stream-io-api.com/channels?api_key=${apiKey}`, {
            method: 'POST',
            headers: streamHeaders(serverToken()),
            body: JSON.stringify({
              filter_conditions: { type: 'messaging', members: { $in: [userId] } },
              sort: [{ field: 'last_message_at', direction: -1 }],
              limit: 20,
              state: false,
              watch: false,
              message_limit: 0,
            }),
          })
          if (!res.ok) return
          const data = await res.json() as any
          const channels: any[] = data.channels ?? []
          for (const ch of channels) {
            const chId = ch.channel?.id
            const lma  = ch.channel?.last_message_at
            if (!chId || !lma) continue
            const prev = lastSeen.get(chId)
            if (!prev) { lastSeen.set(chId, lma); continue }
            if (lma > prev) {
              lastSeen.set(chId, lma)
              send({ type: 'new-message', channelId: chId, lastMessageAt: lma })
            }
          }
        } catch { /* swallow poll errors */ }
      }, POLL_MS)
    },
  })

  return new Response(stream, { headers: SSE_HEADERS })
}

export const config = { path: '/api/stream-sse' }
