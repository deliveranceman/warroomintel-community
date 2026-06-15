import type { Layer2ExtractionOutput } from './prompts/layer2Extraction'

type FieldExtraction = { value: string | boolean; excerpt: string; confidence: number } | null

function val(f: FieldExtraction): string {
  if (!f) return ''
  const v = typeof f.value === 'boolean' ? (f.value ? 'true' : 'false') : String(f.value ?? '')
  return v.trim()
}

/**
 * Flatten a Layer2ExtractionOutput into the proposed_fields shape expected by
 * library_enrichment_suggestions and the approve path in library-enrich-apply.ts.
 *
 * Keys are camelCase (matching FIELD_DEFS first column in spiritWrite.ts) so
 * toColumns() resolves them to the correct Supabase snake_case columns without
 * any dependency on legacy Airtable display names.
 */
export function layer2ToProposedFields(
  output: Layer2ExtractionOutput,
): Record<string, string> {
  const fields: Record<string, string> = {}

  function set(camelKey: string, extraction: FieldExtraction) {
    const v = val(extraction)
    if (v) fields[camelKey] = v
  }

  // ── Layer 1 — Gateways ───────────────────────────────────────────────────
  set('entryPoints',        output.layer1_gateways.entry_points)
  set('legalRights',        output.layer1_gateways.legal_rights)
  set('transmissionVectors', output.layer1_gateways.transmission_vectors)
  set('demonicAgreements',  output.layer1_gateways.demonic_agreements)

  // ── Layer 2 — Manifestations ─────────────────────────────────────────────
  set('manifestation',           output.layer2_manifestations.manifestation)
  set('sessionIndicators',       output.layer2_manifestations.session_indicators)
  set('personalityPresentation', output.layer2_manifestations.personality_presentation)
  set('primaryBattlefield',      output.layer2_manifestations.primary_battlefield)

  // Symptoms: merge layer2 symptoms + layer5 body regions into one field
  const symptomsText = val(output.layer2_manifestations.symptoms)
  const bodyRegions  = output.layer5_body_regions ?? []
  if (bodyRegions.length > 0) {
    const bodyMap = bodyRegions.map(r => `${r.region}: ${r.symptom}`).join('; ')
    fields['symptoms'] = symptomsText
      ? `${symptomsText}\n\nBody map: ${bodyMap}`
      : `Body map: ${bodyMap}`
  } else if (symptomsText) {
    fields['symptoms'] = symptomsText
  }

  // ── Layer 3 — Network ────────────────────────────────────────────────────
  set('strongman',        output.layer3_network.strongman)
  set('parentStrongman',  output.layer3_network.parent_strongman)
  set('companionSpirits', output.layer3_network.companion_spirits)
  set('clusterSpirits',   output.layer3_network.cluster_spirits)
  set('relatedSpirits',   output.layer3_network.related_spirits)

  // ── Layer 4 — Line ───────────────────────────────────────────────────────
  set('sourceOrigin',          output.layer4_line.source_origin)
  set('culturalPresence',      output.layer4_line.cultural_presence)
  set('etymologyNotes',        output.layer4_line.etymology_notes)
  set('archaeologyNotes',      output.layer4_line.archaeology_notes)
  set('institutionalExpression', output.layer4_line.institutional_expression)
  set('isGenerational',        output.layer4_line.is_generational as FieldExtraction)
  set('isTerritorial',         output.layer4_line.is_territorial  as FieldExtraction)

  // ── Layer 6 — Scripture ──────────────────────────────────────────────────
  set('scripture',        output.layer6_scripture.scripture)
  set('scriptureContext', output.layer6_scripture.scripture_context)
  set('counterScriptures', output.layer6_scripture.counter_scriptures)
  // biblical_umbrella → description field (closest semantic match in FIELD_DEFS)
  set('description',      output.layer6_scripture.biblical_umbrella)

  // ── Layer 7 — Counter-strategies ─────────────────────────────────────────
  set('deliveranceSequence',      output.layer7_counter_strategies.deliverance_sequence)
  set('prayerPoints',             output.layer7_counter_strategies.prayer_points)
  set('sessionTriggerQuestions',  output.layer7_counter_strategies.session_trigger_questions)
  set('resistanceSignature',      output.layer7_counter_strategies.resistance_signature)
  set('aftercareNotes',           output.layer7_counter_strategies.aftercare_notes)
  set('operationalNotes',         output.layer7_counter_strategies.operational_notes)

  return fields
}
