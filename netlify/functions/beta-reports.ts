import { requireAuth } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')
const sbHeaders = {
  apikey:          serviceRoleKey as string,
  Authorization:   `Bearer ${serviceRoleKey as string}`,
  'Content-Type':  'application/json',
}
const sb = (path: string) => `${supabaseUrl}/rest/v1${path}`

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-internal-key',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
}
const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json' }

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}


// ── Actions ────────────────────────────────────────────────────────────────────

async function getList(userId: string, isMinister: boolean, params: URLSearchParams): Promise<Response> {
  const type   = params.get('type')   || ''
  const status = params.get('status') || ''
  const sort   = params.get('sort')   || 'new'
  const mine   = params.get('mine') === 'true'

  const selectFields = isMinister
    ? 'id,user_id,user_name,type,title,description,page_section,screenshot_url,screenshot_url_2,screenshot_url_3,status,priority,upvotes,upvoted_by,admin_notes,fix_summary,fixed_at,resolved_at,source,created_at,updated_at'
    : 'id,user_id,user_name,type,title,description,page_section,screenshot_url,screenshot_url_2,screenshot_url_3,status,priority,upvotes,upvoted_by,fix_summary,fixed_at,created_at,updated_at'

  let url = `${sb('/beta_reports')}?select=${selectFields}&limit=200`

  if (type) url += `&type=eq.${encodeURIComponent(type)}`
  if (mine) url += `&user_id=eq.${encodeURIComponent(userId)}`

  if (status === 'open') {
    url += `&status=in.(new,confirmed,in_progress)`
  } else if (status === 'fixed') {
    url += `&status=in.(fixed,deployed)`
  }

  url += sort === 'top' ? `&order=upvotes.desc,created_at.desc` : `&order=created_at.desc`

  const res = await fetch(url, { headers: sbHeaders })
  if (!res.ok) return json({ error: 'Database error', detail: await res.text() }, 500)
  return json({ reports: await res.json() })
}

async function getStats(): Promise<Response> {
  const res = await fetch(
    `${sb('/beta_reports')}?select=id,type,status,upvotes,title&limit=1000`,
    { headers: sbHeaders },
  )
  if (!res.ok) return json({ error: 'Database error' }, 500)
  const all: any[] = await res.json()

  const byStatus: Record<string, number> = {
    new: 0, confirmed: 0, in_progress: 0, fixed: 0, deployed: 0,
    wont_fix: 0, by_design: 0, duplicate: 0,
  }
  const byType: Record<string, number> = { bug: 0, feature: 0, question: 0, praise: 0 }

  for (const r of all) {
    if (r.status in byStatus) byStatus[r.status]++
    if (r.type in byType)     byType[r.type]++
  }

  const topUpvoted = [...all]
    .sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0))
    .slice(0, 5)
    .map(r => ({ id: r.id, title: r.title, upvotes: r.upvotes, status: r.status, type: r.type }))

  return json({ total: all.length, byStatus, byType, topUpvoted })
}

async function submitReport(userId: string, userName: string, body: any): Promise<Response> {
  const { type, title, description, pageSection, screenshotUrl, screenshotUrl2, screenshotUrl3 } = body || {}
  const validTypes = ['bug', 'feature', 'question', 'praise']
  if (!type || !validTypes.includes(type))               return json({ error: 'Invalid type' }, 400)
  if (!title?.trim() || title.length > 120)              return json({ error: 'title required, max 120 chars' }, 400)
  if (!description?.trim() || description.length > 3000) return json({ error: 'description required, max 3000 chars' }, 400)

  const res = await fetch(`${sb('/beta_reports')}?select=*`, {
    method: 'POST',
    headers: { ...sbHeaders, Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id:          userId,
      user_name:        userName,
      type,
      title:            title.trim(),
      description:      description.trim(),
      page_section:     pageSection     || null,
      screenshot_url:   screenshotUrl   || null,
      screenshot_url_2: screenshotUrl2  || null,
      screenshot_url_3: screenshotUrl3  || null,
    }),
  })
  if (!res.ok) return json({ error: 'Insert failed', detail: await res.text() }, 500)
  const rows: any[] = await res.json()
  return json({ report: rows[0] ?? null }, 201)
}

async function upvoteReport(userId: string, body: any): Promise<Response> {
  const { reportId } = body || {}
  if (!reportId) return json({ error: 'reportId required' }, 400)

  const getRes = await fetch(
    `${sb('/beta_reports')}?id=eq.${encodeURIComponent(reportId)}&select=upvoted_by,upvotes`,
    { headers: sbHeaders },
  )
  if (!getRes.ok) return json({ error: 'Database error' }, 500)
  const rows: any[] = await getRes.json()
  if (!rows.length) return json({ error: 'Not found' }, 404)

  const upvotedBy: string[]  = rows[0].upvoted_by || []
  const alreadyVoted         = upvotedBy.includes(userId)
  const newUpvotedBy         = alreadyVoted
    ? upvotedBy.filter(id => id !== userId)
    : [...upvotedBy, userId]

  const patchRes = await fetch(`${sb('/beta_reports')}?id=eq.${encodeURIComponent(reportId)}`, {
    method: 'PATCH',
    headers: { ...sbHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify({ upvoted_by: newUpvotedBy, upvotes: newUpvotedBy.length }),
  })
  if (!patchRes.ok) return json({ error: 'Update failed' }, 500)

  return json({ upvoted: !alreadyVoted, upvotes: newUpvotedBy.length })
}

async function triageReport(userId: string, isMinister: boolean, body: any): Promise<Response> {
  void userId
  if (!isMinister) return json({ error: 'Forbidden' }, 403)
  const { id, status, priority, adminNotes, fixSummary } = body || {}
  // Support both camelCase (adminNotes) and snake_case (admin_notes) from callers
  const adminNotesValue = adminNotes ?? body?.admin_notes
  const fixSummaryValue = fixSummary ?? body?.fix_summary
  if (!id) return json({ error: 'id required' }, 400)

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (status           !== undefined) patch.status      = status
  if (priority         !== undefined) patch.priority    = priority
  if (adminNotesValue  !== undefined) patch.admin_notes = adminNotesValue
  if (fixSummaryValue  !== undefined) patch.fix_summary = fixSummaryValue
  if (status === 'fixed' || status === 'deployed')  patch.fixed_at    = new Date().toISOString()
  if (status === 'resolved')                        patch.resolved_at = new Date().toISOString()

  const patchRes = await fetch(`${sb('/beta_reports')}?id=eq.${encodeURIComponent(id)}&select=*`, {
    method: 'PATCH',
    headers: { ...sbHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  })
  if (!patchRes.ok) return json({ error: 'Update failed', detail: await patchRes.text() }, 500)
  const resRows: any[] = await patchRes.json()
  return json({ report: resRows[0] ?? null })
}

async function deleteReport(isMinister: boolean, id: string | null): Promise<Response> {
  if (!isMinister) return json({ error: 'Forbidden' }, 403)
  if (!id) return json({ error: 'id required' }, 400)

  const delRes = await fetch(`${sb('/beta_reports')}?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { ...sbHeaders, Prefer: 'return=minimal' },
  })
  if (!delRes.ok) return json({ error: 'Delete failed', detail: await delRes.text() }, 500)
  return json({ success: true })
}

async function systemIntake(req: Request): Promise<Response> {
  const key = req.headers.get('x-internal-key')
  if (key !== 'wri-internal-2026-backfill') return json({ error: 'Forbidden' }, 403)

  const body = await req.json().catch(() => ({}))
  const { title, description, priority, category } = body as any
  if (!title) return json({ error: 'title required' }, 400)

  const res = await fetch(`${sb('/beta_reports')}?select=id`, {
    method: 'POST',
    headers: { ...sbHeaders, Prefer: 'return=representation' },
    body: JSON.stringify({
      title,
      description: description || '',
      type:        category    || 'bug',
      priority:    priority    || 'medium',
      status:      'new',
      user_name:   'System',
      source:      'system',
    }),
  })
  if (!res.ok) return json({ error: 'Insert failed', detail: await res.text() }, 500)
  return json({ success: true })
}

const SYSTEM_BUGS = [
  {
    title: 'Audio Prayer Call not connecting on iPad',
    priority: 'critical',
    description: 'iPad recipient accepts call, hangs at Connecting... Screen. Desktop caller shows Connected. Stream Backstage was disabled but issue persists. Mic-before-join fix deployed but unconfirmed.',
  },
  {
    title: 'Presence showing only current user online',
    priority: 'high',
    description: 'Warriors panel only shows current user as online. Soldier01 does not appear even after stream-backfill. memberPresence map may not be updating from war-room-general channel correctly.',
  },
  {
    title: 'Nav jump on sidebar click',
    priority: 'medium',
    description: 'Clicking certain sidebar items causes the main content area to scroll to top instead of navigating correctly. behavior: instant was set but issue persists per HAR.',
  },
  {
    title: 'DM request takes full screen on mobile',
    priority: 'medium',
    description: 'Pending requests section takes full screen on iPhone. Should be a compact section above the DM list.',
  },
  {
    title: 'Field Teams not appearing in sidebar',
    priority: 'medium',
    description: 'Field Teams page was built and pushed but not visible in community sidebar under Field Ops.',
  },
  {
    title: 'Tier badges not visible in Warriors panel',
    priority: 'low',
    description: 'Tier badges shipped in warriors panel commit but not confirmed visible in screenshots.',
  },
  {
    title: 'Admin 403 on stats, members, moderation',
    priority: 'high',
    description: 'admin-quick-stats, admin-members, admin-moderation all returning 403 Forbidden for minister/general role. Functions check for admin role only, need to accept minister too.',
  },
]

async function systemSeed(req: Request): Promise<Response> {
  const key = req.headers.get('x-internal-key')
  if (key !== 'wri-internal-2026-backfill') return json({ error: 'Forbidden' }, 403)

  // One-time flag: check if system bugs already exist
  const checkRes = await fetch(`${sb('/beta_reports')}?user_name=eq.System&select=id&limit=1`, { headers: sbHeaders })
  if (checkRes.ok) {
    const existing = await checkRes.json()
    if (existing.length > 0) return json({ skipped: true, reason: 'already seeded' })
  }

  const rows = SYSTEM_BUGS.map(bug => ({
    title:       bug.title,
    description: bug.description,
    type:        'bug',
    priority:    bug.priority,
    status:      'new',
    user_name:   'System',
    source:      'system',
  }))

  const res = await fetch(`${sb('/beta_reports')}?select=id`, {
    method: 'POST',
    headers: { ...sbHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(rows),
  })
  if (!res.ok) return json({ error: 'Seed failed', detail: await res.text() }, 500)
  return json({ success: true, seeded: rows.length })
}

async function uploadScreenshot(userId: string, req: Request): Promise<Response> {
  const formData = await req.formData()
  const file = formData.get('file')
  if (!file || typeof file === 'string') return json({ error: 'file required' }, 400)

  const f = file as File
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(f.type))
    return json({ error: 'image files only (jpeg, png, gif, webp)' }, 400)
  if (f.size > 10 * 1024 * 1024) return json({ error: 'max 10MB' }, 400)

  const buffer    = Buffer.from(await f.arrayBuffer())
  const safeName  = f.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const timestamp = Date.now()
  const filePath  = `beta/${userId}/${timestamp}-${safeName}`

  const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/beta-screenshots/${filePath}`, {
    method: 'POST',
    headers: {
      apikey:          serviceRoleKey as string,
      Authorization:   `Bearer ${serviceRoleKey as string}`,
      'Content-Type':  f.type,
    },
    body: buffer,
  })
  if (!uploadRes.ok) return json({ error: 'Upload failed', detail: await uploadRes.text() }, 500)

  const url = `${supabaseUrl}/storage/v1/object/public/beta-screenshots/${filePath}`
  return json({ url })
}

// ── Main handler ───────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const url    = new URL(req.url)
  const action = url.searchParams.get('action') ?? ''

  // System-level actions — use internal key, no user auth needed
  if (action === 'system-intake') return systemIntake(req)
  if (action === 'system-seed')   return systemSeed(req)

  const authResult = await requireAuth(req)
  if (authResult instanceof Response) return authResult
  const { userId, displayName: userName, isAdmin: isMinister } = authResult

  if (action === 'upload') return uploadScreenshot(userId, req)
  if (action === 'stats')  return getStats()

  if (action === 'upvote') {
    const body = await req.json().catch(() => ({}))
    return upvoteReport(userId, body)
  }

  if (req.method === 'DELETE') {
    const id = url.searchParams.get('id')
    return deleteReport(isMinister, id)
  }

  if (req.method === 'GET') {
    return getList(userId, isMinister, url.searchParams)
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}))
    return submitReport(userId, userName, body)
  }

  if (req.method === 'PATCH') {
    const body = await req.json().catch(() => ({}))
    return triageReport(userId, isMinister, body)
  }

  return json({ error: 'Not found' }, 404)
}

export const config = { path: '/api/beta-reports' }
