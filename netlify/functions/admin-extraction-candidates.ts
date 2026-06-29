import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'
import { normalizeName } from './_shared/patristicScan'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
function sb() { return createClient(sbUrl, sbKey) }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// ── Normalizer for bloodline match-existing lookup ─────────────────────────
// Repeat-strips common leading prefixes, collapses internal whitespace.
// ONLY used for match — never stored.
function normName(s: string): string {
  let n = s.toLowerCase().trim()
  let prev: string
  do {
    prev = n
    n = n.replace(/^(the |curse of |spirit of |demon of )/, '')
  } while (n !== prev)
  return n.replace(/\s+/g, ' ').trim()
}

// ── Apply bloodline tables (curses / cultural_dossiers / secret_societies) ──
// NEVER touches embedding columns. FK linkage fields left null on curses
// (resolved via the curse edit form post-approval).
// Returns { id, enriched }. Throws __CONFLICT__:<message> for 409 cases.
async function applyCandidate(
  client: ReturnType<typeof sb>,
  targetTable: string,
  payload: Record<string, any>,
  sourceName: string | null,
): Promise<{ id: string; enriched: boolean }> {

  if (targetTable === 'curses') {
    const candNorm = normName((payload.name as string) || '')

    const { data: existingRows } = await client
      .from('curses')
      .select('id, name, aka, origin_description, how_it_enters, manifestations, scripture_refs, breaking_prayer, generational_depth_note, forgiveness_focus, tagged_items, source_book, source_author, source_page')
    const matches = (existingRows ?? []).filter(
      (r: any) => candNorm !== '' && normName(r.name || '') === candNorm
    )

    if (matches.length > 1) {
      throw new Error(`__CONFLICT__:Multiple existing curses match "${payload.name}" — review and merge manually.`)
    }

    if (matches.length === 1) {
      const ex = matches[0] as any
      const existingTagged: any[] = Array.isArray(ex.tagged_items) ? ex.tagged_items : []
      const newTagged: any[] = Array.isArray(payload.tagged_items) ? payload.tagged_items : []
      const seen = new Set(existingTagged.map((i: any) => `${i.type}::${i.content}`))
      const mergedTagged = [
        ...existingTagged,
        ...newTagged.filter((i: any) => !seen.has(`${i.type}::${i.content}`)),
      ]
      const updateRow: Record<string, any> = {}
      for (const f of ['aka', 'origin_description', 'how_it_enters', 'manifestations', 'scripture_refs', 'breaking_prayer', 'generational_depth_note', 'forgiveness_focus']) {
        if (!ex[f] && payload[f]) updateRow[f] = payload[f]
      }
      const sourceBook = sourceName ?? payload.source_book ?? null
      if (!ex.source_book && sourceBook)        updateRow.source_book   = sourceBook
      if (!ex.source_author && payload.source_author) updateRow.source_author = payload.source_author
      if (!ex.source_page   && payload.source_page)   updateRow.source_page   = payload.source_page
      if (mergedTagged.length > existingTagged.length) updateRow.tagged_items = mergedTagged
      if (Object.keys(updateRow).length > 0) {
        const { error: updErr } = await client.from('curses').update(updateRow).eq('id', ex.id)
        if (updErr) throw new Error(`curses enrich update: ${updErr.message}`)
      }
      return { id: ex.id as string, enriched: true }
    }

    // Zero matches → insert new
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
    const { data: inserted, error: insertErr } = await client.from('curses').insert(row).select('id').single()
    if (insertErr) {
      if ((insertErr as any).code === '23505') {
        throw new Error(`__CONFLICT__:A curse named "${payload.name}" already exists.`)
      }
      throw new Error(`curses insert: ${insertErr.message}`)
    }
    return { id: (inserted as any).id as string, enriched: false }

  } else if (targetTable === 'cultural_dossiers') {
    const candNorm = normName((payload.culture_name as string) || '')

    const { data: existingRows } = await client
      .from('cultural_dossiers')
      .select('id, culture_name, description, historical_practices, religious_influences, folk_magic, secret_societies, pagan_practices, known_oaths, known_rituals, source_book, source_author, source_page')
    const matches = (existingRows ?? []).filter(
      (r: any) => candNorm !== '' && normName(r.culture_name || '') === candNorm
    )

    if (matches.length > 1) {
      throw new Error(`__CONFLICT__:Multiple existing cultural dossiers match "${payload.culture_name}" — review and merge manually.`)
    }

    if (matches.length === 1) {
      const ex = matches[0] as any
      const updateRow: Record<string, any> = {}
      for (const f of ['description', 'historical_practices', 'religious_influences', 'folk_magic', 'secret_societies', 'pagan_practices', 'known_oaths', 'known_rituals', 'source_book', 'source_author', 'source_page']) {
        if (!ex[f] && payload[f]) updateRow[f] = payload[f]
      }
      if (Object.keys(updateRow).length > 0) {
        const { error: updErr } = await client.from('cultural_dossiers').update(updateRow).eq('id', ex.id)
        if (updErr) throw new Error(`cultural_dossiers enrich update: ${updErr.message}`)
      }
      return { id: ex.id as string, enriched: true }
    }

    // Zero matches → insert new
    const row: Record<string, any> = {}
    for (const f of ['culture_name', 'description', 'historical_practices', 'religious_influences', 'folk_magic', 'secret_societies', 'pagan_practices', 'known_oaths', 'known_rituals', 'source_book', 'source_author', 'source_page']) {
      row[f] = payload[f] ?? null
    }
    const { data: inserted, error: insertErr } = await client.from('cultural_dossiers').insert(row).select('id').single()
    if (insertErr) {
      if ((insertErr as any).code === '23505') {
        throw new Error(`__CONFLICT__:A cultural dossier named "${payload.culture_name}" already exists.`)
      }
      throw new Error(`cultural_dossiers insert: ${insertErr.message}`)
    }
    return { id: (inserted as any).id as string, enriched: false }

  } else if (targetTable === 'secret_societies') {
    const candNorm = normName((payload.name as string) || '')

    const { data: existingRows } = await client
      .from('secret_societies')
      .select('id, name, history, known_oaths, known_symbols, known_degrees, scriptures, ministry_considerations, source_book, source_author, source_page')
    const matches = (existingRows ?? []).filter(
      (r: any) => candNorm !== '' && normName(r.name || '') === candNorm
    )

    if (matches.length > 1) {
      throw new Error(`__CONFLICT__:Multiple existing secret societies match "${payload.name}" — review and merge manually.`)
    }

    if (matches.length === 1) {
      const ex = matches[0] as any
      const updateRow: Record<string, any> = {}
      for (const f of ['history', 'known_oaths', 'known_symbols', 'known_degrees', 'scriptures', 'ministry_considerations', 'source_book', 'source_author', 'source_page']) {
        if (!ex[f] && payload[f]) updateRow[f] = payload[f]
      }
      if (Object.keys(updateRow).length > 0) {
        const { error: updErr } = await client.from('secret_societies').update(updateRow).eq('id', ex.id)
        if (updErr) throw new Error(`secret_societies enrich update: ${updErr.message}`)
      }
      return { id: ex.id as string, enriched: true }
    }

    // Zero matches → insert new
    const row: Record<string, any> = {}
    for (const f of ['name', 'history', 'known_oaths', 'known_symbols', 'known_degrees', 'scriptures', 'ministry_considerations', 'source_book', 'source_author', 'source_page']) {
      row[f] = payload[f] ?? null
    }
    const { data: inserted, error: insertErr } = await client.from('secret_societies').insert(row).select('id').single()
    if (insertErr) {
      if ((insertErr as any).code === '23505') {
        throw new Error(`__CONFLICT__:A secret society named "${payload.name}" already exists.`)
      }
      throw new Error(`secret_societies insert: ${insertErr.message}`)
    }
    return { id: (inserted as any).id as string, enriched: false }

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

// ── Spirit-name resolver ────────────────────────────────────────────────────
// Three-step match: (a) exact ilike name, (b) prefix-normalized name,
// (c) aka-token exact match. Single-match guard at every step.
type SpiritRow = { id: string; name: string; aka: string | null }

function normSpiritName(s: string): string {
  return s.toLowerCase().trim()
    .replace(/^(spirit of|demon of|the)\s+/i, '')
    .replace(/[^a-z0-9\s]/g, '').trim()
}

function resolveSpiritId(
  spirits: SpiritRow[],
  rawName: string,
): { spiritId: string } | { unresolved: true; reason: 'ambiguous' | 'not_found' } {
  const trimmed = rawName.trim()
  if (!trimmed) return { unresolved: true, reason: 'not_found' }

  // Step (a): exact case-insensitive name match
  const exactMatches = spirits.filter(s => s.name.toLowerCase() === trimmed.toLowerCase())
  const exactIds = [...new Set(exactMatches.map(s => s.id))]
  if (exactIds.length === 1) return { spiritId: exactIds[0] }
  if (exactIds.length > 1)   return { unresolved: true, reason: 'ambiguous' }

  // Step (b): prefix-normalized name match
  const normQuery = normSpiritName(trimmed)
  if (normQuery) {
    const normMatches = spirits.filter(s => normSpiritName(s.name) === normQuery)
    const normIds = [...new Set(normMatches.map(s => s.id))]
    if (normIds.length === 1) return { spiritId: normIds[0] }
    if (normIds.length > 1)   return { unresolved: true, reason: 'ambiguous' }
  }

  // Step (c): aka-token exact match (token = lowercased, prefix-stripped word)
  const queryToken = normSpiritName(trimmed)
  if (queryToken) {
    const akaMatches = spirits.filter(s => {
      if (!s.aka) return false
      const tokens = s.aka.split(/[,;|\/\n]+/).map(t => normSpiritName(t)).filter(Boolean)
      return tokens.includes(queryToken)
    })
    const akaIds = [...new Set(akaMatches.map(s => s.id))]
    if (akaIds.length === 1) return { spiritId: akaIds[0] }
    if (akaIds.length > 1)   return { unresolved: true, reason: 'ambiguous' }
  }

  return { unresolved: true, reason: 'not_found' }
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
  spiritCandidatesSuggested: number
  regionLinksCreated: number
  regionLinksUnresolved: string[]
}

async function applyConditions(
  client: ReturnType<typeof sb>,
  payload: Record<string, any>,
  _reviewedBy: string,
  sourceInfo?: { sourceName: string | null; sourceResourceId: string | null },
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
  let spiritCandidatesSuggested = 0
  let regionLinksCreated = 0
  const regionLinksUnresolved: string[] = []

  const VALID_RELS = new Set(['function_of', 'manifests_as', 'associated'])

  // Fetch all spirits once for resolver (id, name, aka)
  const { data: allSpirits } = await client.from('spirits').select('id, name, aka')
  const spiritRoster: SpiritRow[] = (allSpirits ?? []) as SpiritRow[]

  const spiritLinks: any[] = Array.isArray(payload.proposed_spirit_links) ? payload.proposed_spirit_links : []
  for (const link of spiritLinks) {
    try {
      const spiritName = (link.spirit_name as string || '').trim()
      if (!spiritName) continue

      if (!VALID_RELS.has(link.relationship)) {
        spiritLinksUnresolved.push(`${spiritName} (invalid relationship: ${link.relationship})`)
        continue
      }

      const resolved = resolveSpiritId(spiritRoster, spiritName)
      if ('unresolved' in resolved) {
        if (resolved.reason === 'ambiguous') {
          spiritLinksUnresolved.push(`${spiritName} (ambiguous — multiple spirits match)`)
        } else {
          // not_found: report as unresolved AND suggest as a spirit candidate for review
          spiritLinksUnresolved.push(spiritName)
          try {
            // normalizeName matches what spirit_candidates.name_normalized stores
            const nameNorm = normalizeName(spiritName)
            const { data: existingCand } = await client
              .from('spirit_candidates')
              .select('id')
              .eq('name_normalized', nameNorm)
              .in('status', ['pending', 'approved'])
              .maybeSingle()
            if (!existingCand) {
              const origin: Record<string, any> = {
                type:          'condition_link',
                condition_key: conditionKey,
                relationship:  link.relationship,
              }
              if (link.note)                        origin.note               = link.note
              if (sourceInfo?.sourceResourceId)     origin.source_resource_id = sourceInfo.sourceResourceId
              const { error: suggestErr } = await client.from('spirit_candidates').insert({
                name:            spiritName,
                name_normalized: nameNorm,
                confidence:      'low',
                ai_notes:        `Suggested via condition '${conditionKey}' (${link.relationship})`,
                source_type:     'condition',
                source_id:       sourceInfo?.sourceResourceId ?? null,
                source_name:     sourceInfo?.sourceName ?? null,
                status:          'pending',
                origin,
              })
              if (!suggestErr) spiritCandidatesSuggested++
              else console.warn('[applyConditions] spirit_candidate suggest failed (non-fatal):', suggestErr.message)
            }
          } catch (e: any) {
            console.warn('[applyConditions] spirit_candidate suggest error (non-fatal):', e?.message)
          }
        }
        continue
      }

      const { error: bridgeErr } = await client
        .from('spirit_conditions')
        .upsert(
          {
            spirit_id:     resolved.spiritId,
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

  return { recordId, mode, conditionKey, spiritLinksCreated, spiritLinksUnresolved, spiritCandidatesSuggested, regionLinksCreated, regionLinksUnresolved }
}

const VALID_TABLES = new Set(['curses', 'cultural_dossiers', 'secret_societies', 'conditions', 'condition_region_links'])

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const client = sb()

  // ── GET — list pending candidates ──────────────────────────────────────────
  if (req.method === 'GET') {
    const url             = new URL(req.url)
    const targetTable     = url.searchParams.get('target_table')
    const statusFilter    = url.searchParams.get('status') || 'pending'
    const mode            = url.searchParams.get('mode')
    const sourceNameParam = url.searchParams.get('source_name') // null=no filter; ''=IS NULL; else exact match

    // ── mode=counts: true database COUNTs — no row fetching, immune to max_rows ─
    if (mode === 'counts') {
      const KNOWN_TABLES = ['curses', 'conditions', 'condition_region_links', 'cultural_dossiers', 'secret_societies'] as const

      // All in parallel: HEAD count for total, one HEAD count per target_table,
      // and a PostgREST 12 GROUP BY aggregate for per-source counts.
      // HEAD requests use SELECT COUNT(*) on the DB — not subject to max_rows.
      // The aggregate returns ~10 rows (one per distinct source_name) — well under max_rows.
      const [totalRes, tableRes, groupRes] = await Promise.all([
        client.from('extraction_candidates')
          .select('*', { count: 'exact', head: true })
          .eq('status', statusFilter),
        Promise.all(KNOWN_TABLES.map(t =>
          client.from('extraction_candidates')
            .select('*', { count: 'exact', head: true })
            .eq('status', statusFilter)
            .eq('target_table', t)
        )),
        // PostgREST 12 aggregate: one row per distinct source_name with COUNT(*)
        (client.from('extraction_candidates') as any)
          .select('source_name, cnt:count()')
          .eq('status', statusFilter)
          .order('source_name', { ascending: true, nullsFirst: false }),
      ])

      if (totalRes.error) return json({ error: totalRes.error.message }, 500)
      if (groupRes.error) return json({ error: (groupRes.error as any).message }, 500)

      const total = totalRes.count ?? 0

      const by_table: Record<string, number> = {}
      for (let i = 0; i < KNOWN_TABLES.length; i++) {
        const cnt = tableRes[i].count ?? 0
        if (cnt > 0) by_table[KNOWN_TABLES[i]] = cnt
      }

      const groups = ((groupRes.data ?? []) as { source_name: string | null; cnt: unknown }[])
        .map(r => ({
          source_name: r.source_name ?? '',
          count: Number(r.cnt ?? 0),
        }))
        .sort((a, b) => {
          if (!a.source_name) return 1
          if (!b.source_name) return -1
          return a.source_name.localeCompare(b.source_name)
        })

      return json({ total, by_table, groups })
    }

    // ── Per-group / filtered fetch ────────────────────────────────────────────
    let query = client
      .from('extraction_candidates')
      .select('id, target_table, confidence, status, source_name, source_id, payload, created_at')
      .eq('status', statusFilter)
      .order('created_at', { ascending: false })
      .limit(500) // explicit per-group cap; a single source book will not exceed this

    if (targetTable) query = (query as any).eq('target_table', targetTable)
    if (sourceNameParam !== null) {
      if (sourceNameParam === '') {
        query = (query as any).is('source_name', null)
      } else {
        query = (query as any).eq('source_name', sourceNameParam)
      }
    }

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

    // Part B: compute parent_condition_exists for each condition_region_links candidate.
    // One bulk query for all distinct condition_keys — avoids per-card round trips in the UI.
    const existingCondKeys = new Set<string>()
    if (hasRegionLinks) {
      const rlKeys = [...new Set(
        hydrated
          .filter(c => c.target_table === 'condition_region_links')
          .map(c => ((c.payload as any)?.condition_key as string) || '')
          .filter(Boolean)
      )]
      if (rlKeys.length > 0) {
        const { data: existingConds } = await client
          .from('conditions')
          .select('condition_key')
          .in('condition_key', rlKeys)
        for (const row of (existingConds ?? []) as any[]) existingCondKeys.add(row.condition_key as string)
      }
    }

    const hydratedFinal = hydrated.map(c => {
      if (c.target_table === 'condition_region_links') {
        const ck = ((c.payload as any)?.condition_key as string) || ''
        return { ...c, parent_condition_exists: ck ? existingCondKeys.has(ck) : false }
      }
      return c
    })

    return json({ candidates: hydratedFinal, ...(hasRegionLinks ? { anatomy_regions: anatomyRegions } : {}) })
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
        .select('id, target_table, payload, source_name, source_id, status')
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

        // Guard: parent condition must exist before binding — condition_regions.condition_key
        // is a FK to conditions.condition_key (ON DELETE CASCADE). Without this check a bind
        // for an un-approved condition throws a raw FK violation to the caller.
        const { data: parentCondition } = await client
          .from('conditions')
          .select('condition_key')
          .eq('condition_key', conditionKey)
          .maybeSingle()

        if (!parentCondition) {
          return json({
            error:         'parent_condition_not_approved',
            message:       `Approve the condition "${conditionKey}" before placing it on the body map.`,
            condition_key: conditionKey,
          }, 409)
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
          result = await applyConditions(client, effectivePayload, auth.userId, {
            sourceName:       (candidate as any).source_name as string | null,
            sourceResourceId: (candidate as any).source_id   as string | null,
          })
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
          applied:                      true,
          mode:                         result.mode,
          condition_key:                result.conditionKey,
          spirit_links_created:         result.spiritLinksCreated,
          spirit_links_unresolved:      result.spiritLinksUnresolved,
          spirit_candidates_suggested:  result.spiritCandidatesSuggested,
          region_links_created:         result.regionLinksCreated,
          region_links_unresolved:      result.regionLinksUnresolved,
        })
      }

      // ── Bloodline tables (curses / cultural_dossiers / secret_societies) ───
      let applyResult: { id: string; enriched: boolean }
      try {
        applyResult = await applyCandidate(
          client, targetTable,
          (candidate as any).payload as Record<string, any>,
          (candidate as any).source_name as string | null,
        )
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
          applied_record_id: applyResult.id,
          reviewed_at:       new Date().toISOString(),
          reviewed_by:       auth.userId,
        })
        .eq('id', id)

      if (stampErr) return json({ error: stampErr.message }, 500)
      return json({ ok: true, applied_record_id: applyResult.id, enriched: applyResult.enriched })
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
