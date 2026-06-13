import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

function sb() { return createClient(sbUrl!, sbKey!) }

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS })
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const url       = new URL(req.url)
  const dateRange = url.searchParams.get('dateRange') || 'all'
  const status    = url.searchParams.get('status')    || 'all'
  const spirit    = (url.searchParams.get('spirit') || '').trim()
  const page      = Math.max(0, parseInt(url.searchParams.get('page') || '0', 10))
  const pageSize  = 50

  const client = sb()
  let query = client
    .from('ai_jobs')
    .select('id,status,created_at,started_at,completed_at,tokens_used,cost_estimate,model_used,input_params,result_json,error_message', { count: 'exact' })
    .eq('job_type', 'spirit_enrich')
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (dateRange !== 'all') {
    const days  = dateRange === 'today' ? 1 : dateRange === '7d' ? 7 : 30
    const since = new Date(Date.now() - days * 86400_000).toISOString()
    query = query.gte('created_at', since)
  }

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  if (spirit) {
    // PostgREST JSONB text extraction: input_params->>'spiritSlug'
    query = query.filter('input_params->>spiritSlug', 'ilike', `%${spirit}%`)
  }

  const { data: jobs, error, count } = await query

  if (error) {
    console.error('[enrichment-history] query failed:', error.message)
    return json({ error: 'Query failed' }, 500)
  }

  const items = (jobs || []).map((j: any) => {
    const rj = (j.result_json as Record<string, any>) || {}
    const runSec = j.started_at && j.completed_at
      ? Math.round((new Date(j.completed_at).getTime() - new Date(j.started_at).getTime()) / 1000)
      : null
    const proposed       = rj.proposed        || {}
    const appliedFields  = rj.applied_fields  || []
    return {
      id:                  j.id,
      status:              j.status,
      created_at:          j.created_at,
      started_at:          j.started_at,
      completed_at:        j.completed_at,
      run_sec:             runSec,
      spirit_slug:         (j.input_params as any)?.spiritSlug || '',
      spirit_name:         rj.spiritName || (j.input_params as any)?.spiritSlug || '',
      tokens_used:         j.tokens_used,
      cost_estimate:       j.cost_estimate,
      error_message:       j.error_message,
      model_used:          j.model_used,
      proposed_count:      Object.keys(proposed).length,
      applied_count:       Array.isArray(appliedFields) ? appliedFields.length : 0,
      proposed,
      current:             rj.current           || {},
      applied_fields:      appliedFields,
      parsed_before_diff:  rj.parsed_before_diff || {},
      raw_model_output:    rj.raw_model_output   || '',
    }
  })

  return json({ items, total: count ?? 0, page, pageSize })
}

export const config = { path: '/api/enrichment-history' }
