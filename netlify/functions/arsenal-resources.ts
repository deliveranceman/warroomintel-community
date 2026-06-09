import { createClient } from '@supabase/supabase-js'
import { requireTier } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey, bucket: supabaseBucket } = JSON.parse(process.env.SUPABASE || '{}')

const SUPABASE_URL = supabaseUrl!
const SUPABASE_KEY = supabaseServiceKey!

const TIER_ORDER: Record<string, number> = { Free: 0, Soldier: 1, Commander: 2, General: 3, free: 0, soldier: 1, commander: 2, general: 3 }


export default async function handler(req: Request) {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })

  const headers = { 'Content-Type': 'application/json' }

  const auth = await requireTier(req, 1)
  if (auth instanceof Response) return auth

  const userTierLevel = TIER_ORDER[auth.tier.toLowerCase()] ?? TIER_ORDER[auth.tier] ?? 0
  // Include BOTH lowercase and title-case variants — the DB has mixed casing
  // (most rows: 'free','soldier','commander'; a few: 'Soldier','Commander')
  // Deduplication was removed because it stripped the lowercase variants that
  // most rows actually use, causing only ~2 title-case rows to match.
  const allowedTiers = Object.entries(TIER_ORDER)
    .filter(([, lvl]) => lvl <= userTierLevel)
    .map(([t]) => t)

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  const reqUrl = new URL(req.url)
  const resourceId = reqUrl.searchParams.get('id')
  const action = reqUrl.searchParams.get('action')
  const searchParam = reqUrl.searchParams.get('search')

  if (action === 'download' && resourceId) {
    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .select('id, title, file_path, file_type, tier')
      .eq('id', resourceId)
      .single()
    if (resourceError || !resource) return new Response(JSON.stringify({ error: 'Resource not found' }), { status: 404, headers })
    if (!allowedTiers.includes(resource.tier)) return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403, headers })
    const { data: signedData, error: signedError } = await supabase.storage
      .from('resources')
      .createSignedUrl(resource.file_path, 3600)
    if (signedError || !signedData?.signedUrl) return new Response(JSON.stringify({ error: 'Could not generate link' }), { status: 500, headers })
    return new Response(JSON.stringify({ url: signedData.signedUrl }), { status: 200, headers })
  }

  // ⚠️ ARSENAL ONLY — source_type = 'arsenal' EXCLUSIVELY
  // All arsenal rows in DB have source_type='arsenal' (set by admin-upload.ts or fixed via migration 2026-06-01)
  // Library rows have source_type='christian'/'intelligence'/'library'
  // NULL fallback was removed — it was the root cause of library data bleeding into Arsenal
  let query = supabase
    .from('resources')
    .select('id, title, description, tier, category, topic, tags, file_path, file_type, file_size, source_type, created_at')
    .in('tier', allowedTiers)
    .eq('source_type', 'arsenal')
    .not('tier', 'is', null)

  if (searchParam) {
    query = query.or(`title.ilike.%${searchParam}%,description.ilike.%${searchParam}%`)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })

  // Generate signed URLs for download links — split by bucket (path format determines bucket)
  const signedMap: Record<string, string> = {}
  const allPaths = (data || []).filter((r: any) => r.file_path).map((r: any) => r.file_path as string)
  const libPaths = allPaths.filter(p => p.startsWith('user_'))
  const resPaths = allPaths.filter(p => !p.startsWith('user_'))
  const bucketName = supabaseBucket || 'resources'
  if (resPaths.length > 0) {
    const { data: signedUrls } = await supabase.storage.from(bucketName).createSignedUrls(resPaths, 3600)
    for (const su of signedUrls || []) {
      if (su.signedUrl && su.path) signedMap[su.path] = su.signedUrl
    }
  }
  if (libPaths.length > 0) {
    const { data: signedUrls } = await supabase.storage.from('ministry-library').createSignedUrls(libPaths, 3600)
    for (const su of signedUrls || []) {
      if (su.signedUrl && su.path) signedMap[su.path] = su.signedUrl
    }
  }
  const resources = (data || []).map((r: any) => ({
    ...r,
    file_url: r.file_path ? (signedMap[r.file_path] || null) : null,
  }))

  return new Response(JSON.stringify({ resources, userTier: auth.tier }), { status: 200, headers })
}

export const config = { path: '/api/arsenal-resources' }
