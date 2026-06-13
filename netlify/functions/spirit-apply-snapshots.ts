import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS })
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const url      = new URL(req.url)
  const spiritId = url.searchParams.get('spiritId') || ''
  const limit    = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)))

  if (!spiritId) return json({ error: 'spiritId required' }, 400)

  const client = createClient(sbUrl!, sbKey!)
  const { data, error } = await client
    .from('spirit_apply_snapshots')
    .select('*')
    .eq('spirit_id', spiritId)
    .order('applied_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[spirit-apply-snapshots] query failed:', error.message)
    return json({ error: 'Query failed' }, 500)
  }

  return json({ snapshots: data || [] })
}

export const config = { path: '/api/spirit-apply-snapshots' }
