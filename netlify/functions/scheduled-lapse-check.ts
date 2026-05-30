// Runs daily — downgrades members who haven't logged in for 6+ months

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000
const PAID_TIERS = new Set(['soldier', 'commander', 'general'])

async function listClerkUsers(page: number, limit = 100): Promise<any[]> {
  const offset = page * limit
  const res = await fetch(
    `https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}&order_by=-created_at`,
    { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } }
  )
  if (!res.ok) return []
  return res.json()
}

async function downgradeUser(userId: string, currentMeta: Record<string, any>): Promise<void> {
  await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      public_metadata: {
        ...currentMeta,
        tier: 'watchman',
        lapseDowngradedAt: new Date().toISOString(),
        preLapseTier: currentMeta.tier,
      },
    }),
  })
}

export default async function handler() {
  console.log('🕐 Lapse check starting...')
  const cutoff = Date.now() - SIX_MONTHS_MS
  let page = 0
  let totalChecked = 0
  let totalDowngraded = 0

  while (true) {
    const users = await listClerkUsers(page)
    if (!users.length) break

    for (const user of users) {
      totalChecked++
      const meta = user.public_metadata || {}
      const tier = (meta.tier || 'watchman').toLowerCase()

      if (!PAID_TIERS.has(tier)) continue
      if (meta.foundingMember || meta.foundingGeneral) continue

      const lastLogin = meta.last_login_at ? new Date(meta.last_login_at).getTime() : null
      if (lastLogin !== null && lastLogin > cutoff) continue

      // Skip users created recently (< 6 months) even if no last_login_at
      const createdAt = new Date(user.created_at).getTime()
      if (!lastLogin && createdAt > cutoff) continue

      await downgradeUser(user.id, meta)
      totalDowngraded++
      console.log(`⬇ Lapse downgrade: ${user.id} (${tier} → watchman), last login: ${meta.last_login_at || 'never'}`)
    }

    if (users.length < 100) break
    page++
  }

  console.log(`✅ Lapse check done. Checked: ${totalChecked}, Downgraded: ${totalDowngraded}`)
}

export const config = { schedule: '@daily' }
