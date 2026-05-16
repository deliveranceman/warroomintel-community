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
        const CLERK_SECRET_KEY  = process.env.CLERK_SECRET_KEY
        const STREAM_API_KEY    = process.env.STREAM_API_KEY
        const STREAM_API_SECRET = process.env.STREAM_API_SECRET

        if (!CLERK_SECRET_KEY || !STREAM_API_KEY || !STREAM_API_SECRET) {
          return Response.json({ error: 'Missing env vars' }, { status: 500 })
        }

        const auth = request.headers.get('Authorization') ?? ''
        if (!auth.startsWith('Bearer ')) {
          return Response.json({ error: 'No token' }, { status: 401 })
        }
        const sessionToken = auth.slice(7)

        try {
          // Verify Clerk session via REST API — no SDK
          const verify = await fetch('https://api.clerk.com/v1/sessions/verify', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: sessionToken }),
          })

          if (!verify.ok) {
            return Response.json({ error: 'Invalid Clerk session' }, { status: 401 })
          }

          const session = await verify.json()
          const userId  = session?.user_id ?? session?.sub
          if (!userId) {
            return Response.json({ error: 'No user ID' }, { status: 401 })
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
