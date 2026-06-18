import { createClient } from '@supabase/supabase-js'
import { requireAuth, tierLevel } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey, bucket: supabaseBucket } = JSON.parse(process.env.SUPABASE || '{}')

const SUPABASE_URL = supabaseUrl!
const SUPABASE_KEY = supabaseServiceKey!

// Columns the shelves need. Mirrors arsenal-resources.ts: DB stores file_path, we sign into file_url.
const SHELF_SELECT = 'id, title, description, tier, category, topic, file_path, file_type, featured, created_at'

type Row = {
  id: string
  title: string | null
  description: string | null
  tier: string | null
  category: string | null
  topic: string | null
  file_path: string | null
  file_type: string | null
  featured: boolean | null
  created_at: string | null
}

export default async function handler(req: Request) {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })

  const headers = { 'Content-Type': 'application/json' }

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const userLevel = auth.level
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // Allowed tier list for the "For Your Watch" shelf: every ladder rung at or below the user.
  // Case-normalize at query time — the tier column is mixed-case (watchman/Soldier/Free/etc).
  // PostgREST .in() is exact-match, so include BOTH the lowercase and Title-case form of each
  // allowed rung to emulate LOWER(tier) IN (...). Title-case rows (Soldier/Commander/Free) exist
  // in the data and would otherwise be silently dropped. Mirrors arsenal-resources.ts's dual-casing.
  // 'free' is watchman-equivalent. Followup (out of scope): lowercase-normalize the column to drop this.
  const allowedTiers = ['watchman', 'free', 'soldier', 'commander', 'general', 'minister', 'commandant']
    .filter(t => tierLevel(t) <= userLevel)
    .flatMap(t => [t, t.charAt(0).toUpperCase() + t.slice(1)])

  const base = () => supabase
    .from('resources')
    .select(SHELF_SELECT)
    .eq('source_type', 'arsenal')
    .eq('active', true)
    .eq('draft', false)
    .not('tier', 'is', null)

  const [recentRes, watchRes, pinnedRes] = await Promise.all([
    base().order('created_at', { ascending: false }).limit(8),
    base().in('tier', allowedTiers).order('created_at', { ascending: false }).limit(8),
    base().eq('featured', true).order('created_at', { ascending: false }).limit(8),
  ])

  const firstErr = recentRes.error || watchRes.error || pinnedRes.error
  if (firstErr) return new Response(JSON.stringify({ error: firstErr.message }), { status: 500, headers })

  const recentRows = (recentRes.data || []) as Row[]
  const watchRows  = (watchRes.data  || []) as Row[]
  const pinnedRows = (pinnedRes.data || []) as Row[]

  // ── Collect accessible file paths across all shelves and sign in batch ────────
  const accessible = (r: Row) => tierLevel(r.tier) <= userLevel
  const allRows = [...recentRows, ...watchRows, ...pinnedRows]
  const paths = Array.from(new Set(
    allRows.filter(r => accessible(r) && r.file_path).map(r => r.file_path as string)
  ))
  const libPaths = paths.filter(p => p.startsWith('user_'))
  const resPaths = paths.filter(p => !p.startsWith('user_'))

  const signedMap: Record<string, string> = {}
  const bucketName = supabaseBucket || 'resources'
  if (resPaths.length > 0) {
    const { data: signed } = await supabase.storage.from(bucketName).createSignedUrls(resPaths, 3600)
    for (const su of signed || []) if (su.signedUrl && su.path) signedMap[su.path] = su.signedUrl
  }
  if (libPaths.length > 0) {
    const { data: signed } = await supabase.storage.from('ministry-library').createSignedUrls(libPaths, 3600)
    for (const su of signed || []) if (su.signedUrl && su.path) signedMap[su.path] = su.signedUrl
  }

  // ── Shape: accessible rows get file_url; locked rows are teaser stubs ─────────
  const shape = (r: Row) => {
    const locked = !accessible(r)
    if (locked) {
      return {
        id: r.id,
        title: r.title || '',
        tier: r.tier || 'free',
        category: r.category || '',
        topic: r.topic || '',
        file_type: r.file_type || '',
        file_url: null,
        locked: true,
      }
    }
    return {
      id: r.id,
      title: r.title || '',
      description: r.description || '',
      tier: r.tier || 'free',
      category: r.category || '',
      topic: r.topic || '',
      file_type: r.file_type || '',
      file_url: r.file_path ? (signedMap[r.file_path] || null) : null,
      locked: false,
    }
  }

  return new Response(JSON.stringify({
    recent:       recentRows.map(shape),
    forYourWatch: watchRows.map(shape),
    pinned:       pinnedRows.map(shape),
    userTier:     auth.tier,
  }), { status: 200, headers })
}

export const config = { path: '/api/arsenal-shelves' }
