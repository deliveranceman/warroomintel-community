import type { Context } from '@netlify/functions'
import { createHmac } from 'crypto'

function makeServerToken(apiSecret: string): string {
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ server: true })).toString('base64url')
  const sig     = createHmac('sha256', apiSecret).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${sig}`
}

function streamFetch(path: string, method: string, token: string, apiKey: string, body?: object) {
  return fetch(`https://chat.stream-io-api.com${path}?api_key=${apiKey}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': token, 'Stream-Auth-Type': 'jwt' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).then(r => r.json())
}

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
      return new Response(JSON.stringify({ error: 'userId and otherUserId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const apiKey    = process.env.VITE_STREAM_API_KEY!
    const apiSecret = process.env.STREAM_API_SECRET!
    const token     = makeServerToken(apiSecret)

    const sortedIds = [userId, otherUserId].sort()
    const hash = (s: string) => s.split('').reduce((a, c) => (Math.imul(31, a) + c.charCodeAt(0)) | 0, 0).toString(36).replace('-', 'z')
    const channelId = ('dm' + hash(sortedIds[0]) + hash(sortedIds[1])).slice(0, 64)

    // Step 1: create or get the channel, seeding members on creation
    const createRes = await streamFetch(
      `/channels/messaging/${channelId}/query`,
      'POST', token, apiKey,
      {
        data: { created_by_id: userId },
        state: true,
        watch: false,
        presence: false,
      }
    )
    console.log('create-dm query result:', JSON.stringify(createRes).slice(0, 200))

    // Step 2: force-add both members via update — works even if channel already existed
    const addRes = await streamFetch(
      `/channels/messaging/${channelId}`,
      'POST', token, apiKey,
      { add_members: sortedIds.map(id => ({ user_id: id })) }
    )
    console.log('create-dm add_members result:', JSON.stringify(addRes).slice(0, 200))

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
