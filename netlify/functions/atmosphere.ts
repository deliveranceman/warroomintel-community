const { url: supabaseUrl, serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
}
const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json' }

const SB = (p: string) => `${supabaseUrl}/rest/v1${p}`
const sbH: Record<string, string> = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

const VALID_STATUSES = new Set([
  'covered','peaceful','weary','victorious','focused','need-prayer','hopeful','grateful',
  'burned-out','dry','anxious','discouraged','lonely','grieving',
  'under-assignment','interceding','in-battle','discernment-active','fasting','standing',
])

const STATUS_CATEGORY: Record<string, string> = {
  covered: 'green', peaceful: 'green', victorious: 'green', focused: 'green', hopeful: 'green', grateful: 'green',
  weary: 'amber', 'need-prayer': 'amber', 'burned-out': 'amber', dry: 'amber',
  anxious: 'amber', discouraged: 'amber', lonely: 'amber', grieving: 'amber',
  'under-assignment': 'purple', interceding: 'purple', 'in-battle': 'purple',
  'discernment-active': 'purple', fasting: 'purple', standing: 'purple',
}

// ── Auth ───────────────────────────────────────────────────────────────────────

function decodeUserId(authHeader: string | null): string | null {
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return payload.sub ?? null
  } catch { return null }
}

// ── Response helpers ───────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}

async function sbFetch(path: string, method = 'GET', body?: unknown): Promise<{ status: number; data: unknown }> {
  const res = await fetch(SB(path), {
    method,
    headers: sbH,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let data: unknown
  try { data = await res.json() } catch { data = [] }
  return { status: res.status, data }
}

// ── Actions ────────────────────────────────────────────────────────────────────

async function checkin(userId: string, body: any): Promise<Response> {
  const { status, note, isPublic = true } = body || {}
  if (!status || !VALID_STATUSES.has(status)) return json({ error: 'Invalid status' }, 400)

  const category = STATUS_CATEGORY[status]
  const today = new Date().toISOString().slice(0, 10)

  // Upsert: one check-in per user per day
  const { status: s, data } = await sbFetch('/atmosphere_checkins', 'POST', {
    user_id: userId,
    status,
    category,
    note: note ? String(note).slice(0, 280) : null,
    is_public: !!isPublic,
    date: today,
  })

  if (s >= 400) {
    // Try PATCH if unique conflict
    const patchRes = await sbFetch(
      `/atmosphere_checkins?user_id=eq.${encodeURIComponent(userId)}&date=eq.${today}`,
      'PATCH',
      { status, category, note: note ? String(note).slice(0, 280) : null, is_public: !!isPublic, checked_in_at: new Date().toISOString() },
    )
    if (patchRes.status >= 400) return json({ error: 'Check-in failed', detail: patchRes.data }, 502)
    return json({ ok: true, updated: true })
  }

  // Fire-and-forget: notify sentinels if amber/purple
  if (category !== 'green') {
    notifySentinels(userId, status, category, note).catch(() => {})
  }

  const arr = Array.isArray(data) ? data : []
  return json({ ok: true, checkin: arr[0] || null })
}

async function notifySentinels(userId: string, status: string, category: string, note: string | null) {
  // Fetch active sentinels (non-self)
  const { data: sentinelRows } = await sbFetch(`/sentinels?is_active=eq.true&user_id=neq.${encodeURIComponent(userId)}&select=user_id`)
  const rows = Array.isArray(sentinelRows) ? sentinelRows : []
  if (!rows.length) return

  const emoji = category === 'amber' ? '⚡' : '📡'
  const title = `${emoji} Watchman Alert: ${status.replace(/-/g, ' ')}`
  const body  = note ? note.slice(0, 80) : 'A warrior needs intercession.'
  const url   = '/community'

  // Send one push per sentinel (fire-and-forget per user)
  for (const row of rows) {
    fetch(`${process.env.URL || ''}/api/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({ title, body, url, userId: row.user_id }),
    }).catch(() => {})
  }
}

async function getToday(userId: string): Promise<Response> {
  const today = new Date().toISOString().slice(0, 10)
  const { data: myRow } = await sbFetch(`/atmosphere_checkins?user_id=eq.${encodeURIComponent(userId)}&date=eq.${today}&select=*`)
  const my = Array.isArray(myRow) ? myRow[0] || null : null

  // Community counts for today (public only)
  const { data: counts } = await sbFetch(
    `/atmosphere_checkins?date=eq.${today}&is_public=eq.true&select=category,status`,
  )
  const rows: any[] = Array.isArray(counts) ? counts : []

  const tally: Record<string, number> = { green: 0, amber: 0, purple: 0 }
  const statusCounts: Record<string, number> = {}
  for (const r of rows) {
    tally[r.category] = (tally[r.category] || 0) + 1
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1
  }

  return json({ my, tally, total: rows.length, statusCounts })
}

async function communitySummary(): Promise<Response> {
  const today = new Date().toISOString().slice(0, 10)

  // Check snapshot first
  const { data: snap } = await sbFetch(`/atmosphere_snapshots?date=eq.${today}&select=*`)
  const snapRow = Array.isArray(snap) ? snap[0] : null
  if (snapRow) return json({ summary: snapRow, source: 'snapshot' })

  // Compute live
  const { data: rows } = await sbFetch(
    `/atmosphere_checkins?date=eq.${today}&is_public=eq.true&select=category,status`,
  )
  const arr: any[] = Array.isArray(rows) ? rows : []

  const tally: Record<string, number> = { green: 0, amber: 0, purple: 0 }
  const statusCounts: Record<string, number> = {}
  for (const r of arr) {
    tally[r.category] = (tally[r.category] || 0) + 1
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1
  }

  const topStatuses = Object.entries(statusCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([s, c]) => ({ status: s, count: c }))

  const dominantCat = Object.entries(tally).sort(([, a], [, b]) => b - a)[0]?.[0] || null
  const dominantStatus = topStatuses[0]?.status || null

  return json({
    summary: {
      date: today,
      total_checkins: arr.length,
      green_count: tally.green,
      amber_count: tally.amber,
      purple_count: tally.purple,
      dominant_status: dominantStatus,
      dominant_category: dominantCat,
      top_statuses: topStatuses,
    },
    source: 'live',
  })
}

async function myHistory(userId: string, params: URLSearchParams): Promise<Response> {
  const limit = Math.min(parseInt(params.get('limit') || '30', 10), 90)
  const { data } = await sbFetch(
    `/atmosphere_checkins?user_id=eq.${encodeURIComponent(userId)}&order=date.desc&limit=${limit}&select=*`,
  )
  return json({ history: Array.isArray(data) ? data : [] })
}

async function weeklyTrend(): Promise<Response> {
  // Last 7 days
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  const from = days[0]
  const to   = days[6]

  const { data } = await sbFetch(
    `/atmosphere_checkins?date=gte.${from}&date=lte.${to}&is_public=eq.true&select=date,category`,
  )
  const rows: any[] = Array.isArray(data) ? data : []

  const byDay: Record<string, { green: number; amber: number; purple: number; total: number }> = {}
  for (const d of days) byDay[d] = { green: 0, amber: 0, purple: 0, total: 0 }
  for (const r of rows) {
    if (!byDay[r.date]) continue
    byDay[r.date][r.category as 'green' | 'amber' | 'purple']++
    byDay[r.date].total++
  }

  const trend = days.map(d => ({ date: d, ...byDay[d] }))
  return json({ trend })
}

async function requestPrayer(userId: string, body: any): Promise<Response> {
  const { note } = body || {}

  // Get user's current check-in
  const today = new Date().toISOString().slice(0, 10)
  const { data: myRows } = await sbFetch(
    `/atmosphere_checkins?user_id=eq.${encodeURIComponent(userId)}&date=eq.${today}&select=status,category`,
  )
  const my: any = Array.isArray(myRows) ? myRows[0] : null

  await notifySentinels(userId, my?.status || 'need-prayer', my?.category || 'amber', note || null)
  return json({ ok: true })
}

async function solAlert(userId: string, body: any): Promise<Response> {
  // Minister-only: SOL generates a community atmosphere alert
  const { data: clerkData } = await (async () => {
    try {
      const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
      })
      if (!res.ok) return { data: null }
      return { data: await res.json() }
    } catch { return { data: null } }
  })()
  const role = clerkData?.public_metadata?.role
  if (role !== 'minister') return json({ error: 'Minister access required' }, 403)

  const { message } = body || {}

  // Fetch community summary for context
  const today = new Date().toISOString().slice(0, 10)
  const { data: rows } = await sbFetch(
    `/atmosphere_checkins?date=eq.${today}&is_public=eq.true&select=category,status`,
  )
  const arr: any[] = Array.isArray(rows) ? rows : []
  const tally: Record<string, number> = { green: 0, amber: 0, purple: 0 }
  const statusCounts: Record<string, number> = {}
  for (const r of arr) {
    tally[r.category] = (tally[r.category] || 0) + 1
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const prompt = message
    ? `Minister instruction: "${message}"\n\nCommunity atmosphere today: ${JSON.stringify({ tally, top: Object.entries(statusCounts).sort(([,a],[,b])=>b-a).slice(0,5) })}\n\nWrite a short prophetic alert (2-3 sentences, max 100 words) to send as a push notification to the War Room community. Return only the alert text.`
    : `Community atmosphere today: ${JSON.stringify({ tally, top: Object.entries(statusCounts).sort(([,a],[,b])=>b-a).slice(0,5) })}\n\nYou are SOL, spiritual intelligence officer for War Room Intel. Write a short prophetic alert (2-3 sentences, max 100 words) based on the community atmosphere readings. Speak to the dominant spiritual pattern you see. Return only the alert text.`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  })

  const alertText = msg.content[0].type === 'text' ? msg.content[0].text.trim() : 'The Lord is moving. Stand firm.'

  // Broadcast push to all subscribers
  await fetch(`${process.env.URL || ''}/api/send-push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceRoleKey}` },
    body: JSON.stringify({ title: '📡 SOL Atmosphere Alert', body: alertText.slice(0, 120), url: '/community' }),
  })

  return json({ ok: true, alert: alertText })
}

// Module-level vibe cache (lives for process lifetime, ~30 min on Netlify)
let vibeCache = { text: '', generatedAt: 0 }

async function getDailyVibe(): Promise<Response> {
  if (vibeCache.text && Date.now() - vibeCache.generatedAt < 30 * 60 * 1000) {
    return json({ vibe: vibeCache.text })
  }

  const today = new Date().toISOString().slice(0, 10)
  const { data: rows } = await sbFetch(
    `/atmosphere_checkins?date=eq.${today}&is_public=eq.true&select=category`,
  )
  const arr: any[] = Array.isArray(rows) ? rows : []
  const tally: Record<string, number> = { green: 0, amber: 0, purple: 0 }
  for (const r of arr) { tally[r.category] = (tally[r.category] || 0) + 1 }
  const total = arr.length

  if (total < 3) return json({ vibe: null })

  let vibe = ''
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 60,
      system: "You are SOL, War Room Intel's intelligence officer. Generate ONE sentence (max 15 words) describing the spiritual atmosphere of a community of deliverance ministers based on their check-in data. Be direct and ministerially useful. No fluff. No quotes.",
      messages: [{ role: 'user', content: `Green: ${tally.green}, Amber: ${tally.amber}, Purple: ${tally.purple}, Total: ${total}` }],
    })
    vibe = msg.content[0].type === 'text' ? msg.content[0].text.trim().replace(/^"|"$/g, '') : ''
  } catch {
    const dominant = tally.green >= tally.amber && tally.green >= tally.purple ? 'green'
      : tally.purple >= tally.amber ? 'purple' : 'amber'
    if (dominant === 'green') vibe = 'The Regiment is largely covered — a strong day for advancing.'
    else if (dominant === 'purple') vibe = 'Heavy intercessory presence — many soldiers on active assignment today.'
    else vibe = 'Mixed atmosphere — cover your team before stepping into ministry.'
  }

  if (vibe) vibeCache = { text: vibe, generatedAt: Date.now() }
  return json({ vibe: vibe || null })
}

async function getMissions(): Promise<Response> {
  const today = new Date().toISOString().slice(0, 10)

  // Return cached missions if available
  const cacheRes = await fetch(SB(`/daily_missions_cache?cache_date=eq.${today}&select=*`), { headers: sbH })
  const cacheRows: any[] = await cacheRes.json().catch(() => [])
  if (Array.isArray(cacheRows) && cacheRows[0]) {
    return json({ missions: cacheRows[0].missions || [] })
  }

  // Fetch community summary for context
  const { data: rows } = await sbFetch(
    `/atmosphere_checkins?date=eq.${today}&is_public=eq.true&select=category,status`,
  )
  const arr: any[] = Array.isArray(rows) ? rows : []
  const tally: Record<string, number> = { green: 0, amber: 0, purple: 0 }
  let prayerRequested = 0
  for (const r of arr) {
    tally[r.category] = (tally[r.category] || 0) + 1
    if (r.status === 'need-prayer') prayerRequested++
  }

  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const context = {
    date: today,
    dayOfWeek,
    greenCount: tally.green,
    amberCount: tally.amber,
    purpleCount: tally.purple,
    totalCheckins: arr.length,
    prayerRequested,
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  let missions: any[] = []
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 300,
      system: 'You are SOL, War Room Intel\'s AI officer. Generate exactly 3 short kingdom assignments for deliverance ministers based on today\'s community data. Each mission must be one sentence, actionable, specific, and ministry-focused. Return as JSON array: [{"id":"m1","text":"...","type":"intercession"},{"id":"m2","text":"...","type":"encouragement"},{"id":"m3","text":"...","type":"prayer"}] where type is one of: intercession, encouragement, posting, prayer, outreach. Return ONLY the JSON array, no other text.',
      messages: [{ role: 'user', content: `Today\'s data: ${JSON.stringify(context)}` }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '[]'
    const match = text.match(/\[[\s\S]*\]/)
    missions = match ? JSON.parse(match[0]) : []
  } catch {
    missions = [
      { id: 'm1', text: 'Intercede for the warriors carrying amber status today — stand in the gap for their burdens.', type: 'intercession' },
      { id: 'm2', text: 'Post an encouraging word in the War Room for those who are weary.', type: 'posting' },
      { id: 'm3', text: 'Pray over your ministry assignments from the past 7 days and release them to the Lord.', type: 'prayer' },
    ]
  }

  // Cache for today
  await sbFetch('/daily_missions_cache', 'POST', { cache_date: today, missions })
    .then(async r => {
      if (r.status === 409 || r.status >= 400) {
        await sbFetch(`/daily_missions_cache?cache_date=eq.${today}`, 'PATCH', { missions })
      }
    }).catch(() => {})

  return json({ missions })
}

async function snapshot(): Promise<Response> {
  // Compute and store today's snapshot (called by scheduled function or manually)
  const today = new Date().toISOString().slice(0, 10)

  const { data: rows } = await sbFetch(
    `/atmosphere_checkins?date=eq.${today}&is_public=eq.true&select=category,status`,
  )
  const arr: any[] = Array.isArray(rows) ? rows : []

  const tally: Record<string, number> = { green: 0, amber: 0, purple: 0 }
  const statusCounts: Record<string, number> = {}
  for (const r of arr) {
    tally[r.category] = (tally[r.category] || 0) + 1
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1
  }

  const topStatuses = Object.entries(statusCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([s, c]) => ({ status: s, count: c }))

  const dominantCat = Object.entries(tally).sort(([, a], [, b]) => b - a)[0]?.[0] || null
  const dominantStatus = topStatuses[0]?.status || null

  const row = {
    date: today,
    total_checkins: arr.length,
    green_count: tally.green,
    amber_count: tally.amber,
    purple_count: tally.purple,
    dominant_status: dominantStatus,
    dominant_category: dominantCat,
    top_statuses: topStatuses,
    snapshot_at: new Date().toISOString(),
  }

  // Upsert
  await sbFetch('/atmosphere_snapshots', 'POST', row)
    .then(async r => {
      if (r.status === 409 || r.status >= 400) {
        await sbFetch(`/atmosphere_snapshots?date=eq.${today}`, 'PATCH', row)
      }
    })

  console.log('[atmosphere] snapshot saved for', today, ':', row)
  return json({ ok: true, snapshot: row })
}

// ── Main handler ───────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const userId = decodeUserId(req.headers.get('Authorization'))
  if (!userId) return json({ error: 'Unauthorized' }, 401)

  const url    = new URL(req.url)
  const action = url.searchParams.get('action') ?? ''

  if (action === 'today')             return getToday(userId)
  if (action === 'community-summary') return communitySummary()
  if (action === 'my-history')        return myHistory(userId, url.searchParams)
  if (action === 'weekly-trend')      return weeklyTrend()
  if (action === 'missions')          return getMissions()
  if (action === 'daily-vibe')        return getDailyVibe()

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const body = await req.json().catch(() => ({}))

  if (action === 'checkin')          return checkin(userId, body)
  if (action === 'request-prayer')   return requestPrayer(userId, body)
  if (action === 'sol-alert')        return solAlert(userId, body)
  if (action === 'snapshot')         return snapshot()

  return json({ error: 'Unknown action' }, 400)
}

export const config = { path: '/api/atmosphere' }
