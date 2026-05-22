import { createClient } from '@supabase/supabase-js'

const CLERK_SECRET = process.env.CLERK_SECRET_KEY!
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!

const TIER_ORDER: Record<string, number> = { Free: 0, Soldier: 1, Commander: 2, General: 3 }

async function verifyAndGetTier(token: string): Promise<{ userId: string; tier: string } | null> {
  const verifyRes = await fetch('https://api.clerk.com/v1/sessions/verify', {
    method: 'POST',
    headers: { Authorization: `Bearer ${CLERK_SECRET}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }),
  })
  if (!verifyRes.ok) return null
  const session = await verifyRes.json()
  const userId = session.user_id
  if (!userId) return null

  const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: { Authorization: `Bearer ${CLERK_SECRET}` },
  })
  if (!userRes.ok) return null
  const userData = await userRes.json()
  const tier = (userData.public_metadata?.tier as string) || 'Free'
  return { userId, tier }
}

export default async function handler(req: Request) {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const auth = await verifyAndGetTier(token)
  if (!auth) return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 })

  const userTierLevel = TIER_ORDER[auth.tier] ?? 0
  // User sees their tier and all tiers below
  const allowedTiers  = Object.entries(TIER_ORDER)
    .filter(([, lvl]) => lvl <= userTierLevel)
    .map(([t]) => t)

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const { data, error } = await supabase
    .from('resources')
    .select('id, title, description, tier, category, file_path, file_type, file_size, created_at')
    .in('tier', allowedTiers)
    .order('tier').order('category').order('title')

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  return new Response(JSON.stringify({ resources: data, userTier: auth.tier }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = { path: '/api/arsenal-resources' }
