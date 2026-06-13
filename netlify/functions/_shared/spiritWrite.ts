// Shared demon/spirit WRITE helpers. Extracted from admin-demon.ts so every
// demon-base writer normalizes identically when repointed from Airtable to the
// Supabase `spirits` table. Behavior is byte-identical to the original inline
// version that the live admin write path was verified against.

const NAME_FIELD = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'

// Single authoritative bridge: [camelCase key, Airtable field name, snake column].
// Inbound bodies arrive in BOTH camelCase AND Airtable-field-name shapes, so the
// lookup map is keyed by both. `region`, `function`, `equivalentSpirits` are
// intentionally absent — they have no Supabase column and are ignored on write.
const FIELD_DEFS: Array<[string, string, string]> = [
  ['name', NAME_FIELD, 'name'],
  ['aka', 'Also Known As', 'aka'],
  ['description', 'Description', 'description'],
  ['manifestation', 'Manifestiation', 'manifestation'],
  ['scripture', 'Scripture Reference', 'scripture'],
  ['entryPoints', 'Entry Points', 'entry_points'],
  ['sourceOrigin', 'Source / Orgin', 'source_origin'],
  ['kingdom', 'Kingdom', 'kingdom'],
  ['strongman', 'Strongman', 'strongman'],
  ['legalRights', 'Legal Rights', 'legal_rights'],
  ['symptoms', 'Symptoms', 'symptoms'],
  ['companionSpirits', 'Companion Spirits', 'companion_spirits'],
  ['wriNotes', 'WRI Exorcist Notes', 'wri_notes'],
  ['assignment', 'Assignment', 'assignment'],
  ['hierarchyCategory', 'Hierarchy Category', 'hierarchy_category'],
  ['parentStrongman', 'Parent Strongman', 'parent_strongman'],
  ['deliveranceSequence', 'Deliverance Sequence', 'deliverance_sequence'],
  ['operationalNotes', 'Operational Notes', 'operational_notes'],
  ['primaryBattlefield', 'Primary Battlefield', 'primary_battlefield'],
  ['personalityPresentation', 'Typical Personality Presentation', 'personality_presentation'],
  ['counterScriptures', 'Counter Scriptures', 'counter_scriptures'],
  ['phonetic', 'Phonetic', 'phonetic'],
  ['images', 'Images', 'images'],
  ['relatedSpirits', 'Related Spirits', 'related_spirits'],
  ['biblicalRank', 'Biblical Rank', 'biblical_rank'],
  ['caseType', 'Case Type', 'case_type'],
  ['isGenerational', 'Is Generational', 'is_generational'],
  ['isTerritorial', 'Is Territorial', 'is_territorial'],
  ['subKingdom', 'Sub-Kingdom', 'sub_kingdom'],
  ['clusterSpirits', 'Cluster Spirits', 'cluster_spirits'],
  ['legalRightsFramework', 'Legal Rights Framework', 'legal_rights_framework'],
  ['institutionalExpression', 'Institutional Expression', 'institutional_expression'],
  ['sessionIndicators', 'Session Indicators', 'session_indicators'],
  ['resistanceSignature', 'Resistance Signature', 'resistance_signature'],
  ['demonicAgreements', 'Demonic Agreements', 'demonic_agreements'],
  ['transmissionVectors', 'Transmission Vectors', 'transmission_vectors'],
  ['etymologyNotes', 'Etymology Notes', 'etymology_notes'],
  ['archaeologyNotes', 'Archaeology Notes', 'archaeology_notes'],
  ['scriptureContext', 'Scripture Context', 'scripture_context'],
  ['prayerPoints', 'Prayer Points', 'prayer_points'],
  ['aftercareNotes', 'Aftercare Notes', 'aftercare_notes'],
  ['culturalPresence', 'Cultural Presence', 'cultural_presence'],
  ['sessionTriggerQuestions', 'Session Trigger Questions', 'session_trigger_questions'],
]

const TO_COLUMN: Record<string, string> = {}
const COL_TO_CAMEL: Record<string, string> = {}
for (const [camel, air, col] of FIELD_DEFS) {
  TO_COLUMN[camel] = col
  TO_COLUMN[air]   = col
  COL_TO_CAMEL[col] = camel
}

const ARRAY_COLS = new Set(['images', 'cultural_presence'])
const BOOL_COLS  = new Set(['is_generational', 'is_territorial'])

// biblical_rank enum — ONLY these 10 are legal; anything else (or blank) -> NULL.
const BIBLICAL_RANK = [
  'Demon', 'Power', 'World Ruler', 'Strongman', 'Principality', 'Wicked Spirit',
  'Spirit of Infirmity', 'Fallen Angel', 'Familiar Spirit', 'Common Spirit',
] as const
const VALID_RANKS = new Set<string>(BIBLICAL_RANK)

function toTextArray(v: any): string[] {
  if (Array.isArray(v)) return v.map((x: any) => String(x).trim()).filter(Boolean)
  if (typeof v === 'string') return v.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
  return []
}

// Normalize any inbound shape (Airtable-named OR camelCase) to snake columns.
// Only keys actually present are emitted (partial-update: never force-overwrite
// unspecified columns). biblical_rank coerces blank/invalid -> NULL (never '').
function toColumns(fields: Record<string, any>): Record<string, any> {
  const cols: Record<string, any> = {}
  for (const [k, v] of Object.entries(fields)) {
    const col = TO_COLUMN[k]
    if (!col) continue // unknown/ignored (region, function, equivalentSpirits, slug, id…)
    if (BOOL_COLS.has(col)) {
      cols[col] = v === true || v === 'true' || v === 'Yes' || v === 'yes'
    } else if (ARRAY_COLS.has(col)) {
      cols[col] = toTextArray(v)
    } else if (col === 'biblical_rank') {
      cols[col] = VALID_RANKS.has(String(v)) ? String(v) : null
    } else {
      cols[col] = v == null ? '' : String(v)
    }
  }
  return cols
}

// Map a Supabase row back to the camelCase read shape.
function mapRow(row: any): Record<string, any> {
  const out: Record<string, any> = {
    id: row.id,
    slug: row.slug || '',
    airtableId: row.legacy_airtable_id || '',
    createdTime: row.created_at || '',
  }
  for (const [camel, , col] of FIELD_DEFS) {
    if (BOOL_COLS.has(col)) out[camel] = row[col] === true
    else if (ARRAY_COLS.has(col)) out[camel] = Array.isArray(row[col]) ? row[col] : []
    else out[camel] = row[col] || ''
  }
  return out
}

// Base slug from a name (no collision check).
function generateSlug(name: string): string {
  return name.toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '') || 'spirit'
}

// Collision-safe slug: appends -2, -3… until free.
async function uniqueSlug(sb: any, name: string): Promise<string> {
  const base = generateSlug(name)
  let candidate = base
  let n = 2
  while (true) {
    const { data } = await sb.from('spirits').select('id').eq('slug', candidate).limit(1)
    if (!data || data.length === 0) return candidate
    candidate = `${base}-${n++}`
  }
}

// Read a name out of either inbound shape.
function extractName(fields: Record<string, any>): string {
  return (fields?.[NAME_FIELD] || fields?.name || '').toString().trim()
}

// ── Snapshot helpers ─────────────────────────────────────────────────────────

export type SnapshotMeta = {
  jobId:      string | null  // ai_jobs.id when AI-driven, null for manual edits
  appliedBy:  string         // verified Clerk userId from requireAdmin2
  source:     'enrich' | 'library_enrich' | 'manual' | 'taxonomy'
}

// Insert one snapshot row per changed column. Takes the already-fetched current
// spirit row so callers that already have it avoid a redundant SELECT.
// Returns an error string on failure, null on success.
async function insertFieldSnapshots(
  sb: any,
  currentRow: Record<string, any>,
  proposedSnakeCols: Record<string, any>,
  meta: SnapshotMeta
): Promise<string | null> {
  const rows = Object.entries(proposedSnakeCols)
    .filter(([col, appliedValue]) => {
      const priorValue = currentRow[col] !== undefined ? currentRow[col] : null
      // Skip no-op: value unchanged between prior and proposed.
      const priorStr   = typeof priorValue   === 'object' ? JSON.stringify(priorValue)   : priorValue
      const appliedStr = typeof appliedValue === 'object' ? JSON.stringify(appliedValue) : appliedValue
      return priorStr !== appliedStr
    })
    .map(([col, appliedValue]) => ({
      spirit_id:     currentRow.id,
      spirit_name:   currentRow.name || '',
      field_name:    COL_TO_CAMEL[col] || col,
      prior_value:   currentRow[col] !== undefined ? currentRow[col] : null,
      applied_value: appliedValue,
      job_id:        meta.jobId || null,
      applied_by:    meta.appliedBy,
      source:        meta.source,
    }))
  if (rows.length === 0) return null
  const { error } = await sb.from('spirit_apply_snapshots').insert(rows)
  return error ? error.message : null
}

// ── High-level write helpers (used by the repointed endpoints) ───────────────

// Update an existing spirit matched by slug. Partial — only present keys change.
// When meta is provided, captures a per-field snapshot before overwriting.
// Aborts and returns an error if the snapshot insert fails.
async function updateSpiritBySlug(
  sb: any,
  slug: string,
  inbound: Record<string, any>,
  meta?: SnapshotMeta
) {
  const cols = toColumns(inbound)

  if (meta) {
    const { data: current, error: fetchErr } = await sb
      .from('spirits').select('*').eq('slug', slug).single()
    if (fetchErr || !current) return { record: null, error: 'Spirit not found' }
    const snapErr = await insertFieldSnapshots(sb, current, cols, meta)
    if (snapErr) {
      console.error('[spiritWrite] snapshot insert failed:', snapErr)
      return { record: null, error: `Snapshot failed — aborting to protect data: ${snapErr}` }
    }
  }

  const { data, error } = await sb.from('spirits').update(cols).eq('slug', slug).select('*')
  if (error) return { record: null, error: error.message }
  if (!data || data.length === 0) return { record: null, error: 'Spirit not found' }
  return { record: mapRow(data[0]), error: null }
}

// Create a new spirit. Generates a unique slug, sets legacy_airtable_id NULL.
// Requires a name (in either shape, or passed explicitly).
async function createSpirit(sb: any, inbound: Record<string, any>, explicitName?: string) {
  const name = (explicitName || extractName(inbound)).trim()
  if (!name) return { record: null, error: 'name required', conflict: false }
  const cols = toColumns(inbound)
  cols.name = name
  cols.slug = await uniqueSlug(sb, name)
  cols.legacy_airtable_id = null
  const { data, error } = await sb.from('spirits').insert(cols).select('*')
  if (error) return { record: null, error: error.message, conflict: false }
  return { record: mapRow(data[0]), error: null, conflict: false }
}

// Upsert by name (case-insensitive). Updates the existing row if found, else
// creates a new one. Returns { record, created, error }.
async function upsertSpiritByName(sb: any, name: string, inbound: Record<string, any>) {
  const clean = (name || '').trim()
  if (!clean) return { record: null, created: false, error: 'name required' }
  const safe = clean.replace(/[%_\\]/g, '\\$&')
  const { data: existing } = await sb.from('spirits').select('slug').ilike('name', safe).limit(1)
  if (existing && existing.length > 0) {
    const res = await updateSpiritBySlug(sb, existing[0].slug, inbound)
    return { record: res.record, created: false, error: res.error }
  }
  const res = await createSpirit(sb, inbound, clean)
  return { record: res.record, created: true, error: res.error }
}

// Case-insensitive existence check by name. Returns the existing slug or null.
async function findSpiritSlugByName(sb: any, name: string): Promise<string | null> {
  const clean = (name || '').trim()
  if (!clean) return null
  const safe = clean.replace(/[%_\\]/g, '\\$&')
  const { data } = await sb.from('spirits').select('slug').ilike('name', safe).limit(1)
  return data && data.length > 0 ? data[0].slug : null
}

export {
  NAME_FIELD,
  FIELD_DEFS,
  BIBLICAL_RANK,
  COL_TO_CAMEL,
  toColumns,
  mapRow,
  generateSlug,
  uniqueSlug,
  extractName,
  insertFieldSnapshots,
  updateSpiritBySlug,
  createSpirit,
  upsertSpiritByName,
  findSpiritSlugByName,
}
