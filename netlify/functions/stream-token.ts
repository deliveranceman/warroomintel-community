import type { Context } from '@netlify/functions'
import { StreamClient } from '@stream-io/node-sdk'
import { requireAuth } from './_shared/access'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json' }

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  // Authenticate FIRST — token is issued ONLY for the verified caller, never for a client-supplied ID.
  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const { userId, displayName, imageUrl } = auth

  const { apiKey, apiSecret } = JSON.parse(process.env.STREAM || '{}')
  if (!apiKey || !apiSecret) {
    return new Response(JSON.stringify({ error: 'Stream not configured' }), { status: 500, headers: JSON_HEADERS })
  }

  try {
    const client = new StreamClient(apiKey, apiSecret)

    // Upsert user — creates if not exists, updates name/image if changed.
    await client.upsertUsers([{
      id:    userId,
      name:  displayName || 'Warrior',
      image: imageUrl || '',
      role:  'user',
    }])

    // Add user to the two permanent community channels.
    const prayerChannel  = client.chat.channel('messaging', 'prayer-wall-requests')
    const generalChannel = client.chat.channel('messaging', 'war-room-general')

    await prayerChannel.getOrCreate({ data: { created_by_id: userId } as any })
    await prayerChannel.update({ add_members: [{ user_id: userId }] })

    await generalChannel.getOrCreate({ data: { created_by_id: userId } as any })
    await generalChannel.update({ add_members: [{ user_id: userId }] })

    // Token is always for the verified caller — never for an arbitrary client-supplied ID.
    const token = client.createToken(userId, Math.floor(Date.now() / 1000) + 3600)

    return new Response(JSON.stringify({ token, apiKey, userId }), { status: 200, headers: JSON_HEADERS })
  } catch (err: any) {
    console.error('[stream-token]', err.message)
    return new Response(JSON.stringify({ error: err.message || 'Stream error' }), { status: 500, headers: JSON_HEADERS })
  }
}

export const config = { path: '/api/stream-token' }
