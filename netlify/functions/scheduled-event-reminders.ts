import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const TIER_LEVEL: Record<string, number> = {
  free: 0, watchman: 0, soldier: 1, commander: 2, general: 3, minister: 4,
}

export default async function handler() {
  const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

  const now = new Date()
  const windowStart = new Date(now.getTime() + 55 * 60 * 1000).toISOString()
  const windowEnd   = new Date(now.getTime() + 65 * 60 * 1000).toISOString()

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('is_published', true)
    .eq('reminder_sent', false)
    .gte('event_date', windowStart)
    .lte('event_date', windowEnd)

  if (!events || events.length === 0) return new Response('No events in window', { status: 200 })

  for (const event of events) {
    const requiredLevel = TIER_LEVEL[event.zoom_link_tier?.toLowerCase() || 'free'] ?? 0

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

        try {
          await fetch(`${process.env.URL || 'https://warroomintel.com'}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' },
            body: JSON.stringify({
              type: 'event-reminder',
              to: email,
              eventTitle: event.title,
              eventDate: event.event_date,
              eventId: event.id,
              joinLink: event.zoom_link || null,
            }),
          })
        } catch { /* continue on individual send failure */ }
      }

      if (users.length < limit) break
      offset += limit
    }

    await supabase.from('events').update({ reminder_sent: true }).eq('id', event.id)
  }

  return new Response(JSON.stringify({ sent: events.length }), { status: 200 })
}

export const config = { schedule: '0 * * * *' }
