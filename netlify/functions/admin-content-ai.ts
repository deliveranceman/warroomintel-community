import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS as HEADERS } from './_shared/access'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
function sb() { return createClient(sbUrl!, sbKey!) }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...HEADERS, 'Content-Type': 'application/json' } })
}

const VALID_TYPES = new Set(['daily_brief', 'field_manual', 'weekly_intel', 'fringe_article'])

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  let body: { title?: string; type?: string; date?: string }
  try { body = await req.json() } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { title, type = 'field_manual', date } = body
  if (!title?.trim()) return json({ error: 'title is required' }, 400)
  if (!VALID_TYPES.has(type)) return json({ error: `Unknown content type: ${type}` }, 400)

  const client = sb()

  const { data: job, error: insertErr } = await client
    .from('ai_jobs')
    .insert({
      job_type:    'content_gen',
      status:      'queued',
      progress:    0,
      stage:       'queued',
      user_id:     auth.userId,
      tier:        auth.tier,
      input_params: {
        contentType: type,
        title:       title.trim(),
        date:        date || null,
      },
    })
    .select('id')
    .single()

  if (insertErr || !job) {
    console.error('[admin-content-ai] job insert error:', insertErr?.message)
    return json({ error: 'Failed to create generation job' }, 500)
  }

  const jobId   = job.id as string
  const reqUrl  = new URL(req.url)
  const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`

  try {
    await fetch(`${baseUrl}/api/job-worker-background`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' },
      body:    JSON.stringify({ jobId }),
      signal:  AbortSignal.timeout(5000),
    })
  } catch (err: any) {
    console.warn('[admin-content-ai] worker dispatch failed:', err.message, 'jobId:', jobId)
  }

  return json({ jobId, status: 'queued' }, 202)
}

export const config = { path: '/api/admin-content-ai' }
