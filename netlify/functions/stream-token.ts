import type { Context } from '@netlify/functions'
import { StreamClient } from '@stream-io/node-sdk'

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  try {
    const { userId: rawUserId, userName, userImage } = await req.json()

    if (!rawUserId) {
      return new Response(JSON.stringify({ error: 'userId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Stream requires user IDs to contain only alphanumeric, underscore, hyphen
    const userId = rawUserId.replace(/[^a-zA-Z0-9_-]/g, '_')

    const apiKey    = process.env.VITE_STREAM_API_KEY!
    const apiSecret = process.env.STREAM_API_SECRET!

    if (!apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: 'Stream not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const client = new StreamClient(apiKey, apiSecret)

    // Upsert user — creates if not exists, updates if exists
    await client.upsertUsers([{
      id:    userId,
      name:  (userName || '').trim() || 'Warrior',
      image: userImage || '',
      role:  'user',
    }])

    // Ensure prayer-wall-requests channel exists and user is a member
    const prayerChannel = client.chat.channel('messaging', 'prayer-wall-requests')
    await prayerChannel.getOrCreate({
      data: {
        created_by_id:  userId,
      } as any,
    })
    await prayerChannel.update({ add_members: [{ user_id: userId }] })

    // Ensure war-room-general channel exists and user is a member
    const generalChannel = client.chat.channel('messaging', 'war-room-general')
    await generalChannel.getOrCreate({
      data: {
        created_by_id:  userId,
      } as any,
    })
    await generalChannel.update({ add_members: [{ user_id: userId }] })

    // Generate a valid token for this user (1-hour expiry)
    const token = client.createToken(userId, Math.floor(Date.now() / 1000) + 3600)

    return new Response(JSON.stringify({ token, apiKey, userId }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err: any) {
    console.error('stream-token error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Stream error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config = { path: '/api/stream-token' }
