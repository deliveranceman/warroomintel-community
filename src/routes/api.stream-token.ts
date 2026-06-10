import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '../../netlify/functions/_shared/access'

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
        const _stream = JSON.parse(process.env.STREAM || '{}')
        const STREAM_API_KEY    = _stream.apiKey
        const STREAM_API_SECRET = _stream.apiSecret

        if (!STREAM_API_KEY || !STREAM_API_SECRET) {
          return Response.json({ error: 'Missing env vars' }, { status: 500 })
        }

        // Verify the caller cryptographically (verifyToken via _shared/access).
        // The Stream token is minted ONLY for the verified user id (claims.sub),
        // never from an unverified token payload. Reading general chat stays
        // open to all authenticated users (level 0).
        const auth = await requireAuth(request)
        if (auth instanceof Response) return auth

        const token = await makeStreamJWT({ user_id: auth.userId }, STREAM_API_SECRET)
        return Response.json({ token, userId: auth.userId, apiKey: STREAM_API_KEY })
      },
    },
  },
})
