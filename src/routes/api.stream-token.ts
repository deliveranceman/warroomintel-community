import { createFileRoute } from '@tanstack/react-router'
import { createHmac } from 'crypto'

// Generate Stream JWT using Node.js built-in crypto — no stream-chat SDK needed
function base64url(input: string | Buffer): string {
  const b64 = Buffer.isBuffer(input)
    ? input.toString('base64')
    : Buffer.from(input).toString('base64')
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function makeStreamJWT(payload: Record<string, unknown>, secret: string): string {
  const header  = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body    = base64url(JSON.stringify(payload))
  const sig     = base64url(createHmac('sha256', secret).update(`${header}.${body}`).digest())
  return `${header}.${body}.${sig}`
}

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
          return Response.json({ error: 'Unauthorized — check STREAM_API_KEY, STREAM_API_SECRET, CLERK_SECRET_KEY' }, { status: 401 })
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
            return Response.json({ error: 'Invalid Clerk session' }, { status: 401 })
          }

          const session = await verifyRes.json()
          const userId  = session?.user_id
          if (!userId) {
            return Response.json({ error: 'No user ID in session' }, { status: 401 })
          }

          // Generate Stream user token — pure JWT, no SDK
          const token = makeStreamJWT({ user_id: userId }, STREAM_API_SECRET)

          return Response.json({ token, userId, apiKey: STREAM_API_KEY })
        } catch (err: any) {
          console.error('[stream-token] error:', err.message)
          return Response.json({ error: 'Server error' }, { status: 500 })
        }
      },
    },
  },
})
