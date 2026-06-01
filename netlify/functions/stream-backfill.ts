import { StreamClient } from '@stream-io/node-sdk'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

const TIER_LEVEL: Record<string, number> = {
  watchman: 0, free: 0, soldier: 1, charter_soldier: 1,
  commander: 2, charter_commander: 2, general: 3, founding_general: 3, minister: 4,
}

function tierNum(tier: string): number {
  return TIER_LEVEL[(tier || '').toLowerCase()] ?? 0
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  const internalKey = process.env.INTERNAL_API_KEY
  console.log('INTERNAL_API_KEY set:', !!internalKey, 'length:', internalKey?.length)

  if (!internalKey) {
    return new Response(JSON.stringify({ error: 'INTERNAL_API_KEY not configured' }), { status: 401, headers: HEADERS })
  }

  const receivedKey = req.headers.get('x-internal-key') || req.headers.get('x-internal-api-key') || req.headers.get('X-Internal-Key') || req.headers.get('Authorization')?.replace('Bearer ', '') || ''
  console.log('Received key length:', receivedKey.length, 'match:', receivedKey === internalKey)

  if (receivedKey !== internalKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  }

  const streamApiKey    = process.env.VITE_STREAM_API_KEY
  const streamApiSecret = process.env.STREAM_API_SECRET
  const clerkSecret     = process.env.CLERK_SECRET_KEY

  if (!streamApiKey || !streamApiSecret || !clerkSecret) {
    return new Response(JSON.stringify({ error: 'Missing credentials', streamApiKey: !!streamApiKey, streamApiSecret: !!streamApiSecret, clerkSecret: !!clerkSecret }), { status: 500, headers: HEADERS })
  }

  const client = new StreamClient(streamApiKey, streamApiSecret)

  // Ensure system user exists (used as channel creator)
  await client.upsertUsers([{ id: 'system', name: 'War Room Intel', role: 'admin' }])

  const channels = [
    { id: 'war-room-general',   name: 'War Room Community', minTier: 0 },
    { id: 'field-reports-live', name: 'Field Reports Live',  minTier: 1 },
    { id: 'commanders-room',    name: 'Commanders Room',     minTier: 2 },
    { id: 'generals-table',     name: "General's Table",     minTier: 3 },
  ]

  // Ensure all channels exist before adding members
  for (const ch of channels) {
    try {
      await client.chat.channel('messaging', ch.id).getOrCreate({
        data: { created_by_id: 'system', name: ch.name },
      })
      console.log(`[stream-backfill] Channel ${ch.id} ready`)
    } catch (e: any) {
      console.error(`[stream-backfill] Channel create failed for ${ch.id}:`, e.message)
    }
  }

  let offset = 0
  const limit = 100
  let added = 0
  let skipped = 0
  let errors = 0
  const errorDetails: any[] = []

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
        // Upsert user into Stream
        await client.upsertUsers([{ id: streamUserId, name, role: 'user' }])

        // Add to each eligible channel via update() with add_members
        const memberChannels = channels.filter(ch => level >= ch.minTier)
        for (const ch of memberChannels) {
          await client.chat.channel('messaging', ch.id).update({
            add_members: [{ user_id: streamUserId }],
          })
        }
        added++
        console.log(`[stream-backfill] Added ${streamUserId} (${tier}) to ${memberChannels.length} channels`)
      } catch (err: any) {
        errors++
        const errDetail = {
          userId: u.id,
          streamUserId,
          message: err.message,
          stack: err.stack?.split('\n')[0],
          responseStatus: err.status || err.statusCode,
          responseBody: typeof err.body === 'string'
            ? err.body.slice(0, 200)
            : JSON.stringify(err.body || {}).slice(0, 200),
        }
        console.error('[backfill-error]', JSON.stringify(errDetail))
        errorDetails.push(errDetail)
      }
    }

    if (users.length < limit) break
    offset += limit
  }

  console.log(`[stream-backfill] Done. Added: ${added}, Skipped: ${skipped}, Errors: ${errors}`)
  return new Response(JSON.stringify({ success: true, added, skipped, errors, errorDetails }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/stream-backfill' }
