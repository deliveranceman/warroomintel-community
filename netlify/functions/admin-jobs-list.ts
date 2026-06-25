import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')

function sb() { return createClient(sbUrl!, sbKey!) }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS })
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const url      = new URL(req.url)
  const statusF  = url.searchParams.get('status')   || null
  const typeF    = url.searchParams.get('job_type') || null
  const limit    = Math.min(Number(url.searchParams.get('limit') || 50), 200)

  const client = sb()

  // ── Fetch jobs with inline LEFT JOIN on resources for title ──────────────
  let query = client
    .from('ai_jobs')
    .select('id, job_type, status, progress, stage, cost_estimate, tokens_used, error_message, created_at, started_at, completed_at, resource_id, input_params, result_json, resources!ai_jobs_resource_id_fkey(title)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (statusF) query = query.eq('status', statusF)
  if (typeF)   query = query.eq('job_type', typeF)

  const { data: rows, error } = await query
  if (error) return json({ error: error.message }, 500)

  const jobs = (rows || []).map((r: any) => ({
    id:            r.id,
    job_type:      r.job_type,
    status:        r.status,
    progress:      r.progress,
    stage:         r.stage,
    cost_estimate: r.cost_estimate,
    tokens_used:   r.tokens_used,
    error_message: typeof r.error_message === 'string' ? r.error_message.slice(0, 200) : null,
    created_at:    r.created_at,
    started_at:    r.started_at,
    completed_at:  r.completed_at,
    resource_id:   r.resource_id,
    resource_title: (r.resources as any)?.title ?? null,
    // Distilled result_json fields for the expand panel
    result_summary: r.result_json ? {
      candidate_count:   r.result_json.candidate_count   ?? null,
      windows_processed: r.result_json.windows_processed ?? null,
      by_target:         r.result_json.by_target          ?? null,
      _cursor:           r.result_json._cursor            ?? null,
      mentionsFound:     r.result_json.mentionsFound      ?? null,
      enrichSuggestions: r.result_json.enrichSuggestions  ?? null,
      newCandidates:     r.result_json.newCandidates      ?? null,
    } : null,
    input_summary: r.input_params ? {
      resourceId:  r.input_params.resourceId  ?? null,
      sourceType:  r.input_params.sourceType  ?? null,
      lane:        r.input_params.lane        ?? null,
    } : null,
  }))

  // ── Summary counts ───────────────────────────────────────────────────────
  // Count across all jobs for this filter (not just the page) via a separate count query
  const countBase = client.from('ai_jobs').select('status')
  const { data: allRows } = typeF
    ? await countBase.eq('job_type', typeF)
    : await countBase

  const summary = { running: 0, queued: 0, complete: 0, failed: 0, partial: 0, total: 0 }
  for (const r of (allRows || [])) {
    const s = (r as any).status as string
    summary.total++
    if (s === 'running')  summary.running++
    else if (s === 'queued')   summary.queued++
    else if (s === 'complete') summary.complete++
    else if (s === 'failed')   summary.failed++
    else if (s === 'partial')  summary.partial++
  }

  return json({ jobs, summary })
}

export const config = { path: '/api/admin-jobs-list' }
