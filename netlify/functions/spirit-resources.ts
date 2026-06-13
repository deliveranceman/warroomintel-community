import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

const TIER_ORDER: Record<string, number> = { free: 0, watchman: 0, soldier: 1, commander: 2, general: 3, minister: 4 }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })

  // Determine user tier from the VERIFIED Clerk record. This endpoint stays open
  // to anonymous callers (tier 0 → only free-tier resources); a token is verified
  // when present, so the tier used for filtering can't be forged.
  let userTierNum = 0
  const auth = await requireAuth(req)
  if (!(auth instanceof Response)) userTierNum = auth.level

  const url     = new URL(req.url)
  const spirit  = url.searchParams.get('spirit') || ''
  const category = url.searchParams.get('category') || ''

  if (!spirit) return new Response(JSON.stringify({ resources: [] }), { status: 200, headers })

  try {
    const sb = createClient(supabaseUrl!, supabaseServiceKey!)

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

    const spiritLower = spirit.toLowerCase()
    const extOrClauses = [
      ...orClauses,
      `description.ilike.%${spiritLower}%`,
    ]

    const { data, error } = await sb
      .from('resources')
      .select('id, title, topic, function_tags, tier, spirit_tags, description, file_url:file_path')
      .neq('topic', 'ministry-library')
      .in('tier', tierNames)
      .or(extOrClauses.join(','))
      .order('created_at', { ascending: false })
      .limit(10)

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
