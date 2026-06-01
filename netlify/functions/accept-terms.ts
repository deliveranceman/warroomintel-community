const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })

  let userId: string | null = null
  try {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('bad token')
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    userId = payload.sub || null
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: HEADERS })
  }
  if (!userId) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: HEADERS })

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
