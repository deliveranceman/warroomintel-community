import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'
import { extractSpiritFromSource } from './_shared/extractSpiritFromSource'
import { layer2ToProposedFields } from './_shared/layer2ToProposedFields'
import { SOURCE_TYPE_MAP } from './_shared/sourceTypeMap'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
function sb() { return createClient(sbUrl, sbKey) }

const COMPLETENESS_CONF: Record<string, number> = {
  minimal: 25, partial: 50, substantial: 75, comprehensive: 95,
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth
  const { userId } = auth

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS })
  }

  const { candidateId } = body || {}
  if (!candidateId || typeof candidateId !== 'string') {
    return new Response(JSON.stringify({ error: 'candidateId required' }), { status: 400, headers: CORS })
  }

  const client = sb()

  // Fetch candidate
  const { data: candidate, error: candErr } = await client
    .from('spirit_candidates')
    .select('id, name, source_id, source_name, source_type, is_adversarial, ai_notes, function, manifestations, also_known_as')
    .eq('id', candidateId)
    .single()

  if (candErr || !candidate) {
    return new Response(JSON.stringify({ error: 'candidate not found' }), { status: 404, headers: CORS })
  }
  if (!candidate.source_id) {
    return new Response(
      JSON.stringify({ error: 'no_source', detail: 'Candidate has no source reference' }),
      { status: 400, headers: CORS }
    )
  }

  // Build a richer query string by folding available candidate context fields into
  // the embedding input. A 2-word name like "Bitterness family" produces a sparse
  // embedding; ai_notes / function / manifestations add semantic weight.
  const queryParts = [
    candidate.name,
    candidate.ai_notes,
    candidate.function,
    candidate.manifestations,
    candidate.also_known_as,
  ].filter(Boolean).map((s: string) => s.trim()).filter((s: string) => s.length > 0)
  const queryText = queryParts.length > 0 ? queryParts.join('. ') : candidate.name

  // Book-scoped vector search via match_library_chunks_in_book — runs similarity
  // within the candidate's own source book only, eliminating the small-book
  // underweighting problem that caused no_chunks_found 404s on the global RPC.
  const OPENAI_KEY = process.env.OPENAI_API_KEY || ''
  if (!OPENAI_KEY) {
    return new Response(
      JSON.stringify({ error: 'config_error', detail: 'OPENAI_API_KEY not configured' }),
      { status: 500, headers: CORS }
    )
  }

  const embRes = await fetch('https://api.openai.com/v1/embeddings', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
    body:    JSON.stringify({ model: 'text-embedding-3-small', input: [queryText] }),
    signal:  AbortSignal.timeout(5000),
  })
  if (!embRes.ok) {
    return new Response(
      JSON.stringify({ error: 'embedding_failed', detail: `OpenAI embeddings returned ${embRes.status}` }),
      { status: 500, headers: CORS }
    )
  }
  const embData      = await embRes.json()
  const queryEmbedding = embData.data?.[0]?.embedding
  if (!queryEmbedding) {
    return new Response(
      JSON.stringify({ error: 'embedding_failed', detail: 'No embedding returned from OpenAI' }),
      { status: 500, headers: CORS }
    )
  }

  const { data: rpcData, error: rpcErr } = await client.rpc('match_library_chunks_in_book', {
    query_embedding: queryEmbedding,
    book_id_filter:  candidate.source_id,
    match_threshold: 0.45,
    match_count:     50,
  })
  if (rpcErr) {
    return new Response(
      JSON.stringify({ error: 'rag_failed', detail: rpcErr.message }),
      { status: 500, headers: CORS }
    )
  }

  const chunks = ((rpcData || []) as Array<{ chunk_text: string; book_title: string; similarity: number }>).slice(0, 5)

  if (chunks.length === 0) {
    return new Response(
      JSON.stringify({
        error:  'no_chunks_found',
        detail: 'No semantically relevant chunks found in the linked resource',
        diagnostic: {
          rpc_match_count:     (rpcData || []).length,
          in_book_match_count: chunks.length,
          similarity_range:    (rpcData || []).length > 0
            ? {
                min: Math.min(...(rpcData as any[]).map((m: any) => m.similarity)),
                max: Math.max(...(rpcData as any[]).map((m: any) => m.similarity)),
              }
            : null,
          query_text_length: queryText.length,
        },
      }),
      { status: 404, headers: CORS }
    )
  }

  const bookTitle  = (chunks[0] as any).book_title || candidate.source_name || 'Unknown source'
  const sourceText = chunks.map((c: any) => c.chunk_text as string).join('\n\n---\n\n').slice(0, 12000)
  const srcExcerpt = sourceText.slice(0, 500)
  const sourceType = SOURCE_TYPE_MAP[(candidate.source_type || '').toLowerCase()] || 'ministry'

  // Run Layer 2 extraction
  let extraction: Awaited<ReturnType<typeof extractSpiritFromSource>>
  try {
    extraction = await extractSpiritFromSource(
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
  } catch (err: any) {
    const msg = (err?.message || '').slice(0, 300)
    console.error('[candidate-run-layer2] extraction failed:', msg)
    return new Response(
      JSON.stringify({ error: 'extraction_failed', detail: msg }),
      { status: 500, headers: CORS }
    )
  }

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
    console.error('[candidate-run-layer2] insert suggestion failed:', insErr.message)
    return new Response(
      JSON.stringify({ error: 'suggestion_write_failed', detail: insErr.message }),
      { status: 500, headers: CORS }
    )
  }

  console.log(`[candidate-run-layer2] ${candidate.name}: completeness=${completeness} fields=${Object.keys(proposedFields).length} cost=$${extraction.meta.costUsd.toFixed(4)}`)

  return new Response(JSON.stringify({
    success:      true,
    candidateId,
    suggestionId: suggestion.id,
    completeness,
    confidence,
    fieldCount:   Object.keys(proposedFields).length,
    costUsd:      extraction.meta.costUsd,
  }), { status: 200, headers: CORS })
}

export const config = { path: '/api/candidate-run-layer2' }
