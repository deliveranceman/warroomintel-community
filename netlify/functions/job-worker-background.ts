import { createClient } from '@supabase/supabase-js'
import { buildWindows, scanOnce, stageCandidates, WINDOW_SIZE } from './_shared/patristicScan'
import { enrichSpirit } from './_shared/spiritEnrich'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')

function sb() { return createClient(sbUrl!, sbKey!) }

export default async function handler(req: Request): Promise<Response> {
  // Internal verification — fail closed. No Clerk check; identity comes from the job row.
  const internalKey = process.env.INTERNAL_API_KEY
  const receivedKey = req.headers.get('x-internal-key') || ''
  if (!(internalKey && receivedKey === internalKey)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 })
  }

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  const { jobId } = body || {}
  if (!jobId) return new Response(JSON.stringify({ error: 'jobId required' }), { status: 400 })

  const client = sb()

  // Load the job row
  const { data: job, error: loadErr } = await client
    .from('ai_jobs')
    .select('id,job_type,status,user_id,tier,resource_id,input_params')
    .eq('id', jobId)
    .single()

  if (loadErr || !job) {
    console.error('[job-worker] job not found:', jobId)
    return new Response(JSON.stringify({ ok: true, skipped: 'not_found' }), { status: 200 })
  }

  // Idempotency guard — a re-delivered trigger must not double-run a job
  if (job.status !== 'queued') {
    console.log(`[job-worker] job ${jobId} already in status '${job.status}' — skipping`)
    return new Response(JSON.stringify({ ok: true, skipped: 'not_queued' }), { status: 200 })
  }

  // Dispatch on job_type
  if (job.job_type === 'patristic_scan') {
    await runPatristicScan(client, job)
  } else if (job.job_type === 'spirit_enrich') {
    await runSpiritEnrich(client, job)
  } else {
    await client.from('ai_jobs').update({
      status:        'failed',
      error_message: `Unknown job_type: ${job.job_type}`,
      completed_at:  new Date().toISOString(),
    }).eq('id', jobId)
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}

async function runPatristicScan(client: ReturnType<typeof sb>, job: any): Promise<void> {
  const jobId      = job.id as string
  const params     = (job.input_params as any) || {}
  const scanMode   = params.scanMode === 'window8k' ? 'window8k' : 'full'
  const resourceId = (job.resource_id as string) || (params.resourceId as string) || ''
  const meta       = {
    userId:   (job.user_id as string) || '',
    userTier: (job.tier    as string) || '',
    callType: 'patristic_scan',
  }

  try {
    // ── Stage 1: extracting ──────────────────────────────────────────────────
    await client.from('ai_jobs').update({
      status:     'running',
      started_at: new Date().toISOString(),
      stage:      'extracting',
    }).eq('id', jobId)

    const { data: resource, error: fetchErr } = await client
      .from('resources')
      .select('id,title,author,extracted_text')
      .eq('id', resourceId)
      .single()

    if (fetchErr || !resource?.extracted_text) {
      throw new Error(`Resource ${resourceId} not found or has no extracted text`)
    }

    await client.from('resources').update({ summary_status: 'processing' }).eq('id', resourceId)

    // ── Stage 2: scanning ────────────────────────────────────────────────────
    await client.from('ai_jobs').update({ stage: 'scanning' }).eq('id', jobId)

    const fullText: string = resource.extracted_text
    let windows: string[]
    let truncated = false
    if (scanMode === 'full') {
      ({ windows, truncated } = buildWindows(fullText))
    } else {
      windows = [fullText.substring(0, WINDOW_SIZE)]
    }

    const total = windows.length
    let done = 0
    let totalInputTokens  = 0
    let totalOutputTokens = 0
    let totalCostUsd      = 0
    const errors: string[] = []
    let firstParsed: any = null
    const collected: any[] = []

    for (const w of windows) {
      try {
        const result = await scanOnce(w, meta)
        if (result.parsed) {
          if (!firstParsed) firstParsed = result.parsed
          if (Array.isArray(result.parsed.spirit_mentions)) {
            collected.push(...result.parsed.spirit_mentions)
          }
        }
        totalInputTokens  += result.inputTokens
        totalOutputTokens += result.outputTokens
        totalCostUsd      += result.costUsd
      } catch (e: any) {
        errors.push((e.message || String(e)).slice(0, 200))
        console.error(`[job-worker] window ${done + 1}/${total} failed:`, e.message)
      }
      done++
      await client.from('ai_jobs').update({
        progress: Math.round(done / total * 100),
      }).eq('id', jobId)
    }

    // ── Stage 3: deduping ────────────────────────────────────────────────────
    await client.from('ai_jobs').update({ stage: 'deduping' }).eq('id', jobId)

    const sourceName = resource.title || resource.author || 'Unknown'
    const { staged, duplicatesSkipped, genericSkipped } = await stageCandidates(
      client, resourceId, sourceName, collected,
    )

    // ── Stage 4: saving ──────────────────────────────────────────────────────
    await client.from('ai_jobs').update({ stage: 'saving' }).eq('id', jobId)

    await client.from('resources').update({
      summary_status:  'complete',
      ai_summary:      firstParsed || null,
      ai_model_used:   'claude-sonnet-4-5',
      ai_generated_at: new Date().toISOString(),
    }).eq('id', resourceId)

    const tokensUsed = totalInputTokens + totalOutputTokens

    await client.from('ai_jobs').update({
      status:       'complete',
      progress:     100,
      completed_at: new Date().toISOString(),
      model_used:   'claude-sonnet-4-5',
      tokens_used:  tokensUsed,
      cost_estimate: totalCostUsd,
      result_json:  {
        windowsScanned:    windows.length,
        truncated,
        spiritsFound:      staged,
        duplicatesSkipped,
        genericSkipped,
        windowErrors:      errors.length,
      },
    }).eq('id', jobId)

    console.log(`[job-worker] ${jobId} complete: ${staged} staged, ${duplicatesSkipped} dupes, ${errors.length} window errors`)

  } catch (e: any) {
    const errMsg = (e.message || String(e)).slice(0, 2000)
    console.error(`[job-worker] ${jobId} failed:`, errMsg)

    await client.from('ai_jobs').update({
      status:        'failed',
      error_message: errMsg,
      completed_at:  new Date().toISOString(),
    }).eq('id', jobId).then(undefined, () => {})

    await client.from('resources').update({
      summary_status: 'failed',
      summary_error:  errMsg,
    }).eq('id', resourceId).then(undefined, () => {})
  }
}

async function runSpiritEnrich(client: ReturnType<typeof sb>, job: any): Promise<void> {
  const jobId    = job.id as string
  const params   = (job.input_params as any) || {}
  const spiritId = (params.spiritId as string) || ''

  try {
    // ── Stage: preparing ────────────────────────────────────────────────────
    await client.from('ai_jobs').update({
      status:     'running',
      started_at: new Date().toISOString(),
      stage:      'preparing',
    }).eq('id', jobId)

    if (!spiritId) throw new Error('input_params.spiritId missing')

    // ── Stage: enriching ────────────────────────────────────────────────────
    await client.from('ai_jobs').update({ stage: 'enriching', progress: 10 }).eq('id', jobId)

    const result = await enrichSpirit({
      spiritId,
      userId:   (job.user_id as string) || '',
      userTier: (job.tier    as string) || '',
      supabase: client,
    })

    // ── Stage: finalizing ───────────────────────────────────────────────────
    await client.from('ai_jobs').update({ stage: 'finalizing', progress: 90 }).eq('id', jobId)

    await client.from('ai_jobs').update({
      status:        'complete',
      progress:      100,
      completed_at:  new Date().toISOString(),
      model_used:    result.model_used,
      tokens_used:   result.tokens_used,
      cost_estimate: result.cost_estimate,
      result_json:   result,
    }).eq('id', jobId)

    console.log(`[job-worker] ${jobId} spirit_enrich complete: ${Object.keys(result.proposed).length} fields proposed for "${result.spiritName}"`)

  } catch (e: any) {
    const errMsg = (e.message || String(e)).slice(0, 2000)
    console.error(`[job-worker] ${jobId} spirit_enrich failed:`, errMsg)

    await client.from('ai_jobs').update({
      status:        'failed',
      error_message: errMsg,
      completed_at:  new Date().toISOString(),
    }).eq('id', jobId).then(undefined, () => {})
  }
}

export const config = { path: '/api/job-worker-background' }
