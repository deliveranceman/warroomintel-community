import { createClient } from '@supabase/supabase-js'

const CLERK_SECRET = process.env.CLERK_SECRET_KEY!
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!
const BUCKET       = process.env.SUPABASE_BUCKET || 'resources'
const EXPIRY_SECS  = 14400 // 4 hours

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

  const url = new URL(req.url)
  const id  = url.searchParams.get('id')
  if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 })

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  const { data: resource, error } = await supabase
    .from('resources')
    .select('tier, file_path')
    .eq('id', id)
    .single()

  if (error || !resource) return new Response(JSON.stringify({ error: 'Resource not found' }), { status: 404 })

  // Check tier access
  const userLevel     = TIER_ORDER[auth.tier] ?? 0
  const resourceLevel = TIER_ORDER[resource.tier] ?? 0
  if (userLevel < resourceLevel) {
    return new Response(JSON.stringify({ error: `${resource.tier} tier required` }), { status: 403 })
  }

  // Generate signed URL
  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(resource.file_path, EXPIRY_SECS)

  if (signErr || !signed?.signedUrl) {
    return new Response(JSON.stringify({ error: 'Could not generate download link' }), { status: 500 })
  }

  return new Response(JSON.stringify({ url: signed.signedUrl }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = { path: '/api/download' }
