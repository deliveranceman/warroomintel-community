import { createFileRoute } from '@tanstack/react-router'

// ─── ENV ─────────────────────────────────────────────────────────────────────
const AIRTABLE_TOKEN         = process.env.AIRTABLE_TOKEN
const AIRTABLE_MEMBERS_BASE  = process.env.AIRTABLE_MEMBERS_BASE
const AIRTABLE_MEMBERS_TABLE = process.env.AIRTABLE_MEMBERS_TABLE

// ─── ROUTE ───────────────────────────────────────────────────────────────────
// Called with ?email=member@email.com from the client
// Returns { tier, name, email } or { error }
export const Route = createFileRoute('/api/mn-verify')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url   = new URL(request.url)
        const email = url.searchParams.get('email')?.toLowerCase().trim()

        if (!email) {
          return Response.json({ error: 'email required' }, { status: 400 })
        }

        if (!AIRTABLE_TOKEN || !AIRTABLE_MEMBERS_BASE || !AIRTABLE_MEMBERS_TABLE) {
          // Airtable not configured — allow free access
          return Response.json({ tier: 'Free', name: '', email, fallback: true })
        }

        try {
          const formula = `{Email} = "${email}"`
          const atUrl = `https://api.airtable.com/v0/${AIRTABLE_MEMBERS_BASE}/${AIRTABLE_MEMBERS_TABLE}` +
            `?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`

          const res = await fetch(atUrl, {
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
          })

          if (!res.ok) {
            const detail = await res.text()
            console.error('[mn-verify] Airtable error', { status: res.status, email, detail })
            return Response.json({ tier: 'Free', name: '', email, fallback: true })
          }

          const data = await res.json()
          const record = data.records?.[0]

          if (!record) {
            // Not in Airtable yet — fall back to Free
            return Response.json({ error: 'not_found', email }, { status: 404 })
          }

          const fields    = record.fields
          const tier      = fields['Tier'] || 'Free'
          const firstName = fields['First Name'] || ''
          const lastName  = fields['Last Name']  || ''
          const name      = [firstName, lastName].filter(Boolean).join(' ')

          return Response.json({ tier, name, email })

        } catch (err: any) {
          console.error('[mn-verify] unexpected error', { email, error: err.message, stack: err.stack })
          return Response.json({ tier: 'Free', name: '', email, fallback: true })
        }
      },
    },
  },
})
