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
        const STREAM_API_KEY    = process.env.STREAM_API_KEY
        const STREAM_API_SECRET = process.env.STREAM_API_SECRET

        if (!STREAM_API_KEY || !STREAM_API_SECRET) {
          return Response.json({ error: 'Missing env vars' }, { status: 500 })
        }

        const auth = request.headers.get('Authorization') ?? ''
        if (!auth.startsWith('Bearer ')) {
          return Response.json({ error: 'No token' }, { status: 401 })
        }
        const sessionToken = auth.slice(7)

        try {
          // Decode Clerk JWT locally — extract sub claim without a network round-trip
          const parts = sessionToken.split('.')
          if (parts.length !== 3) throw new Error('Bad token format')

          const payload = JSON.parse(
            atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
          )
          const userId = payload.sub
          if (!userId) throw new Error('No sub claim in token')

          const token = await makeStreamJWT({ user_id: userId }, STREAM_API_SECRET)
          return Response.json({ token, userId, apiKey: STREAM_API_KEY })

        } catch (err: any) {
          return Response.json({ error: 'Invalid token: ' + err.message }, { status: 401 })
        }
      },
    },
  },
})
