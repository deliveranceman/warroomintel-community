import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'
import { embedSpiritsBatch, persistSpiritEmbedding } from './_shared/embedSpirit'

export const config = { path: '/api/admin-backfill-spirit-embeddings' }

/**
 * POST /api/admin-backfill-spirit-embeddings
 * Body (all optional):
 *   { onlyMissing?: boolean = true,    // skip spirits already embedded
 *     batchSize?: number    = 50,      // spirits per OpenAI call
 *     maxBatches?: number   = 20 }     // safety cap (50*20 = 1000 spirits)
 *
 * Tier: requireAdmin2 (commandant)
 *
 * Returns: { processed, batches, durationMs, errors }
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

  const startTime = Date.now()
  let processed = 0
  let batches = 0
  const errors: Array<{ batch: number; error: string }> = []

  try {
    while (batches < maxBatches) {
      // Fetch next batch
      let q = supabase
        .from('spirits')
        .select('id, name, aka, description')
        .order('created_at', { ascending: true })
        .limit(batchSize)
      if (onlyMissing) q = q.is('embedding', null)

      const { data, error } = await q
      if (error) throw error
      if (!data || data.length === 0) break

      // One OpenAI call for the whole batch
      try {
        const embedded = await embedSpiritsBatch(apiKey, data)

        // Persist in parallel (PostgREST has no batch update for vectors)
        await Promise.all(
          embedded.map((e) =>
            persistSpiritEmbedding(supabase, e.id, e.embedding, e.sourceText)
          )
        )

        processed += embedded.length
      } catch (batchErr: any) {
        errors.push({
          batch: batches,
          error: String(batchErr?.message ?? batchErr),
        })
      }

      batches += 1
      if (data.length < batchSize) break  // last batch
    }

    return new Response(
      JSON.stringify({
        processed,
        batches,
        durationMs: Date.now() - startTime,
        errors,
      }, null, 2),
      { status: 200, headers: CORS }
    )
  } catch (err: any) {
    console.error('admin-backfill-spirit-embeddings failed', err)
    return new Response(
      JSON.stringify({
        error: 'backfill_failed',
        detail: String(err?.message ?? err),
        processed,
        batches,
      }),
      { status: 500, headers: CORS }
    )
  }
}
