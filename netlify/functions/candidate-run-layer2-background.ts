/**
 * Netlify Background Function (renamed with -background suffix).
 *
 * Client receives 202 immediately when this endpoint is invoked;
 * extraction then runs in the background (up to 15 min).
 *
 * Outcome is reflected in spirit_candidates:
 *   - last_extraction_at: always set on every run (success or failure)
 *   - last_extraction_error: NULL on success, error message on failure,
 *     'skipped: status=X' on status-guard short-circuit
 *
 * On success, a new library_enrichment_suggestions row is INSERTed.
 *
 * NEW URL: /api/candidate-run-layer2-background
 */

import { createClient } from '@supabase/supabase-js'
import { requireAdmin2 } from './_shared/access'
import { extractSpiritFromSource } from './_shared/extractSpiritFromSource'
import { layer2ToProposedFields } from './_shared/layer2ToProposedFields'
import { SOURCE_TYPE_MAP } from './_shared/sourceTypeMap'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
function sb() { return createClient(sbUrl, sbKey) }

const COMPLETENESS_CONF: Record<string, number> = {
  minimal: 25, partial: 50, substantial: 75, comprehensive: 95,
}

export default async function handler(req: Request) {
  // Auth check — secure but silent: client already received 202 so we cannot
  // communicate auth failure via response. Log and exit if unauthorized.
  const auth = await requireAdmin2(req)
  if (auth instanceof Response) {
    console.error('[candidate-run-layer2-background] unauthorized request — exiting silently')
    return
  }
  const { userId } = auth

  let body: any
  try { body = await req.json() } catch {
    console.error('[candidate-run-layer2-background] invalid JSON in request body')
    return
  }

  const { candidateId } = body || {}
  if (!candidateId || typeof candidateId !== 'string') {
    console.error('[candidate-run-layer2-background] candidateId missing or not a string')
    return
  }

  const client = sb()

  async function writeFailure(msg: string) {
    await client
      .from('spirit_candidates')
      .update({
        last_extraction_at:    new Date().toISOString(),
        last_extraction_error: msg.slice(0, 2000),
      })
      .eq('id', candidateId)
  }

  try {
    // Fetch candidate (include status for guard check)
    const { data: candidate, error: candErr } = await client
      .from('spirit_candidates')
      .select('id, name, source_id, source_name, source_type, is_adversarial, ai_notes, function, manifestations, also_known_as, status')
      .eq('id', candidateId)
      .single()

    if (candErr || !candidate) {
      console.error('[candidate-run-layer2-background] candidate not found:', candidateId)
      await writeFailure('candidate_not_found')
      return
    }

    // Status guard — skip already-processed candidates
    if (candidate.status === 'approved' || candidate.status === 'rejected') {
      console.warn(`[candidate-run-layer2-background] skipped: status=${candidate.status} for candidate ${candidateId}`)
      await client
        .from('spirit_candidates')
        .update({
          last_extraction_at:    new Date().toISOString(),
          last_extraction_error: `skipped: status=${candidate.status}`,
        })
        .eq('id', candidateId)
      return
    }

    if (!candidate.source_id) {
      await writeFailure('no_source: Candidate has no source reference')
      return
    }

    // Build enriched query string — semantic weight beyond a bare 2-word name
    const queryParts = [
      candidate.name,
      candidate.ai_notes,
      candidate.function,
      candidate.manifestations,
      candidate.also_known_as,
    ].filter(Boolean).map((s: string) => s.trim()).filter((s: string) => s.length > 0)
    const queryText = queryParts.length > 0 ? queryParts.join('. ') : candidate.name

    // Book-scoped vector search via match_library_chunks_in_book
    const OPENAI_KEY = process.env.OPENAI_API_KEY || ''
    if (!OPENAI_KEY) {
      await writeFailure('config_error: OPENAI_API_KEY not configured')
      return
    }

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
      book_id_filter:  candidate.source_id,
      match_threshold: 0.30,
      match_count:     50,
    })
    if (rpcErr) {
      await writeFailure(`rag_failed: ${rpcErr.message}`)
      return
    }

    const chunks = ((rpcData || []) as Array<{ chunk_text: string; book_title: string; similarity: number }>).slice(0, 5)

    if (chunks.length === 0) {
      await writeFailure(`no_chunks_found: No semantically relevant chunks found in the linked resource for "${candidate.name}"`)
      return
    }

    const bookTitle  = (chunks[0] as any).book_title || candidate.source_name || 'Unknown source'
    const sourceText = chunks.map((c: any) => c.chunk_text as string).join('\n\n---\n\n').slice(0, 12000)
    const srcExcerpt = sourceText.slice(0, 500)
    const sourceType = SOURCE_TYPE_MAP[(candidate.source_type || '').toLowerCase()] || 'ministry'

    // Run Layer 2 extraction
    const extraction = await extractSpiritFromSource(
      {
        targetSpiritName: candidate.name,
        sourceMetadata: {
          title:         bookTitle,
          author:        'unknown',
          year:          'unknown',
          sourceType,
          isAdversarial: candidate.is_adversarial ?? false,
        },
        sourceText,
      },
      { tier: 'standard', meta: { userId, userTier: 'admin' } }
    )

    const proposedFields = layer2ToProposedFields(extraction.output)
    const completeness   = extraction.output?._meta?.extraction_completeness || 'partial'
    const confidence     = COMPLETENESS_CONF[completeness] ?? 50

    // Insert into library_enrichment_suggestions (no unique constraint — plain insert)
    const { data: suggestion, error: insErr } = await client
      .from('library_enrichment_suggestions')
      .insert({
        resource_id:        candidate.source_id,
        book_title:         bookTitle,
        spirit_name:        candidate.name,
        existing_record_id: null,
        action:             'enrich',
        proposed_fields:    proposedFields,
        layer2_raw:         extraction.output,
        confidence,
        source_excerpt:     srcExcerpt,
        status:             'pending',
        is_adversarial:     candidate.is_adversarial ?? false,
      })
      .select('id')
      .single()

    if (insErr) {
      console.error('[candidate-run-layer2-background] insert suggestion failed:', insErr.message)
      await writeFailure(`suggestion_write_failed: ${insErr.message}`)
      return
    }

    // SUCCESS — update candidate tracking columns
    await client
      .from('spirit_candidates')
      .update({
        last_extraction_at:    new Date().toISOString(),
        last_extraction_error: null,
      })
      .eq('id', candidateId)

    console.log(`[candidate-run-layer2-background] ${candidate.name}: completeness=${completeness} fields=${Object.keys(proposedFields).length} suggestionId=${suggestion.id} cost=$${extraction.meta.costUsd.toFixed(4)}`)

  } catch (err: any) {
    const msg = (err?.message ?? String(err)).slice(0, 2000)
    console.error('[candidate-run-layer2-background] unhandled error:', msg)
    await writeFailure(msg)
  }
}

export const config = { path: '/api/candidate-run-layer2-background' }
