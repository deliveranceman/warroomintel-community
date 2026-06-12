import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

function sb() { return createClient(sbUrl!, sbKey!) }

// Allowlist of accepted job types — grows per feature, never accepts arbitrary strings.
const ALLOWED_JOB_TYPES = new Set(['patristic_scan'])

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  let body: any
  try { body = await req.json() } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { jobType, resourceId, scanMode: rawScanMode } = body || {}

  if (!ALLOWED_JOB_TYPES.has(jobType)) {
    return json({ error: 'unknown job_type' }, 400)
  }
  if (!resourceId) {
    return json({ error: 'resourceId required' }, 400)
  }

  const scanMode: 'full' | 'window8k' = rawScanMode === 'window8k' ? 'window8k' : 'full'

  const client = sb()

  // Validate: resource exists and has extracted_text
  const { data: resource, error: fetchErr } = await client
    .from('resources')
    .select('id, extracted_text')
    .eq('id', resourceId)
    .single()

  if (fetchErr || !resource) {
    return json({ error: 'Resource not found' }, 404)
  }
  if (!resource.extracted_text?.trim()) {
    return json({ error: 'Resource has no extracted text — run indexing first' }, 422)
  }

  // Insert ai_jobs row
  const { data: job, error: insertErr } = await client
    .from('ai_jobs')
    .insert({
      job_type:    jobType,
      status:      'queued',
      progress:    0,
      stage:       'queued',
      user_id:     auth.userId,
      tier:        auth.tier,
      resource_id: resourceId,
      input_params: { scanMode, resourceId },
    })
    .select('id')
    .single()

  if (insertErr || !job) {
    console.error('[job-start] insert error:', insertErr?.message)
    return json({ error: 'Failed to create job' }, 500)
  }

  const jobId = job.id as string

  // Fire-and-forget: trigger background worker
  const reqUrl  = new URL(req.url)
  const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`
  fetch(`${baseUrl}/api/job-worker-background`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-key': process.env.INTERNAL_API_KEY ?? '',
    },
    body: JSON.stringify({ jobId }),
  }).catch(() => {})

  return json({ jobId, status: 'queued' })
}

export const config = { path: '/api/job-start' }
