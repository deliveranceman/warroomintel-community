import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'
import { extractSpiritFromSource } from './_shared/extractSpiritFromSource'
import { layer2ToProposedFields } from './_shared/layer2ToProposedFields'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
function sb() { return createClient(sbUrl, sbKey) }

const COMPLETENESS_CONF: Record<string, number> = {
  minimal: 25, partial: 50, substantial: 75, comprehensive: 95,
}
const SOURCE_TYPE_MAP: Record<string, 'academic' | 'occult' | 'ministry' | 'historical' | 'canonical'> = {
  academic: 'academic', occult: 'occult', ministry: 'ministry',
  historical: 'historical', canonical: 'canonical',
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
    .select('id, name, source_id, source_name, source_type, is_adversarial')
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

  // Find chunks in the linked resource that mention this spirit
  const { data: chunks } = await client
    .from('library_chunks')
    .select('chunk_text, book_title')
    .eq('book_id', candidate.source_id)
    .ilike('chunk_text', `%${candidate.name}%`)
    .limit(5)

  if (!chunks || chunks.length === 0) {
    return new Response(
      JSON.stringify({ error: 'no_chunks_found', detail: 'No source chunks mention this name in the linked resource' }),
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
