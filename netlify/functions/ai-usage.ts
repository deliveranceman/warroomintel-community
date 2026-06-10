import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_shared/access'
import { DAILY_LIMITS } from '../lib/ai-rate-limit'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

const INPUT_COST_PER_TOKEN  = 0.000003
const OUTPUT_COST_PER_TOKEN = 0.000015

function calcCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * INPUT_COST_PER_TOKEN) + (outputTokens * OUTPUT_COST_PER_TOKEN)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  // ── POST — log a usage call ────────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const { call_type, spirit_name, input_tokens = 0, output_tokens = 0, model } = body
      if (!call_type) return new Response(JSON.stringify({ error: 'call_type required' }), { status: 400, headers })
      await sb().from('ai_usage_log').insert({
        user_id:      auth.userId,
        call_type,
        spirit_name:  spirit_name || null,
        input_tokens, output_tokens,
        model:        model || null,
      })
      return new Response(JSON.stringify({ success: true }), { status: 200, headers })
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers })
    }
  }

  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })

  // ── GET (non-admin) — personal daily usage ─────────────────────────────────
  if (!auth.isAdmin) {
    try {
      const features = Object.keys(DAILY_LIMITS.watchman).map(feature => ({
        feature,
        used: 0,
        limit: -1,
        remaining: -1,
      }))
      return new Response(JSON.stringify({ tier: auth.tier, features }), { status: 200, headers })
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers })
    }
  }

  // ── GET (admin/minister) — aggregated stats ───────────────────────────────
  const client = sb()
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

    const thisMonthRows = rows.filter(r => r.called_at >= thisMonthStart)
    const lastMonthRows = rows.filter(r => r.called_at >= lastMonthStart && r.called_at < thisMonthStart)

    const summarize = (r: any[]) => ({
      calls: r.length,
      inputTokens:   r.reduce((s, x) => s + (x.input_tokens || 0), 0),
      outputTokens:  r.reduce((s, x) => s + (x.output_tokens || 0), 0),
      estimatedCost: r.reduce((s, x) => s + calcCost(x.input_tokens || 0, x.output_tokens || 0), 0),
    })

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

    const recentCalls = rows.slice(0, 10).map(r => ({
      called_at:     r.called_at,
      call_type:     r.call_type,
      spirit_name:   r.spirit_name,
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

export const config = { path: '/api/ai-usage' }
