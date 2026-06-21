import type { SupabaseClient } from '@supabase/supabase-js'
import type { SpiritMatch } from './spiritTypes'

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
 * Find all spirits whose name or aka tokens appear as whole-word matches
 * in the given text. Uses JS regex word-boundary (\b), not substring,
 * to avoid the Anamalech-style false positives (June 15 lesson).
 *
 * For 472 spirits this runs in microseconds. If spirits table exceeds
 * ~5000 rows, migrate to a Postgres function (~RPC) for index-friendly
 * matching.
 */
export async function findSpiritsInText(
  supabase: SupabaseClient,
  text: string
): Promise<SpiritMatch[]> {
  if (!text || !text.trim()) return []

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
