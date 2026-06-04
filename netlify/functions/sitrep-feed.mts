import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const { apiKey, apiSecret } = JSON.parse(process.env.STREAM || '{}')
const feedsSecret = process.env.STREAM_FEEDS_SECRET || apiSecret
const { url: supabaseUrl, serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
}
const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json' }

const FEEDS_BASE = 'https://feeds.stream-io-api.com/api/v1.0'

const TIER_LEVEL: Record<string, number> = {
  watchman: 0, free: 0,
  soldier: 1, charter_soldier: 1,
  commander: 2, charter_commander: 2,
  general: 3, founding_general: 3,
  minister: 99,
}

// ── JWT helpers ────────────────────────────────────────────────────────────────

function streamJWT(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body   = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig    = crypto.createHmac('sha256', feedsSecret ?? '').update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

function serverToken(): string { return streamJWT({ server: true }) }

function feedHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: serverToken(),
    'stream-auth-type': 'jwt',
    'X-Stream-Client': 'stream-javascript-client-node-0',
  }
}

function feedUrl(path: string): string {
  const sep = path.includes('?') ? '&' : '?'
  return `${FEEDS_BASE}${path}${sep}api_key=${apiKey}`
}

// ── Auth helpers ───────────────────────────────────────────────────────────────

function extractUserId(authHeader: string | null): string | null {
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return payload.sub ?? null
  } catch { return null }
}

async function resolveUserTier(userId: string): Promise<string> {
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return 'watchman'
    const data = await res.json()
    return (data.public_metadata?.tier as string)?.toLowerCase() ||
           (data.public_metadata?.role === 'minister' ? 'minister' : 'watchman')
  } catch { return 'watchman' }
}

// ── Response helpers ───────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}

async function feedFetch(
  url: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const res = await fetch(url, {
    method,
    headers: feedHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let data: unknown
  try { data = await res.json() } catch { data = {} }
  return { status: res.status, data }
}

// ── Actions ────────────────────────────────────────────────────────────────────

async function getToken(userId: string): Promise<Response> {
  const token = streamJWT({ user_id: userId, feed_id: `user:${userId}` })
  return json({ token })
}

async function uploadPhoto(userId: string, req: Request): Promise<Response> {
  const formData = await req.formData()
  const file = formData.get('file')
  if (!file || typeof file === 'string') return json({ error: 'file required' }, 400)

  const f = file as File
  if (!f.type.startsWith('image/')) return json({ error: 'image files only' }, 400)
  if (f.size > 10 * 1024 * 1024) return json({ error: 'max 10MB' }, 400)

  const arrayBuffer = await f.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const fileName = `sitrep/${userId}/${Date.now()}-${safeName}`

  const sb = createClient(supabaseUrl, serviceRoleKey)
  const { error } = await sb.storage
    .from('sitrep-photos')
    .upload(fileName, buffer, { contentType: f.type, upsert: false })

  if (error) return json({ error: error.message }, 500)

  const { data: { publicUrl } } = sb.storage.from('sitrep-photos').getPublicUrl(fileName)
  return json({ url: publicUrl })
}

async function postActivity(userId: string, userTier: string, body: any): Promise<Response> {
  const { type, text, imageUrl, scriptureRef, spiritTag, locationTag, photoUrl, resourceUrl } = body
  const validTypes = ['thought', 'scripture', 'testimony', 'resource', 'photo', 'prayer', 'revelation', 'field']
  if (!validTypes.includes(type)) return json({ error: 'Invalid type' }, 400)
  if (type !== 'photo' && !text?.trim()) return json({ error: 'text required' }, 400)

  const tierLevel = TIER_LEVEL[userTier] ?? 0
  if (tierLevel < 1) return json({ error: 'Soldier tier required to post' }, 403)

  const now = Date.now()
  const activityBody = {
    verb: type,
    object: `post:${now}`,
    foreign_id: `post:${userId}:${now}`,
    time: new Date().toISOString(),
    text: String(text || '').slice(0, 1000),
    actor: userId,
    data: {
      type,
      imageUrl: imageUrl || null,
      scriptureRef: scriptureRef || null,
      spiritTag: spiritTag || null,
      locationTag: locationTag || null,
      photoUrl: photoUrl || null,
      resourceUrl: resourceUrl || null,
      tier: userTier,
    },
  }

  // Upsert user into Stream Feeds before posting — required for first-time posters
  const feedsUpsert = await feedFetch(feedUrl('/users/'), 'POST', { id: userId, data: { name: userId } })
  if ((feedsUpsert.status as number) >= 400) {
    console.error('[sitrep/post] Feeds upsert failed:', feedsUpsert.data)
  }

  const [userRes, allRes] = await Promise.all([
    feedFetch(feedUrl(`/feed/user/${userId}/`), 'POST', activityBody),
    feedFetch(feedUrl(`/feed/flat/wri-all/`), 'POST', activityBody),
  ])

  if (userRes.status >= 400) {
    return json({ error: 'Failed to post', detail: userRes.data }, 502)
  }

  const activity = (userRes.data as any)?.activity || activityBody
  return json({ ok: true, activityId: activity.id || `post:${userId}:${now}`, activity })
}

async function getTimeline(userId: string, params: URLSearchParams): Promise<Response> {
  // Fire-and-forget: register user in Feeds so they can post later
  fetch(`${FEEDS_BASE}/users/?api_key=${apiKey}`, {
    method: 'POST',
    headers: feedHeaders(),
    body: JSON.stringify({ id: userId, data: { name: userId } }),
  }).catch(e => console.error('[sitrep/timeline] Feeds upsert error:', e))

  const limit = parseInt(params.get('limit') || '20', 10)
  const idLt  = params.get('id_lt') || ''

  const ltParam = idLt ? `&id_lt=${encodeURIComponent(idLt)}` : ''
  const [allRes, timelineRes] = await Promise.all([
    feedFetch(feedUrl(`/feed/flat/wri-all/?limit=${limit}${ltParam}`)),
    feedFetch(feedUrl(`/feed/timeline/${userId}/?limit=${limit}${ltParam}`)),
  ])

  const allActivities: any[] = (allRes.data as any)?.results || []
  const timelineActivities: any[] = (timelineRes.data as any)?.results || []

  const seen = new Set<string>()
  const merged: any[] = []
  for (const a of [...allActivities, ...timelineActivities]) {
    if (a.id && !seen.has(a.id)) { seen.add(a.id); merged.push(a) }
  }
  merged.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  const page = merged.slice(0, limit)
  const next = page.length >= limit ? (page[page.length - 1]?.id || null) : null

  return json({ activities: page, next })
}

async function getUserFeed(params: URLSearchParams): Promise<Response> {
  const targetUserId = params.get('userId') || ''
  if (!targetUserId) return json({ error: 'userId required' }, 400)
  const limit = parseInt(params.get('limit') || '20', 10)
  const idLt  = params.get('id_lt') || ''
  const ltParam = idLt ? `&id_lt=${encodeURIComponent(idLt)}` : ''

  const { data } = await feedFetch(feedUrl(`/feed/user/${targetUserId}/?limit=${limit}${ltParam}`))
  const activities = (data as any)?.results || []
  const next = activities.length >= limit ? (activities[activities.length - 1]?.id || null) : null
  return json({ activities, next })
}

async function follow(userId: string, body: any): Promise<Response> {
  const { targetUserId } = body
  if (!targetUserId) return json({ error: 'targetUserId required' }, 400)
  const { status, data } = await feedFetch(
    feedUrl(`/feed/timeline/${userId}/follows/`),
    'POST',
    { target: `user:${targetUserId}`, activity_copy_limit: 10 },
  )
  if (status >= 400) return json({ error: 'Follow failed', detail: data }, 502)
  return json({ ok: true })
}

async function unfollow(userId: string, body: any): Promise<Response> {
  const { targetUserId } = body
  if (!targetUserId) return json({ error: 'targetUserId required' }, 400)
  const { status, data } = await feedFetch(
    feedUrl(`/feed/timeline/${userId}/follows/user:${targetUserId}/`),
    'DELETE',
  )
  if (status >= 400 && status !== 404) return json({ error: 'Unfollow failed', detail: data }, 502)
  return json({ ok: true })
}

async function getFollowers(userId: string, params: URLSearchParams): Promise<Response> {
  const targetUserId = params.get('userId') || userId
  const [followersRes, followingRes] = await Promise.all([
    feedFetch(feedUrl(`/feed/user/${targetUserId}/followers/?limit=50`)),
    feedFetch(feedUrl(`/feed/timeline/${userId}/follows/?limit=200`)),
  ])
  const followers = ((followersRes.data as any)?.results || []).map((f: any) => f.feed_id?.split(':')[1]).filter(Boolean)
  const following = ((followingRes.data as any)?.results || []).map((f: any) => f.target_id?.split(':')[1]).filter(Boolean)
  return json({ followers, following, followingSet: following })
}

async function react(userId: string, body: any): Promise<Response> {
  const { activityId, kind } = body
  if (!activityId || !kind) return json({ error: 'activityId and kind required' }, 400)
  const validKinds = ['cover', 'pray', 'relay']
  if (!validKinds.includes(kind)) return json({ error: 'Invalid reaction kind' }, 400)

  const { status, data } = await feedFetch(feedUrl('/reaction/'), 'POST', {
    kind,
    activity_id: activityId,
    user_id: userId,
  })
  if (status >= 400) return json({ error: 'Reaction failed', detail: data }, 502)
  return json({ ok: true })
}

async function solPicks(): Promise<Response> {
  const { data } = await feedFetch(feedUrl('/feed/flat/wri-all/?limit=50'))
  const activities: any[] = (data as any)?.results || []

  if (!activities.length) return json({ picks: [] })

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 256,
      system: 'You are SOL, the AI intelligence officer for War Room Intel, a spiritual warfare ministry platform. Review these recent field reports and community posts from deliverance ministers. Select the 5 most valuable, spiritually significant, or tactically useful posts. Return ONLY a JSON array of activity ids: ["id1","id2","id3","id4","id5"]. No explanation.',
      messages: [{
        role: 'user',
        content: JSON.stringify(activities.map(a => ({ id: a.id, type: a.verb, text: a.data?.text || a.text || '', time: a.time }))),
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '[]'
    const match = text.match(/\[[\s\S]*\]/)
    const ids: string[] = match ? JSON.parse(match[0]) : []
    const idSet = new Set(ids)
    const picks = activities.filter(a => idSet.has(a.id)).slice(0, 5)
    return json({ picks })
  } catch {
    return json({ picks: activities.slice(0, 5) })
  }
}

// ── Main handler ───────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const userId = extractUserId(req.headers.get('Authorization'))
  if (!userId) return json({ error: 'Unauthorized' }, 401)

  const url    = new URL(req.url)
  const action = url.searchParams.get('action') ?? ''

  if (action === 'get-token') return getToken(userId)

  if (action === 'sol-picks') return solPicks()

  if (action === 'get-timeline') return getTimeline(userId, url.searchParams)

  if (action === 'get-user-feed') return getUserFeed(url.searchParams)

  if (action === 'get-followers') return getFollowers(userId, url.searchParams)

  if (action === 'upload-photo') return uploadPhoto(userId, req)

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const body = await req.json().catch(() => ({}))

  if (action === 'post') {
    const userTier = await resolveUserTier(userId)
    return postActivity(userId, userTier, body)
  }

  if (action === 'follow') return follow(userId, body)
  if (action === 'unfollow') return unfollow(userId, body)
  if (action === 'react') return react(userId, body)

  return json({ error: 'Unknown action' }, 400)
}

export const config = { path: '/api/sitrep-feed' }
