import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'
import { createSpirit, generateSlug, findSpiritSlugByName, toColumns, insertFieldSnapshots } from './_shared/spiritWrite'
import { applySpiritRegions    } from './_shared/applySpiritRegions'
import { applySpiritGateways   } from './_shared/applySpiritGateways'
import { applySpiritScriptures } from './_shared/applySpiritScriptures'
import { applySpiritHierarchy  } from './_shared/applySpiritHierarchy'
import { applySpiritCompanions } from './_shared/applySpiritCompanions'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
const { token: airtableToken }              = JSON.parse(process.env.AIRTABLE || '{}')

// Same switch as admin-demon.ts — one flag governs all demon-base writes.
const USE_SUPABASE_DEMON_WRITES = true

const BASE_ID    = 'appVXEj2DLPBTJTtD'
const TABLE_ID   = 'tblcP4lgVykzOhLi4'
const NAME_FIELD = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'

function cleanFields(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined || v === '') continue
    out[k] = v
  }
  return out
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST')  return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: CORS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth
  const { userId } = auth

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS })
  }

  const { candidateId, confirmed } = body || {}
  if (!candidateId) return new Response(JSON.stringify({ error: 'candidateId required' }), { status: 400, headers: CORS })
  if (confirmed !== true) return new Response(JSON.stringify({ error: 'confirmed must be true' }), { status: 400, headers: CORS })

  const client = createClient(sbUrl, sbKey)

  const { data: candidate, error: fetchErr } = await client
    .from('spirit_candidates')
    .select('*')
    .eq('id', candidateId)
    .eq('status', 'pending')
    .single()

  if (fetchErr || !candidate) {
    return new Response(JSON.stringify({ error: 'Candidate not found or not pending' }), { status: 404, headers: CORS })
  }

  // ── Supabase write path (flag-on) ──────────────────────────────────────────
  // Push the confirmed candidate into the Supabase `spirits` table via the shared
  // write helper (enum-coerces biblical_rank, generates a unique slug) instead of
  // POSTing to the legacy Airtable demon base.
  if (USE_SUPABASE_DEMON_WRITES) {
    // DEDUP: never create a second record for a spirit that already exists.
    // Match on case-insensitive name first, then on the would-be slug.
    let existingSlug = await findSpiritSlugByName(client, candidate.name)
    if (!existingSlug) {
      const slug = generateSlug(candidate.name)
      const { data: bySlug } = await client.from('spirits').select('slug').eq('slug', slug).limit(1)
      if (bySlug && bySlug.length > 0) existingSlug = bySlug[0].slug
    }
    if (existingSlug) {
      await client.from('spirit_candidates').update({
        status:       'duplicate',
        duplicate_of: existingSlug,
        reviewed_at:  new Date().toISOString(),
        reviewed_by:  userId,
      }).eq('id', candidateId)
      return new Response(
        JSON.stringify({ success: true, duplicate: true, duplicateOf: existingSlug, airtableId: existingSlug, slug: existingSlug }),
        { status: 200, headers: CORS },
      )
    }

    // candidate.function holds the dossier "Description"; source_name -> Source / Origin.
    const inboundFields = {
      name:             candidate.name,
      aka:              candidate.also_known_as,
      description:      candidate.function,
      manifestation:    candidate.manifestations,
      scriptureContext: candidate.scripture_context,
      kingdom:          candidate.kingdom,
      biblicalRank:     candidate.biblical_rank,
      subKingdom:       candidate.sub_kingdom,
      sourceOrigin:     candidate.source_name,
    }
    const { record, error: createErr } = await createSpirit(client, inboundFields)
    if (createErr || !record) {
      return new Response(JSON.stringify({ error: `Supabase create failed: ${createErr || 'unknown'}` }), { status: 500, headers: CORS })
    }

    // Write per-field snapshots (one row per populated column).
    // prior_value = null for all fields (new spirit — no prior state).
    // Snapshot failure logs but does NOT block the approve.
    const snapErr = await insertFieldSnapshots(
      client,
      { id: record.id, name: record.name },
      toColumns(inboundFields),
      { jobId: null, appliedBy: userId, source: 'enrich' },
    )
    if (snapErr) console.error('[spirit-candidate-confirm] snapshot write failed:', snapErr)

    // airtable_record_id now transitionally holds the Supabase spirit SLUG (not an
    // Airtable id) — column reused to avoid a schema change.
    await client.from('spirit_candidates').update({
      status:             'approved',
      airtable_record_id: record.slug,
      reviewed_at:        new Date().toISOString(),
      reviewed_by:        userId,
    }).eq('id', candidateId)

    // ---- Unified approval: auto-fan-out paired LES ----
    // Fixes the silent-failure pattern where candidate-confirm creates the
    // spirits row but never triggers Layer 2 fan-outs from the paired LES.
    // Additive — if the fan-out fails, the candidate-confirm still succeeds.
    let pairedFanOutResult: any = null

    try {
      const { data: pairedLES } = await client
        .from('library_enrichment_suggestions')
        .select('id, layer2_raw, status')
        .eq('resource_id', candidate.source_id)
        .ilike('spirit_name', candidate.name)
        .eq('status', 'pending')
        .not('layer2_raw', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (pairedLES && pairedLES.layer2_raw) {
        console.log(
          `[spirit-candidate-confirm] paired LES ${pairedLES.id} found, ` +
          `firing fan-out helpers for unified approval`
        )

        const spiritId = record.id as string
        const lr = pairedLES.layer2_raw

        // Mirror library-enrich-apply.ts orchestration. Each in own try/catch
        // so partial failure is visible per-helper.
        const regionsResult    = await applySpiritRegions   (client, spiritId, lr?.layer5_body_regions, pairedLES.id).catch((e: any) => ({ inserted: [], skipped: [], errors: [String(e?.message ?? e)] }))
        const gatewaysResult   = await applySpiritGateways  (client, spiritId, lr?.layer1_gateways,     pairedLES.id).catch((e: any) => ({ inserted: [], skipped: [], errors: [String(e?.message ?? e)] }))
        const scripturesResult = await applySpiritScriptures(client, spiritId, lr?.layer6_scripture,    pairedLES.id).catch((e: any) => ({ inserted: [], skipped: [], errors: [String(e?.message ?? e)] }))
        const hierarchyResult  = await applySpiritHierarchy (client, spiritId, lr?.layer3_network,      pairedLES.id).catch((e: any) => ({ inserted: [], skipped: [], errors: [String(e?.message ?? e)] }))
        const companionsResult = await applySpiritCompanions(client, spiritId, lr?.layer3_network,      pairedLES.id).catch((e: any) => ({ inserted: [], skipped: [], errors: [String(e?.message ?? e)] }))

        // Mark LES applied
        await client.from('library_enrichment_suggestions').update({
          status:     'applied',
          applied_at: new Date().toISOString(),
        }).eq('id', pairedLES.id)

        pairedFanOutResult = {
          les_id:     pairedLES.id,
          regions:    regionsResult,
          gateways:   gatewaysResult,
          scriptures: scripturesResult,
          hierarchy:  hierarchyResult,
          companions: companionsResult,
        }
      }
    } catch (fanOutErr: any) {
      console.error(
        '[spirit-candidate-confirm] paired LES fan-out failed (non-fatal):',
        fanOutErr?.message ?? fanOutErr
      )
      pairedFanOutResult = { error: fanOutErr?.message ?? String(fanOutErr) }
    }

    return new Response(JSON.stringify({ success: true, airtableId: record.slug, slug: record.slug, pairedFanOut: pairedFanOutResult }), { status: 200, headers: CORS })
  }

  // Push to Airtable
  const fields = cleanFields({
    [NAME_FIELD]:          candidate.name,
    'AKA':                 candidate.also_known_as,
    'Description':         candidate.function,
    'Manifestiation':      candidate.manifestations,
    'Scripture Context':   candidate.scripture_context,
    'Kingdom':             candidate.kingdom,
    'Biblical Rank':       candidate.biblical_rank,
    'Sub-Kingdom':         candidate.sub_kingdom,
    'Source / Orgin':      candidate.source_name,
  })

  const atRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${airtableToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
    signal: AbortSignal.timeout(10000),
  })

  if (!atRes.ok) {
    const errText = await atRes.text().catch(() => String(atRes.status))
    return new Response(JSON.stringify({ error: `Airtable error: ${errText}` }), { status: 502, headers: CORS })
  }

  const atData          = await atRes.json()
  const airtableRecordId = atData.id || ''

  await client.from('spirit_candidates').update({
    status:             'approved',
    airtable_record_id: airtableRecordId,
    reviewed_at:        new Date().toISOString(),
    reviewed_by:        userId,
  }).eq('id', candidateId)

  return new Response(JSON.stringify({ success: true, airtableId: airtableRecordId }), { status: 200, headers: CORS })
}

export const config = { path: '/api/spirit-candidate-confirm' }
