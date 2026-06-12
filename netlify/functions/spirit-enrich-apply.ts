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

  const { jobId } = body || {}
  if (!jobId) return json({ error: 'jobId required' }, 400)

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

  const proposed   = (resultJson.proposed   as Record<string, any>) || {}
  const spiritSlug = (resultJson.spiritSlug as string) || ''
  const spiritId   = (resultJson.spiritId   as string) || ''

  if (!spiritSlug) {
    return json({ error: 'result_json.spiritSlug missing — job data is corrupt' }, 422)
  }
  if (Object.keys(proposed).length === 0) {
    return json({ error: 'No proposed fields to apply' }, 422)
  }

  const { record, error: writeErr } = await updateSpiritBySlug(client, spiritSlug, proposed)

  if (writeErr === 'Spirit not found') {
    return json({
      error: `Spirit "${spiritSlug}" no longer exists — it may have been deleted after enrichment was queued. Re-run enrichment or restore the spirit first.`,
    }, 422)
  }
  if (writeErr || !record) {
    console.error('[spirit-enrich-apply] write error:', writeErr)
    return json({ error: writeErr || 'Write failed' }, 500)
  }

  // Stamp the job row so re-applies are idempotent
  await client.from('ai_jobs').update({
    result_json: {
      ...resultJson,
      applied_at: new Date().toISOString(),
      applied_by: auth.userId,
    },
  }).eq('id', jobId)

  const updatedFields = Object.keys(proposed)
  console.log(`[spirit-enrich-apply] applied ${updatedFields.length} fields to "${spiritSlug}" by ${auth.userId}`)

  return json({ ok: true, spiritId, spiritSlug, updatedFields })
}

export const config = { path: '/api/spirit-enrich-apply' }
