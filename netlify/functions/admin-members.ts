import { requireAdmin2, CORS as headers } from './_shared/access'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

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

    const getTier = (u: any): string =>
      (u.public_metadata?.tier || u.publicMetadata?.tier || 'watchman').toLowerCase()

    console.log('[admin-members] All user tiers:',
      allUsers.map((u: any) => getTier(u)))

    for (const u of allUsers) {
      const tier = getTier(u)
      const role = (u.public_metadata?.role as string)?.toLowerCase() || ''
      // minister role overrides tier
      const key = role === 'minister' ? 'minister'
        : (['general', 'commander', 'soldier', 'watchman', 'free'].includes(tier) ? tier : 'watchman')
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
