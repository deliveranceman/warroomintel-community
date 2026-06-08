import { StreamChat } from 'stream-chat'
import { requireAdmin2, CORS as HEADERS } from './_shared/access'

const VALID_TIERS = new Set([
  'watchman', 'free', 'soldier', 'charter_soldier',
  'commander', 'charter_commander', 'general', 'founding_general',
])

const TIER_LEVEL: Record<string, number> = {
  watchman: 0, free: 0, soldier: 1, charter_soldier: 1,
  commander: 2, charter_commander: 2, general: 3, founding_general: 3, minister: 4,
}

const STREAM_CHANNELS = [
  { id: 'war-room-general',   minTier: 0 },
  { id: 'field-reports-live', minTier: 1 },
  { id: 'commanders-room',    minTier: 2 },
  { id: 'generals-table',     minTier: 3 },
]

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  let body: any
  try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS }) }

  const { userId, tier, extra } = body
  if (!userId || typeof userId !== 'string') {
    return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: HEADERS })
  }
  if (!tier || !VALID_TIERS.has(tier)) {
    return new Response(JSON.stringify({ error: `Invalid tier. Must be one of: ${[...VALID_TIERS].join(', ')}` }), { status: 400, headers: HEADERS })
  }

  // 1. Fetch current Clerk metadata
  const clerkRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
  })
  if (!clerkRes.ok) {
    const err = await clerkRes.text()
    return new Response(JSON.stringify({ error: `Clerk user not found: ${err}` }), { status: 404, headers: HEADERS })
  }
  const clerkUser = await clerkRes.json()
  const currentMeta = clerkUser.public_metadata || {}

  // 2. Update Clerk publicMetadata (merge, not overwrite)
  const newMeta: Record<string, any> = {
    ...currentMeta,
    tier,
    tierSetAt: new Date().toISOString(),
    tierSetBy: 'admin',
    ...(extra || {}),
  }

  const updateRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ public_metadata: newMeta }),
  })
  if (!updateRes.ok) {
    const err = await updateRes.text()
    return new Response(JSON.stringify({ error: `Clerk update failed: ${err}` }), { status: 500, headers: HEADERS })
  }

  // 3. Sync Stream channel membership
  const streamResults: Record<string, string> = {}
  const _stream = JSON.parse(process.env.STREAM || '{}')
  const streamApiKey    = _stream.apiKey
  const streamApiSecret = _stream.apiSecret

  if (streamApiKey && streamApiSecret) {
    const streamUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_')
    const level = TIER_LEVEL[tier] ?? 0
    const firstName = clerkUser.first_name || ''
    const lastName  = clerkUser.last_name  || ''
    const name = `${firstName} ${lastName}`.trim() || clerkUser.email_addresses?.[0]?.email_address || 'Warrior'

    try {
      const client = new StreamChat(streamApiKey, streamApiSecret)
      await client.upsertUser({ id: streamUserId, name, role: 'user' })

      for (const ch of STREAM_CHANNELS) {
        if (level >= ch.minTier) {
          try {
            const channel = client.channel('messaging', ch.id)
            await channel.addMembers([streamUserId])
            streamResults[ch.id] = 'added'
          } catch (e: any) {
            streamResults[ch.id] = `error: ${e.message}`
          }
        }
      }
    } catch (e: any) {
      console.error('[admin-fix-user-tier] Stream error:', e.message)
    }
  }

  const name = `${clerkUser.first_name || ''} ${clerkUser.last_name || ''}`.trim()
  console.log(`[admin-fix-user-tier] ${userId} (${name}) → ${tier}`, streamResults)

  return new Response(JSON.stringify({
    success: true,
    userId,
    name,
    tier,
    previousTier: currentMeta.tier || null,
    streamChannels: streamResults,
  }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/admin-fix-user-tier' }
