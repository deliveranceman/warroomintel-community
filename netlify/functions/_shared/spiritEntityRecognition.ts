import type { SupabaseClient } from '@supabase/supabase-js'
import type { SpiritMatch } from './spiritTypes'
import { embedTexts } from './embedSpirit'

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildWordBoundaryPattern(token: string): RegExp {
  return new RegExp(`\\b${escapeRegex(token)}\\b`, 'i')
}

function computeMatchStrength(
  matched_via: 'name' | 'aka',
  matched_token: string
): number {
  if (matched_via === 'name') return 100
  return 50 + Math.min(matched_token.length, 20)
}

/**
 * Compute semantic match strength from cosine similarity.
 * similarity 0.5 -> strength 75
 * similarity 0.7 -> strength 85
 * similarity 0.9 -> strength 95
 * Always below name-match (100) so direct name hits still rank highest.
 */
function computeSemanticStrength(similarity: number): number {
  return Math.round(50 + Math.max(0, Math.min(similarity, 1)) * 50)
}

/**
 * Find spirits matching the given text using BOTH literal
 * (word-boundary on name + aka tokens) AND semantic (cosine
 * similarity over spirit embeddings) passes. Merges results,
 * deduplicating by spirit_id and keeping the higher matchStrength.
 *
 * Semantic pass is skipped if openaiKey is not provided OR if
 * the embed call fails — in either case literal pass still runs.
 *
 * Per admin_doc 661f5fd2 Phase 4 decision #3: both passes always
 * run when key available, results merged + ranked.
 */
export async function findSpiritsInText(
  supabase: SupabaseClient,
  text: string,
  opts: { openaiKey?: string; semanticThreshold?: number; semanticLimit?: number } = {}
): Promise<SpiritMatch[]> {
  if (!text || !text.trim()) return []

  // Run literal + semantic in parallel for latency.
  const literalP = findSpiritsLiteralPass(supabase, text)
  const semanticP = opts.openaiKey
    ? findSpiritsSemanticPass(
        supabase,
        text,
        opts.openaiKey,
        opts.semanticThreshold ?? 0.5,
        opts.semanticLimit ?? 10
      ).catch((err) => {
        console.error('[findSpiritsInText] semantic pass failed:', err?.message ?? err)
        return [] as SpiritMatch[]
      })
    : Promise.resolve([] as SpiritMatch[])

  const [literalMatches, semanticMatches] = await Promise.all([literalP, semanticP])

  // Merge + dedupe by id, keeping highest matchStrength.
  const byId = new Map<string, SpiritMatch>()
  for (const m of [...literalMatches, ...semanticMatches]) {
    const existing = byId.get(m.id)
    if (!existing || m.matchStrength > existing.matchStrength) {
      byId.set(m.id, m)
    }
  }

  return Array.from(byId.values()).sort((a, b) => b.matchStrength - a.matchStrength)
}

/**
 * Word-boundary regex pass against name + aka tokens.
 * For 472 spirits this runs in microseconds. If spirits table exceeds
 * ~5000 rows, migrate to a Postgres RPC for index-friendly matching.
 */
async function findSpiritsLiteralPass(
  supabase: SupabaseClient,
  text: string
): Promise<SpiritMatch[]> {
  const { data, error } = await supabase
    .from('spirits')
    .select('id, name, aka')

  if (error) throw error
  if (!data) return []

  const matches: SpiritMatch[] = []

  for (const spirit of data) {
    // Skip spirits with empty names defensively
    if (!spirit.name || !spirit.name.trim()) continue

    // 1. Try whole-word name match first
    const namePattern = buildWordBoundaryPattern(spirit.name.trim())
    if (namePattern.test(text)) {
      matches.push({
        id: spirit.id,
        name: spirit.name,
        matched_via: 'name',
        matched_token: spirit.name,
        matchStrength: computeMatchStrength('name', spirit.name),
      })
      continue
    }

    // 2. Fall back to aka tokens (tokenize on , or ;)
    if (spirit.aka) {
      const akaTokens = spirit.aka
        .split(/[,;]/)
        .map((t: string) => t.trim())
        .filter((t: string) => t.length >= 3)  // guard: skip 1-2 char tokens

      for (const token of akaTokens) {
        const pattern = buildWordBoundaryPattern(token)
        if (pattern.test(text)) {
          matches.push({
            id: spirit.id,
            name: spirit.name,
            matched_via: 'aka',
            matched_token: token,
            matchStrength: computeMatchStrength('aka', token),
          })
          break  // only one match per spirit
        }
      }
    }
  }

  return matches
}

/** Semantic pass — embeds query, calls match_spirits_semantic RPC. */
async function findSpiritsSemanticPass(
  supabase: SupabaseClient,
  text: string,
  openaiKey: string,
  threshold: number,
  limit: number
): Promise<SpiritMatch[]> {
  const [queryEmbedding] = await embedTexts(openaiKey, text)

  const { data, error } = await supabase.rpc('match_spirits_semantic', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: limit,
  })

  if (error) {
    console.error('[findSpiritsSemanticPass] RPC error:', error.message)
    return []
  }
  if (!data) return []

  return (data as any[]).map((row): SpiritMatch => ({
    id: row.id,
    name: row.name,
    matched_via: 'semantic',
    matched_token: text.length > 60 ? text.slice(0, 60) + '…' : text,
    matchStrength: computeSemanticStrength(row.similarity),
    similarity: row.similarity,
  }))
}
