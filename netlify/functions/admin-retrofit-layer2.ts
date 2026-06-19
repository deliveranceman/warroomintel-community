import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'
import { extractSpiritFromSource } from './_shared/extractSpiritFromSource'
import { layer2ToProposedFields } from './_shared/layer2ToProposedFields'
import { SOURCE_TYPE_MAP } from './_shared/sourceTypeMap'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
function sb() { return createClient(sbUrl, sbKey) }

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

  const { lesId, promptVersion } = body || {}
  if (!lesId || typeof lesId !== 'string') {
    return new Response(JSON.stringify({ error: 'lesId required' }), { status: 400, headers: CORS })
  }
  const version: string = (typeof promptVersion === 'string' && promptVersion.trim())
    ? promptVersion.trim()
    : 'unspecified'

  const client = sb()

  // 1. Load LES
  const { data: les, error: lesErr } = await client
    .from('library_enrichment_suggestions')
    .select('id, resource_id, book_title, spirit_name, status, is_adversarial, source_excerpt')
    .eq('id', lesId)
    .single()

  if (lesErr || !les) {
    return new Response(JSON.stringify({ error: 'les_not_found' }), { status: 404, headers: CORS })
  }

  // 2. Status guard
  if (les.status === 'applied') {
    return new Response(
      JSON.stringify({
        error:  'status_blocked',
        detail: 'LES status is "applied" — spirits/regions/gateways tables already written from prior layer2_raw. Retrofitting would create misleading state.',
      }),
      { status: 409, headers: CORS }
    )
  }
  if (les.status === 'rejected') {
    return new Response(
      JSON.stringify({
        error:  'status_blocked',
        detail: 'LES status is "rejected" — operator decision. Retrofit refused.',
      }),
      { status: 409, headers: CORS }
    )
  }

  // 3. resource_id required for RAG
  if (!les.resource_id) {
    return new Response(
      JSON.stringify({ error: 'no_resource', detail: 'LES has no resource_id — cannot perform RAG lookup' }),
      { status: 400, headers: CORS }
    )
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

  // 5. RAG pipeline — spirit_name as query, book_id filter to les.resource_id
  const OPENAI_KEY = process.env.OPENAI_API_KEY || ''
  if (!OPENAI_KEY) {
    return new Response(
      JSON.stringify({ error: 'config_error', detail: 'OPENAI_API_KEY not configured' }),
      { status: 500, headers: CORS }
    )
  }

  // Prefer the source_excerpt (the exact chunk the original Layer-1
  // ingestion identified as this spirit's source content) — embedding
  // it pulls same-book neighbors to the top of the vector match. Fall
  // back to bare spirit_name if source_excerpt is missing or too short
  // to embed meaningfully.
  const excerpt = (les.source_excerpt ?? '').trim()
  const queryText = excerpt.length >= 50 ? excerpt : les.spirit_name

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
  const embData        = await embRes.json()
  const queryEmbedding = embData.data?.[0]?.embedding
  if (!queryEmbedding) {
    return new Response(
      JSON.stringify({ error: 'embedding_failed', detail: 'No embedding returned from OpenAI' }),
      { status: 500, headers: CORS }
    )
  }

  const { data: rpcMatches, error: rpcErr } = await client.rpc('match_library_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: 0.45,
    match_count:     50,
  })
  if (rpcErr) {
    return new Response(
      JSON.stringify({ error: 'rag_failed', detail: rpcErr.message }),
      { status: 500, headers: CORS }
    )
  }

  // Post-filter to the LES's linked resource, preserving RPC similarity ranking
  const matchedIds = (rpcMatches || []).map((m: any) => m.id)
  let chunks: Array<{ chunk_text: string; book_title: string }> = []
  if (matchedIds.length > 0) {
    const { data: bookFiltered } = await client
      .from('library_chunks')
      .select('id, chunk_text, book_title')
      .in('id', matchedIds)
      .eq('book_id', les.resource_id)

    const orderById = new Map<string, number>()
    ;(rpcMatches || []).forEach((m: any, idx: number) => orderById.set(m.id, idx))
    chunks = (bookFiltered || [])
      .sort((a: any, b: any) => (orderById.get(a.id) ?? 999) - (orderById.get(b.id) ?? 999))
      .slice(0, 5)
      .map((c: any) => ({ chunk_text: c.chunk_text, book_title: c.book_title }))
  }

  if (chunks.length === 0) {
    return new Response(
      JSON.stringify({
        error:  'no_chunks_found',
        detail: `No library_chunks matched for spirit "${les.spirit_name}" in resource ${les.resource_id}. Was the source embedded?`,
      }),
      { status: 404, headers: CORS }
    )
  }

  // 6. Build extraction inputs
  const bookTitle  = chunks[0].book_title || les.book_title || 'Unknown source'
  const sourceText = chunks.map((c) => c.chunk_text).join('\n\n---\n\n').slice(0, 12000)

  // 7. Layer 2 extraction
  let extraction: Awaited<ReturnType<typeof extractSpiritFromSource>>
  try {
    extraction = await extractSpiritFromSource(
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
  } catch (err: any) {
    const msg = (err?.message || '').slice(0, 300)
    console.error('[admin-retrofit-layer2] extraction failed:', msg)
    return new Response(
      JSON.stringify({ error: 'extraction_failed', detail: msg }),
      { status: 500, headers: CORS }
    )
  }

  // 8. Regenerate proposed_fields
  let proposedFields: Record<string, string>
  try {
    proposedFields = layer2ToProposedFields(extraction.output)
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'proposed_fields_failed', detail: err.message }),
      { status: 500, headers: CORS }
    )
  }

  // 9. UPDATE the LES row in place
  const { error: updErr } = await client
    .from('library_enrichment_suggestions')
    .update({
      layer2_raw:              extraction.output,
      proposed_fields:         proposedFields,
      retrofitted_at:          new Date().toISOString(),
      retrofit_prompt_version: version,
    })
    .eq('id', lesId)

  if (updErr) {
    return new Response(
      JSON.stringify({ error: 'les_update_failed', detail: updErr.message }),
      { status: 500, headers: CORS }
    )
  }

  console.log(`[admin-retrofit-layer2] ${les.spirit_name}: fields=${Object.keys(proposedFields).length} cost=$${extraction.meta.costUsd.toFixed(4)}`)

  // 10. Success
  return new Response(JSON.stringify({
    success:        true,
    lesId,
    spiritName:     les.spirit_name,
    bookTitle,
    promptVersion:  version,
    chunksUsed:     chunks.length,
    sourceTextChars: sourceText.length,
    fieldCount:     Object.keys(proposedFields).length,
    model:          extraction.meta.model,
    inputTokens:    extraction.meta.inputTokens,
    outputTokens:   extraction.meta.outputTokens,
    costUsd:        extraction.meta.costUsd,
    durationMs:     extraction.meta.durationMs,
  }), { status: 200, headers: CORS })
}

export const config = { path: '/api/admin-retrofit-layer2' }
