// Fan-out helper for Layer 3 hierarchy extractions.
// Given a spirit UUID and the layer3_network object, reads the strongman
// and parent_strongman sub-fields, resolves them to spirit UUIDs where
// possible, and INSERTs rows into spirit_hierarchy.
//
// spirit_hierarchy schema (MCP-verified):
//   id, child_spirit_id, parent_spirit_id (nullable FK),
//   parent_name_raw (nullable text), relation (enum), created_at
// Enum spirit_hierarchy_relation: 'parent_strongman' | 'strongman' | 'umbrella'
// UNIQUE (child_spirit_id, parent_name_raw, relation)
//
// parent_name_raw is ALWAYS written (never null) so the UNIQUE constraint
// deduplicates correctly (PostgreSQL NULLs are not equal in UNIQUE indexes).

import { resolveSpiritByName } from './resolveSpiritByName'

type HierarchyRelation = 'strongman' | 'parent_strongman'

const HIERARCHY_FIELDS: Array<{ key: 'strongman' | 'parent_strongman'; relation: HierarchyRelation }> = [
  { key: 'strongman',        relation: 'strongman' },
  { key: 'parent_strongman', relation: 'parent_strongman' },
]

export async function applySpiritHierarchy(
  client:        any,    // service-role Supabase client (caller provides)
  spiritId:      string, // becomes child_spirit_id
  network:       any,    // layer2_raw.layer3_network — may be null/undefined
  _suggestionId: string, // accepted for stable signature; not yet wired to a column
): Promise<{
  inserted: Array<{ parent_name_raw: string; parent_spirit_id: string | null; relation: HierarchyRelation }>
  skipped:  Array<{ parent_name_raw: string; reason: string }>
  errors:   string[]
}> {
  const result = {
    inserted: [] as Array<{ parent_name_raw: string; parent_spirit_id: string | null; relation: HierarchyRelation }>,
    skipped:  [] as Array<{ parent_name_raw: string; reason: string }>,
    errors:   [] as string[],
  }

  if (!network || typeof network !== 'object') return result

  for (const { key, relation } of HIERARCHY_FIELDS) {
    const entry = network[key]
    if (!entry || typeof entry !== 'object') continue

    const rawValue: string = typeof entry.value === 'string' ? entry.value.trim() : ''
    if (!rawValue) continue

    // Resolve to spirit UUID where possible; null is acceptable
    let parentSpiritId: string | null = null
    try {
      parentSpiritId = await resolveSpiritByName(client, rawValue)
    } catch (resolveErr: any) {
      result.errors.push(`resolve ${relation} "${rawValue.slice(0, 60)}": ${resolveErr.message}`)
    }

    const { error: insertErr } = await client
      .from('spirit_hierarchy')
      .insert({
        child_spirit_id:  spiritId,
        parent_spirit_id: parentSpiritId,
        parent_name_raw:  rawValue,
        relation,
      })

    if (insertErr) {
      if ((insertErr as any).code === '23505') {
        result.skipped.push({ parent_name_raw: rawValue, reason: 'duplicate' })
      } else {
        result.errors.push(
          `${relation} — "${rawValue.slice(0, 60)}": ${insertErr.message}`,
        )
      }
    } else {
      result.inserted.push({ parent_name_raw: rawValue, parent_spirit_id: parentSpiritId, relation })
    }
  }

  return result
}
