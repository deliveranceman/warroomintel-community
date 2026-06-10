import { createFileRoute } from '@tanstack/react-router'
import { verifyToken } from '@clerk/backend'

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
          // Cryptographically verify the session JWT via @clerk/backend.
          // Derive identity only from verified claims — never trust the raw token.
          let userId: string | undefined
          try {
            const claims = await verifyToken(sessionToken, { secretKey: CLERK_SECRET_KEY })
            userId = claims.sub as string | undefined
          } catch {
            return Response.json({ tier: 'Free', authenticated: false })
          }

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
