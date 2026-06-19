import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, tierLevel } from './_shared/access'

// ── Env ────────────────────────────────────────────────────────────────────────
const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey, bucket: supabaseBucket } = JSON.parse(process.env.SUPABASE || '{}')
const { apiKey: streamApiKey, apiSecret: streamApiSecret } = JSON.parse(process.env.STREAM || '{}')

const SUPABASE_URL = supabaseUrl!
const SUPABASE_KEY = supabaseServiceKey!

const FEEDS_BASE = 'https://us-east-api.stream-io-api.com/api/v1.0'
const CHAT_BASE  = 'https://chat.stream-io-api.com'

// Mirrors arsenal-shelves.ts: DB stores file_path, we sign into file_url.
const SHELF_SELECT = 'id, title, description, tier, category, topic, file_path, file_type, featured, created_at'

type ShelfRow = {
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

// ── Stream JWT helpers ───────────────────────────────────────────────────────────
// Feeds (sitrep) and Chat (prayer wall) are separate Stream products with different
// server-token payloads. Both sign HS256 over the shared apiSecret.
function streamFeedsServerJWT(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body   = Buffer.from(JSON.stringify({ resource: '*', action: '*', feed_id: '*' })).toString('base64url')
  const sig    = crypto.createHmac('sha256', streamApiSecret ?? '').update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}
function streamChatServerJWT(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body   = Buffer.from(JSON.stringify({ server: true })).toString('base64url')
  const sig    = crypto.createHmac('sha256', streamApiSecret ?? '').update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json' }

// ── Sub-loaders. Each is independent and failure-isolated by the caller. ─────────

async function loadArsenal(supabase: any, userLevel: number) {
  const base = () => supabase
    .from('resources')
    .select(SHELF_SELECT)
    .eq('source_type', 'arsenal')
    .eq('active', true)
    .eq('draft', false)
    .not('tier', 'is', null)

  // Allowed tiers for "For Your Watch" — every ladder rung at or below the user.
  // Dual-cased to emulate LOWER(tier) IN (...); mirrors arsenal-shelves.ts.
  const allowedTiers = ['watchman', 'free', 'soldier', 'commander', 'general', 'minister', 'commandant']
    .filter(t => tierLevel(t) <= userLevel)
    .flatMap(t => [t, t.charAt(0).toUpperCase() + t.slice(1)])

  const [recentRes, watchRes] = await Promise.all([
    base().order('created_at', { ascending: false }).limit(8),
    base().in('tier', allowedTiers).order('created_at', { ascending: false }).limit(8),
  ])

  const recentRows = (recentRes.data || []) as ShelfRow[]
  const watchRows  = (watchRes.data || []) as ShelfRow[]

  const accessible = (r: ShelfRow) => tierLevel(r.tier) <= userLevel
  const allRows = [...recentRows, ...watchRows]
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

  const shape = (r: ShelfRow) => {
    const locked = !accessible(r)
    if (locked) {
      return { id: r.id, title: r.title || '', tier: r.tier || 'free', category: r.category || '', topic: r.topic || '', file_type: r.file_type || '', file_url: null, locked: true }
    }
    return { id: r.id, title: r.title || '', description: r.description || '', tier: r.tier || 'free', category: r.category || '', topic: r.topic || '', file_type: r.file_type || '', file_url: r.file_path ? (signedMap[r.file_path] || null) : null, locked: false }
  }

  return { recent: recentRows.map(shape), forYourWatch: watchRows.map(shape) }
}

async function loadTodaysBrief(supabase: any) {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from('daily_devotions')
    .select('title, morning_prayer, evening_prayer, devotional_text, scripture, scripture_reference, youtube_url, min_tier, date')
    .eq('date', today)
    .eq('published', true)
    .single()
  return data || null
}

async function loadTestimonies(supabase: any) {
  const { data } = await supabase
    .from('testimonies')
    .select('id, title, body, user_name, user_image, user_tier, category, created_at, reaction_count, is_anonymous, is_founder')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(4)
  return (data || []).map((t: any) => ({
    id: t.id,
    title: t.title || '',
    body: String(t.body || '').slice(0, 240),
    user_name: t.is_anonymous ? 'Anonymous' : (t.user_name || 'Warrior'),
    user_image: t.is_anonymous ? '' : (t.user_image || ''),
    user_tier: t.user_tier || '',
    category: t.category || '',
    created_at: t.created_at,
    reaction_count: t.reaction_count || 0,
    is_founder: !!t.is_founder,
  }))
}

async function loadEvents(supabase: any) {
  const { data } = await supabase
    .from('events')
    .select('id, title, event_date, event_type, description, is_published')
    .eq('is_published', true)
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })
    .limit(3)
  return (data || []).map((e: any) => ({
    id: e.id,
    title: e.title || '',
    event_date: e.event_date,
    event_type: e.event_type || '',
    description: String(e.description || '').slice(0, 160),
  }))
}

async function loadActiveCases(supabase: any, userId: string) {
  const { data } = await supabase
    .from('case_files')
    .select('id, subject_name, subject_alias, primary_issue, status, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(3)
  return (data || []).map((c: any) => ({
    id: c.id,
    subject_name: c.subject_name || c.subject_alias || 'Unnamed',
    primary_issue: c.primary_issue || c.status || '',
    status: c.status || '',
  }))
}

async function loadRecentSearches(supabase: any, userId: string) {
  const { data } = await supabase
    .from('ai_search_history')
    .select('id, tool, query, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)
  return (data || []).map((s: any) => ({
    id: s.id,
    tool: s.tool || '',
    query: String(s.query || '').slice(0, 140),
    created_at: s.created_at,
  }))
}

async function loadSitrep() {
  if (!streamApiKey || !streamApiSecret) return []
  const res = await fetch(`${FEEDS_BASE}/feed/user/wri-community/?limit=10&api_key=${streamApiKey}`, {
    headers: { 'Content-Type': 'application/json', Authorization: streamFeedsServerJWT(), 'stream-auth-type': 'jwt' },
  })
  if (!res.ok) return []
  const data = await res.json().catch(() => ({})) as any
  const activities: any[] = data?.results || []
  activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  return activities.slice(0, 3).map((a: any) => ({
    id: a.id,
    verb: a.verb || '',
    type: a.data?.type || a.verb || '',
    text: String(a.data?.text || a.text || '').slice(0, 200),
    userName: a.userName || a.actor || 'Warrior',
    userTier: a.userTier || '',
    time: a.time,
  }))
}

async function loadPrayers() {
  if (!streamApiKey || !streamApiSecret) return []
  const res = await fetch(`${CHAT_BASE}/channels/messaging/prayer-wall-requests/query?api_key=${streamApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: streamChatServerJWT(), 'stream-auth-type': 'jwt' },
    body: JSON.stringify({ state: true, messages: { limit: 12 }, watch: false, presence: false }),
  })
  if (!res.ok) return []
  const data = await res.json().catch(() => ({})) as any
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  const messages: any[] = (data?.messages || [])
    .filter((m: any) => m.type !== 'deleted' && !m.deleted_at && new Date(m.created_at).getTime() > cutoff)
  return messages.slice(-3).reverse().map((m: any) => ({
    id: m.id,
    text: String(m.text || '').slice(0, 180),
    userName: m.user?.name || 'Anonymous',
    createdAt: m.created_at,
  }))
}

// ── Handler ──────────────────────────────────────────────────────────────────────
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: JSON_HEADERS })

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const userLevel  = auth.level
  const isCommander = userLevel >= 2
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  const [
    arsenalRes, briefRes, testimoniesRes, eventsRes, sitrepRes, prayersRes, casesRes, searchesRes,
  ] = await Promise.allSettled([
    loadArsenal(supabase, userLevel),
    loadTodaysBrief(supabase),
    loadTestimonies(supabase),
    loadEvents(supabase),
    loadSitrep(),
    loadPrayers(),
    isCommander ? loadActiveCases(supabase, auth.userId) : Promise.resolve(null),
    isCommander ? loadRecentSearches(supabase, auth.userId) : Promise.resolve(null),
  ])

  const ok = <T,>(r: PromiseSettledResult<T>, fallback: T): T => (r.status === 'fulfilled' ? r.value : fallback)
  const arsenal = ok(arsenalRes, { recent: [], forYourWatch: [] })

  return new Response(JSON.stringify({
    todaysBrief:         ok(briefRes, null),
    arsenalRecent:       arsenal.recent,
    arsenalForYourWatch: arsenal.forYourWatch,
    sitrepRecent:        ok(sitrepRes, []),
    prayerRecent:        ok(prayersRes, []),
    testimoniesRecent:   ok(testimoniesRes, []),
    eventsUpcoming:      ok(eventsRes, []),
    activeCases:         isCommander ? ok(casesRes, []) : null,
    recentSearches:      isCommander ? ok(searchesRes, []) : null,
    userTier:            auth.tier,
  }), { status: 200, headers: JSON_HEADERS })
}

export const config = { path: '/api/dashboard-load' }
