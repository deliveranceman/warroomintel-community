import { createClient } from '@supabase/supabase-js'
import { requireAuth, CORS } from './_shared/access'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

function sb() { return createClient(sbUrl!, sbKey!) }

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS })
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const url   = new URL(req.url)
  const jobId = url.searchParams.get('jobId')
  if (!jobId) return json({ error: 'jobId required' }, 400)

  const client = sb()

  // Single PK read — no joins, no scans
  const { data: job, error } = await client
    .from('ai_jobs')
    .select('id,job_type,status,progress,stage,user_id,result_json,error_message,tokens_used,cost_estimate,created_at,started_at,completed_at')
    .eq('id', jobId)
    .single()

  if (error || !job) return json({ error: 'Job not found' }, 404)

  // Authorize: caller must be owner OR level >= 4
  if (job.user_id !== auth.userId && auth.level < 4) {
    return json({ error: 'Forbidden' }, 403)
  }

  const base = {
    id:           job.id,
    job_type:     job.job_type,
    status:       job.status,
    progress:     job.progress,
    stage:        job.stage,
    result_json:  job.result_json,
    error_message: job.error_message,
    created_at:   job.created_at,
    started_at:   job.started_at,
    completed_at: job.completed_at,
  }

  // Cost fields only visible to admins (level >= 4)
  if (auth.level >= 4) {
    return json({ ...base, tokens_used: job.tokens_used, cost_estimate: job.cost_estimate })
  }

  return json(base)
}

export const config = { path: '/api/job-status' }
