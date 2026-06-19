// Fan-out helper for Layer 6 scripture extractions.
// Given a spirit UUID and the layer2_raw.layer6_scripture object, reads the
// refs[] array from each of the four sub-fields and INSERTs one row per verse
// reference into spirit_scriptures.
//
// spirit_scriptures schema (MCP-verified):
//   id, spirit_id, reference, kind (enum), text_note, created_at, source_suggestion_id
// Enum spirit_scripture_kind: 'primary' | 'counter' | 'context'
// UNIQUE (spirit_id, reference, kind)
//
// Sub-field → kind mapping (admin_doc 565dce90):
//   scripture.refs          → kind='primary'
//   counter_scriptures.refs → kind='counter'
//   scripture_context.refs  → kind='context'
//   biblical_umbrella.refs  → kind='context' (thematic-category mapped to context)
//
// Called from library-enrich-apply.ts on LES approve (action === 'enrich').
//
// source_suggestion_id is written so the display layer and SOL synthesis can
// JOIN through to library_enrichment_suggestions.is_adversarial — adversarial-
// source rows carry equal data weight but render with "Intelligence Only" framing.

type ScriptureKind = 'primary' | 'counter' | 'context'

const SUB_FIELDS: Array<{ key: string; kind: ScriptureKind }> = [
  { key: 'scripture',          kind: 'primary' },
  { key: 'counter_scriptures', kind: 'counter' },
  { key: 'scripture_context',  kind: 'context' },
  { key: 'biblical_umbrella',  kind: 'context' }, // thematic-category mapped to context per admin_doc 565dce90
]

export async function applySpiritScriptures(
  client:       any,    // service-role Supabase client (caller provides)
  spiritId:     string, // canonical spirit UUID (must exist in spirits table)
  scripture:    any,    // layer2_raw.layer6_scripture — may be null/undefined
  suggestionId: string, // FK to library_enrichment_suggestions (enables is_adversarial JOIN)
): Promise<{
  inserted: Array<{ reference: string; kind: ScriptureKind; sub_field: string }>
  skipped:  Array<{ reference: string; reason: string }>
  errors:   string[]
}> {
  const result = {
    inserted: [] as Array<{ reference: string; kind: ScriptureKind; sub_field: string }>,
    skipped:  [] as Array<{ reference: string; reason: string }>,
    errors:   [] as string[],
  }

  if (!scripture || typeof scripture !== 'object') return result

  for (const { key, kind } of SUB_FIELDS) {
    const field = scripture[key]
    if (!field || typeof field !== 'object') continue

    const refs: unknown = field.refs
    if (!Array.isArray(refs) || refs.length === 0) continue

    const textNote = [field.value, field.excerpt]
      .filter(Boolean)
      .join(' | ')
      .slice(0, 1000)

    for (const ref of refs) {
      const trimmedRef = typeof ref === 'string' ? ref.trim() : ''
      if (!trimmedRef) continue

      const { error: insertErr } = await client
        .from('spirit_scriptures')
        .insert({
          spirit_id:            spiritId,
          reference:            trimmedRef,
          kind,
          text_note:            textNote || null,
          source_suggestion_id: suggestionId,
        })

      if (insertErr) {
        if ((insertErr as any).code === '23505') {
          result.skipped.push({ reference: trimmedRef, reason: 'duplicate' })
        } else {
          result.errors.push(
            `${key} — "${trimmedRef.slice(0, 60)}": ${insertErr.message}`,
          )
        }
      } else {
        result.inserted.push({ reference: trimmedRef, kind, sub_field: key })
      }
    }
  }

  return result
}
