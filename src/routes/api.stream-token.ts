import { createFileRoute } from '@tanstack/react-router'

async function makeStreamJWT(payload: object, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now    = Math.floor(Date.now() / 1000)
  const claims = { ...payload, iat: now, exp: now + 3600 }

  const enc = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const unsigned = `${enc(header)}.${enc(claims)}`

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(unsigned))
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  return `${unsigned}.${b64}`
}

export const Route = createFileRoute('/api/stream-token')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const CLERK_SECRET_KEY  = process.env.CLERK_SECRET_KEY
          const STREAM_API_KEY    = process.env.STREAM_API_KEY
          const STREAM_API_SECRET = process.env.STREAM_API_SECRET

          if (!CLERK_SECRET_KEY || !STREAM_API_KEY || !STREAM_API_SECRET) {
            return Response.json({ error: 'Missing env vars' }, { status: 500 })
          }

          const authHeader = request.headers.get('Authorization')
          if (!authHeader?.startsWith('Bearer ')) {
            return Response.json({ error: 'No token' }, { status: 401 })
          }
          const sessionToken = authHeader.slice(7)

          // Verify with Clerk backend SDK
          const { createClerkClient } = await import('@clerk/backend')
          const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY })
          const payload = await clerk.verifyToken(sessionToken)
          const userId = payload.sub
          if (!userId) {
            return Response.json({ error: 'Invalid session' }, { status: 401 })
          }

          const token = await makeStreamJWT({ user_id: userId }, STREAM_API_SECRET)
          return Response.json({ token, userId, apiKey: STREAM_API_KEY })

        } catch (err: any) {
          console.error('[stream-token]', err.message)
          return Response.json({ error: err.message }, { status: 500 })
        }
      },
    },
  },
})
