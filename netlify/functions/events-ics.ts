import { createClient } from '@supabase/supabase-js'

export default async function handler(req: Request) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return new Response('Missing id', { status: 400 })
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (error || !event) return new Response('Event not found', { status: 404 })

  const start = new Date(event.event_date)
  const end = new Date(start.getTime() + (event.duration_minutes || 60) * 60000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const escape = (s: string) => (s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//War Room Intel//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${escape(event.title)}`,
    event.description ? `DESCRIPTION:${escape(event.description)}` : '',
    event.zoom_link ? `LOCATION:${escape(event.zoom_link)}` : '',
    event.zoom_link ? `URL:${event.zoom_link}` : '',
    `UID:wri-event-${event.id}@warroomintel.com`,
    `DTSTAMP:${fmt(new Date())}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  const slug = (event.title || 'wri-event').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}.ics"`,
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export const config = { path: '/api/events-ics' }
