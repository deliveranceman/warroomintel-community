import { createFileRoute } from '@tanstack/react-router'

// Base64url using Web Crypto API only — works in Node.js, Deno, and edge runtimes
function base64url(bytes: Uint8Array | string): string {
  const str = typeof bytes === 'string'
    ? bytes
    : Array.from(bytes, b => String.fromCharCode(b)).join('')
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function makeStreamJWT(payload: Record<string, unknown>, secret: string): Promise<string> {
  const enc    = new TextEncoder()
  const header = base64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body   = base64url(enc.encode(JSON.stringify(payload)))
  const input  = `${header}.${body}`

  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(input))
  return `${input}.${base64url(new Uint8Array(sig))}`
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
          return Response.json({ error: 'Missing env vars or token' }, { status: 401 })
        }

        try {
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

          const token = await makeStreamJWT({ user_id: userId }, STREAM_API_SECRET)
          return Response.json({ token, userId, apiKey: STREAM_API_KEY })
        } catch (err: any) {
          console.error('[stream-token]', err.message)
          return Response.json({ error: 'Server error' }, { status: 500 })
        }
      },
    },
  },
})
