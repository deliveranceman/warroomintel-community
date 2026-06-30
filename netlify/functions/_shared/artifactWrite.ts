// Shared artifact WRITE helpers for admin endpoints.
// Mirrors the spiritWrite.ts pattern but without Airtable field bridging.

import { reembedArtifactAfterWrite } from './reembedArtifactAfterWrite'

// camelCase frontend key → snake_case DB column (explicit allow-list for writes)
const CAMEL_TO_COL: Record<string, string> = {
  name:            'name',
  artifactType:    'artifact_type',
  aliases:         'aliases',
  summary:         'summary',
  body:            'body',
  cautionLevel:    'caution_level',
  cautionNote:     'caution_note',
  firstAppearance: 'first_appearance',
  origin:          'origin',
  status:          'status',
  classification:  'classification',
  intelligenceOnly: 'intelligence_only',
  details:         'details',
  subjectImageUrl:  'subject_image_url',
  ogImageUrl:       'og_image_url',
  compiledBy:      'compiled_by',
  published:       'published',
  createdBy:       'created_by',
}

const COL_TO_CAMEL: Record<string, string> = Object.fromEntries(
  Object.entries(CAMEL_TO_COL).map(([c, col]) => [col, c])
)

const VALID_STATUS         = new Set(['active', 'historical', 'dormant', 'disputed'])
const VALID_CLASSIFICATION = new Set(['unclassified', 'intelligence_only', 'confirmed', 'unverified', 'redacted'])
const INT_COLS  = new Set(['caution_level'])
const BOOL_COLS = new Set(['intelligence_only', 'published'])
const JSONB_COLS = new Set(['details'])

// Normalize inbound camelCase body → snake_case DB columns with validation.
// Partial-update safe: only keys present in inbound are emitted.
export function toArtifactColumns(inbound: Record<string, any>): Record<string, any> {
  const cols: Record<string, any> = {}
  for (const [k, v] of Object.entries(inbound)) {
    const col = CAMEL_TO_COL[k]
    if (!col) continue
    if (BOOL_COLS.has(col)) {
      cols[col] = v === true || v === 'true'
    } else if (INT_COLS.has(col)) {
      const n = parseInt(String(v), 10)
      cols[col] = isNaN(n) ? null : Math.min(5, Math.max(1, n))
    } else if (JSONB_COLS.has(col)) {
      cols[col] = typeof v === 'object' ? v : {}
    } else if (col === 'status') {
      cols[col] = VALID_STATUS.has(String(v)) ? String(v) : 'active'
    } else if (col === 'classification') {
      cols[col] = VALID_CLASSIFICATION.has(String(v)) ? String(v) : 'unclassified'
    } else {
      cols[col] = v == null ? '' : String(v)
    }
  }
  return cols
}

// Map a DB row back to camelCase response shape.
export function mapArtifactRow(row: any): Record<string, any> {
  const out: Record<string, any> = {
    id:        row.id,
    slug:      row.slug || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  }
  for (const [col, camel] of Object.entries(COL_TO_CAMEL)) {
    if (BOOL_COLS.has(col))  out[camel] = row[col] === true
    else if (INT_COLS.has(col))  out[camel] = row[col] ?? null
    else if (JSONB_COLS.has(col)) out[camel] = row[col] ?? {}
    else out[camel] = row[col] || ''
  }
  return out
}

function generateArtifactSlug(name: string): string {
  return name.toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '') || 'artifact'
}

async function uniqueArtifactSlug(sb: any, name: string): Promise<string> {
  const base = generateArtifactSlug(name)
  let candidate = base
  let n = 2
  while (true) {
    const { data } = await sb.from('artifacts').select('id').eq('slug', candidate).limit(1)
    if (!data || data.length === 0) return candidate
    candidate = `${base}-${n++}`
  }
}

// Create a new artifact. Generates a unique slug, fires embed.
export async function createArtifact(
  sb: any,
  inbound: Record<string, any>,
  userId: string,
): Promise<{ record: Record<string, any> | null; error: string | null }> {
  const name = (inbound.name || '').toString().trim()
  if (!name) return { record: null, error: 'name required' }

  const cols = toArtifactColumns(inbound)
  cols.name       = name
  cols.slug       = await uniqueArtifactSlug(sb, name)
  cols.created_by = userId
  cols.updated_at = new Date().toISOString()

  const { data, error } = await sb.from('artifacts').insert(cols).select('*').single()
  if (error) return { record: null, error: error.message }

  void reembedArtifactAfterWrite(sb, data.id, process.env.OPENAI_API_KEY).catch(
    (e: any) => console.error('[artifactWrite] embed failed after create:', e?.message)
  )
  return { record: mapArtifactRow(data), error: null }
}

// Update an existing artifact by id. Partial — only present keys change.
export async function updateArtifact(
  sb: any,
  id: string,
  inbound: Record<string, any>,
): Promise<{ record: Record<string, any> | null; error: string | null }> {
  const cols = toArtifactColumns(inbound)
  cols.updated_at = new Date().toISOString()
  // created_by must not be overwritten on update
  delete cols.created_by

  const { data, error } = await sb.from('artifacts').update(cols).eq('id', id).select('*').single()
  if (error) return { record: null, error: error.message }
  if (!data)  return { record: null, error: 'Artifact not found' }

  void reembedArtifactAfterWrite(sb, data.id, process.env.OPENAI_API_KEY).catch(
    (e: any) => console.error('[artifactWrite] embed failed after update:', e?.message)
  )
  return { record: mapArtifactRow(data), error: null }
}

export { generateArtifactSlug, uniqueArtifactSlug, CAMEL_TO_COL, COL_TO_CAMEL }
