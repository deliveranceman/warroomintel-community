import type { SupabaseClient } from '@supabase/supabase-js'

// WRI calls the OpenAI embeddings REST API directly (see
// library-embed-backfill-background.ts) rather than the `openai` npm
// package, which is not a project dependency. These helpers take the
// API key string and mirror that established pattern.

const EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings'
const EMBED_MODEL    = 'text-embedding-3-small'

export interface EmbedSpiritInput {
  id: string
  name: string
  aka?: string | null
  description?: string | null
}

/**
 * Build the canonical text that gets embedded for a spirit.
 * Per spec 661f5fd2 Phase 4 decision: name + aka + first 500
 * chars description. Balanced semantic richness without bloat.
 */
export function buildEmbeddingSourceText(spirit: EmbedSpiritInput): string {
  const parts: string[] = []
  parts.push(spirit.name)
  if (spirit.aka && spirit.aka.trim()) {
    parts.push(`aka: ${spirit.aka.trim()}`)
  }
  if (spirit.description && spirit.description.trim()) {
    parts.push(spirit.description.trim().slice(0, 500))
  }
  return parts.join('\n')
}

/**
 * Generic OpenAI embedding call. Accepts a single string or an
 * array. Returns one vector per input.
 * Mirrors existing WRI fetch pattern (library-embed-backfill-background).
 */
export async function embedTexts(
  apiKey: string,
  texts: string | string[]
): Promise<number[][]> {
  const input = Array.isArray(texts) ? texts : [texts]
  if (input.length === 0) return []

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    const resp = await fetch(EMBEDDINGS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input,
      }),
      signal: controller.signal,
    })

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '')
      throw new Error(`OpenAI embeddings ${resp.status}: ${errText.slice(0, 200)}`)
    }

    const data = await resp.json()
    return (data.data as Array<{ embedding: number[] }>).map((d) => d.embedding)
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Embed a single spirit. For one-off use (e.g. new spirit insert).
 */
export async function embedSpirit(
  apiKey: string,
  spirit: EmbedSpiritInput
): Promise<{ embedding: number[]; sourceText: string }> {
  const sourceText = buildEmbeddingSourceText(spirit)
  const [embedding] = await embedTexts(apiKey, [sourceText])
  return { embedding, sourceText }
}

/**
 * Batched embed for backfill. OpenAI accepts up to 2048 inputs
 * per request. Spirits' canonical text is small (~125 tokens
 * each), so batches of 50–100 are safe and efficient.
 */
export async function embedSpiritsBatch(
  apiKey: string,
  spirits: EmbedSpiritInput[]
): Promise<Array<{ id: string; embedding: number[]; sourceText: string }>> {
  if (spirits.length === 0) return []

  const sourceTexts = spirits.map(buildEmbeddingSourceText)
  const embeddings  = await embedTexts(apiKey, sourceTexts)

  return spirits.map((s, i) => ({
    id: s.id,
    embedding: embeddings[i],
    sourceText: sourceTexts[i],
  }))
}

/**
 * Persist an embedding to the spirits row. Updates 3 columns
 * matching the Phase 4 migration shape.
 */
export async function persistSpiritEmbedding(
  supabase: SupabaseClient,
  spiritId: string,
  embedding: number[],
  sourceText: string
): Promise<void> {
  const { error } = await supabase
    .from('spirits')
    .update({
      embedding: embedding,
      embedding_source_text: sourceText,
      embedding_updated_at: new Date().toISOString(),
    })
    .eq('id', spiritId)
  if (error) throw error
}
