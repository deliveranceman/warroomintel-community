import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const supabase = createClient(
  supabaseUrl!,
  supabaseServiceKey!
)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

const TIER_LEVEL: Record<string, number> = {
  free: 0, watchman: 0, soldier: 1, commander: 2, general: 3, minister: 4,
}

const TIER_NAMES: Record<string, string> = {
  free: 'Watchman', watchman: 'Watchman', soldier: 'Soldier',
  commander: 'Commander', general: 'General',
}

async function resolveUser(token: string): Promise<{ userId: string; tier: string; role: string; email: string } | null> {
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
    const email = userData.email_addresses?.[0]?.email_address || ''
    return { userId, tier, role, email }
  } catch { return null }
}

function gateZoomLink(event: any, userTier: string, userRole: string): any {
  const requiredLevel = TIER_LEVEL[event.zoom_link_tier?.toLowerCase() || 'free'] ?? 0
  const userLevel = userRole === 'minister' ? 4 : (TIER_LEVEL[userTier] ?? 0)
  if (userLevel >= requiredLevel) return event
  return { ...event, zoom_link: null, zoom_link_blocked: true, zoom_link_required_tier: event.zoom_link_tier }
}

async function sendEventEmail(type: 'event-published' | 'event-reminder', event: any, to: string) {
  try {
    await fetch(`${process.env.URL || 'https://warroomintel.com'}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        to,
        eventTitle: event.title,
        eventDate: event.event_date,
        eventType: event.event_type,
        eventDescription: event.description,
        eventId: event.id,
        joinLink: event.zoom_link || null,
        tierName: TIER_NAMES[event.zoom_link_tier?.toLowerCase() || 'free'] || 'Watchman',
      }),
    })
  } catch { /* don't fail the main request on email error */ }
}

async function blastEventEmail(type: 'event-published' | 'event-reminder', event: any) {
  try {
    const requiredLevel = TIER_LEVEL[event.zoom_link_tier?.toLowerCase() || 'free'] ?? 0
    // Page through Clerk users (max 500 per page)
    let offset = 0
    const limit = 200
    while (true) {
      const res = await fetch(`https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}`, {
        headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
      })
      if (!res.ok) break
      const users = await res.json()
      if (!Array.isArray(users) || users.length === 0) break
      for (const u of users) {
        const tier = (u.public_metadata?.tier as string || 'free').toLowerCase()
        const role = (u.public_metadata?.role as string || 'member').toLowerCase()
        const userLevel = role === 'minister' ? 4 : (TIER_LEVEL[tier] ?? 0)
        if (userLevel < requiredLevel) continue
        const email = u.email_addresses?.[0]?.email_address
        if (!email) continue
        await sendEventEmail(type, event, email)
      }
      if (users.length < limit) break
      offset += limit
    }
  } catch { /* ignore blast errors */ }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const url = new URL(req.url)
  const id  = url.searchParams.get('id')

  // ── GET — published events, including recent past (within 2 hours) ──────────
  if (req.method === 'GET') {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
    let userTier = 'free'
    let userRole = 'member'
    if (token) {
      const auth = await resolveUser(token)
      if (auth) { userTier = auth.tier; userRole = auth.role }
    }

    const isAdmin = userRole === 'minister'

    if (id) {
      let q = supabase.from('events').select('*').eq('id', id)
      if (!isAdmin) q = q.eq('is_published', true)
      const { data, error } = await q.single()
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 404, headers })
      return new Response(JSON.stringify({ event: gateZoomLink(data, userTier, userRole) }), { status: 200, headers })
    }

    const upcoming = url.searchParams.get('upcoming')
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    let query = supabase.from('events').select('*').order('event_date', { ascending: true })
    if (!isAdmin) {
      query = query.eq('is_published', true)
      if (upcoming === 'true') {
        query = query.gte('event_date', new Date().toISOString())
      } else {
        query = query.gte('event_date', twoHoursAgo)
      }
    }
    const { data, error } = await query
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    const events = (data || []).map(e => gateZoomLink(e, userTier, userRole))
    return new Response(JSON.stringify({ events }), { status: 200, headers })
  }

  // ── Auth required for write operations ─────────────────────────────────────
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const auth = await resolveUser(token)
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  if (auth.role !== 'minister') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })

  // ── POST — create event ─────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = await req.json()
    const { data, error } = await supabase.from('events').insert([body]).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    if (data.is_published) {
      blastEventEmail('event-published', data) // fire-and-forget
    }
    return new Response(JSON.stringify({ event: data }), { status: 200, headers })
  }

  // ── PATCH — update event ────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })
    // Fetch current state to detect first-publish
    const { data: before } = await supabase.from('events').select('is_published').eq('id', id).single()
    const body = await req.json()
    const { data, error } = await supabase.from('events').update(body).eq('id', id).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    // Blast email only on first publish
    if (!before?.is_published && data.is_published) {
      blastEventEmail('event-published', data)
    }
    return new Response(JSON.stringify({ event: data }), { status: 200, headers })
  }

  // ── DELETE — soft delete (unpublish) ────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })
    const { error } = await supabase.from('events').update({ is_published: false }).eq('id', id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/events' }
