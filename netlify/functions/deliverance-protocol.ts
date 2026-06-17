import { requireTier } from './_shared/access'
import { checkAndIncrementUsage, getUpgradeMessage } from '../lib/ai-rate-limit'
import { createClient } from '@supabase/supabase-js'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })

  const auth = await requireTier(req, 2)
  if (auth instanceof Response) return auth

  const usage = await checkAndIncrementUsage(auth.userId, auth.tier, 'deliverance', auth.level)
  if (!usage.allowed) {
    return new Response(JSON.stringify({ error: getUpgradeMessage(auth.tier, 'deliverance'), rateLimited: true, limit: usage.limit, remaining: 0 }), { status: 429, headers: HEADERS })
  }

  let body: any = {}
  try { body = await req.json() } catch {}

  const {
    mode = 'spirit',
    spiritData,
    spiritName: bodySpitName = '',
    spiritNames = [],
    includeCluster = true,
    manifestationDescription = '',
    manifestationCandidates = [],
  } = body

  try {
    const client = createClient(sbUrl!, sbKey!)

    const { data: job, error: insertErr } = await client.from('ai_jobs').insert({
      job_type:     'deliverance_protocol',
      status:       'queued',
      progress:     0,
      stage:        'queued',
      user_id:      auth.userId,
      tier:         auth.tier,
      input_params: {
        mode,
        spiritData:               spiritData || null,
        spiritName:               bodySpitName,
        spiritNames,
        includeCluster,
        manifestationDescription,
        manifestationCandidates,
      },
    }).select('id').single()

    if (insertErr || !job?.id) {
      console.error('[deliverance-protocol] job insert failed:', insertErr?.message)
      return new Response(JSON.stringify({ error: 'Failed to queue protocol job' }), { status: 500, headers: HEADERS })
    }

    const jobId = job.id as string

    // Trigger background worker immediately — cron is the fallback safety net.
    const reqUrl  = new URL(req.url)
    const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`
    try {
      await fetch(`${baseUrl}/api/job-worker-background`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'x-internal-key': process.env.INTERNAL_API_KEY ?? '',
        },
        body: JSON.stringify({ jobId }),
        signal: AbortSignal.timeout(5000),
      })
    } catch (dispatchErr: any) {
      console.warn('[deliverance-protocol] worker dispatch failed:', dispatchErr.message, 'jobId:', jobId)
      // Non-fatal — cron picks it up within 1 minute.
    }

    return new Response(JSON.stringify({ jobId }), { status: 202, headers: HEADERS })
  } catch (e: any) {
    console.error('[deliverance-protocol] Error:', e.message)
    return new Response(JSON.stringify({ error: e.message || 'Failed to start protocol job' }), { status: 500, headers: HEADERS })
  }
}

export const config = { path: '/api/deliverance-protocol' }
