import { createClient } from '@supabase/supabase-js'

/*
  Supabase setup — run once in SQL editor:

  CREATE TABLE beta_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    submitted_by_id text NOT NULL,
    submitted_by_name text NOT NULL,
    type text NOT NULL CHECK (type IN ('bug','feature','crash','ui','performance','other')),
    page_section text,
    title text NOT NULL,
    description text,
    screenshot_url text,
    status text DEFAULT 'open' CHECK (status IN ('open','in_progress','done','wont_fix')),
    priority text DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
    minister_notes text,
    upvotes int DEFAULT 0,
    upvoter_ids text[] DEFAULT '{}',
    resolved_at timestamptz
  );
  ALTER TABLE beta_reports ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "read_all" ON beta_reports FOR SELECT USING (true);
  CREATE POLICY "insert_any" ON beta_reports FOR INSERT WITH CHECK (true);
  CREATE POLICY "update_any" ON beta_reports FOR UPDATE USING (true);

  Storage bucket (run in SQL or Supabase dashboard):
  INSERT INTO storage.buckets (id, name, public) VALUES ('beta-screenshots', 'beta-screenshots', true) ON CONFLICT DO NOTHING;
  CREATE POLICY "beta_screenshots_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'beta-screenshots');
  CREATE POLICY "beta_screenshots_read" ON storage.objects FOR SELECT USING (bucket_id = 'beta-screenshots');
*/

const { url: supabaseUrl, serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')
const supabase = createClient(supabaseUrl!, serviceRoleKey!)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
}
const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json' }

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}

async function resolveUser(token: string) {
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
    return { userId, userData, meta: userData?.public_metadata }
  } catch { return null }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'Unauthorized' }, 401)

  const auth = await resolveUser(token)
  if (!auth) return json({ error: 'Invalid session' }, 401)

  const { userId, userData, meta } = auth
  const isMinister = meta?.role === 'minister'
  const userName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Warrior'

  const url = new URL(req.url)
  const action = url.searchParams.get('action') ?? ''

  // ── list ─────────────────────────────────────────────────────────
  if (action === 'list') {
    const { data, error } = await supabase
      .from('beta_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) return json({ error: error.message }, 500)
    return json({ reports: data })
  }

  // ── stats ─────────────────────────────────────────────────────────
  if (action === 'stats') {
    const { data, error } = await supabase.from('beta_reports').select('type, status')
    if (error) return json({ error: error.message }, 500)
    const byType: Record<string, number> = {}
    const byStatus: Record<string, number> = {}
    for (const r of (data || [])) {
      byType[r.type]     = (byType[r.type]     || 0) + 1
      byStatus[r.status] = (byStatus[r.status] || 0) + 1
    }
    return json({ byType, byStatus, total: (data || []).length })
  }

  // ── submit ────────────────────────────────────────────────────────
  if (action === 'submit' && req.method === 'POST') {
    const body = await req.json().catch(() => ({}))
    const { type, title, page_section, description, screenshot_url } = body
    const validTypes = ['bug', 'feature', 'crash', 'ui', 'performance', 'other']
    if (!validTypes.includes(type)) return json({ error: 'Invalid type' }, 400)
    if (!title?.trim()) return json({ error: 'title required' }, 400)

    const { data, error } = await supabase.from('beta_reports').insert({
      submitted_by_id:   userId,
      submitted_by_name: userName,
      type,
      title:          String(title).slice(0, 200),
      page_section:   page_section || null,
      description:    description ? String(description).slice(0, 2000) : null,
      screenshot_url: screenshot_url || null,
      status:         'open',
      priority:       'normal',
      upvotes:        0,
      upvoter_ids:    [],
    }).select().single()
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true, report: data }, 201)
  }

  // ── upvote (toggle) ───────────────────────────────────────────────
  if (action === 'upvote' && req.method === 'POST') {
    const body = await req.json().catch(() => ({}))
    const { id } = body
    if (!id) return json({ error: 'id required' }, 400)

    const { data: existing } = await supabase.from('beta_reports').select('upvotes, upvoter_ids').eq('id', id).single()
    if (!existing) return json({ error: 'Not found' }, 404)

    const upvoterIds: string[] = existing.upvoter_ids || []
    const alreadyVoted = upvoterIds.includes(userId)
    const newIds   = alreadyVoted ? upvoterIds.filter((x: string) => x !== userId) : [...upvoterIds, userId]
    const newCount = alreadyVoted ? Math.max(0, (existing.upvotes || 0) - 1) : (existing.upvotes || 0) + 1

    const { error } = await supabase.from('beta_reports').update({ upvotes: newCount, upvoter_ids: newIds }).eq('id', id)
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true, upvotes: newCount, voted: !alreadyVoted })
  }

  // ── triage (minister only) ────────────────────────────────────────
  if (action === 'triage' && req.method === 'PATCH') {
    if (!isMinister) return json({ error: 'Forbidden' }, 403)
    const body = await req.json().catch(() => ({}))
    const { id, status, priority, minister_notes } = body
    if (!id) return json({ error: 'id required' }, 400)

    const validStatuses   = ['open', 'in_progress', 'done', 'wont_fix']
    const validPriorities = ['low', 'normal', 'high', 'critical']
    if (status   && !validStatuses.includes(status))     return json({ error: 'Invalid status'   }, 400)
    if (priority && !validPriorities.includes(priority)) return json({ error: 'Invalid priority' }, 400)

    const update: Record<string, unknown> = {}
    if (status            !== undefined) update.status          = status
    if (priority          !== undefined) update.priority        = priority
    if (minister_notes    !== undefined) update.minister_notes  = minister_notes
    if (status === 'done')               update.resolved_at     = new Date().toISOString()

    const { error } = await supabase.from('beta_reports').update(update).eq('id', id)
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true })
  }

  // ── upload screenshot ─────────────────────────────────────────────
  if (action === 'upload' && req.method === 'POST') {
    const formData = await req.formData()
    const file = formData.get('file')
    if (!file || typeof file === 'string') return json({ error: 'file required' }, 400)
    const f = file as File
    if (!f.type.startsWith('image/'))  return json({ error: 'image files only' }, 400)
    if (f.size > 10 * 1024 * 1024)    return json({ error: 'max 10MB' }, 400)

    const arrayBuffer = await f.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)
    const safeName    = f.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName    = `${userId}/${Date.now()}-${safeName}`

    const { error } = await supabase.storage.from('beta-screenshots').upload(fileName, buffer, { contentType: f.type, upsert: false })
    if (error) return json({ error: error.message }, 500)

    const { data: { publicUrl } } = supabase.storage.from('beta-screenshots').getPublicUrl(fileName)
    return json({ url: publicUrl })
  }

  return json({ error: `Unknown action: ${action}` }, 400)
}

export const config = { path: '/api/beta-reports' }
