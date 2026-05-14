import { createFileRoute } from '@tanstack/react-router'

// ─── ENV ─────────────────────────────────────────────────────────────────────
const MN_API_TOKEN  = process.env.MN_API_TOKEN
const MN_NETWORK_ID = process.env.MN_NETWORK_ID
const MN_API_BASE   = 'https://api.mn.co/admin/v1'

const TIER_ORDER: Record<string, number> = { Free: 0, Soldier: 1, Commander: 2, General: 3 }

// Plan name → WRI tier
function resolveTier(planName: string | undefined): string {
  if (!planName) return 'Free'
  const n = planName.toLowerCase()
  if (n.includes('general'))   return 'General'
  if (n.includes('commander')) return 'Commander'
  if (n.includes('soldier'))   return 'Soldier'
  return 'Free'
}

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

        if (!MN_API_TOKEN || !MN_NETWORK_ID) {
          // MN not configured — allow free access for now
          return Response.json({ tier: 'Free', name: '', email, fallback: true })
        }

        try {
          // Search MN members by email
          const res = await fetch(
            `${MN_API_BASE}/networks/${MN_NETWORK_ID}/members?email=${encodeURIComponent(email)}&per_page=1`,
            { headers: { Authorization: `Bearer ${MN_API_TOKEN}`, 'Content-Type': 'application/json' } }
          )

          if (!res.ok) {
            const detail = await res.text()
            console.error('[mn-verify] MN API error', { status: res.status, email, detail })
            return Response.json({ tier: 'Free', name: '', email, fallback: true })
          }

          const data = await res.json()
          const member = data.members?.[0] || data[0]

          if (!member) {
            // Email not found in MN — offer free signup
            return Response.json({ error: 'not_found', email }, { status: 404 })
          }

          // Get their plan if available
          const planName = member.current_plan?.name || member.plan?.name || ''
          const tier = resolveTier(planName)

          return Response.json({
            tier,
            name: member.full_name || member.name || '',
            email,
            mnId: member.id,
          })

        } catch (err: any) {
          console.error('[mn-verify] unexpected error', { email, error: err.message, stack: err.stack })
          return Response.json({ tier: 'Free', name: '', email, fallback: true })
        }
      },
    },
  },
})
