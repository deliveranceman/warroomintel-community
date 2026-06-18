import { createClient } from '@supabase/supabase-js'
import { requireAuth, CORS } from './_shared/access'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

function sb() { return createClient(sbUrl!, sbKey!) }

const SENSITIVE_KEYS = new Set(['token', 'apiKey', 'secret'])
const VALID_STATUSES  = new Set(['queued', 'running', 'complete', 'failed'])
const VALID_JOB_TYPES = new Set([
  'spirit_enrich', 'deliverance_protocol', 'dream_interpretation',
  'research_drop_spirits', 'gateway_investigation', 'content_gen', 'patristic_scan',
  'ask_sol',
])

function stripInputParams(params: unknown): unknown {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return params
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
    if (k.startsWith('_') || SENSITIVE_KEYS.has(k)) continue
    out[k] = v
  }
  return out
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS })
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const url      = new URL(req.url)
  const status   = url.searchParams.get('status')   || ''
  const jobType  = url.searchParams.get('job_type') || ''
  const limitRaw = parseInt(url.searchParams.get('limit') || '25', 10)
  const limit    = Math.min(Math.max(1, isNaN(limitRaw) ? 25 : limitRaw), 50)
  const before   = url.searchParams.get('before')   || ''

  const client = sb()

  let query = client
    .from('ai_jobs')
    .select('id,job_type,status,stage,progress,error_message,created_at,started_at,completed_at,input_params,result_json,model_used,tokens_used,cost_estimate')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(limit + 1) // extra row to detect hasMore

  if (status && VALID_STATUSES.has(status)) {
    query = query.eq('status', status)
  }
  if (jobType && VALID_JOB_TYPES.has(jobType)) {
    query = query.eq('job_type', jobType)
  }
  if (before) {
    const d = new Date(before)
    if (!isNaN(d.getTime())) query = query.lt('created_at', d.toISOString())
  }

  const { data: rows, error } = await query

  if (error) {
    console.error('[my-sol-jobs] query error:', error.message)
    return json({ error: 'Failed to load jobs' }, 500)
  }

  const all     = rows || []
  const hasMore = all.length > limit
  const slice   = all.slice(0, limit)

  const jobs = slice.map(job => {
    const base = {
      id:            job.id,
      job_type:      job.job_type,
      status:        job.status,
      stage:         job.stage,
      progress:      job.progress,
      error_message: job.error_message,
      created_at:    job.created_at,
      started_at:    job.started_at,
      completed_at:  job.completed_at,
      input_params:  stripInputParams(job.input_params),
      result_json:   job.result_json,
    }
    // Cost fields only for Minister / Commandant (level >= 4)
    if (auth.level >= 4) {
      return { ...base, model_used: job.model_used, tokens_used: job.tokens_used, cost_estimate: job.cost_estimate }
    }
    return base
  })

  const nextCursor = hasMore ? (slice[slice.length - 1]?.created_at ?? null) : null

  return json({ jobs, hasMore, nextCursor })
}

export const config = { path: '/api/my-sol-jobs' }
