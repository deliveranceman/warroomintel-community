import { StreamClient } from '@stream-io/node-sdk'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

const TIER_LEVEL: Record<string, number> = {
  watchman: 0, free: 0, soldier: 1, commander: 2, general: 3, minister: 4,
}

function tierNum(tier: string): number {
  return TIER_LEVEL[(tier || '').toLowerCase()] ?? 0
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  const internalKey = process.env.INTERNAL_API_KEY
  const provided    = req.headers.get('x-internal-api-key') || req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!internalKey || provided !== internalKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  }

  const streamApiKey    = process.env.VITE_STREAM_API_KEY
  const streamApiSecret = process.env.STREAM_API_SECRET
  const clerkSecret     = process.env.CLERK_SECRET_KEY

  if (!streamApiKey || !streamApiSecret || !clerkSecret) {
    return new Response(JSON.stringify({ error: 'Missing credentials' }), { status: 500, headers: HEADERS })
  }

  const client = new StreamClient(streamApiKey, streamApiSecret)

  // Ensure all tier-gated channels exist
  const channels = [
    { id: 'war-room-general',    name: 'War Room Community',  minTier: 0 },
    { id: 'field-reports-live',  name: 'Field Reports Live',  minTier: 1 },
    { id: 'commanders-room',     name: 'Commanders Room',     minTier: 2 },
    { id: 'generals-table',      name: "General's Table",     minTier: 3 },
  ]

  for (const ch of channels) {
    try {
      const channel = client.chat.channel('messaging', ch.id)
      await channel.create({ created_by_id: 'admin', name: ch.name })
    } catch { /* channel may already exist */ }
  }

  let offset = 0
  const limit = 100
  let added = 0
  let skipped = 0
  let errors = 0

  while (true) {
    const res = await fetch(`https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}`, {
      headers: { Authorization: `Bearer ${clerkSecret}` },
    })
    if (!res.ok) break

    const users = await res.json()
    if (!Array.isArray(users) || users.length === 0) break

    for (const u of users) {
      const streamUserId = u.id.replace(/[^a-zA-Z0-9_-]/g, '_')
      const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Warrior'
      const tier = (u.public_metadata?.tier as string) || 'watchman'
      const level = tierNum(tier)

      try {
        await client.upsertUsers([{ id: streamUserId, name, role: 'user' }])

        const memberChannels = channels.filter(ch => level >= ch.minTier)
        for (const ch of memberChannels) {
          const channel = client.chat.channel('messaging', ch.id)
          await channel.addMembers([{ user_id: streamUserId }])
        }
        added++
      } catch (err: any) {
        console.error(`[stream-backfill] Failed for ${u.id}:`, err.message)
        errors++
      }
    }

    if (users.length < limit) break
    offset += limit
  }

  console.log(`[stream-backfill] Done. Added: ${added}, Skipped: ${skipped}, Errors: ${errors}`)
  return new Response(JSON.stringify({ success: true, added, skipped, errors }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/stream-backfill' }
