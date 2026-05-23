import { createClient } from '@supabase/supabase-js'

const CLERK_SECRET = process.env.CLERK_SECRET_KEY!
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!

const TIER_ORDER: Record<string, number> = { Free: 0, Soldier: 1, Commander: 2, General: 3, free: 0, soldier: 1, commander: 2, general: 3 }

async function resolveUser(token: string): Promise<{ userId: string; userData: any } | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return null
    const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!userRes.ok) return null
    const userData = await userRes.json()
    return { userId, userData }
  } catch { return null }
}

export default async function handler(req: Request) {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })

  const headers = { 'Content-Type': 'application/json' }
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

  const auth = await resolveUser(token)
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

  const { userId, userData } = auth
  const userTier = (userData?.public_metadata?.tier as string || 'Free')
  const userTierLevel = TIER_ORDER[userTier] ?? 0
  const allowedTiers = Object.entries(TIER_ORDER)
    .filter(([, lvl]) => lvl <= userTierLevel)
    .map(([t]) => t)
    .filter((t, i, arr) => arr.findIndex(x => x.toLowerCase() === t.toLowerCase()) === i)

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  const reqUrl = new URL(req.url)
  const resourceId = reqUrl.searchParams.get('id')
  const action = reqUrl.searchParams.get('action')

  if (action === 'download' && resourceId) {
    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .select('id, title, file_path, mime_type, tier')
      .eq('id', resourceId)
      .single()
    if (resourceError || !resource) return new Response(JSON.stringify({ error: 'Resource not found' }), { status: 404, headers })
    if (!allowedTiers.includes(resource.tier)) return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403, headers })
    const { data, error } = await supabase.storage
      .from('resources')
      .download(resource.file_path)
    if (error || !data) return new Response(JSON.stringify({ error: 'File not found' }), { status: 404, headers })
    const arrayBuffer = await data.arrayBuffer()
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        ...headers,
        'Content-Type': resource.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${resource.title}"`,
      }
    })
  }

  const { data, error } = await supabase
    .from('resources')
    .select('id, title, description, tier, category, file_path, file_type, file_size, created_at')
    .in('tier', allowedTiers)
    .order('tier').order('category').order('title')

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })

  return new Response(JSON.stringify({ resources: data, userTier }), { status: 200, headers })
}

export const config = { path: '/api/arsenal-resources' }
