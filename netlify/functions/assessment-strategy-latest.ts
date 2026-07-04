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

  const sb = createClient(supabaseUrl!, supabaseServiceKey!)
  const { data } = await sb
    .from('assessment_logs')
    .select('id, status, war_strategy, error')
    .eq('user_id', auth.userId)
    .eq('status', 'complete')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) {
    return new Response(JSON.stringify({ status: null }), { status: 200, headers })
  }

  return new Response(JSON.stringify({
    id: data.id,
    status: data.status,
    strategy: data.war_strategy ?? '',
    error: data.error ?? '',
  }), { status: 200, headers })
}

export const config = { path: '/api/assessment-strategy-latest' }
