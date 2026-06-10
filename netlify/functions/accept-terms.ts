import { requireAuth } from './_shared/access'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const userId = auth.userId
  const clerkSecret = process.env.CLERK_SECRET_KEY
  if (!clerkSecret) return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers: HEADERS })

  // Fetch current metadata to merge (not overwrite)
  const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: { Authorization: `Bearer ${clerkSecret}` },
  })
  if (!userRes.ok) return new Response(JSON.stringify({ error: 'Failed to fetch user' }), { status: 500, headers: HEADERS })
  const userData = await userRes.json()
  const currentMeta = userData.public_metadata || {}

  const updateRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${clerkSecret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      public_metadata: {
        ...currentMeta,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        terms_version: '1.0',
      },
    }),
  })

  if (!updateRes.ok) {
    const err = await updateRes.text()
    console.error('[accept-terms] Clerk update failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to save acceptance' }), { status: 500, headers: HEADERS })
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/accept-terms' }
