import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/stream-token')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const STREAM_API_KEY    = process.env.STREAM_API_KEY
        const STREAM_API_SECRET = process.env.STREAM_API_SECRET
        const CLERK_SECRET_KEY  = process.env.CLERK_SECRET_KEY

        const auth = request.headers.get('Authorization') || ''
        const sessionToken = auth.replace('Bearer ', '').trim()

        if (!sessionToken || !CLERK_SECRET_KEY || !STREAM_API_KEY || !STREAM_API_SECRET) {
          return Response.json({ error: 'Unauthorized — check STREAM_API_KEY, STREAM_API_SECRET, CLERK_SECRET_KEY env vars' }, { status: 401 })
        }

        try {
          // Verify Clerk session
          const verifyRes = await fetch('https://api.clerk.com/v1/sessions/verify', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
              'Content-Type':  'application/json',
            },
            body: JSON.stringify({ token: sessionToken }),
          })

          if (!verifyRes.ok) {
            return Response.json({ error: 'Invalid session' }, { status: 401 })
          }

          const session = await verifyRes.json()
          const userId  = session?.user_id

          if (!userId) {
            return Response.json({ error: 'No user ID' }, { status: 401 })
          }

          // Generate Stream user token
          const { StreamChat } = await import('stream-chat')
          const serverClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET)
          const token = serverClient.createToken(userId)

          return Response.json({ token, userId })
        } catch (err: any) {
          console.error('[stream-token] error:', err.message)
          return Response.json({ error: 'Server error' }, { status: 500 })
        }
      },
    },
  },
})
