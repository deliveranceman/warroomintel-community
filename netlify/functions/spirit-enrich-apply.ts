import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'
import { updateSpiritBySlug } from './_shared/spiritWrite'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

function sb() { return createClient(sbUrl!, sbKey!) }

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  let body: any
  try { body = await req.json() } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { jobId, applyFields } = body || {}
  if (!jobId) return json({ error: 'jobId required' }, 400)

  // applyFields: when present and non-empty, only those keys are written.
  // When omitted or empty, all keys in proposed are written (batch path).
  const fieldFilter: Set<string> | null =
    Array.isArray(applyFields) && applyFields.length > 0
      ? new Set<string>(applyFields as string[])
      : null

  const client = sb()

  const { data: job, error: loadErr } = await client
    .from('ai_jobs')
    .select('id,job_type,status,result_json,user_id')
    .eq('id', jobId)
    .single()

  if (loadErr || !job) return json({ error: 'Job not found' }, 404)

  if (job.job_type !== 'spirit_enrich') {
    return json({ error: 'Job is not a spirit_enrich job' }, 422)
  }
  if (job.status !== 'complete') {
    return json({ error: `Job is not complete (status: ${job.status})` }, 422)
  }

  const resultJson = job.result_json as Record<string, any> || {}

  // Idempotency: already applied
  if (resultJson.applied_at) {
    return json({ ok: true, noop: true, spiritId: resultJson.spiritId, appliedAt: resultJson.applied_at })
  }

  const fullProposed = (resultJson.proposed   as Record<string, any>) || {}
  const spiritSlug   = (resultJson.spiritSlug as string) || ''

  if (!spiritSlug) {
    return json({ error: 'result_json.spiritSlug missing — job data is corrupt' }, 422)
  }
  if (Object.keys(fullProposed).length === 0) {
    return json({ error: 'No proposed fields to apply' }, 422)
  }

  // Apply only the filtered subset, or everything if no filter.
  const proposed: Record<string, any> = fieldFilter
    ? Object.fromEntries(
        Object.entries(fullProposed).filter(([k]) => fieldFilter.has(k))
      )
    : fullProposed

  if (Object.keys(proposed).length === 0) {
    return json({ error: 'applyFields had no overlap with proposed fields' }, 422)
  }

  // updateSpiritBySlug with meta: snapshots prior values, aborts if snapshot fails.
  const { record, error: writeErr } = await updateSpiritBySlug(
    client, spiritSlug, proposed,
    { jobId, appliedBy: auth.userId, source: 'enrich' }
  )

  if (writeErr === 'Spirit not found') {
    return json({
      error: `Spirit "${spiritSlug}" no longer exists — it may have been deleted after enrichment was queued.`,
    }, 422)
  }
  if (writeErr || !record) {
    console.error('[spirit-enrich-apply] write error:', writeErr)
    return json({ error: writeErr || 'Write failed' }, 500)
  }

  const appliedFields = Object.keys(proposed)

  // Stamp the job row so re-applies are idempotent; record exactly which keys landed.
  await client.from('ai_jobs').update({
    result_json: {
      ...resultJson,
      applied_at:     new Date().toISOString(),
      applied_by:     auth.userId,
      applied_fields: appliedFields,
    },
  }).eq('id', jobId)

  console.log(`[spirit-enrich-apply] applied ${appliedFields.length} fields to "${spiritSlug}" by ${auth.userId}`)

  return json({ ok: true, spiritId: record.id, spiritSlug, updatedFields: appliedFields })
}

export const config = { path: '/api/spirit-enrich-apply' }
