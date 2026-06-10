import { StreamClient } from '@stream-io/node-sdk'
import { requireAuth } from './_shared/access'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const userId = auth.userId
  const name   = auth.displayName || 'Warrior'

  const { apiKey, apiSecret } = JSON.parse(process.env.STREAM || '{}')
  if (!apiKey || !apiSecret) {
    return new Response(JSON.stringify({ error: 'Stream not configured' }), { status: 500, headers: JSON_HEADERS })
  }

  try {
    const client = new StreamClient(apiKey, apiSecret)

    // Upsert user — log failure but don't throw; Stream auto-creates on first join
    try {
      await client.upsertUsers([{ id: userId, name }])
    } catch (upsertErr: any) {
      console.error('[stream-video-token] upsert failed (non-fatal):', upsertErr?.message)
    }

    // Generate a 1-hour video/call token (user_id claim required by Stream Video SDK)
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
