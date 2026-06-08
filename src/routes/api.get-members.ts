import { createFileRoute } from '@tanstack/react-router'
import { requireTier } from '../../netlify/functions/_shared/access'

export const Route = createFileRoute('/api/get-members')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authRes = await requireTier(request, 1)
        if (authRes instanceof Response) return authRes
        const headers = {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        }

        const clerkSecret = process.env.CLERK_SECRET_KEY
        if (!clerkSecret) {
          return new Response(JSON.stringify({ error: 'Missing CLERK_SECRET_KEY' }), { status: 500, headers })
        }

        try {
          const res = await fetch('https://api.clerk.com/v1/users?limit=500', {
            headers: {
              Authorization: `Bearer ${clerkSecret}`,
              'Content-Type': 'application/json',
            },
          })

          if (!res.ok) {
            const err = await res.text()
            console.error('Clerk API error:', err)
            return new Response(JSON.stringify({ error: err }), { status: 500, headers })
          }

          const raw = await res.json()
          const users = Array.isArray(raw) ? raw : (raw.data || raw.users || [])

          const members = users.map((u: any) => ({
            id: u.id,
            firstName: u.first_name || '',
            lastName: u.last_name || '',
            username: u.username || '',
            imageUrl: u.image_url || '',
            publicMetadata: {
              tier: u.public_metadata?.tier || 'Watchman',
              role: u.public_metadata?.role || 'member',
              bio: u.public_metadata?.bio || '',
              location: u.public_metadata?.location || '',
            },
          }))

          return new Response(JSON.stringify({ members }), { status: 200, headers })
        } catch (err: any) {
          console.error('get-members exception:', err)
          return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
        }
      },
    },
  },
})
