import { createClient } from '@supabase/supabase-js'
import { checkAndIncrementUsage, getUpgradeMessage } from '../lib/ai-rate-limit'
import { requireTier } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })

  const auth = await requireTier(req, 1)
  if (auth instanceof Response) return auth

  const usage = await checkAndIncrementUsage(auth.userId, auth.tier, 'assessment', auth.level)
  if (!usage.allowed) {
    return new Response(JSON.stringify({ error: getUpgradeMessage(auth.tier, 'assessment'), rateLimited: true, limit: usage.limit, remaining: 0 }), { status: 429, headers })
  }

  const body = await req.json()
  const { assessmentText, anonymizeAndLog } = body

  if (!assessmentText) return new Response(JSON.stringify({ error: 'No assessment text' }), { status: 400, headers })

  const sb = createClient(supabaseUrl!, supabaseServiceKey!)
  const { data: row, error: insertErr } = await sb
    .from('assessment_logs')
    .insert({
      status: 'processing',
      user_id: auth.userId,
      consented: !!anonymizeAndLog,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertErr || !row?.id) {
    console.error('[assessment-strategy] insert failed:', insertErr?.message)
    return new Response(JSON.stringify({ error: 'Failed to create strategy job' }), { status: 500, headers })
  }

  const id = row.id as string

  const reqUrl  = new URL(req.url)
  const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`
  try {
    await fetch(`${baseUrl}/api/assessment-strategy-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' },
      body: JSON.stringify({
        id,
        assessmentText,
        anonymizeAndLog: !!anonymizeAndLog,
        userId: auth.userId,
        userTier: auth.tier,
      }),
      signal: AbortSignal.timeout(5000),
    })
  } catch (e: any) {
    console.error('[assessment-strategy] background dispatch failed:', e?.message)
    await sb.from('assessment_logs').update({ status: 'failed', error: 'Dispatch failed' }).eq('id', id)
    return new Response(JSON.stringify({ error: 'Failed to start strategy generation. Please try again.' }), { status: 500, headers })
  }

  return new Response(JSON.stringify({ id }), { status: 202, headers })
}

export const config = { path: '/api/assessment-strategy' }
