import type { Context } from '@netlify/functions'

const clerkSecretKey = process.env.CLERK_SECRET_KEY!

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  const sessionToken = authHeader?.replace('Bearer ', '')
  if (!sessionToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  // Verify session token with Clerk to get userId
  const verifyRes = await fetch('https://api.clerk.com/v1/sessions/verify', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${clerkSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ token: sessionToken }),
  })

  if (!verifyRes.ok) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 })
  }

  const session = await verifyRes.json()
  const userId = session.user_id
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Could not identify user' }), { status: 401 })
  }

  const { bio, city, state } = await req.json()

  // Fetch existing metadata to preserve other fields
  const getRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: { Authorization: `Bearer ${clerkSecretKey}` },
  })
  const existing = await getRes.json()
  const existingMeta = existing.public_metadata || {}

  const patchRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${clerkSecretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      public_metadata: {
        ...existingMeta,
        ...(bio !== undefined && { bio }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
      },
    }),
  })

  if (!patchRes.ok) {
    const err = await patchRes.text()
    return new Response(JSON.stringify({ error: err }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = { path: '/api/update-profile-secure' }
