import { createFileRoute } from '@tanstack/react-router'

const { token: airtableToken, membersBase: airtableMembersBase, membersTable: airtableMembersTable } = JSON.parse(process.env.AIRTABLE || '{}')

// ─── ENV ─────────────────────────────────────────────────────────────────────
const AIRTABLE_TOKEN         = airtableToken
const AIRTABLE_MEMBERS_BASE  = airtableMembersBase
const AIRTABLE_MEMBERS_TABLE = airtableMembersTable

// ─── ROUTE ───────────────────────────────────────────────────────────────────
// Called with ?email=member@email.com from the client
// Returns { tier, name, email } or { error }
export const Route = createFileRoute('/api/mn-verify')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url   = new URL(request.url)
        const token = url.searchParams.get('token')?.trim()
        const email = url.searchParams.get('email')?.toLowerCase().trim()

        if (!token && !email) {
          return Response.json({ error: 'email or token required' }, { status: 400 })
        }

        if (!AIRTABLE_TOKEN || !AIRTABLE_MEMBERS_BASE || !AIRTABLE_MEMBERS_TABLE) {
          // Airtable not configured — allow free access (email flow only)
          if (email) return Response.json({ tier: 'Free', name: '', email, fallback: true })
          return Response.json({ error: 'not_found' }, { status: 404 })
        }

        try {
          const formula = token
            ? `{Access Token} = "${token}"`
            : `{Email} = "${email}"`

          const atUrl = `https://api.airtable.com/v0/${AIRTABLE_MEMBERS_BASE}/${AIRTABLE_MEMBERS_TABLE}` +
            `?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`

          const res = await fetch(atUrl, {
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
          })

          if (!res.ok) {
            const detail = await res.text()
            console.error('[mn-verify] Airtable error', { status: res.status, token, email, detail })
            if (token) return Response.json({ error: 'not_found' }, { status: 404 })
            return Response.json({ tier: 'Free', name: '', email, fallback: true })
          }

          const data = await res.json()
          const record = data.records?.[0]

          if (!record) {
            return Response.json({ error: 'not_found', ...(email ? { email } : {}) }, { status: 404 })
          }

          const fields    = record.fields
          const tier      = fields['Tier'] || 'Free'
          const firstName = fields['First Name'] || ''
          const lastName  = fields['Last Name']  || ''
          const name      = [firstName, lastName].filter(Boolean).join(' ')
          const resolvedEmail = fields['Email'] || email || ''

          return Response.json({ tier, name, email: resolvedEmail })

        } catch (err: any) {
          console.error('[mn-verify] unexpected error', { token, email, error: err.message })
          if (token) return Response.json({ error: 'not_found' }, { status: 404 })
          return Response.json({ tier: 'Free', name: '', email, fallback: true })
        }
      },
    },
  },
})
