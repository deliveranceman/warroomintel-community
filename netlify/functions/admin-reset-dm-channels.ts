import type { Context } from '@netlify/functions'
import { createHmac, timingSafeEqual } from 'crypto'

function tsEqual(a: string, b: string): boolean {
  const bA = Buffer.from(a)
  const bB = Buffer.from(b)
  if (bA.length !== bB.length) { timingSafeEqual(bA, bA); return false }
  return timingSafeEqual(bA, bB)
}

const KEEP = new Set(['war-room-general', 'prayer-wall-requests'])

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
  const received = req.headers.get('x-admin-secret') || ''
  const expected = process.env.ADMIN_SECRET || ''
  if (!(expected && tsEqual(received, expected))) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const stream = JSON.parse(process.env.STREAM || '{}')
  const streamApiKey = stream.apiKey
  const streamApiSecret = stream.apiSecret
  const apiKey    = streamApiKey!
  const apiSecret = streamApiSecret!

  if (!apiKey || !apiSecret) {
    return new Response(JSON.stringify({ error: 'Stream not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const token = makeServerToken(apiSecret)

    const data = await streamFetch('/channels', 'POST', token, apiKey, {
      filter_conditions: { type: 'messaging' },
      limit: 30,
    })

    const channels: any[] = data.channels || []
    const toDelete = channels.filter((ch: any) => {
      const id = ch.channel?.id || ch.id
      return id && !KEEP.has(id)
    })

    const deletedIds: string[] = []
    const errors: string[] = []

    for (const ch of toDelete) {
      const id = ch.channel?.id || ch.id
      try {
        await streamFetch(`/channels/messaging/${id}`, 'DELETE', token, apiKey)
        deletedIds.push(id)
      } catch (err: any) {
        console.error(`Failed to delete channel ${id}:`, err.message)
        errors.push(id)
      }
    }

    return new Response(
      JSON.stringify({ deleted: deletedIds.length, ids: deletedIds, errors }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    console.error('admin-reset-dm-channels error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Stream error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config = { path: '/api/admin-reset-dm-channels' }
