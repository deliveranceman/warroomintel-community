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
          // Derive userId from Clerk session token — never trust the request body
          const authHeader = request.headers.get('Authorization')
          const sessionToken = authHeader?.replace('Bearer ', '').trim()
          if (!sessionToken) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
          }

          // JWT decode — frontend tokens are JWTs not session tokens
          const parts = sessionToken.split('.')
          if (parts.length !== 3) {
            return new Response(JSON.stringify({ error: 'Invalid token format' }), { status: 401, headers })
          }
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
          const userId = payload.sub
          if (!userId) {
            return new Response(JSON.stringify({ error: 'No user ID in token' }), { status: 401, headers })
          }

          const { bio, city, state } = await request.json()

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
                ...(city !== undefined && { city }),
                ...(state !== undefined && { state }),
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
