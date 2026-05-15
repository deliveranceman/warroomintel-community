import { createFileRoute } from '@tanstack/react-router'

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY

export const Route = createFileRoute('/api/user-tier')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Read session token from Authorization header (Bearer <session_token>)
        const auth = request.headers.get('Authorization') || ''
        const sessionToken = auth.replace('Bearer ', '').trim()

        if (!sessionToken || !CLERK_SECRET_KEY) {
          return Response.json({ tier: 'Free', authenticated: false })
        }

        try {
          // Verify the session and get the user
          const verifyRes = await fetch('https://api.clerk.com/v1/sessions/verify', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
              'Content-Type':  'application/json',
            },
            body: JSON.stringify({ token: sessionToken }),
          })

          if (!verifyRes.ok) {
            return Response.json({ tier: 'Free', authenticated: false })
          }

          const session = await verifyRes.json()
          const userId  = session?.user_id

          if (!userId) {
            return Response.json({ tier: 'Free', authenticated: false })
          }

          // Fetch the user's public metadata
          const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${CLERK_SECRET_KEY}` },
          })

          if (!userRes.ok) {
            return Response.json({ tier: 'Free', authenticated: true })
          }

          const user = await userRes.json()
          const tier = (user?.public_metadata?.tier as string) || 'Free'

          return Response.json({ tier, authenticated: true, userId })
        } catch (err: any) {
          console.error('[user-tier] error:', err.message)
          return Response.json({ tier: 'Free', authenticated: false })
        }
      },
    },
  },
})
