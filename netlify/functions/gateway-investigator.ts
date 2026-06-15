import { checkAndIncrementUsage, getUpgradeMessage } from '../lib/ai-rate-limit'
// @ts-ignore — retained for Session 2 async worker where assembleWRIContext is reintroduced
import { assembleWRIContext } from './_shared/assembleWRIContext'
import { requireTier } from './_shared/access'
import { createClient } from '@supabase/supabase-js'

const { url: _sbUrl, serviceRoleKey: _sbKey } = JSON.parse(process.env.SUPABASE || '{}')

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() { return createClient(_sbUrl!, _sbKey!) }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers })

  const auth = await requireTier(req, 2)
  if (auth instanceof Response) return auth

  const usage = await checkAndIncrementUsage(auth.userId, auth.tier || 'watchman', 'gateway', auth.level)
  if (!usage.allowed) {
    return new Response(JSON.stringify({ error: getUpgradeMessage(auth.tier || 'watchman', 'gateway'), rateLimited: true, limit: usage.limit, remaining: 0 }), { status: 429, headers })
  }

  let body: any
  try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers }) }

  const { spiritName = '', personContext = '' } = body || {}
  if (!spiritName?.trim() && !personContext?.trim()) {
    return new Response(JSON.stringify({ error: 'Provide a spirit name, cultural exposure context, or both.' }), { status: 400, headers })
  }

  try {
    const client = sb()
    const { data: job, error: insertErr } = await client.from('ai_jobs').insert({
      job_type:     'gateway_investigation',
      status:       'queued',
      progress:     0,
      user_id:      auth.userId,
      tier:         auth.tier || 'watchman',
      input_params: {
        spiritName:   spiritName?.trim() || '',
        personContext: personContext?.trim() || '',
      },
    }).select('id').single()

    if (insertErr || !job?.id) {
      console.error('[gateway-investigator] job insert failed:', insertErr?.message)
      return new Response(JSON.stringify({ error: 'Failed to queue investigation job' }), { status: 500, headers })
    }

    return new Response(JSON.stringify({ jobId: job.id }), { status: 202, headers })
  } catch (e: any) {
    console.error('[gateway-investigator] Error:', e.message)
    return new Response(JSON.stringify({ error: e.message || 'Failed to start investigation' }), { status: 500, headers })
  }
}

export const config = { path: '/api/gateway-investigator' }
