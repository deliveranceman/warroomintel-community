import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

const TIER_LEVEL: Record<string, number> = {
  free: 0, watchman: 0, soldier: 1, commander: 2, general: 3, minister: 4,
}

async function resolveUser(token: string): Promise<{ userId: string; tier: string; role: string } | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return null
    const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!userRes.ok) return null
    const userData = await userRes.json()
    const tier = (userData.public_metadata?.tier as string || 'free').toLowerCase()
    const role = (userData.public_metadata?.role as string || 'member').toLowerCase()
    return { userId, tier, role }
  } catch { return null }
}

function gateZoomLink(event: any, userTier: string, userRole: string): any {
  const requiredLevel = TIER_LEVEL[event.zoom_link_tier?.toLowerCase() || 'free'] ?? 0
  const userLevel = userRole === 'minister' ? 4 : (TIER_LEVEL[userTier] ?? 0)
  if (userLevel >= requiredLevel) return event
  return { ...event, zoom_link: null, zoom_link_blocked: true, zoom_link_required_tier: event.zoom_link_tier }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const url = new URL(req.url)
  const id  = url.searchParams.get('id')

  // ── GET — public (published events only) ─────────────────────────────────
  if (req.method === 'GET') {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
    let userTier = 'free'
    let userRole = 'member'
    if (token) {
      const auth = await resolveUser(token)
      if (auth) { userTier = auth.tier; userRole = auth.role }
    }

    const isAdmin = userRole === 'minister'
    let query = supabase.from('events').select('*').order('event_date', { ascending: true })
    if (!isAdmin) {
      query = query.eq('is_published', true).gte('event_date', new Date().toISOString())
    }
    const { data, error } = await query
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })

    const events = (data || []).map(e => gateZoomLink(e, userTier, userRole))
    return new Response(JSON.stringify({ events }), { status: 200, headers })
  }

  // ── Auth required for write operations ────────────────────────────────────
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const auth = await resolveUser(token)
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  if (auth.role !== 'minister') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })

  // ── POST — create event ───────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = await req.json()
    const { data, error } = await supabase.from('events').insert([body]).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ event: data }), { status: 200, headers })
  }

  // ── PATCH — update event ──────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })
    const body = await req.json()
    const { data, error } = await supabase.from('events').update(body).eq('id', id).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ event: data }), { status: 200, headers })
  }

  // ── DELETE — delete event ─────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/events' }
