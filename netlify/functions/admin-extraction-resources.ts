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

  const url = new URL(req.url)
  const q   = (url.searchParams.get('q') || '').trim()

  const client = sb()

  // Build query — select extracted_text to compute length; strip before returning
  const baseQuery = client
    .from('resources')
    .select('id, title, author, source_type, topic, created_at, extracted_text')
    .not('extracted_text', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)

  const { data, error } = q
    ? await baseQuery.ilike('title', `%${q}%`)
    : await baseQuery

  if (error) return json({ error: error.message }, 500)

  const resources = (data || [])
    .filter((r: any) => (r.extracted_text as string | null)?.length ?? 0 > 0)
    .map((r: any) => ({
      id:          r.id          as string,
      title:       r.title       as string,
      author:      (r.author     as string | null) ?? null,
      source_type: (r.source_type as string | null) ?? null,
      topic:       (r.topic      as string | null) ?? null,
      created_at:  r.created_at  as string,
      text_len:    ((r.extracted_text as string) || '').length,
    }))

  // ── Coverage — one batch query for all returned resource IDs ────────────────
  type LaneStatus = 'complete' | 'running' | 'failed' | 'none'
  const coverage: Record<string, { spirits: LaneStatus; conditions: LaneStatus; bloodline: LaneStatus }> = {}
  const resourceIds = resources.map(r => r.id)

  if (resourceIds.length > 0) {
    const { data: jobRows } = await client
      .from('ai_jobs')
      .select('resource_id, job_type, status')
      .in('job_type', ['research_drop_spirits', 'research_drop_conditions', 'research_drop_bloodline'])
      .in('resource_id', resourceIds)

    const acc: Record<string, Record<string, Set<string>>> = {}
    for (const row of (jobRows || [])) {
      const rid  = (row as any).resource_id as string
      const jt   = (row as any).job_type    as string
      const stat = (row as any).status      as string
      const lane = jt === 'research_drop_spirits'    ? 'spirits'
                 : jt === 'research_drop_conditions' ? 'conditions'
                 : jt === 'research_drop_bloodline'  ? 'bloodline'
                 : null
      if (!lane || !rid) continue
      if (!acc[rid])       acc[rid] = {}
      if (!acc[rid][lane]) acc[rid][lane] = new Set<string>()
      acc[rid][lane].add(stat)
    }

    const statusOf = (statuses: Set<string> | undefined): LaneStatus => {
      if (!statuses || statuses.size === 0)                   return 'none'
      if (statuses.has('complete'))                           return 'complete'
      if (statuses.has('running') || statuses.has('queued'))  return 'running'
      if (statuses.has('failed')  || statuses.has('partial')) return 'failed'
      return 'none'
    }

    for (const rid of resourceIds) {
      const lanes = acc[rid] || {}
      coverage[rid] = {
        spirits:    statusOf(lanes['spirits']),
        conditions: statusOf(lanes['conditions']),
        bloodline:  statusOf(lanes['bloodline']),
      }
    }
  }

  return json({ resources, coverage })
}

export const config = { path: '/api/admin-extraction-resources' }
