import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
function sb() { return createClient(sbUrl, sbKey) }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// ── Apply bloodline tables (curses / cultural_dossiers / secret_societies) ──
// NEVER touches embedding columns. FK linkage fields left null on curses
// (resolved via the curse edit form post-approval).
async function applyCandidate(
  client: ReturnType<typeof sb>,
  targetTable: string,
  payload: Record<string, any>,
  sourceName: string | null,
): Promise<string> {

  if (targetTable === 'curses') {
    const row: Record<string, any> = {}
    if (payload.name)                    row.name                    = payload.name
    if (payload.aka)                     row.aka                     = payload.aka || null
    if (payload.origin_description)      row.origin_description      = payload.origin_description || null
    if (payload.how_it_enters)           row.how_it_enters           = payload.how_it_enters || null
    if (payload.manifestations)          row.manifestations          = payload.manifestations || null
    if (payload.scripture_refs)          row.scripture_refs          = payload.scripture_refs || null
    if (payload.breaking_prayer)         row.breaking_prayer         = payload.breaking_prayer || null
    if (payload.generational_depth_note) row.generational_depth_note = payload.generational_depth_note || null
    if (payload.forgiveness_focus)       row.forgiveness_focus       = payload.forgiveness_focus || null
    if (Array.isArray(payload.tagged_items)) row.tagged_items        = payload.tagged_items
    row.source_book   = sourceName ?? payload.source_book ?? null
    row.source_author = payload.source_author ?? null
    row.source_page   = payload.source_page   ?? null
    const { data, error } = await client.from('curses').insert(row).select('id').single()
    if (error) throw new Error(`curses insert: ${error.message}`)
    return (data as any).id as string

  } else if (targetTable === 'cultural_dossiers') {
    const row: Record<string, any> = {}
    const FIELDS = [
      'culture_name', 'description', 'historical_practices', 'religious_influences',
      'folk_magic', 'secret_societies', 'pagan_practices', 'known_oaths', 'known_rituals',
      'source_book', 'source_author', 'source_page',
    ]
    for (const f of FIELDS) row[f] = payload[f] ?? null
    const { data, error } = await client.from('cultural_dossiers').insert(row).select('id').single()
    if (error) throw new Error(`cultural_dossiers insert: ${error.message}`)
    return (data as any).id as string

  } else if (targetTable === 'secret_societies') {
    const row: Record<string, any> = {}
    const FIELDS = [
      'name', 'history', 'known_oaths', 'known_symbols', 'known_degrees',
      'scriptures', 'ministry_considerations', 'source_book', 'source_author', 'source_page',
    ]
    for (const f of FIELDS) row[f] = payload[f] ?? null
    const { data, error } = await client.from('secret_societies').insert(row).select('id').single()
    if (error) throw new Error(`secret_societies insert: ${error.message}`)
    return (data as any).id as string

  } else {
    throw new Error(`unsupported target_table: ${targetTable}`)
  }
}

// ── Normalize spiritual_tags ────────────────────────────────────────────────
// lowercase, underscores→hyphens, trim, dedupe.
function normalizeTags(tags: string[]): string[] {
  return [...new Set(
    tags.map(t => t.toLowerCase().replace(/_/g, '-').trim()).filter(Boolean)
  )]
}

// ── Apply conditions candidate ──────────────────────────────────────────────
// Handles both new conditions and enrichment of existing rows.
// Throws errors prefixed __CONFLICT__ for 409 cases.
// Never touches embedding columns.
interface ConditionsApplyResult {
  recordId: string
  mode: 'enrichment' | 'new'
  conditionKey: string
  spiritLinksCreated: number
  spiritLinksUnresolved: string[]
  regionLinksCreated: number
  regionLinksUnresolved: string[]
}

async function applyConditions(
  client: ReturnType<typeof sb>,
  payload: Record<string, any>,
  _reviewedBy: string,
): Promise<ConditionsApplyResult> {
  const conditionKey = (payload.condition_key as string || '').trim()
  if (!conditionKey) throw new Error('condition_key is required')

  const rawTags: string[] = Array.isArray(payload.spiritual_tags) ? payload.spiritual_tags : []
  const normalizedTags = normalizeTags(rawTags)

  let recordId: string
  let mode: 'enrichment' | 'new'

  if (payload.is_enrichment === true) {
    // ── Enrichment path ─────────────────────────────────────────────────────
    const { data: existing, error: lookupErr } = await client
      .from('conditions')
      .select('id, tagged_items')
      .eq('condition_key', conditionKey)
      .maybeSingle()

    if (lookupErr) throw new Error(`conditions lookup: ${lookupErr.message}`)
    if (!existing) {
      throw new Error(`__CONFLICT__:enrichment target '${conditionKey}' not found — condition may have been deleted or condition_key changed`)
    }

    // Merge tagged_items: existing + new, dedupe by type+content
    const existingTagged: any[] = Array.isArray((existing as any).tagged_items) ? (existing as any).tagged_items : []
    const newTagged: any[] = Array.isArray(payload.tagged_items) ? payload.tagged_items : []
    const seen = new Set(existingTagged.map((i: any) => `${i.type}::${i.content}`))
    const mergedTagged = [
      ...existingTagged,
      ...newTagged.filter((i: any) => !seen.has(`${i.type}::${i.content}`)),
    ]

    const updateRow: Record<string, any> = { active: true }
    if (payload.symptoms !== undefined)          updateRow.symptoms          = payload.symptoms || null
    if (payload.author_conclusion !== undefined) updateRow.author_conclusion = payload.author_conclusion || null
    if (normalizedTags.length > 0)               updateRow.spiritual_tags    = normalizedTags
    if (payload.source_strength !== undefined)   updateRow.source_strength   = payload.source_strength
    if (payload.source_note !== undefined)        updateRow.source_note       = payload.source_note || null
    if (payload.enriched_overview)               updateRow.enriched_overview = payload.enriched_overview
    if (mergedTagged.length > 0)                 updateRow.tagged_items      = mergedTagged
    // NEVER overwrite system or system_key on enrichment — existing taxonomy is authoritative

    const { error: updateErr } = await client
      .from('conditions')
      .update(updateRow)
      .eq('condition_key', conditionKey)

    if (updateErr) throw new Error(`conditions update: ${updateErr.message}`)
    recordId = (existing as any).id as string
    mode = 'enrichment'

  } else {
    // ── New condition path ───────────────────────────────────────────────────
    const { data: collision } = await client
      .from('conditions')
      .select('id')
      .eq('condition_key', conditionKey)
      .maybeSingle()

    if (collision) {
      throw new Error(`__CONFLICT__:condition_key '${conditionKey}' already exists — the model flagged this as new but the key collides. Review and approve as enrichment, or use a distinct key.`)
    }

    const insertRow: Record<string, any> = {
      condition_key:  conditionKey,
      display_name:   (payload.display_name as string || conditionKey),
      active:         true,
      spiritual_tags: normalizedTags,
    }
    if (payload.system)            insertRow.system            = payload.system
    if (payload.system_key)        insertRow.system_key        = payload.system_key
    if (payload.symptoms)          insertRow.symptoms          = payload.symptoms
    if (payload.author_conclusion) insertRow.author_conclusion = payload.author_conclusion
    if (payload.source_strength)   insertRow.source_strength   = payload.source_strength
    if (payload.source_note)       insertRow.source_note       = payload.source_note
    if (Array.isArray(payload.tagged_items)) insertRow.tagged_items = payload.tagged_items

    const { data: inserted, error: insertErr } = await client
      .from('conditions')
      .insert(insertRow)
      .select('id')
      .single()

    if (insertErr) throw new Error(`conditions insert: ${insertErr.message}`)
    recordId = (inserted as any).id as string
    mode = 'new'
  }

  // ── Bridge links (best-effort; each wrapped; never blocks main write) ─────
  let spiritLinksCreated = 0
  const spiritLinksUnresolved: string[] = []
  let regionLinksCreated = 0
  const regionLinksUnresolved: string[] = []

  const VALID_RELS = new Set(['function_of', 'manifests_as', 'associated'])

  const spiritLinks: any[] = Array.isArray(payload.proposed_spirit_links) ? payload.proposed_spirit_links : []
  for (const link of spiritLinks) {
    try {
      const spiritName = (link.spirit_name as string || '').trim()
      if (!spiritName) continue

      if (!VALID_RELS.has(link.relationship)) {
        spiritLinksUnresolved.push(`${spiritName} (invalid relationship: ${link.relationship})`)
        continue
      }

      // Exact case-insensitive name match (mirrors spiritWrite.ts pattern)
      const { data: spirit } = await client
        .from('spirits')
        .select('id')
        .ilike('name', spiritName)
        .maybeSingle()

      if (!spirit) {
        spiritLinksUnresolved.push(spiritName)
        continue
      }

      const { error: bridgeErr } = await client
        .from('spirit_conditions')
        .upsert(
          {
            spirit_id:     (spirit as any).id,
            condition_key: conditionKey,
            relationship:  link.relationship,
            notes:         link.note || null,
          },
          { onConflict: 'spirit_id,condition_key', ignoreDuplicates: true },
        )

      if (bridgeErr) spiritLinksUnresolved.push(`${spiritName} (insert error: ${bridgeErr.message})`)
      else spiritLinksCreated++
    } catch {
      spiritLinksUnresolved.push(`${link.spirit_name ?? '?'} (error)`)
    }
  }

  const regionLinks: any[] = Array.isArray(payload.proposed_region_links) ? payload.proposed_region_links : []
  for (const link of regionLinks) {
    try {
      const regionLabel = (link.region_label as string || '').trim()
      if (!regionLabel) continue

      // Try normalized slug as region_key first, then display_name ilike
      const slugged = regionLabel.toLowerCase().replace(/\s+/g, '_')
      const { data: byKey } = await client
        .from('anatomy_regions')
        .select('region_key')
        .eq('region_key', slugged)
        .maybeSingle()

      const { data: byDisplay } = !byKey
        ? await client.from('anatomy_regions').select('region_key').ilike('display_name', regionLabel).maybeSingle()
        : { data: null }

      const regionKey = ((byKey ?? byDisplay) as any)?.region_key as string | undefined
      if (!regionKey) {
        regionLinksUnresolved.push(regionLabel)
        continue
      }

      const strengthMap: Record<string, number> = { high: 3, medium: 2, low: 1 }
      const relevanceStrength = strengthMap[link.relevance as string] ?? 2

      const { error: rErr } = await client
        .from('condition_regions')
        .upsert(
          { condition_key: conditionKey, region_key: regionKey, relevance_strength: relevanceStrength },
          { onConflict: 'condition_key,region_key', ignoreDuplicates: true },
        )

      if (rErr) regionLinksUnresolved.push(`${regionLabel} (insert error: ${rErr.message})`)
      else regionLinksCreated++
    } catch {
      regionLinksUnresolved.push(`${link.region_label ?? '?'} (error)`)
    }
  }

  return { recordId, mode, conditionKey, spiritLinksCreated, spiritLinksUnresolved, regionLinksCreated, regionLinksUnresolved }
}

const VALID_TABLES = new Set(['curses', 'cultural_dossiers', 'secret_societies', 'conditions', 'condition_region_links'])

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const client = sb()

  // ── GET — list pending candidates ──────────────────────────────────────────
  if (req.method === 'GET') {
    const url          = new URL(req.url)
    const targetTable  = url.searchParams.get('target_table')
    const statusFilter = url.searchParams.get('status') || 'pending'

    let query = client
      .from('extraction_candidates')
      .select('id, target_table, confidence, status, source_name, source_id, payload, created_at')
      .eq('status', statusFilter)
      .order('created_at', { ascending: false })

    if (targetTable) query = (query as any).eq('target_table', targetTable)

    const { data, error } = await query
    if (error) return json({ error: error.message }, 500)

    const candidates = (data ?? []) as any[]

    // Hydrate conditions enrichment candidates with existing row for current-vs-proposed UI
    const enrichmentKeys = candidates
      .filter(c => c.target_table === 'conditions' && (c.payload as any)?.is_enrichment === true)
      .map(c => ((c.payload as any)?.condition_key as string) || '')
      .filter(Boolean)

    const existingMap: Record<string, any> = {}
    if (enrichmentKeys.length > 0) {
      const { data: existing } = await client
        .from('conditions')
        .select('id, condition_key, display_name, system, system_key, symptoms, author_conclusion, spiritual_tags, source_strength, source_note, enriched_overview')
        .in('condition_key', enrichmentKeys)
      if (existing) {
        for (const row of existing as any[]) {
          existingMap[row.condition_key] = row
        }
      }
    }

    const hydrated = candidates.map(c => {
      if (c.target_table === 'conditions' && (c.payload as any)?.is_enrichment === true) {
        const key = (c.payload as any)?.condition_key as string
        return { ...c, existing_record: existingMap[key] ?? null }
      }
      return { ...c, existing_record: null }
    })

    // A1: Fetch anatomy_regions once when condition_region_links candidates are present
    const hasRegionLinks = candidates.some(c => c.target_table === 'condition_region_links')
    let anatomyRegions: any[] = []
    if (hasRegionLinks) {
      const { data: arData } = await client
        .from('anatomy_regions')
        .select('region_key, display_name, category, body_side, view')
        .order('sort_order', { ascending: true })
      anatomyRegions = (arData ?? []) as any[]
    }

    return json({ candidates: hydrated, ...(hasRegionLinks ? { anatomy_regions: anatomyRegions } : {}) })
  }

  // ── POST — approve or reject ────────────────────────────────────────────────
  if (req.method === 'POST') {
    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return json({ error: 'invalid_json' }, 400)
    }

    const action = typeof body.action === 'string' ? body.action : ''
    const id     = typeof body.id     === 'string' ? body.id.trim() : ''
    if (!id) return json({ error: 'id required' }, 400)

    // A2: edited_payload — reviewer's cleaned-up version (conditions only; others ignore it)
    const editedPayload = (
      body.edited_payload &&
      typeof body.edited_payload === 'object' &&
      !Array.isArray(body.edited_payload)
    ) ? body.edited_payload as Record<string, any> : null

    // ── APPROVE ───────────────────────────────────────────────────────────────
    if (action === 'approve') {
      const { data: candidate, error: loadErr } = await client
        .from('extraction_candidates')
        .select('id, target_table, payload, source_name, status')
        .eq('id', id)
        .single()

      if (loadErr || !candidate) return json({ error: 'candidate not found' }, 404)

      const targetTable = (candidate as any).target_table as string
      if (!VALID_TABLES.has(targetTable)) {
        return json({ error: `unsupported target_table: ${targetTable}` }, 400)
      }

      // condition_region_links allows rebind from needs_region (held) bin
      const currentStatus = (candidate as any).status as string
      const allowedStatuses = targetTable === 'condition_region_links'
        ? new Set(['pending', 'needs_region'])
        : new Set(['pending'])
      if (!allowedStatuses.has(currentStatus)) return json({ error: 'not_pending' }, 409)

      // ── condition_region_links branch ─────────────────────────────────────
      if (targetTable === 'condition_region_links') {
        const regionKey = typeof body.region_key === 'string' ? body.region_key.trim() : ''
        if (!regionKey) return json({ error: 'region_key required' }, 400)

        // Validate region_key exists in anatomy_regions
        const { data: regionExists } = await client
          .from('anatomy_regions')
          .select('region_key')
          .eq('region_key', regionKey)
          .maybeSingle()
        if (!regionExists) return json({ error: 'region_key not in anatomy_regions' }, 400)

        const crlPayload = (candidate as any).payload as Record<string, any>
        const conditionKey = (crlPayload.condition_key as string || '').trim()
        if (!conditionKey) return json({ error: 'payload.condition_key missing' }, 400)

        // Derive relevance_strength from explicit body value or placement_confidence
        let relevanceStrength: number
        if (typeof body.relevance_strength === 'number') {
          relevanceStrength = Math.min(5, Math.max(1, Math.round(body.relevance_strength as number)))
        } else {
          const strengthMap: Record<string, number> = { high: 3, medium: 2, low: 1 }
          relevanceStrength = strengthMap[crlPayload.placement_confidence as string] ?? 2
        }

        // Check if already linked (to report already_existed; then insert only if not)
        const { data: existingRow } = await client
          .from('condition_regions')
          .select('condition_key')
          .eq('condition_key', conditionKey)
          .eq('region_key', regionKey)
          .maybeSingle()
        const alreadyExisted = !!existingRow

        if (!alreadyExisted) {
          const { error: insertErr } = await client
            .from('condition_regions')
            .insert({ condition_key: conditionKey, region_key: regionKey, relevance_strength: relevanceStrength })
          if (insertErr) return json({ error: `condition_regions insert: ${insertErr.message}` }, 500)
        }

        // Stamp candidate — applied_record_id left NULL (condition_regions has no surrogate id)
        const { error: crlStampErr } = await client
          .from('extraction_candidates')
          .update({
            status:      'approved',
            reviewed_at: new Date().toISOString(),
            reviewed_by: auth.userId,
            ai_notes:    `bound to ${regionKey}`,
          })
          .eq('id', id)

        if (crlStampErr) return json({ error: crlStampErr.message }, 500)

        return json({
          applied:            true,
          mode:               'bound',
          condition_key:      conditionKey,
          region_key:         regionKey,
          relevance_strength: relevanceStrength,
          already_existed:    alreadyExisted,
        })
      }

      // ── Conditions branch ──────────────────────────────────────────────────
      if (targetTable === 'conditions') {
        // Use edited_payload (reviewer's version) if present; fall back to stored payload
        const effectivePayload = editedPayload ?? ((candidate as any).payload as Record<string, any>)
        if (!effectivePayload || typeof effectivePayload !== 'object' || Array.isArray(effectivePayload)) {
          return json({ error: 'invalid payload' }, 400)
        }

        let result: ConditionsApplyResult
        try {
          result = await applyConditions(client, effectivePayload, auth.userId)
        } catch (err: any) {
          const msg = String(err.message ?? err)
          if (msg.startsWith('__CONFLICT__:')) {
            return json({ error: msg.slice('__CONFLICT__:'.length) }, 409)
          }
          return json({ error: msg }, 500)
        }

        const { error: stampErr } = await client
          .from('extraction_candidates')
          .update({
            status:            'approved',
            applied_record_id: result.recordId,
            reviewed_at:       new Date().toISOString(),
            reviewed_by:       auth.userId,
          })
          .eq('id', id)

        if (stampErr) return json({ error: stampErr.message }, 500)

        return json({
          applied:                 true,
          mode:                    result.mode,
          condition_key:           result.conditionKey,
          spirit_links_created:    result.spiritLinksCreated,
          spirit_links_unresolved: result.spiritLinksUnresolved,
          region_links_created:    result.regionLinksCreated,
          region_links_unresolved: result.regionLinksUnresolved,
        })
      }

      // ── Bloodline tables (curses / cultural_dossiers / secret_societies) ───
      let appliedRecordId: string
      try {
        appliedRecordId = await applyCandidate(
          client, targetTable,
          (candidate as any).payload as Record<string, any>,
          (candidate as any).source_name as string | null,
        )
      } catch (err: any) {
        return json({ error: err.message }, 500)
      }

      const { error: stampErr } = await client
        .from('extraction_candidates')
        .update({
          status:            'approved',
          applied_record_id: appliedRecordId,
          reviewed_at:       new Date().toISOString(),
          reviewed_by:       auth.userId,
        })
        .eq('id', id)

      if (stampErr) return json({ error: stampErr.message }, 500)
      return json({ ok: true, applied_record_id: appliedRecordId })
    }

    // ── NEEDS_REGION ──────────────────────────────────────────────────────────
    if (action === 'needs_region') {
      const { data: nrCandidate, error: nrErr } = await client
        .from('extraction_candidates')
        .select('id, status')
        .eq('id', id)
        .single()

      if (nrErr || !nrCandidate) return json({ error: 'candidate not found' }, 404)

      const suggestedLabel = typeof body.suggested_region_label === 'string'
        ? body.suggested_region_label.trim() : ''

      const { error: holdErr } = await client
        .from('extraction_candidates')
        .update({
          status:      'needs_region',
          reviewed_at: new Date().toISOString(),
          reviewed_by: auth.userId,
          ai_notes:    suggestedLabel ? `flagged needs new region: ${suggestedLabel}` : 'flagged needs new region',
        })
        .eq('id', id)

      if (holdErr) return json({ error: holdErr.message }, 500)
      return json({ held: true })
    }

    // ── REJECT ────────────────────────────────────────────────────────────────
    if (action === 'reject') {
      const rejectionReason = typeof body.rejection_reason === 'string'
        ? body.rejection_reason.trim() : ''

      const { error: rejectErr } = await client
        .from('extraction_candidates')
        .update({
          status:           'rejected',
          rejection_reason: rejectionReason || null,
          reviewed_at:      new Date().toISOString(),
          reviewed_by:      auth.userId,
        })
        .eq('id', id)

      if (rejectErr) return json({ error: rejectErr.message }, 500)
      return json({ ok: true })
    }

    return json({ error: 'unknown action' }, 400)
  }

  return json({ error: 'method_not_allowed' }, 405)
}

export const config = { path: '/api/admin-extraction-candidates' }
