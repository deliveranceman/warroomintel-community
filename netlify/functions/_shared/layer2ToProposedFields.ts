import type { Layer2ExtractionOutput } from './prompts/layer2Extraction'

type FieldExtraction = { value: string | boolean; excerpt: string; confidence: number } | null

function val(f: FieldExtraction): string {
  if (!f) return ''
  const v = typeof f.value === 'boolean' ? (f.value ? 'Yes' : 'No') : String(f.value ?? '')
  return v.trim()
}

/**
 * Flatten a Layer2ExtractionOutput into the proposed_fields shape expected by
 * library_enrichment_suggestions and the approve path in library-enrich-apply.ts.
 *
 * Keys are the Airtable display names from FIELD_DEFS (spiritWrite.ts) so that
 * toColumns() resolves them to the correct DB columns.
 *
 * Note: Airtable field names include typos preserved from the original schema:
 *   'Manifestiation' (double-i)  and  'Source / Orgin' (missing i)
 * These must match FIELD_DEFS exactly or toColumns() silently drops the field.
 */
export function layer2ToProposedFields(
  output: Layer2ExtractionOutput,
): Record<string, string> {
  const fields: Record<string, string> = {}

  function set(airtableKey: string, extraction: FieldExtraction) {
    const v = val(extraction)
    if (v) fields[airtableKey] = v
  }

  // ── Layer 1 — Gateways ───────────────────────────────────────────────────
  set('Entry Points',        output.layer1_gateways.entry_points)
  set('Legal Rights',        output.layer1_gateways.legal_rights)
  set('Transmission Vectors', output.layer1_gateways.transmission_vectors)
  set('Demonic Agreements',  output.layer1_gateways.demonic_agreements)

  // ── Layer 2 — Manifestations ─────────────────────────────────────────────
  // NOTE: 'Manifestiation' is the Airtable field name (typo preserved from schema)
  set('Manifestiation',                output.layer2_manifestations.manifestation)
  set('Session Indicators',            output.layer2_manifestations.session_indicators)
  set('Typical Personality Presentation', output.layer2_manifestations.personality_presentation)
  set('Primary Battlefield',           output.layer2_manifestations.primary_battlefield)

  // Symptoms: merge layer2 symptoms + layer5 body regions into one field
  const symptomsText = val(output.layer2_manifestations.symptoms)
  const bodyRegions  = output.layer5_body_regions ?? []
  if (bodyRegions.length > 0) {
    const bodyMap = bodyRegions
      .map(r => `${r.region}: ${r.symptom}`)
      .join('; ')
    fields['Symptoms'] = symptomsText
      ? `${symptomsText}\n\nBody map: ${bodyMap}`
      : `Body map: ${bodyMap}`
  } else if (symptomsText) {
    fields['Symptoms'] = symptomsText
  }

  // ── Layer 3 — Network ────────────────────────────────────────────────────
  set('Strongman',        output.layer3_network.strongman)
  set('Parent Strongman', output.layer3_network.parent_strongman)
  set('Companion Spirits', output.layer3_network.companion_spirits)
  set('Cluster Spirits',  output.layer3_network.cluster_spirits)
  set('Related Spirits',  output.layer3_network.related_spirits)

  // ── Layer 4 — Line ───────────────────────────────────────────────────────
  // NOTE: 'Source / Orgin' is the Airtable field name (typo preserved from schema)
  set('Source / Orgin',          output.layer4_line.source_origin)
  set('Cultural Presence',       output.layer4_line.cultural_presence)
  set('Etymology Notes',         output.layer4_line.etymology_notes)
  set('Archaeology Notes',       output.layer4_line.archaeology_notes)
  set('Institutional Expression', output.layer4_line.institutional_expression)
  set('Is Generational',         output.layer4_line.is_generational as FieldExtraction)
  set('Is Territorial',          output.layer4_line.is_territorial  as FieldExtraction)

  // ── Layer 6 — Scripture ──────────────────────────────────────────────────
  set('Scripture Reference', output.layer6_scripture.scripture)
  set('Scripture Context',   output.layer6_scripture.scripture_context)
  set('Counter Scriptures',  output.layer6_scripture.counter_scriptures)
  set('Biblical Rank',       output.layer6_scripture.biblical_umbrella)

  // ── Layer 7 — Counter-strategies ─────────────────────────────────────────
  set('Deliverance Sequence',      output.layer7_counter_strategies.deliverance_sequence)
  set('Prayer Points',             output.layer7_counter_strategies.prayer_points)
  set('Session Trigger Questions', output.layer7_counter_strategies.session_trigger_questions)
  set('Resistance Signature',      output.layer7_counter_strategies.resistance_signature)
  set('Aftercare Notes',           output.layer7_counter_strategies.aftercare_notes)
  set('Operational Notes',         output.layer7_counter_strategies.operational_notes)

  return fields
}
