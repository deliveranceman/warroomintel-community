import { createClient } from '@supabase/supabase-js'
import { requireTier } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const DERIVED_NAME_RE = /^#\s+PERSONALIZED WAR STRATEGY FOR ([^\n]+)/im

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })

  const auth = await requireTier(req, 1)
  if (auth instanceof Response) return auth

  const sb = createClient(supabaseUrl!, supabaseServiceKey!)
  const { data, error } = await sb
    .from('assessment_logs')
    .select('id, status, created_at, war_strategy')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[assessment-strategy-list] query failed:', error.message)
    return new Response(JSON.stringify({ error: 'Failed to load history' }), { status: 500, headers })
  }

  const items = (data ?? []).map((row: any) => {
    const match = row.war_strategy ? DERIVED_NAME_RE.exec(row.war_strategy) : null
    return {
      id: row.id,
      status: row.status,
      created_at: row.created_at,
      derived_name: match ? match[1].trim() : null,
      strategy_len: row.war_strategy ? (row.war_strategy as string).length : 0,
    }
  })

  return new Response(JSON.stringify({ items }), { status: 200, headers })
}

export const config = { path: '/api/assessment-strategy-list' }
