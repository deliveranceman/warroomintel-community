import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS as HEADERS } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

const ZERO_STATS = { totalCalls: 0, totalTokens: 0, totalCost: 0, topUsers: [] }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: HEADERS })
  }

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const today = new Date().toISOString().split('T')[0]
  const supabase = sb()

  // Aggregate totals for today
  const { data: rows, error } = await supabase
    .from('ai_usage')
    .select('user_id, call_count, tokens_used, cost_usd')
    .eq('date', today)

  if (error) {
    // Table may not exist yet — return zeros gracefully
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return new Response(JSON.stringify(ZERO_STATS), { status: 200, headers: HEADERS })
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
  }

  if (!rows || rows.length === 0) {
    return new Response(JSON.stringify(ZERO_STATS), { status: 200, headers: HEADERS })
  }

  let totalCalls = 0
  let totalTokens = 0
  let totalCost = 0

  for (const row of rows) {
    totalCalls += Number(row.call_count) || 0
    totalTokens += Number(row.tokens_used) || 0
    totalCost += Number(row.cost_usd) || 0
  }

  // Top 5 users by call_count
  const topUsers = [...rows]
    .sort((a, b) => (Number(b.call_count) || 0) - (Number(a.call_count) || 0))
    .slice(0, 5)
    .map((r) => ({
      userId: r.user_id as string,
      calls: Number(r.call_count) || 0,
      cost: Number(r.cost_usd) || 0,
    }))

  return new Response(
    JSON.stringify({ totalCalls, totalTokens, totalCost, topUsers }),
    { status: 200, headers: HEADERS },
  )
}

export const config = { path: '/api/admin-ai-stats' }
