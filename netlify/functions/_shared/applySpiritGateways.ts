// Fan-out helper for Layer 2 gateway extractions.
// Given a spirit UUID and the layer2_raw.layer1_gateways object, splits
// each sub-field's semicolon-delimited value into individual gateway rows
// and INSERTs them into spirit_gateways.
//
// Shape confirmed (admin_doc 96f848f4, code-verified June 16 2026):
//   layer1_gateways: {
//     entry_points: FieldExtraction | null
//     legal_rights: FieldExtraction | null
//     transmission_vectors: FieldExtraction | null
//     demonic_agreements: FieldExtraction | null
//   }
// where FieldExtraction = { value: string, excerpt: string, confidence: 1-5 }
// value is semicolon-delimited (e.g. "Lodge membership; ancestral ties; ...")
//
// Called from library-enrich-apply.ts on LES approve (action === 'enrich').

const SUB_FIELDS = [
  'entry_points',
  'legal_rights',
  'transmission_vectors',
  'demonic_agreements',
] as const

function makeGatewayKey(gateway: string): { key: string; warning?: string } {
  const key = gateway
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  if (key) return { key }

  // Edge case: gateway text is all punctuation / whitespace — compute stable fallback
  let h = 0
  for (let i = 0; i < gateway.length; i++) {
    h = (Math.imul(31, h) + gateway.charCodeAt(i)) >>> 0
  }
  return {
    key: `unknown_${h.toString(16).padStart(8, '0').slice(0, 8)}`,
    warning: `gateway_key normalized to empty; using hash fallback for: "${gateway.slice(0, 60)}"`,
  }
}

export async function applySpiritGateways(
  client:        any,    // service-role Supabase client (caller provides)
  spiritId:      string, // canonical spirit UUID (must exist in spirits table)
  gateways:      any,    // layer2_raw.layer1_gateways — may be null/undefined
  _suggestionId: string, // les.id — accepted for stable signature; not yet wired to a column
): Promise<{
  inserted: Array<{ gateway: string; gateway_key: string; sub_field: string }>
  skipped:  Array<{ gateway: string; reason: string }>
  errors:   string[]
}> {
  const result = {
    inserted: [] as Array<{ gateway: string; gateway_key: string; sub_field: string }>,
    skipped:  [] as Array<{ gateway: string; reason: string }>,
    errors:   [] as string[],
  }

  if (!gateways || typeof gateways !== 'object') return result

  for (const subField of SUB_FIELDS) {
    const entry = gateways[subField]
    if (!entry || typeof entry !== 'object') continue

    const rawValue: string = typeof entry.value === 'string' ? entry.value : ''
    if (!rawValue.trim()) continue

    const excerpt: string = typeof entry.excerpt === 'string' ? entry.excerpt.trim() : ''
    const notes = excerpt ? `${subField}: ${excerpt}` : subField

    const pieces = rawValue.split(';').map((s: string) => s.trim()).filter(Boolean)

    for (const gateway of pieces) {
      const { key: gatewayKey, warning } = makeGatewayKey(gateway)
      if (warning) result.errors.push(warning)

      const { data: inserted, error: insertErr } = await client
        .from('spirit_gateways')
        .insert({
          spirit_id:   spiritId,
          gateway,
          gateway_key: gatewayKey,
          notes,
        })
        .select('id')
        .single()

      if (insertErr) {
        if ((insertErr as any).code === '23505') {
          result.skipped.push({ gateway, reason: 'duplicate' })
        } else {
          result.errors.push(
            `${subField} — "${gateway.slice(0, 60)}": ${insertErr.message}`,
          )
        }
      } else if (inserted) {
        result.inserted.push({ gateway, gateway_key: gatewayKey, sub_field: subField })
      }
    }
  }

  return result
}
