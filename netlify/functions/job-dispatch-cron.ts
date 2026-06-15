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

  const url = `${process.env.URL}/api/job-worker-background`
  const key = process.env.INTERNAL_API_KEY ?? ''
  const dispatched: string[] = []

  for (const job of (stuck ?? [])) {
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

  if (dispatched.length > 0) {
    console.log('[cron] dispatched', dispatched.length, 'of', (stuck ?? []).length,
                'jobs:', dispatched.join(','))
  }

  // ─────────────────────────────────────────────────────────────
  // Zombie detection: status='running' jobs whose current invocation
  // has exceeded Netlify's 15-min hard ceiling are definitionally dead.
  // Resumable jobs exit cleanly at the 13-min budget guard, so anything
  // past 16 min means the worker died inside a non-checkpointed stage
  // (embedding, dedup, finalizing) or hit an uncaught exception.
  // Mark them failed with a clear, debuggable error message.
  // ─────────────────────────────────────────────────────────────
  {
    const zombieThreshold = new Date(Date.now() - 16 * 60 * 1000).toISOString()
    const { data: zombies, error: zombieErr } = await supabase
      .from('ai_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message:
          'Zombie detected by cron sweeper: worker ran past 16 minutes without ' +
          'completing or checkpointing. Likely died inside a non-resumable stage ' +
          '(embedding/dedup/finalizing) or hit an unhandled exception. Review ' +
          'Netlify function logs for the invocation that owned this job to diagnose.',
      })
      .eq('status', 'running')
      .lt('started_at', zombieThreshold)
      .select('id, job_type')

    if (zombieErr) {
      console.error('[cron] zombie sweep error:', zombieErr.message)
    } else if (zombies && zombies.length > 0) {
      console.log(
        `[cron] marked ${zombies.length} zombie job(s) failed: ` +
        zombies.map(z => `${z.id} (${z.job_type})`).join(', ')
      )
    }
  }

  return new Response(JSON.stringify({ dispatched }))
}
