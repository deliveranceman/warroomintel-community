import { createClient } from '@supabase/supabase-js'
import { requireTier } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })

  const auth = await requireTier(req, 1)
  if (auth instanceof Response) return auth

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers })

  const sb = createClient(supabaseUrl!, supabaseServiceKey!)
  const { data, error } = await sb
    .from('assessment_logs')
    .select('war_strategy, status, created_at')
    .eq('id', id)
    .eq('user_id', auth.userId)
    .maybeSingle()

  if (error) {
    console.error('[assessment-strategy-get] query failed:', error.message)
    return new Response(JSON.stringify({ error: 'Failed to load strategy' }), { status: 500, headers })
  }

  if (!data) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers })
  }

  return new Response(JSON.stringify({
    war_strategy: data.war_strategy ?? '',
    status: data.status,
    created_at: data.created_at,
  }), { status: 200, headers })
}

export const config = { path: '/api/assessment-strategy-get' }
