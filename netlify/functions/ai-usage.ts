import { createClient } from '@supabase/supabase-js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

async function resolveMinister(token: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return false
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return false
    const data = await res.json()
    return data?.public_metadata?.role === 'minister'
  } catch { return false }
}

// Sonnet 4 pricing per token
const INPUT_COST_PER_TOKEN  = 0.000003  // $3 per million
const OUTPUT_COST_PER_TOKEN = 0.000015  // $15 per million

function calcCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * INPUT_COST_PER_TOKEN) + (outputTokens * OUTPUT_COST_PER_TOKEN)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const ok = await resolveMinister(token)
  if (!ok) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })

  const client = sb()

  // ── GET — aggregated stats ───────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const thirtyDaysAgo  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const { data: allRows } = await client
        .from('ai_usage_log')
        .select('called_at, call_type, spirit_name, input_tokens, output_tokens')
        .gte('called_at', lastMonthStart)
        .order('called_at', { ascending: false })

      const rows = allRows || []

      // This month
      const thisMonthRows = rows.filter(r => r.called_at >= thisMonthStart)
      const lastMonthRows = rows.filter(r => r.called_at >= lastMonthStart && r.called_at < thisMonthStart)

      const summarize = (r: any[]) => ({
        calls: r.length,
        inputTokens:  r.reduce((s, x) => s + (x.input_tokens || 0), 0),
        outputTokens: r.reduce((s, x) => s + (x.output_tokens || 0), 0),
        estimatedCost: r.reduce((s, x) => s + calcCost(x.input_tokens || 0, x.output_tokens || 0), 0),
      })

      // Calls by day (last 30 days)
      const dayMap: Record<string, { calls: number; cost: number }> = {}
      const recent30 = rows.filter(r => r.called_at >= thirtyDaysAgo)
      for (const r of recent30) {
        const day = r.called_at.slice(0, 10)
        if (!dayMap[day]) dayMap[day] = { calls: 0, cost: 0 }
        dayMap[day].calls++
        dayMap[day].cost += calcCost(r.input_tokens || 0, r.output_tokens || 0)
      }
      const byDay = Object.entries(dayMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, ...v }))

      // Recent calls (last 10)
      const recentCalls = rows.slice(0, 10).map(r => ({
        called_at: r.called_at,
        call_type: r.call_type,
        spirit_name: r.spirit_name,
        estimatedCost: calcCost(r.input_tokens || 0, r.output_tokens || 0),
      }))

      return new Response(JSON.stringify({
        thisMonth:   summarize(thisMonthRows),
        lastMonth:   summarize(lastMonthRows),
        byDay,
        recentCalls,
      }), { status: 200, headers })
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers })
    }
  }

  // ── POST — log a call ────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const { call_type, spirit_name, input_tokens = 0, output_tokens = 0, model } = body
      if (!call_type) return new Response(JSON.stringify({ error: 'call_type required' }), { status: 400, headers })

      await client.from('ai_usage_log').insert({
        call_type, spirit_name: spirit_name || null,
        input_tokens, output_tokens, model: model || null,
      })
      return new Response(JSON.stringify({ success: true }), { status: 200, headers })
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers })
    }
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/ai-usage' }
