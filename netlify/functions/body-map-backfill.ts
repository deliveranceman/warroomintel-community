import { createClient } from '@supabase/supabase-js'
import { requireAdmin2 } from './_shared/access'

// One-time backfill: legacy `body_map_manifestations` rows → Spirit Body Map v2
// (anatomy_regions.overview + spirit_region_correlations). Admin only. Idempotent:
// a region whose overview is already populated is skipped entirely.

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

// Confident-only crosswalk from legacy hotspot ids → new region_key. Ambiguous
// legacy hotspots (elbow, wrist, generic abdomen) are intentionally absent so the
// backfill skips and reports them rather than mis-placing paid content.
const LEGACY_TO_REGION: Record<string, string> = {
  // ── front (male mf-*, female ff-*) ──
  'mf-crown': 'cranium',          'ff-crown': 'cranium',
  'mf-left-eye': 'left_eye',      'ff-left-eye': 'left_eye',
  'mf-right-eye': 'right_eye',    'ff-right-eye': 'right_eye',
  'mf-mouth': 'mouth_jaw',        'ff-mouth': 'mouth_jaw',
  'mf-throat': 'throat',          'ff-throat': 'throat',
  'mf-heart': 'heart',            'ff-heart': 'heart',
  'mf-left-shoulder': 'left_deltoid',   'ff-left-shoulder': 'left_deltoid',
  'mf-right-shoulder': 'right_deltoid', 'ff-right-shoulder': 'right_deltoid',
  'mf-solar-plexus': 'solar_plexus',    'ff-solar-plexus': 'solar_plexus',
  'mf-pelvis': 'pelvis',          'ff-pelvis': 'pelvis',
  'mf-left-hand': 'left_hand',    'ff-left-hand': 'left_hand',
  'mf-right-hand': 'right_hand',  'ff-right-hand': 'right_hand',
  'mf-left-thigh': 'left_quadricep',   'ff-left-thigh': 'left_quadricep',
  'mf-right-thigh': 'right_quadricep', 'ff-right-thigh': 'right_quadricep',
  'mf-left-knee': 'left_knee',    'ff-left-knee': 'left_knee',
  'mf-right-knee': 'right_knee',  'ff-right-knee': 'right_knee',
  'mf-left-shin': 'left_lower_leg',    'ff-left-shin': 'left_lower_leg',
  'mf-right-shin': 'right_lower_leg',  'ff-right-shin': 'right_lower_leg',
  'mf-left-foot': 'left_foot',    'ff-left-foot': 'left_foot',
  'mf-right-foot': 'right_foot',  'ff-right-foot': 'right_foot',
  'ff-womb': 'uterus_ovaries',
  // ── back (male mb-*, female fb-*) ──
  'mb-crown': 'occiput',          'fb-crown': 'occiput',
  'mb-neck': 'cervical_spine',    'fb-neck': 'cervical_spine',
  'mb-left-shoulder': 'left_scapula',   'fb-left-shoulder': 'left_scapula',
  'mb-right-shoulder': 'right_scapula', 'fb-right-shoulder': 'right_scapula',
  'mb-upper-back': 'thoracic_spine',    'fb-upper-back': 'thoracic_spine',
  'mb-mid-back': 'lumbar_spine',  'fb-mid-back': 'lumbar_spine',
  'mb-lower-back': 'sacrum',      'fb-lower-back': 'sacrum',
  'mb-left-hip': 'left_gluteal',  'fb-left-hip': 'left_gluteal',
  'mb-right-hip': 'right_gluteal','fb-right-hip': 'right_gluteal',
  'mb-left-hamstring': 'left_hamstring',   'fb-left-hamstring': 'left_hamstring',
  'mb-right-hamstring': 'right_hamstring', 'fb-right-hamstring': 'right_hamstring',
  'mb-left-knee-back': 'left_knee',     'fb-left-knee-back': 'left_knee',
  'mb-right-knee-back': 'right_knee',   'fb-right-knee-back': 'right_knee',
  'mb-left-heel': 'left_foot',    'fb-left-heel': 'left_foot',
  'mb-right-heel': 'right_foot',  'fb-right-heel': 'right_foot',
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: CORS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const client = sb()

  const { data: legacyRows, error: lErr } = await client.from('body_map_manifestations').select('*')
  if (lErr) return new Response(JSON.stringify({ error: lErr.message }), { status: 500, headers: CORS })

  const { data: regionRows } = await client.from('anatomy_regions').select('region_key, overview')
  const overviewByRegion: Record<string, string> = {}
  for (const r of regionRows || []) overviewByRegion[(r as any).region_key] = (r as any).overview || ''

  // Existing correlations — dedupe key region_key|lower(spirit_name)
  const { data: existingCorrs } = await client.from('spirit_region_correlations').select('region_key, spirit_name')
  const corrSeen = new Set<string>()
  for (const c of existingCorrs || []) corrSeen.add(`${(c as any).region_key}|${String((c as any).spirit_name).toLowerCase()}`)

  // Group legacy rows by target region
  const byRegion: Record<string, any[]> = {}
  const unmapped: string[] = []
  for (const row of legacyRows || []) {
    const target = LEGACY_TO_REGION[(row as any).hotspot_id]
    if (!target) { if (!unmapped.includes((row as any).hotspot_id)) unmapped.push((row as any).hotspot_id); continue }
    if (!(target in overviewByRegion)) { if (!unmapped.includes((row as any).hotspot_id)) unmapped.push((row as any).hotspot_id); continue }
    ;(byRegion[target] ||= []).push(row)
  }

  let regionsPopulated = 0
  let correlationsInserted = 0
  const skippedPopulated: string[] = []
  const corrRowsToInsert: any[] = []

  for (const [regionKey, rows] of Object.entries(byRegion)) {
    // Idempotent: skip a region that already has an overview.
    if ((overviewByRegion[regionKey] || '').trim()) { skippedPopulated.push(regionKey); continue }

    const overview = rows
      .map(r => {
        const m = (r.manifestation || '').trim()
        const n = (r.notes || '').trim()
        return n ? `${m}\n\n${n}` : m
      })
      .filter(Boolean)
      .join('\n\n———\n\n')

    if (overview) {
      const { error: uErr } = await client.from('anatomy_regions').update({ overview }).eq('region_key', regionKey)
      if (!uErr) regionsPopulated++
    }

    // Explode spirit_names[] (paired with spirit_airtable_ids[]) into correlations.
    for (const r of rows) {
      const names: string[] = Array.isArray(r.spirit_names) ? r.spirit_names : []
      const ids: string[]   = Array.isArray(r.spirit_airtable_ids) ? r.spirit_airtable_ids : []
      names.forEach((name: string, i: number) => {
        const clean = (name || '').trim()
        if (!clean) return
        const dedupe = `${regionKey}|${clean.toLowerCase()}`
        if (corrSeen.has(dedupe)) return
        corrSeen.add(dedupe)
        corrRowsToInsert.push({
          region_key: regionKey,
          spirit_name: clean,
          airtable_record_id: ids[i] || null,
          correlation_strength: 3,
          manifestation_type: r.region || r.body_part || null,
          notes: r.source ? `Migrated from legacy body map (source: ${r.source})` : 'Migrated from legacy body map',
        })
      })
    }
  }

  if (corrRowsToInsert.length) {
    const { error: cErr } = await client.from('spirit_region_correlations').insert(corrRowsToInsert)
    if (!cErr) correlationsInserted = corrRowsToInsert.length
    else console.error('[body-map-backfill] correlation insert failed:', cErr.message)
  }

  return new Response(JSON.stringify({
    ok: true,
    legacyRows: (legacyRows || []).length,
    regionsPopulated,
    correlationsInserted,
    skippedAlreadyPopulated: skippedPopulated,
    unmappedHotspots: unmapped,
  }), { status: 200, headers: CORS })
}

export const config = { path: '/api/body-map-backfill' }
