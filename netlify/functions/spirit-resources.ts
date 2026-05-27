import { createClient } from '@supabase/supabase-js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

const TIER_ORDER: Record<string, number> = { free: 0, watchman: 0, soldier: 1, commander: 2, general: 3, minister: 4 }

async function getUserTier(token: string): Promise<number> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return 0
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return 0
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return 0
    const data = await res.json()
    const tier = (data?.public_metadata?.tier as string)?.toLowerCase() || 'free'
    const role = (data?.public_metadata?.role as string)?.toLowerCase() || ''
    if (role === 'minister') return TIER_ORDER.minister
    return TIER_ORDER[tier] ?? 0
  } catch { return 0 }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })

  // Determine user tier (anonymous = 0, so only free-tier resources show)
  let userTierNum = 0
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (token) userTierNum = await getUserTier(token)

  const url     = new URL(req.url)
  const spirit  = url.searchParams.get('spirit') || ''
  const category = url.searchParams.get('category') || ''

  if (!spirit) return new Response(JSON.stringify({ resources: [] }), { status: 200, headers })

  try {
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

    // Build tier filter — include resources up to user's tier
    const tierNames = Object.entries(TIER_ORDER)
      .filter(([, n]) => n <= userTierNum)
      .map(([t]) => t)
    if (!tierNames.includes('free')) tierNames.push('free', 'watchman')

    console.log('[SPIRIT-RESOURCES] spirit param:', spirit, '| category:', category, '| tier:', userTierNum)

    // spirit_tags is text[] — use .cs (array contains) for tag matching, ilike for title/topic text fallback
    const orClauses = [
      `spirit_tags.cs.{${spirit}}`,
      `title.ilike.%${spirit}%`,
      `topic.ilike.%${spirit}%`,
    ]
    if (category) orClauses.push(`spirit_tags.cs.{${category}}`)

    const { data, error } = await sb
      .from('resources')
      .select('id, title, topic, function_tags, tier, spirit_tags')
      .in('tier', tierNames)
      .or(orClauses.join(','))
      .limit(5)

    console.log('[SPIRIT-RESOURCES] results:', data?.length ?? 0, '| error:', error?.message ?? null)

    if (error) {
      // Gracefully handle if spirit_tags column doesn't exist yet
      if (error.message?.includes('spirit_tags')) {
        return new Response(JSON.stringify({ resources: [] }), { status: 200, headers })
      }
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    }

    return new Response(JSON.stringify({ resources: data || [] }), { status: 200, headers })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers })
  }
}

export const config = { path: '/api/spirit-resources' }
