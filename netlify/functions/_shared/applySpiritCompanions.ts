// Fan-out helper for Layer 3 companion/network extractions.
// Given a spirit UUID and the layer3_network object, splits each of the
// three semicolon-list sub-fields into individual companion rows and
// INSERTs them into spirit_companions.
//
// spirit_companions schema (MCP-verified):
//   id, spirit_id, companion_spirit_id (nullable FK),
//   companion_name_raw NOT NULL, kind (enum),
//   source_suggestion_id (nullable FK → library_enrichment_suggestions), created_at
// Enum spirit_companion_kind: 'companion' | 'related' | 'cluster'
// UNIQUE (spirit_id, companion_name_raw, kind)
//
// source_suggestion_id is written so the display layer and SOL synthesis can
// JOIN through to library_enrichment_suggestions.is_adversarial — adversarial-
// source rows carry equal data weight but render with "Intelligence Only" framing.

import { resolveSpiritByName } from './resolveSpiritByName'

type CompanionKind = 'companion' | 'related' | 'cluster'

const COMPANION_FIELDS: Array<{ key: 'cluster_spirits' | 'companion_spirits' | 'related_spirits'; kind: CompanionKind }> = [
  { key: 'cluster_spirits',   kind: 'cluster' },
  { key: 'companion_spirits', kind: 'companion' },
  { key: 'related_spirits',   kind: 'related' },
]

export async function applySpiritCompanions(
  client:        any,    // service-role Supabase client (caller provides)
  spiritId:      string, // spirit_id in spirit_companions
  network:      any,    // layer2_raw.layer3_network — may be null/undefined
  suggestionId: string, // FK to library_enrichment_suggestions (enables is_adversarial JOIN)
): Promise<{
  inserted: Array<{ companion_name_raw: string; companion_spirit_id: string | null; kind: CompanionKind }>
  skipped:  Array<{ companion_name_raw: string; reason: string }>
  errors:   string[]
}> {
  const result = {
    inserted: [] as Array<{ companion_name_raw: string; companion_spirit_id: string | null; kind: CompanionKind }>,
    skipped:  [] as Array<{ companion_name_raw: string; reason: string }>,
    errors:   [] as string[],
  }

  if (!network || typeof network !== 'object') return result

  for (const { key, kind } of COMPANION_FIELDS) {
    const entry = network[key]
    if (!entry || typeof entry !== 'object') continue

    const rawValue: string = typeof entry.value === 'string' ? entry.value : ''
    if (!rawValue.trim()) continue

    const segments = rawValue.split(';').map((s: string) => s.trim()).filter(Boolean)

    for (const segment of segments) {
      // Resolve to spirit UUID where possible; null is acceptable
      let companionSpiritId: string | null = null
      try {
        companionSpiritId = await resolveSpiritByName(client, segment)
      } catch (resolveErr: any) {
        result.errors.push(`resolve ${kind} "${segment.slice(0, 60)}": ${resolveErr.message}`)
      }

      const { error: insertErr } = await client
        .from('spirit_companions')
        .insert({
          spirit_id:            spiritId,
          companion_spirit_id:  companionSpiritId,
          companion_name_raw:   segment,
          kind,
          source_suggestion_id: suggestionId,
        })

      if (insertErr) {
        if ((insertErr as any).code === '23505') {
          result.skipped.push({ companion_name_raw: segment, reason: 'duplicate' })
        } else {
          result.errors.push(
            `${kind} — "${segment.slice(0, 60)}": ${insertErr.message}`,
          )
        }
      } else {
        result.inserted.push({ companion_name_raw: segment, companion_spirit_id: companionSpiritId, kind })
      }
    }
  }

  return result
}
