import { createFileRoute } from '@tanstack/react-router'

const AIRTABLE_TOKEN   = process.env.AIRTABLE_TOKEN
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appLPhhHPP5rKvlKT'
// Table ID returned when "Ministry Requests" table was created in Airtable.
// Set AIRTABLE_MINISTRY_REQUESTS_TABLE_ID in env vars after creating the table.
const TABLE_ID = process.env.AIRTABLE_MINISTRY_REQUESTS_TABLE_ID || 'Ministry Requests'

export const Route = createFileRoute('/api/submit-help')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Record<string, unknown>
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
        }

        const fields: Record<string, unknown> = {
          'First Name':        body.firstName        ?? '',
          'Last Name':         body.lastName         ?? '',
          'Email':             body.email            ?? '',
          'Phone':             body.phone            ?? '',
          'State/Country':     body.stateCountry     ?? '',
          'Age Range':         body.ageRange         ?? '',
          'Believer':          body.believer         ?? '',
          'Time Saved':        body.timeSaved        ?? '',
          'In Church':         body.inChurch         ?? '',
          'Previous Ministry': body.previousMinistry ?? '',
          'Experiences':       Array.isArray(body.experiences)
                                 ? (body.experiences as string[]).join(', ')
                                 : (body.experiences ?? ''),
          'Duration':          body.duration         ?? '',
          'Description':       body.description      ?? '',
          'Already Tried':     body.alreadyTried     ?? '',
          'Currently Safe':    body.currentlySafe    ?? '',
          'Contact Method':    body.contactMethod    ?? '',
          'Best Time':         body.bestTime         ?? '',
          'Notes':             body.notes            ?? '',
          'Status':            'New',
          'Submitted':         new Date().toISOString(),
        }

        if (!AIRTABLE_TOKEN) {
          console.warn('[submit-help] AIRTABLE_TOKEN not set — skipping Airtable write')
          return Response.json({ ok: true, warning: 'No Airtable token configured' })
        }

        try {
          const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_ID)}`
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
              'Content-Type':  'application/json',
            },
            body: JSON.stringify({ fields }),
          })

          if (!res.ok) {
            const err = await res.text()
            console.error('[submit-help] Airtable error:', err)
            return Response.json({ error: 'Failed to save to Airtable', detail: err }, { status: 502 })
          }

          const data = await res.json()
          return Response.json({ ok: true, id: data.id })
        } catch (err: any) {
          console.error('[submit-help] fetch error:', err.message)
          return Response.json({ error: 'Server error' }, { status: 500 })
        }
      },
    },
  },
})
