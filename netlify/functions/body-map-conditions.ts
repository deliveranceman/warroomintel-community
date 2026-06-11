import { createClient } from '@supabase/supabase-js'
import { requireAdmin2 } from './_shared/access'

// Author condition/manifestation ingest. Admin only. Idempotent: conditions
// upsert on condition_key; condition_regions upsert on (condition_key, region_key)
// DO NOTHING. Confident crosswalk only — an unrecognised body area creates the
// condition row but is REPORTED in unmappedBodyAreas[] rather than guessed at a
// region (same discipline as body-map-backfill's unmappedHotspots).
//
// Enrich/apply are a separate concern and NOT part of this endpoint.

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS })
}

// ── Body Area → region_key crosswalk (confident maps only) ───────────────────
// Pairs expand to left+right. Keys are normalized (lowercase, trimmed).
const CROSSWALK: Record<string, string[]> = {
  // head / face
  'head': ['cranium'], 'skull': ['cranium'], 'hair/scalp': ['cranium'], 'scalp': ['cranium'], 'hair': ['cranium'],
  'brain': ['brain'], 'mind': ['brain'],
  'forehead': ['forehead'],
  'eyes': ['left_eye', 'right_eye'], 'eye': ['left_eye', 'right_eye'], 'vision': ['left_eye', 'right_eye'],
  'ears': ['left_ear', 'right_ear'], 'ear': ['left_ear', 'right_ear'], 'hearing': ['left_ear', 'right_ear'],
  'nose': ['nose'],
  'sinuses': ['sinuses'], 'sinus': ['sinuses'],
  'mouth/eyes/mucus': ['mouth_jaw'], 'mouth': ['mouth_jaw'], 'jaw': ['mouth_jaw'], 'teeth': ['mouth_jaw'], 'tmj': ['mouth_jaw'],
  // neck / throat
  'throat': ['throat'], 'voice': ['throat'],
  'thyroid': ['thyroid'],
  'neck': ['cervical_spine'],
  // chest
  'heart': ['heart'],
  'chest': ['sternum_ribcage'], 'ribs': ['sternum_ribcage'], 'sternum': ['sternum_ribcage'],
  'lungs': ['left_lung', 'right_lung'], 'lung': ['left_lung', 'right_lung'], 'breath': ['left_lung', 'right_lung'], 'respiratory': ['left_lung', 'right_lung'],
  'breasts': ['left_breast', 'right_breast'], 'breast': ['left_breast', 'right_breast'],
  // abdomen / organs
  'stomach': ['stomach'], 'gut': ['stomach'],
  'solar plexus': ['solar_plexus'],
  'liver': ['liver'],
  'gallbladder': ['gallbladder'],
  'pancreas': ['pancreas'], 'blood sugar': ['pancreas'],
  'spleen': ['spleen'],
  'colon': ['colon'], 'large intestine': ['colon'], 'bowel': ['colon'],
  'small intestine': ['small_intestine'],
  'kidneys': ['left_kidney', 'right_kidney'], 'kidney': ['left_kidney', 'right_kidney'],
  'adrenal glands': ['left_kidney', 'right_kidney'], 'adrenals': ['left_kidney', 'right_kidney'], 'adrenal': ['left_kidney', 'right_kidney'],
  'bladder': ['bladder'],
  // pelvis / reproductive
  'pelvis': ['pelvis'],
  'groin': ['groin_lymph'],
  'ovaries': ['uterus_ovaries'], 'uterus': ['uterus_ovaries'], 'uterus-cervix': ['uterus_ovaries'],
  'uterus-pelvic': ['uterus_ovaries'], 'female reproductive': ['uterus_ovaries'], 'womb': ['uterus_ovaries'],
  'prostate': ['prostate_testes'], 'testicles': ['prostate_testes'], 'testes': ['prostate_testes'],
  // arms / hands
  'shoulders': ['left_deltoid', 'right_deltoid'], 'shoulder': ['left_deltoid', 'right_deltoid'],
  'biceps': ['left_bicep', 'right_bicep'], 'upper arms': ['left_bicep', 'right_bicep'],
  'forearms': ['left_forearm', 'right_forearm'],
  'hands': ['left_hand', 'right_hand'], 'wrists': ['left_hand', 'right_hand'], 'hand': ['left_hand', 'right_hand'],
  // legs / feet
  'hips': ['left_hip', 'right_hip'], 'hip': ['left_hip', 'right_hip'],
  'thighs': ['left_quadricep', 'right_quadricep'],
  'knees': ['left_knee', 'right_knee'], 'knee': ['left_knee', 'right_knee'],
  'lower legs': ['left_lower_leg', 'right_lower_leg'], 'shins': ['left_lower_leg', 'right_lower_leg'],
  'calves': ['left_calf', 'right_calf'],
  'feet': ['left_foot', 'right_foot'], 'ankles': ['left_foot', 'right_foot'], 'foot': ['left_foot', 'right_foot'],
  'heel': ['left_achilles', 'right_achilles'], 'achilles': ['left_achilles', 'right_achilles'],
  // back
  'upper back': ['thoracic_spine'],
  'lower back': ['lumbar_spine'],
  'shoulder blades': ['left_scapula', 'right_scapula'],
  'tailbone': ['tailbone'], 'coccyx': ['tailbone'],
  'sacrum': ['sacrum'],
  'glutes': ['left_gluteal', 'right_gluteal'], 'buttocks': ['left_gluteal', 'right_gluteal'],
  // skin
  'skin': ['skin'], 'rash': ['skin'],
}

// Systemic body areas: condition row only, NO region link (intentional, not unmapped).
const SYSTEMIC = new Set<string>([
  'whole body', 'immune system', 'whole body/immune', 'blood/metabolism',
  'blood vessels', 'veins', 'immune system/joints', 'immune system/nervous',
  'muscles', 'joints', 'bones', 'whole body muscles',
])

// Author system label → one of the 12 body_systems keys, where it cleanly maps.
const SYSTEM_KEY: Record<string, string> = {
  'nervous': 'nervous', 'nervous system': 'nervous', 'neurological': 'nervous',
  'endocrine': 'endocrine', 'endocrine system': 'endocrine', 'hormonal': 'endocrine',
  'cardiovascular': 'cardio', 'cardio': 'cardio', 'circulatory': 'cardio', 'heart': 'cardio',
  'respiratory': 'respiratory', 'respiratory system': 'respiratory',
  'digestive': 'digestive', 'digestive system': 'digestive', 'gi': 'digestive', 'gastrointestinal': 'digestive',
  'immune': 'lymphatic', 'immune system': 'lymphatic', 'lymphatic': 'lymphatic', 'immune/lymphatic': 'lymphatic',
  'musculoskeletal': 'musculoskeletal',
  'reproductive': 'reproductive', 'reproductive system': 'reproductive',
  'urinary': 'urinary', 'urinary system': 'urinary',
  'skin': 'skin', 'integumentary': 'skin',
  'skeletal': 'skeletal', 'bones': 'skeletal',
  'muscular': 'muscular', 'muscles': 'muscular', 'muscle': 'muscular',
}

const STRENGTH_LABEL: Record<string, number> = { high: 5, medium: 3, med: 3, low: 2 }

function norm(s: any): string {
  return String(s ?? '').trim().toLowerCase()
}

function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function pick(row: any, ...keys: string[]): any {
  for (const k of keys) if (row[k] != null && row[k] !== '') return row[k]
  return undefined
}

// source_strength may already be 1–5, or a High/Medium/Low label. Returns
// { strength: 1–5 | null, note: original label or null }.
function resolveStrength(raw: any): { strength: number | null; note: string | null } {
  if (raw == null || raw === '') return { strength: null, note: null }
  const n = Number(raw)
  if (Number.isFinite(n) && n >= 1 && n <= 5) return { strength: Math.round(n), note: null }
  const label = norm(raw)
  if (label in STRENGTH_LABEL) return { strength: STRENGTH_LABEL[label], note: String(raw).trim() }
  return { strength: null, note: String(raw).trim() }
}

function toTags(raw: any): string[] {
  if (Array.isArray(raw)) return raw.map(t => String(t).trim()).filter(Boolean)
  if (raw == null || raw === '') return []
  return String(raw).split(/[;,|]/).map(t => t.trim()).filter(Boolean)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405)

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const action = new URL(req.url).searchParams.get('action') || 'ingest'
  if (action !== 'ingest') return json({ error: 'Unknown action' }, 400)

  let body: any
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const rows: any[] = Array.isArray(body?.rows) ? body.rows : Array.isArray(body) ? body : []
  if (!rows.length) return json({ error: 'rows[] required' }, 400)

  const client = sb()

  // Normalize header keys per-row (lowercase, spaces/dashes → underscore) so the
  // client can pass CSV-derived objects with loose header casing.
  const normRows = rows.map(r => {
    const o: any = {}
    for (const k of Object.keys(r || {})) o[k.trim().toLowerCase().replace(/[\s-]+/g, '_')] = (r as any)[k]
    return o
  })

  const conditionsToUpsert: any[] = []
  const seenKeys = new Set<string>()
  const linksByCondition: Record<string, Set<string>> = {}
  const linkStrength: Record<string, number> = {}
  const unmapped = new Set<string>()
  const skipped: string[] = []

  for (const r of normRows) {
    const name = String(pick(r, 'condition', 'name', 'condition_name', 'display_name') ?? '').trim()
    if (!name) { skipped.push(JSON.stringify(r).slice(0, 120)); continue }

    const key = slugify(name)
    if (!key) { skipped.push(name); continue }

    const { strength, note } = resolveStrength(pick(r, 'source_strength', 'strength'))
    const systemRaw = pick(r, 'system')
    const sysKey = systemRaw != null ? (SYSTEM_KEY[norm(systemRaw)] ?? null) : null
    const sourceNote = pick(r, 'source_note', 'source') ?? note ?? null

    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      conditionsToUpsert.push({
        condition_key: key,
        display_name: name,
        system: systemRaw != null ? String(systemRaw).trim() : null,
        system_key: sysKey,
        symptoms: pick(r, 'symptoms') != null ? String(pick(r, 'symptoms')).trim() : null,
        author_conclusion: String(pick(r, 'conclusion', 'author_conclusion') ?? '').trim(),
        spiritual_tags: toTags(pick(r, 'spiritual_tags', 'tags')),
        source_strength: strength,
        source_note: sourceNote != null ? String(sourceNote).trim() : null,
      })
    }

    // Resolve body area → region_key(s)
    const areaRaw = pick(r, 'body_area', 'bodyarea', 'area', 'region')
    const area = norm(areaRaw)
    if (!area) continue                       // no area → condition only, nothing to map
    if (SYSTEMIC.has(area)) continue          // systemic → condition only, intentional no-link
    const targets = CROSSWALK[area]
    if (!targets) { unmapped.add(String(areaRaw).trim()); continue }

    const relevance = pick(r, 'relevance_strength') != null
      ? Number(pick(r, 'relevance_strength'))
      : (strength ?? 3)
    for (const rk of targets) {
      const lk = `${key}|${rk}`
      ;(linksByCondition[key] ||= new Set()).add(rk)
      linkStrength[lk] = Number.isFinite(relevance) && relevance >= 1 && relevance <= 5 ? Math.round(relevance) : 3
    }
  }

  // ── Upsert conditions ───────────────────────────────────────────────────────
  let conditionsUpserted = 0
  if (conditionsToUpsert.length) {
    const { error } = await client.from('conditions').upsert(conditionsToUpsert, { onConflict: 'condition_key' })
    if (error) return json({ error: `conditions upsert failed: ${error.message}` }, 500)
    conditionsUpserted = conditionsToUpsert.length
  }

  // ── Upsert links (only for region_keys that actually exist) ─────────────────
  const wantedRegions = new Set<string>()
  for (const set of Object.values(linksByCondition)) for (const rk of set) wantedRegions.add(rk)

  let validRegions = new Set<string>()
  if (wantedRegions.size) {
    const { data: regionRows, error: rErr } = await client
      .from('anatomy_regions')
      .select('region_key')
      .in('region_key', Array.from(wantedRegions))
    if (rErr) return json({ error: `region lookup failed: ${rErr.message}` }, 500)
    validRegions = new Set((regionRows || []).map((x: any) => x.region_key))
  }

  const linkRows: any[] = []
  const missingRegions = new Set<string>()
  for (const [key, set] of Object.entries(linksByCondition)) {
    for (const rk of set) {
      if (!validRegions.has(rk)) { missingRegions.add(rk); continue }
      linkRows.push({ condition_key: key, region_key: rk, relevance_strength: linkStrength[`${key}|${rk}`] ?? 3 })
    }
  }

  let linksInserted = 0
  if (linkRows.length) {
    const { error } = await client
      .from('condition_regions')
      .upsert(linkRows, { onConflict: 'condition_key,region_key', ignoreDuplicates: true })
    if (error) return json({ error: `condition_regions upsert failed: ${error.message}` }, 500)
    linksInserted = linkRows.length
  }

  return json({
    ok: true,
    rowsReceived: rows.length,
    conditionsUpserted,
    linksInserted,
    unmappedBodyAreas: Array.from(unmapped),
    missingRegions: Array.from(missingRegions),   // crosswalk targets not yet in anatomy_regions (run the migration)
    skipped,
  })
}

export const config = { path: '/api/body-map-conditions' }
