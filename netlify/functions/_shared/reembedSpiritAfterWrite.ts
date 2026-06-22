import type { SupabaseClient } from '@supabase/supabase-js'
import { buildEmbeddingSourceText, embedTexts } from './embedSpirit'

/**
 * Idempotent re-embed after a spirit write. Fetches the spirit,
 * computes the canonical source text, compares to what's stored.
 * If unchanged AND embedding exists, no-op. Otherwise, re-embeds
 * via OpenAI and updates the row.
 *
 * FAIL-SOFT: any error is logged but NOT thrown. The caller's
 * write has already committed; an embed failure must not poison
 * the parent operation.
 *
 * Cost: ~$0.0001 per re-embed. Latency: ~200-500ms.
 */
export async function reembedSpiritAfterWrite(
  supabase: SupabaseClient,
  spiritId: string,
  openaiKey: string | undefined
): Promise<void> {
  if (!openaiKey) {
    console.warn('[reembedSpiritAfterWrite] OPENAI_API_KEY not set; skipping embed for', spiritId)
    return
  }

  try {
    const { data: spirit, error } = await supabase
      .from('spirits')
      .select('id, name, aka, description, embedding, embedding_source_text')
      .eq('id', spiritId)
      .single()

    if (error || !spirit) {
      console.warn('[reembedSpiritAfterWrite] spirit not found:', spiritId, error?.message)
      return
    }

    const newSourceText = buildEmbeddingSourceText({
      id: spirit.id,
      name: spirit.name,
      aka: spirit.aka,
      description: spirit.description,
    })

    // No-op when embedding exists AND source text matches.
    if (spirit.embedding && spirit.embedding_source_text === newSourceText) {
      return
    }

    const [embedding] = await embedTexts(openaiKey, newSourceText)

    const { error: updErr } = await supabase
      .from('spirits')
      .update({
        embedding,
        embedding_source_text: newSourceText,
        embedding_updated_at: new Date().toISOString(),
      })
      .eq('id', spiritId)

    if (updErr) {
      console.error('[reembedSpiritAfterWrite] update failed:', spiritId, updErr.message)
    }
  } catch (err: any) {
    console.error('[reembedSpiritAfterWrite] failed for', spiritId, err?.message ?? err)
  }
}
