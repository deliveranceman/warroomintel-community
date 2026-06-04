import { StreamClient } from '@stream-io/node-sdk'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json' }

function extractPayload(authHeader: string | null) {
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString())
  } catch { return null }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const payload = extractPayload(req.headers.get('Authorization'))
  if (!payload?.sub) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: JSON_HEADERS })
  }

  const userId    = payload.sub as string
  const meta      = payload?.publicMetadata || payload?.public_metadata || {}
  const firstName = (payload.firstName || payload.first_name || meta.first_name || '') as string
  const lastName  = (payload.lastName  || payload.last_name  || meta.last_name  || '') as string
  const name      = [firstName, lastName].filter(Boolean).join(' ') || (payload.name as string) || 'Soldier'

  const { apiKey, apiSecret } = JSON.parse(process.env.STREAM || '{}')
  if (!apiKey || !apiSecret) {
    return new Response(JSON.stringify({ error: 'Stream not configured' }), { status: 500, headers: JSON_HEADERS })
  }

  try {
    const client = new StreamClient(apiKey, apiSecret)

    // Upsert user in Stream (both chat and video share the same user store)
    await client.upsertUsers([{ id: userId, name }])

    // Generate a 1-hour video/call token
    const token = client.generateUserToken({ user_id: userId, validity_in_seconds: 3600 })

    return new Response(JSON.stringify({ apiKey, token, userId, name }), {
      status: 200,
      headers: JSON_HEADERS,
    })
  } catch (err: any) {
    console.error('[stream-video-token]', err.message)
    return new Response(JSON.stringify({ error: err.message || 'Failed to generate token' }), {
      status: 500,
      headers: JSON_HEADERS,
    })
  }
}

export const config = { path: '/api/stream-video-token' }
