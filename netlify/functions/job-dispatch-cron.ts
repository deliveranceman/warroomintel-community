import type { Config } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')

export const config: Config = {
  schedule: '* * * * *',  // every minute — safety-net for jobs job-start couldn't dispatch
}

export default async (_req: Request) => {
  const supabase = createClient(sbUrl!, sbKey!)

  const cutoff = new Date(Date.now() - 20_000).toISOString()
  const { data: stuck, error } = await supabase
    .from('ai_jobs')
    .select('id')
    .eq('status', 'queued')
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(10)

  if (error) {
    console.warn('[cron] query failed:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!stuck || stuck.length === 0) {
    return new Response(JSON.stringify({ dispatched: 0 }))
  }

  const url = `${process.env.URL}/.netlify/functions/job-worker-background`
  const key = process.env.INTERNAL_API_KEY ?? ''
  const dispatched: string[] = []

  for (const job of stuck) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': key,
        },
        body: JSON.stringify({ jobId: job.id }),
        signal: AbortSignal.timeout(5000),
      })
      if (r.status === 202 || r.status === 200) {
        dispatched.push(job.id)
      } else {
        console.warn('[cron] non-202 from worker for', job.id, ':', r.status)
      }
    } catch (err: any) {
      console.warn('[cron] fetch failed for', job.id, ':', String(err?.message || err))
    }
  }

  console.log('[cron] dispatched', dispatched.length, 'of', stuck.length,
              'jobs:', dispatched.join(','))
  return new Response(JSON.stringify({ dispatched }))
}
