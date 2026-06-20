/**
 * Netlify Background Function (renamed with -background suffix).
 *
 * Client receives 202 immediately when this endpoint is invoked;
 * extraction then runs in the background (up to 15 min).
 *
 * Outcome is reflected in library_enrichment_suggestions:
 *   - last_extraction_at: always set on every run (success or failure)
 *   - last_extraction_error: NULL on success, error message on failure,
 *     'skipped: status=X' on status-guard short-circuit
 *
 * NEW URL: /api/admin-retrofit-layer2-background
 */

import { createClient } from '@supabase/supabase-js'
import { requireAdmin2 } from './_shared/access'
import { extractSpiritFromSource } from './_shared/extractSpiritFromSource'
import { layer2ToProposedFields } from './_shared/layer2ToProposedFields'
import { SOURCE_TYPE_MAP } from './_shared/sourceTypeMap'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
function sb() { return createClient(sbUrl, sbKey) }

export default async function handler(req: Request) {
  // Auth check — secure but silent: client already received 202 so we cannot
  // communicate auth failure via response. Log and exit if unauthorized.
  const auth = await requireAdmin2(req)
  if (auth instanceof Response) {
    console.error('[admin-retrofit-layer2-background] unauthorized request — exiting silently')
    return
  }
  const { userId } = auth

  let body: any
  try { body = await req.json() } catch {
    console.error('[admin-retrofit-layer2-background] invalid JSON in request body')
    return
  }

  const { lesId, promptVersion } = body || {}
  if (!lesId || typeof lesId !== 'string') {
    console.error('[admin-retrofit-layer2-background] lesId missing or not a string')
    return
  }
  const version: string = (typeof promptVersion === 'string' && promptVersion.trim())
    ? promptVersion.trim()
    : 'unspecified'

  const client = sb()

  async function writeFailure(msg: string) {
    await client
      .from('library_enrichment_suggestions')
      .update({
        last_extraction_at:    new Date().toISOString(),
        last_extraction_error: msg.slice(0, 2000),
      })
      .eq('id', lesId)
  }

  try {
    // 1. Load LES
    const { data: les, error: lesErr } = await client
      .from('library_enrichment_suggestions')
      .select('id, resource_id, book_title, spirit_name, status, is_adversarial, source_excerpt')
      .eq('id', lesId)
      .single()

    if (lesErr || !les) {
      console.error('[admin-retrofit-layer2-background] les_not_found:', lesId)
      await writeFailure('les_not_found')
      return
    }

    // 2. Status guard — write skipped marker and exit
    if (les.status === 'rejected') {
      console.warn(`[admin-retrofit-layer2-background] skipped: status=${les.status} for LES ${lesId}`)
      await client
        .from('library_enrichment_suggestions')
        .update({
          last_extraction_at:    new Date().toISOString(),
          last_extraction_error: `skipped: status=${les.status}`,
        })
        .eq('id', lesId)
      return
    }
    // status='applied' now allowed — operator can re-retrofit an
    // already-approved LES to deepen its fan-out. Fan-out helpers are
    // idempotent (UNIQUE constraints handle dedup) so re-approval after
    // retrofit is safe.

    // 3. resource_id required for RAG
    if (!les.resource_id) {
      await writeFailure('no_resource: LES has no resource_id — cannot perform RAG lookup')
      return
    }

    // 4. JOIN resources for author + source_type
    const { data: resource } = await client
      .from('resources')
      .select('author, source_type')
      .eq('id', les.resource_id)
      .single()
    const author     = (resource as any)?.author     || 'unknown'
    const rawSrcType = ((resource as any)?.source_type || '').toLowerCase()
    const sourceType = SOURCE_TYPE_MAP[rawSrcType] || 'ministry'

    // 5. RAG pipeline — excerpt-first query, book-scoped vector RPC
    const OPENAI_KEY = process.env.OPENAI_API_KEY || ''
    if (!OPENAI_KEY) {
      await writeFailure('config_error: OPENAI_API_KEY not configured')
      return
    }

    // Prefer source_excerpt — embedding it pulls same-book neighbors to the top.
    // Fall back to bare spirit_name if excerpt is missing or too short.
    const excerpt   = (les.source_excerpt ?? '').trim()
    const queryText = excerpt.length >= 50 ? excerpt : les.spirit_name

    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
      body:    JSON.stringify({ model: 'text-embedding-3-small', input: [queryText] }),
      signal:  AbortSignal.timeout(5000),
    })
    if (!embRes.ok) {
      await writeFailure(`embedding_failed: OpenAI embeddings returned ${embRes.status}`)
      return
    }
    const embData        = await embRes.json()
    const queryEmbedding = embData.data?.[0]?.embedding
    if (!queryEmbedding) {
      await writeFailure('embedding_failed: No embedding returned from OpenAI')
      return
    }

    const { data: rpcData, error: rpcErr } = await client.rpc('match_library_chunks_in_book', {
      query_embedding: queryEmbedding,
      book_id_filter:  les.resource_id,
      match_threshold: 0.30,
      match_count:     50,
    })
    if (rpcErr) {
      await writeFailure(`rag_failed: ${rpcErr.message}`)
      return
    }

    const chunks = ((rpcData || []) as Array<{ chunk_text: string; book_title: string }>).slice(0, 5)

    if (chunks.length === 0) {
      await writeFailure(`no_chunks_found: No library_chunks matched for spirit "${les.spirit_name}" in resource ${les.resource_id}. Was the source embedded?`)
      return
    }

    // 6. Build extraction inputs
    const bookTitle  = chunks[0].book_title || les.book_title || 'Unknown source'
    const sourceText = chunks.map((c) => c.chunk_text).join('\n\n---\n\n').slice(0, 12000)

    // 7. Layer 2 extraction
    const extraction = await extractSpiritFromSource(
      {
        targetSpiritName: les.spirit_name,
        sourceMetadata: {
          title:         bookTitle,
          author,
          year:          'unknown',
          sourceType,
          isAdversarial: les.is_adversarial ?? false,
        },
        sourceText,
      },
      { tier: 'standard', meta: { userId, userTier: 'admin' } }
    )

    // 8. Regenerate proposed_fields
    const proposedFields = layer2ToProposedFields(extraction.output)

    // 9. SUCCESS — UPDATE the LES row with extraction results + tracking columns
    const { error: updErr } = await client
      .from('library_enrichment_suggestions')
      .update({
        layer2_raw:              extraction.output,
        proposed_fields:         proposedFields,
        retrofitted_at:          new Date().toISOString(),
        retrofit_prompt_version: version,
        last_extraction_at:      new Date().toISOString(),
        last_extraction_error:   null,
      })
      .eq('id', lesId)

    if (updErr) {
      console.error('[admin-retrofit-layer2-background] les_update_failed:', updErr.message)
      await writeFailure(`les_update_failed: ${updErr.message}`)
      return
    }

    console.log(`[admin-retrofit-layer2-background] ${les.spirit_name}: fields=${Object.keys(proposedFields).length} cost=$${extraction.meta.costUsd.toFixed(4)}`)

  } catch (err: any) {
    const msg = (err?.message ?? String(err)).slice(0, 2000)
    console.error('[admin-retrofit-layer2-background] unhandled error:', msg)
    await writeFailure(msg)
  }
}

export const config = { path: '/api/admin-retrofit-layer2-background' }
