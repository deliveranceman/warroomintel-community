import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

function sb() { return createClient(sbUrl!, sbKey!) }

// Allowlist of accepted job types — grows per feature, never accepts arbitrary strings.
const ALLOWED_JOB_TYPES = new Set(['patristic_scan', 'spirit_enrich'])

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  let body: any
  try { body = await req.json() } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { jobType, resourceId, scanMode: rawScanMode, spiritSlug: rawSpiritSlug } = body || {}

  if (!ALLOWED_JOB_TYPES.has(jobType)) {
    return json({ error: 'unknown job_type' }, 400)
  }

  const client = sb()

  // ── patristic_scan validation ─────────────────────────────────────────────
  let scanMode: 'full' | 'window8k' = 'full'
  if (jobType === 'patristic_scan') {
    if (!resourceId) return json({ error: 'resourceId required' }, 400)
    scanMode = rawScanMode === 'window8k' ? 'window8k' : 'full'

    const { data: resource, error: fetchErr } = await client
      .from('resources')
      .select('id, extracted_text')
      .eq('id', resourceId)
      .single()

    if (fetchErr || !resource) return json({ error: 'Resource not found' }, 404)
    if (!resource.extracted_text?.trim()) {
      return json({ error: 'Resource has no extracted text — run indexing first' }, 422)
    }
  }

  // ── spirit_enrich validation ──────────────────────────────────────────────
  if (jobType === 'spirit_enrich') {
    if (!rawSpiritSlug) return json({ error: 'spiritSlug required' }, 400)

    const { data: spirit, error: spiritErr } = await client
      .from('spirits')
      .select('id')
      .eq('slug', rawSpiritSlug)
      .single()

    if (spiritErr || !spirit) return json({ error: 'Spirit not found' }, 422)
  }

  // ── Build insert row ──────────────────────────────────────────────────────
  const jobRow: Record<string, any> = {
    job_type:  jobType,
    status:    'queued',
    progress:  0,
    stage:     'queued',
    user_id:   auth.userId,
    tier:      auth.tier,
  }
  if (jobType === 'patristic_scan') {
    jobRow.resource_id   = resourceId
    jobRow.input_params  = { scanMode, resourceId }
  } else if (jobType === 'spirit_enrich') {
    jobRow.input_params  = { spiritSlug: rawSpiritSlug }
  }

  // Insert ai_jobs row
  const { data: job, error: insertErr } = await client
    .from('ai_jobs')
    .insert(jobRow)
    .select('id')
    .single()

  if (insertErr || !job) {
    console.error('[job-start] insert error:', insertErr?.message)
    return json({ error: 'Failed to create job' }, 500)
  }

  const jobId = job.id as string

  // Trigger background worker — await up to 5s so Netlify registers the dispatch
  // before job-start returns (fire-and-forget silently dropped on this platform).
  const reqUrl  = new URL(req.url)
  const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`
  try {
    const dispatch = await fetch(
      `${baseUrl}/.netlify/functions/job-worker-background`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': process.env.INTERNAL_API_KEY ?? '',
        },
        body: JSON.stringify({ jobId }),
        signal: AbortSignal.timeout(5000),
      }
    )
    console.log('[job-start] dispatch status:', dispatch.status, 'jobId:', jobId)
    if (dispatch.status !== 202 && dispatch.status !== 200) {
      const body = await dispatch.text().catch(() => '')
      console.warn('[job-start] unexpected dispatch status:',
                   dispatch.status, body.slice(0, 200))
    }
  } catch (err: any) {
    console.warn('[job-start] worker dispatch failed:',
                 String(err?.message || err), 'jobId:', jobId)
  }

  return json({ jobId, status: 'queued' })
}

export const config = { path: '/api/job-start' }
