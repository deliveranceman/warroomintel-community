// Field classification helpers for SpiritVariantMergeModal.
// Drives the auto-fill vs. conflict vs. relational display logic.

export type FieldState =
  | { kind: 'auto';      camel: string; label: string; value: any }
  | { kind: 'match';     camel: string; label: string; value: any }
  | { kind: 'preserved'; camel: string; label: string; value: any }
  | { kind: 'conflict';  camel: string; label: string; existing: any; candidate: any }
  | { kind: 'empty';     camel: string; label: string; value: any }

// Fields that have their own structured sub-table. Classified normally for
// state (auto/conflict/match/preserved) — the UI layer adds an inline spirit
// picker for these regardless of state.
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

export function appendSeparator(a: string, b: string): string {
  const ta = a.trim()
  const tb = b.trim()
  if (!ta) return tb
  if (!tb) return ta
  return `${ta}\n\n---\n\n${tb}`
}

export function appendMerge(existing: string, candidate: string): string {
  return appendSeparator(existing, candidate)
}

// Classify a single field given existing spirit value and candidate value.
// Five possible kinds:
//   empty     — both sides have no value (hide entirely)
//   auto      — existing blank, candidate has value (offer to fill)
//   preserved — existing has value, candidate blank (show for confidence, no action)
//   match     — both have identical values (show for confidence, no action)
//   conflict  — both have different values (human decides)
export function classifyField(
  camel: string,
  existingValue: any,
  candidateValue: any,
): FieldState {
  const label = LABELS[camel] || camel
  const existEmpty = isEmpty(existingValue)
  const candEmpty  = isEmpty(candidateValue)

  if (existEmpty && candEmpty)  return { kind: 'empty',     camel, label, value: existingValue }
  if (existEmpty && !candEmpty) return { kind: 'auto',      camel, label, value: candidateValue }
  if (!existEmpty && candEmpty) return { kind: 'preserved', camel, label, value: existingValue }

  // Both have data — compare normalised strings
  const existStr = typeof existingValue === 'string' ? existingValue.trim().toLowerCase() : JSON.stringify(existingValue)
  const candStr  = typeof candidateValue === 'string' ? candidateValue.trim().toLowerCase() : JSON.stringify(candidateValue)

  if (existStr === candStr) return { kind: 'match', camel, label, value: existingValue }

  return { kind: 'conflict', camel, label, existing: existingValue, candidate: candidateValue }
}
