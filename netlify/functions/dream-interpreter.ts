import { checkAndIncrementUsage, getUpgradeMessage } from '../lib/ai-rate-limit'
// @ts-ignore — retained for Session 2 async worker where assembleWRIContext is reintroduced
import { assembleWRIContext } from './_shared/assembleWRIContext'
import { requireTier } from './_shared/access'
import { createClient } from '@supabase/supabase-js'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}
const { url: _sbUrl, serviceRoleKey: _sbKey } = JSON.parse(process.env.SUPABASE || '{}')

function sb() { return createClient(_sbUrl!, _sbKey!) }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  const auth = await requireTier(req, 1)
  if (auth instanceof Response) return auth

  const usage = await checkAndIncrementUsage(auth.userId, auth.tier || 'watchman', 'dream', auth.level)
  if (!usage.allowed) {
    return new Response(JSON.stringify({ error: getUpgradeMessage(auth.tier || 'watchman', 'dream'), rateLimited: true, limit: usage.limit, remaining: 0 }), { status: 429, headers: HEADERS })
  }

  let body: any
  try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS }) }

  const { dreamDescription = '', dreamerContext = '' } = body || {}
  if (!dreamDescription?.trim()) {
    return new Response(JSON.stringify({ error: 'dreamDescription is required' }), { status: 400, headers: HEADERS })
  }
  if (dreamDescription.trim().length < 20) {
    return new Response(JSON.stringify({ error: 'Please describe the dream in more detail (at least 20 characters).' }), { status: 400, headers: HEADERS })
  }

  try {
    const client = sb()
    const { data: job, error: insertErr } = await client.from('ai_jobs').insert({
      job_type:     'dream_interpretation',
      status:       'queued',
      progress:     0,
      user_id:      auth.userId,
      tier:         auth.tier || 'watchman',
      input_params: {
        dreamDescription: dreamDescription.trim(),
        dreamerContext:   dreamerContext?.trim() || '',
      },
    }).select('id').single()

    if (insertErr || !job?.id) {
      console.error('[dream-interpreter] job insert failed:', insertErr?.message)
      return new Response(JSON.stringify({ error: 'Failed to queue interpretation job' }), { status: 500, headers: HEADERS })
    }

    const jobId = job.id as string

    const reqUrl  = new URL(req.url)
    const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`
    try {
      await fetch(`${baseUrl}/api/job-worker-background`, {
        method:  'POST',
        headers: {
          'Content-Type':   'application/json',
          'x-internal-key': process.env.INTERNAL_API_KEY ?? '',
        },
        body:   JSON.stringify({ jobId }),
        signal: AbortSignal.timeout(5000),
      })
    } catch (dispatchErr: any) {
      console.warn('[dream-interpreter] worker dispatch failed:', dispatchErr.message, 'jobId:', jobId)
    }

    return new Response(JSON.stringify({ jobId }), { status: 202, headers: HEADERS })
  } catch (e: any) {
    console.error('[dream-interpreter] Error:', e.message)
    return new Response(JSON.stringify({ error: e.message || 'Failed to start interpretation' }), { status: 500, headers: HEADERS })
  }
}

export const config = { path: '/api/dream-interpreter' }
