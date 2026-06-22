import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'
import { embedSpiritsBatch, persistSpiritEmbedding } from './_shared/embedSpirit'

export const config = { path: '/api/admin-backfill-spirit-embeddings-background' }

/**
 * POST /api/admin-backfill-spirit-embeddings-background
 * Body (all optional):
 *   { onlyMissing?: boolean = true,    // skip spirits already embedded
 *     batchSize?: number    = 50,      // spirits per OpenAI call
 *     maxBatches?: number   = 20 }     // safety cap (50*20 = 1000 spirits)
 *
 * Returns 202 immediately; work continues as a Netlify background function
 * (15-minute timeout via -background filename suffix).
 *
 * Tier: requireAdmin2 (commandant)
 */
export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: CORS,
    })
  }

  let body: any = {}
  try { body = await req.json() } catch { /* default empty */ }

  const onlyMissing = body?.onlyMissing !== false   // default true
  const batchSize   = Math.min(Math.max(body?.batchSize || 50, 1), 200)
  const maxBatches  = Math.min(Math.max(body?.maxBatches || 20, 1), 100)

  const apiKey = process.env.OPENAI_API_KEY || ''
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not set' }), {
      status: 500,
      headers: CORS,
    })
  }

  const env = JSON.parse(process.env.SUPABASE || '{}')
  const supabase = createClient(env.url, env.serviceRoleKey)

  // Kick off the work without awaiting so the 202 response goes back immediately.
  // The Netlify background function runtime keeps this process alive (up to 15 min)
  // until the unawaited promise settles.
  runBackfill(supabase, apiKey, { onlyMissing, batchSize, maxBatches }).catch(err =>
    console.error('[admin-backfill-spirit-embeddings-background] fatal:', err)
  )

  return new Response(
    JSON.stringify({ accepted: true, message: 'Backfill started in background' }),
    { status: 202, headers: CORS }
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runBackfill(
  supabase: any,
  apiKey: string,
  opts: { onlyMissing: boolean; batchSize: number; maxBatches: number }
) {
  const { onlyMissing, batchSize, maxBatches } = opts
  const startTime = Date.now()
  let processed = 0
  let batches = 0
  const errors: Array<{ batch: number; error: string }> = []

  try {
    while (batches < maxBatches) {
      let q = supabase
        .from('spirits')
        .select('id, name, aka, description')
        .order('created_at', { ascending: true })
        .limit(batchSize)
      if (onlyMissing) q = q.is('embedding', null)

      const { data, error } = await q
      if (error) throw error
      if (!data || data.length === 0) break

      try {
        const embedded = await embedSpiritsBatch(apiKey, data)
        await Promise.all(
          embedded.map((e) =>
            persistSpiritEmbedding(supabase, e.id, e.embedding, e.sourceText)
          )
        )
        processed += embedded.length
      } catch (batchErr: any) {
        errors.push({ batch: batches, error: String(batchErr?.message ?? batchErr) })
      }

      batches += 1
      if (data.length < batchSize) break
    }

    console.log(
      `[admin-backfill-spirit-embeddings-background] complete: ${processed} spirits, ` +
      `${batches} batches, ${Date.now() - startTime} ms, ${errors.length} errors`
    )
  } catch (err: any) {
    console.error('[admin-backfill-spirit-embeddings-background] failed:', err)
  }
}
