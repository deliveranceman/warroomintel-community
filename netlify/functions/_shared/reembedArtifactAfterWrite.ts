import type { SupabaseClient } from '@supabase/supabase-js'
import { embedTexts } from './embedSpirit'

export function computeArtifactEmbeddingSourceText(artifact: {
  name: string
  aliases?: string | null
  summary?: string | null
  body?: string | null
  caution_note?: string | null
  origin?: string | null
}): string {
  const parts: string[] = [artifact.name]
  if (artifact.aliases?.trim())     parts.push(`aliases: ${artifact.aliases.trim()}`)
  if (artifact.summary?.trim())     parts.push(artifact.summary.trim())
  if (artifact.body?.trim())        parts.push(artifact.body.trim().slice(0, 500))
  if (artifact.caution_note?.trim()) parts.push(artifact.caution_note.trim())
  if (artifact.origin?.trim())      parts.push(artifact.origin.trim())
  return parts.join('\n')
}

export async function reembedArtifactAfterWrite(
  supabase: SupabaseClient,
  artifactId: string,
  openaiKey: string | undefined,
): Promise<void> {
  if (!openaiKey) {
    console.warn('[reembedArtifactAfterWrite] OPENAI_API_KEY not set; skipping embed for', artifactId)
    return
  }
  try {
    const { data: artifact, error } = await supabase
      .from('artifacts')
      .select('id, name, aliases, summary, body, caution_note, origin, embedding, embedding_source_text')
      .eq('id', artifactId)
      .single()

    if (error || !artifact) {
      console.warn('[reembedArtifactAfterWrite] artifact not found:', artifactId, error?.message)
      return
    }

    const newSourceText = computeArtifactEmbeddingSourceText(artifact)

    if (artifact.embedding && artifact.embedding_source_text === newSourceText) return

    const [embedding] = await embedTexts(openaiKey, newSourceText)

    const { error: updErr } = await supabase
      .from('artifacts')
      .update({
        embedding,
        embedding_source_text: newSourceText,
        embedding_updated_at:  new Date().toISOString(),
      })
      .eq('id', artifactId)

    if (updErr) console.error('[reembedArtifactAfterWrite] update failed:', artifactId, updErr.message)
  } catch (err: any) {
    console.error('[reembedArtifactAfterWrite] failed for', artifactId, err?.message ?? err)
  }
}
