import { StreamChat } from 'stream-chat'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

const TIER_LEVEL: Record<string, number> = {
  watchman: 0, free: 0, soldier: 1, charter_soldier: 1,
  commander: 2, charter_commander: 2, general: 3, founding_general: 3, minister: 4,
}

const CHANNELS = [
  { id: 'war-room-general',   name: 'War Room Community', minTier: 0 },
  { id: 'field-reports-live', name: 'Field Reports Live',  minTier: 1 },
  { id: 'commanders-room',    name: 'Commanders Room',     minTier: 2 },
  { id: 'generals-table',     name: "General's Table",     minTier: 3 },
]

function tierNum(tier: string): number {
  return TIER_LEVEL[(tier || '').toLowerCase()] ?? 0
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  const internalKey = process.env.INTERNAL_API_KEY
  const receivedKey = req.headers.get('x-internal-key') || req.headers.get('x-internal-api-key') || req.headers.get('X-Internal-Key') || req.headers.get('Authorization')?.replace('Bearer ', '') || ''
  console.log('INTERNAL_API_KEY set:', !!internalKey, 'match:', receivedKey === internalKey)

  if (!internalKey || receivedKey !== internalKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  }

  const streamApiKey    = process.env.VITE_STREAM_API_KEY || process.env.STREAM_API_KEY
  const streamApiSecret = process.env.STREAM_API_SECRET
  const clerkSecret     = process.env.CLERK_SECRET_KEY

  console.log('STREAM_API_KEY set:', !!streamApiKey)
  console.log('STREAM_API_SECRET set:', !!streamApiSecret)
  console.log('CLERK_SECRET_KEY set:', !!clerkSecret)

  if (!streamApiKey || !streamApiSecret || !clerkSecret) {
    return new Response(JSON.stringify({ error: 'Missing credentials', streamApiKey: !!streamApiKey, streamApiSecret: !!streamApiSecret, clerkSecret: !!clerkSecret }), { status: 500, headers: HEADERS })
  }

  // Use stream-chat SDK — the stable server-side SDK
  const serverClient = new StreamChat(streamApiKey, streamApiSecret)

  // Upsert a system user used as channel creator
  await serverClient.upsertUser({ id: 'system', name: 'War Room Intel', role: 'admin' })

  // Create all 4 channels — no-op if they already exist
  for (const ch of CHANNELS) {
    try {
      const channel = serverClient.channel('messaging', ch.id, { name: ch.name, created_by_id: 'system' })
      await channel.create()
      console.log(`[stream-backfill] Channel ${ch.id} ready`)
    } catch (e: any) {
      console.log(`[stream-backfill] Channel ${ch.id}:`, e.message)
    }
  }

  let offset = 0
  const limit = 100
  let added = 0
  let skipped = 0
  const errorList: { userId: string; channel: string; reason: string; code?: number }[] = []
  const skippedList: { userId: string; reason: string }[] = []

  while (true) {
    const res = await fetch(`https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}`, {
      headers: { Authorization: `Bearer ${clerkSecret}` },
    })
    if (!res.ok) {
      console.error('[stream-backfill] Clerk fetch failed:', res.status)
      break
    }

    const users = await res.json()
    if (!Array.isArray(users) || users.length === 0) break

    console.log(`[stream-backfill] Processing ${users.length} users at offset ${offset}`)
    if (offset === 0 && users.length > 0) {
      console.log('First user sample:', { id: users[0]?.id, tier: users[0]?.public_metadata?.tier })
    }

    // Batch upsert all users first — Stream requires users to exist before addMembers
    try {
      await serverClient.upsertUsers(users.map((u: any) => ({
        id:   u.id.replace(/[^a-zA-Z0-9_-]/g, '_'),
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Warrior',
        role: 'user',
      })))
      console.log(`[stream-backfill] Upserted ${users.length} Stream users`)
    } catch (e: any) {
      console.error('[stream-backfill] upsertUsers batch failed:', e.message)
    }

    // Add each user to their eligible channels — track per-channel errors
    for (const u of users) {
      const streamUserId = u.id.replace(/[^a-zA-Z0-9_-]/g, '_')
      const rawTier = u.public_metadata?.tier as string | undefined
      // Default users with no tier to watchman — they get war-room-general, not counted as errors
      const tier  = rawTier || 'watchman'
      const level = tierNum(tier)

      if (!rawTier) {
        skipped++
        skippedList.push({ userId: u.id, reason: 'no tier set — defaulted to watchman' })
      }

      const memberChannels = CHANNELS.filter(ch => level >= ch.minTier)
      let userFullyAdded = true

      for (const ch of memberChannels) {
        try {
          const channel = serverClient.channel('messaging', ch.id)
          await channel.addMembers([streamUserId])
        } catch (err: any) {
          userFullyAdded = false
          const detail = {
            userId:  u.id,
            channel: ch.id,
            reason:  err.message || String(err),
            code:    err.response?.status ?? err.status ?? err.code ?? undefined,
          }
          console.error('[stream-backfill] Failed:', JSON.stringify(detail))
          errorList.push(detail)
        }
      }

      if (userFullyAdded) added++
    }

    if (users.length < limit) break
    offset += limit
  }

  const errors = errorList.length
  console.log(`[stream-backfill] Done. Added: ${added}, Skipped: ${skipped}, Errors: ${errors}`)
  return new Response(JSON.stringify({ success: true, added, skipped, errors, errorList, skippedList }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/stream-backfill' }
