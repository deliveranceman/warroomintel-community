// Field classification helpers for SpiritVariantMergeModal.
// Drives the auto-fill vs. conflict vs. relational display logic.

export type FieldState =
  | { kind: 'auto';      camel: string; label: string; value: any }
  | { kind: 'conflict';  camel: string; label: string; existing: any; candidate: any }
  | { kind: 'relational'; camel: string; label: string; existing: any; candidate: any }
  | { kind: 'empty';     camel: string; label: string; value: any }

// Fields that have their own structured sub-table and should not be clobbered
// by raw text from a candidate — show side-by-side but never auto-fill.
export const RELATIONAL_FIELDS = new Set([
  'companionSpirits',
  'parentStrongman',
  'relatedSpirits',
  'clusterSpirits',
])

// Fields where long prose content should be appended with a separator
// rather than replaced, when both sides have content.
export const LONG_FORM_FIELDS = new Set([
  'description',
  'manifestation',
  'scripture',
  'entryPoints',
  'legalRights',
  'symptoms',
  'wriNotes',
  'operationalNotes',
  'personalityPresentation',
  'counterScriptures',
  'legalRightsFramework',
  'sessionIndicators',
  'resistanceSignature',
  'demonicAgreements',
  'transmissionVectors',
  'etymologyNotes',
  'archaeologyNotes',
  'scriptureContext',
  'prayerPoints',
  'aftercareNotes',
  'sessionTriggerQuestions',
])

// Human-readable label for each camelCase field key.
const LABELS: Record<string, string> = {
  name:                    'Name',
  aka:                     'Also Known As',
  description:             'Description',
  manifestation:           'Manifestation',
  scripture:               'Scripture Reference',
  entryPoints:             'Entry Points',
  sourceOrigin:            'Source / Origin',
  kingdom:                 'Kingdom',
  strongman:               'Strongman',
  legalRights:             'Legal Rights',
  symptoms:                'Symptoms',
  companionSpirits:        'Companion Spirits',
  wriNotes:                'WRI Exorcist Notes',
  assignment:              'Assignment',
  hierarchyCategory:       'Hierarchy Category',
  parentStrongman:         'Parent Strongman',
  deliveranceSequence:     'Deliverance Sequence',
  operationalNotes:        'Operational Notes',
  primaryBattlefield:      'Primary Battlefield',
  personalityPresentation: 'Personality Presentation',
  counterScriptures:       'Counter Scriptures',
  phonetic:                'Phonetic',
  relatedSpirits:          'Related Spirits',
  biblicalRank:            'Biblical Rank',
  caseType:                'Case Type',
  isGenerational:          'Is Generational',
  isTerritorial:           'Is Territorial',
  subKingdom:              'Sub-Kingdom',
  clusterSpirits:          'Cluster Spirits',
  legalRightsFramework:    'Legal Rights Framework',
  institutionalExpression: 'Institutional Expression',
  sessionIndicators:       'Session Indicators',
  resistanceSignature:     'Resistance Signature',
  demonicAgreements:       'Demonic Agreements',
  transmissionVectors:     'Transmission Vectors',
  etymologyNotes:          'Etymology Notes',
  archaeologyNotes:        'Archaeology Notes',
  scriptureContext:        'Scripture Context',
  prayerPoints:            'Prayer Points',
  aftercareNotes:          'Aftercare Notes',
  culturalPresence:        'Cultural Presence',
  equivalents:             'Equivalent Spirits',
  sessionTriggerQuestions: 'Session Trigger Questions',
}

// The ordered field list the modal walks through (name excluded — not editable via merge).
export const FIELD_GROUPS: string[] = [
  'aka', 'phonetic', 'sourceOrigin',
  'kingdom', 'subKingdom', 'biblicalRank', 'hierarchyCategory',
  'strongman', 'parentStrongman',
  'description', 'manifestation', 'assignment', 'primaryBattlefield',
  'scripture', 'entryPoints', 'legalRights', 'symptoms',
  'companionSpirits', 'relatedSpirits', 'clusterSpirits',
  'caseType', 'isGenerational', 'isTerritorial',
  'deliveranceSequence', 'operationalNotes',
  'personalityPresentation', 'counterScriptures',
  'legalRightsFramework', 'institutionalExpression',
  'sessionIndicators', 'resistanceSignature',
  'demonicAgreements', 'transmissionVectors',
  'etymologyNotes', 'archaeologyNotes', 'scriptureContext',
  'prayerPoints', 'aftercareNotes',
  'wriNotes', 'culturalPresence', 'equivalents', 'sessionTriggerQuestions',
]

function isEmpty(v: any): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  return false
}

export function appendSeparator(existing: string, candidate: string): string {
  const a = existing.trim()
  const b = candidate.trim()
  if (!a) return b
  if (!b) return a
  return `${a}\n\n---\n\n${b}`
}

// Pre-populated merge value for a long-form field where both sides have content.
export function appendMerge(existing: string, candidate: string): string {
  return appendSeparator(existing, candidate)
}

// Classify a single field given existing spirit value and candidate value.
export function classifyField(
  camel: string,
  existingValue: any,
  candidateValue: any,
): FieldState {
  const label = LABELS[camel] || camel
  const existEmpty = isEmpty(existingValue)
  const candEmpty  = isEmpty(candidateValue)

  // Nothing from either side — skip
  if (existEmpty && candEmpty) return { kind: 'empty', camel, label, value: existingValue }

  // Relational fields — always show side-by-side, never auto-fill
  if (RELATIONAL_FIELDS.has(camel)) {
    return { kind: 'relational', camel, label, existing: existingValue, candidate: candidateValue }
  }

  // Candidate adds new info, existing is blank — auto-fill
  if (existEmpty && !candEmpty) {
    return { kind: 'auto', camel, label, value: candidateValue }
  }

  // Existing has data, candidate is blank — skip (no contribution)
  if (!existEmpty && candEmpty) {
    return { kind: 'empty', camel, label, value: existingValue }
  }

  // Both have data
  const existStr = typeof existingValue === 'string' ? existingValue.trim() : JSON.stringify(existingValue)
  const candStr  = typeof candidateValue === 'string' ? candidateValue.trim() : JSON.stringify(candidateValue)

  // Identical — no conflict, keep existing
  if (existStr === candStr) return { kind: 'empty', camel, label, value: existingValue }

  // Conflict — human decides
  return { kind: 'conflict', camel, label, existing: existingValue, candidate: candidateValue }
}
