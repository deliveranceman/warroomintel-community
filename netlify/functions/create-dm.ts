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
    const { userId, otherUserId } = await req.json()
    if (!userId || !otherUserId) {
      return new Response(JSON.stringify({ error: 'userId and otherUserId required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    const apiKey    = process.env.VITE_STREAM_API_KEY!
    const apiSecret = process.env.STREAM_API_SECRET!
    const client    = new StreamClient(apiKey, apiSecret)

    const sortedIds = [userId, otherUserId].sort()
    const hash = (s: string) => s.split('').reduce((a, c) => (Math.imul(31, a) + c.charCodeAt(0)) | 0, 0).toString(36).replace('-', 'z')
    const channelId = ('dm' + hash(sortedIds[0]) + hash(sortedIds[1])).slice(0, 64)

    const channel = client.chat.channel('messaging', channelId)
    await channel.getOrCreate({
      data: {
        created_by_id: userId,
        members: sortedIds.map(id => ({ user_id: id })),
      },
    })

    return new Response(JSON.stringify({ channelId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err: any) {
    console.error('create-dm error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Stream error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}

export const config = { path: '/api/create-dm' }
