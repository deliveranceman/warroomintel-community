const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

async function resolveMinister(token: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return false
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return false
    const data = await res.json()
    return data?.public_metadata?.role === 'minister'
  } catch { return false }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'GET') return new Response(JSON.stringify({ error: 'GET required' }), { status: 405, headers: HEADERS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  const ok = await resolveMinister(token)
  if (!ok) return new Response(JSON.stringify({ error: 'Minister role required' }), { status: 403, headers: HEADERS })

  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim() || ''
  if (q.length < 2) return new Response(JSON.stringify({ users: [] }), { status: 200, headers: HEADERS })

  const res = await fetch(
    `https://api.clerk.com/v1/users?query=${encodeURIComponent(q)}&limit=10&order_by=-created_at`,
    { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } }
  )
  if (!res.ok) {
    const err = await res.text()
    return new Response(JSON.stringify({ error: `Clerk query failed: ${err}` }), { status: 500, headers: HEADERS })
  }

  const data = await res.json()
  const users = (Array.isArray(data) ? data : []).map((u: any) => ({
    id: u.id,
    firstName: u.first_name || '',
    lastName: u.last_name || '',
    email: u.email_addresses?.[0]?.email_address || '',
    tier: ((u.public_metadata?.tier || 'watchman') as string).toLowerCase(),
    role: ((u.public_metadata?.role || '') as string).toLowerCase(),
  }))

  return new Response(JSON.stringify({ users }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/admin-user-search' }
