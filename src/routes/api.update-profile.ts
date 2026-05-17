import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/update-profile')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const headers = {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        }

        const clerkSecret = process.env.CLERK_SECRET_KEY
        if (!clerkSecret) {
          return new Response(JSON.stringify({ error: 'Missing CLERK_SECRET_KEY' }), { status: 500, headers })
        }

        try {
          const { userId, bio, location } = await request.json()

          if (!userId) {
            return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers })
          }

          const getRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
            headers: { Authorization: `Bearer ${clerkSecret}` },
          })
          const existing = await getRes.json()
          const existingMeta = existing.public_metadata || {}

          const patchRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${clerkSecret}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              public_metadata: {
                ...existingMeta,
                ...(bio !== undefined && { bio }),
                ...(location !== undefined && { location }),
              },
            }),
          })

          if (!patchRes.ok) {
            const err = await patchRes.text()
            return new Response(JSON.stringify({ error: err }), { status: 500, headers })
          }

          return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
        } catch (err: any) {
          console.error('update-profile exception:', err)
          return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
        }
      },
    },
  },
})
