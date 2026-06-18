import { createClient } from '@supabase/supabase-js'
import { requireAdmin2 } from './_shared/access'
import { checkAndIncrementUsage, getUpgradeMessage } from '../lib/ai-rate-limit'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')

const headers = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type':                 'application/json',
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const usage = await checkAndIncrementUsage(auth.userId, auth.tier, 'document', auth.level)
  if (!usage.allowed) {
    return new Response(
      JSON.stringify({ error: getUpgradeMessage(auth.tier, 'document'), rateLimited: true, limit: usage.limit, remaining: 0 }),
      { status: 429, headers },
    )
  }

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers })
  }

  const { templateId, templateName, sections, subject, spiritData, specialInstructions } = body
  if (!templateId || !subject?.trim()) {
    return new Response(JSON.stringify({ error: 'templateId and subject required' }), { status: 400, headers })
  }

  try {
    const client = createClient(sbUrl!, sbKey!)

    const { data: job, error: insertErr } = await client
      .from('ai_jobs')
      .insert({
        job_type:     'generate_document',
        status:       'queued',
        progress:     0,
        stage:        'queued',
        user_id:      auth.userId,
        tier:         auth.tier,
        input_params: {
          mode: 'admin',
          templateId,
          templateName,
          sections,
          subject:             subject.trim(),
          spiritData:          spiritData || null,
          specialInstructions: specialInstructions || null,
        },
      })
      .select('id')
      .single()

    if (insertErr || !job?.id) {
      console.error('[admin-generate-document] job insert failed:', insertErr?.message)
      return new Response(JSON.stringify({ error: 'Failed to queue document job' }), { status: 500, headers })
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
      console.warn('[admin-generate-document] worker dispatch failed:', dispatchErr.message, 'jobId:', jobId)
    }

    return new Response(JSON.stringify({ jobId }), { status: 202, headers })

  } catch (e: any) {
    console.error('[admin-generate-document] Error:', e.message)
    return new Response(JSON.stringify({ error: e.message || 'Failed to start document job' }), { status: 500, headers })
  }
}

export const config = { path: '/api/admin-generate-document' }
