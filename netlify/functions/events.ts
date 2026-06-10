import { createClient } from '@supabase/supabase-js'
import { requireAuth, requireAdmin2, tierLevel } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

const TIER_NAMES: Record<string, string> = {
  free: 'Watchman', watchman: 'Watchman', soldier: 'Soldier',
  commander: 'Commander', general: 'General',
}

function gateZoomLink(event: any, userLevel: number): any {
  const requiredLevel = tierLevel(event.zoom_link_tier)
  if (userLevel >= requiredLevel) return event
  return { ...event, zoom_link: null, zoom_link_blocked: true, zoom_link_required_tier: event.zoom_link_tier }
}

async function sendEventEmail(type: 'event-published' | 'event-reminder', event: any, to: string) {
  try {
    await fetch(`${process.env.URL || 'https://warroomintel.com'}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' },
      body: JSON.stringify({
        type,
        to,
        eventTitle:       event.title,
        eventDate:        event.event_date,
        eventType:        event.event_type,
        eventDescription: event.description,
        eventId:          event.id,
        joinLink:         event.zoom_link || null,
        tierName:         TIER_NAMES[event.zoom_link_tier?.toLowerCase() || 'free'] || 'Watchman',
      }),
    })
  } catch { /* don't fail the main request on email error */ }
}

async function blastEventEmail(type: 'event-published' | 'event-reminder', event: any) {
  try {
    const requiredLevel = tierLevel(event.zoom_link_tier)
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
        const uTier = (u.public_metadata?.tier as string || 'free').toLowerCase()
        const uRole = (u.public_metadata?.role as string || '').toLowerCase()
        const uLevel = uRole === 'commandant' ? 5
          : (uRole === 'minister' || uRole === 'admin') ? 4
          : tierLevel(uTier)
        if (uLevel < requiredLevel) continue
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
    const authResult = await requireAuth(req)
    const userLevel  = authResult instanceof Response ? 0 : authResult.level
    const isAdmin    = authResult instanceof Response ? false : authResult.isAdmin

    if (id) {
      let q = supabase.from('events').select('*').eq('id', id)
      if (!isAdmin) q = q.eq('is_published', true)
      const { data, error } = await q.single()
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 404, headers })
      return new Response(JSON.stringify({ event: gateZoomLink(data, userLevel) }), { status: 200, headers })
    }

    const upcoming    = url.searchParams.get('upcoming')
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
    const events = (data || []).map(e => gateZoomLink(e, userLevel))
    return new Response(JSON.stringify({ events }), { status: 200, headers })
  }

  // ── Auth required for write operations ─────────────────────────────────────
  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

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
