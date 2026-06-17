// Canonical write helper for Layer 2 body-region extractions.
// Given a spirit UUID and free-text region payloads, resolves each to
// canonical region_keys and INSERTs into spirit_regions.
//
// Called from library-enrich-apply.ts on LES approve.

import { resolveRegion } from './regionVocabulary'

export type RegionPayload = {
  region:       string   // free-text from Layer 2 (e.g. "lower back", "kidneys")
  symptom?:     string   // manifestation description from Layer 2
  excerpt?:     string   // source quote (50-300 chars per Layer 2 discipline)
  confidence?:  number   // 1-5 from Layer 2
}

export type ApplyRegionsResult = {
  inserted:          Array<{ region_key: string; spirit_region_id: string }>
  skipped_unmapped:  Array<{ free_text: string; reason: string }>
  skipped_ambiguous: Array<{ free_text: string; candidates: string[] }>
  errors:            Array<{ free_text: string; error: string }>
}

// Ambiguity threshold: if a term resolves to more than this many region_keys,
// it is considered too broad and pushed to skipped_ambiguous rather than inserted.
// "head" → 3 keys (brain, cranium, forehead) is acceptable.
// A 5-key match is suspicious for a single-symptom report.
// TODO Justin: tune if legitimate compound regions produce > 4 keys in practice.
const AMBIGUITY_THRESHOLD = 4

export async function applySpiritRegions(
  client:       any,    // service-role Supabase client (caller provides)
  spiritId:     string, // canonical spirit UUID (must exist in spirits table)
  payloads:     RegionPayload[],
  suggestionId: string  // library_enrichment_suggestions.id → source_suggestion_id FK
): Promise<ApplyRegionsResult> {
  const result: ApplyRegionsResult = {
    inserted:          [],
    skipped_unmapped:  [],
    skipped_ambiguous: [],
    errors:            [],
  }

  // 1. Validate spirit exists
  const { data: spiritRow, error: spiritErr } = await client
    .from('spirits')
    .select('id')
    .eq('id', spiritId)
    .single()

  if (spiritErr || !spiritRow) {
    throw new Error(`Spirit not found: ${spiritId}`)
  }

  // 2. Process each payload
  for (const payload of payloads) {
    const regionKeys = resolveRegion(payload.region)

    if (regionKeys.length === 0) {
      result.skipped_unmapped.push({ free_text: payload.region, reason: 'no synonym match' })
      continue
    }

    if (regionKeys.length > AMBIGUITY_THRESHOLD) {
      result.skipped_ambiguous.push({ free_text: payload.region, candidates: regionKeys })
      continue
    }

    // Insert one row per resolved region_key
    for (const region_key of regionKeys) {
      const { data: inserted, error: insertErr } = await client
        .from('spirit_regions')
        .insert({
          spirit_id:            spiritId,
          region_key,
          correlation_strength: payload.confidence   ?? null,
          manifestation_type:   payload.symptom      ?? null,
          notes:                payload.excerpt       ?? null,
          scripture_reference:  null,
          source_suggestion_id: suggestionId,
        })
        .select('id')
        .single()

      if (insertErr) {
        result.errors.push({ free_text: payload.region, error: insertErr.message })
        // Partial failure — continue processing remaining payloads
      } else {
        result.inserted.push({
          region_key,
          spirit_region_id: inserted.id as string,
        })
      }
    }
  }

  return result
}
