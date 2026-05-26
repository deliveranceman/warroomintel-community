const headers = {
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const ok = await resolveMinister(token)
  if (!ok) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })

  try {
    const allUsers: any[] = []
    let offset = 0
    const limit = 100

    // Paginate through all Clerk users
    while (true) {
      const res = await fetch(
        `https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}&order_by=-created_at`,
        { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } }
      )
      if (!res.ok) break
      const batch = await res.json()
      if (!Array.isArray(batch) || batch.length === 0) break
      allUsers.push(...batch)
      if (batch.length < limit) break
      offset += limit
    }

    const now = Date.now()
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
    const sevenDaysAgo   = now - 7 * 24 * 60 * 60 * 1000

    const byTier: Record<string, number> = {
      free: 0, watchman: 0, soldier: 0, commander: 0, general: 0, minister: 0,
    }
    let newThisMonth = 0
    let activeThisWeek = 0

    for (const u of allUsers) {
      const tier = (u.public_metadata?.tier as string)?.toLowerCase() || 'free'
      const role = (u.public_metadata?.role as string)?.toLowerCase() || ''
      const key = role === 'minister' ? 'minister' : (byTier[tier] !== undefined ? tier : 'free')
      byTier[key] = (byTier[key] || 0) + 1

      const createdMs = u.created_at || 0
      if (createdMs >= thisMonthStart) newThisMonth++

      const lastSignIn = u.last_sign_in_at || 0
      if (lastSignIn >= sevenDaysAgo) activeThisWeek++
    }

    return new Response(JSON.stringify({
      total: allUsers.length,
      byTier,
      newThisMonth,
      activeThisWeek,
    }), { status: 200, headers })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers })
  }
}

export const config = { path: '/api/admin-members' }
