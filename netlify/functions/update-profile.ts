import { requireAuth } from './_shared/access'

const CLERK_SECRET = process.env.CLERK_SECRET_KEY!

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers })

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const { bio, city, state, expertiseTags } = await req.json()

  // Fetch existing metadata to preserve other fields — auth.userId is verified
  const getRes = await fetch(`https://api.clerk.com/v1/users/${auth.userId}`, {
    headers: { Authorization: `Bearer ${CLERK_SECRET}` },
  })
  const existing = await getRes.json()
  const existingMeta = existing.public_metadata || {}

  const patchRes = await fetch(`https://api.clerk.com/v1/users/${auth.userId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${CLERK_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      public_metadata: {
        ...existingMeta,
        ...(bio !== undefined && { bio }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(expertiseTags !== undefined && { expertiseTags }),
      },
    }),
  })

  if (!patchRes.ok) {
    const err = await patchRes.text()
    return new Response(JSON.stringify({ error: err }), { status: 500, headers })
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers })
}

export const config = { path: '/api/update-profile-secure' }
