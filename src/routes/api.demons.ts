import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../netlify/functions/_shared/access'

// Flag-guarded source swap. true => read demons from Supabase `spirits`; false =>
// legacy Airtable path (kept intact below for instant revert with zero redeploy).
// The downstream tier-strip is data-source-independent, so the client JSON is
// shape-identical either way.
const USE_SUPABASE_DEMONS = true

// Cumulative tier ladder. Each tier's response includes its own fields PLUS
// every lower tier's — keyed off the VERIFIED Clerk level (authRes.level),
// never the token payload or client. A lower tier's network response physically
// does NOT contain higher-tier field values; this is the real paid-content
// boundary, not CSS. Field-character routing: identity/orientation→Watchman,
// operational-basics→Soldier, warfare-mechanics→Commander, deep/sensitive→General.
const TIER_FIELDS: Record<number, string[]> = {
  0: [
    'id', 'uuid', 'slug', 'airtableId', 'createdTime', 'name', 'aka', 'typeRank', 'description',
    'function', 'strongman', 'kingdom', 'subKingdom', 'biblicalRank', 'caseType',
    'phonetic', 'images', 'isGenerational', 'isTerritorial', 'hierarchyCategory',
    'region', 'parentStrongman', 'relatedSpirits', 'clusterSpirits',
    'culturalPresence',
  ],
  1: ['manifestation', 'scripture', 'companionSpirits'],
  2: [
    'entryPoints', 'legalRights', 'deliveranceSequence', 'assignment',
    'counterScriptures', 'sessionIndicators', 'resistanceSignature',
    'transmissionVectors', 'legalRightsFramework', 'prayerPoints',
    'sessionTriggerQuestions', 'scriptureContext',
    'primaryBattlefield', 'personalityPresentation',
  ],
  3: [
    'symptoms', 'wriNotes', 'sourceOrigin', 'demonicAgreements',
    'operationalNotes', 'aftercareNotes', 'etymologyNotes', 'archaeologyNotes',
    'institutionalExpression',
  ],
}

// Display names + required tier for the lockedSections hint. Only NAMES/tiers of
// gated sections are ever sent to an under-tier caller — never their values — so
// the dossier can render "🔒 {tier} tier — Upgrade to unlock" placeholders.
const SECTION_LABELS: Record<string, { label: string; tier: string }> = {
  manifestation:           { label: 'Manifestation', tier: 'soldier' },
  scripture:               { label: 'Scripture Reference', tier: 'soldier' },
  companionSpirits:        { label: 'Companion Spirits', tier: 'soldier' },
  entryPoints:             { label: 'Entry Points', tier: 'commander' },
  legalRights:             { label: 'Legal Rights', tier: 'commander' },
  deliveranceSequence:     { label: 'Deliverance Sequence', tier: 'commander' },
  assignment:              { label: 'Assignment', tier: 'commander' },
  counterScriptures:       { label: 'Counter Scriptures', tier: 'commander' },
  sessionIndicators:       { label: 'Session Indicators', tier: 'commander' },
  resistanceSignature:     { label: 'Resistance Signature', tier: 'commander' },
  transmissionVectors:     { label: 'Transmission Vectors', tier: 'commander' },
  legalRightsFramework:    { label: 'Legal Rights Framework', tier: 'commander' },
  prayerPoints:            { label: 'Prayer Points', tier: 'commander' },
  sessionTriggerQuestions: { label: 'Session Trigger Questions', tier: 'commander' },
  scriptureContext:        { label: 'Scripture Context', tier: 'commander' },
  primaryBattlefield:      { label: 'Primary Battlefield', tier: 'commander' },
  personalityPresentation: { label: 'Typical Personality Presentation', tier: 'commander' },
  symptoms:                { label: 'Symptoms', tier: 'general' },
  wriNotes:                { label: 'WRI Exorcist Notes', tier: 'general' },
  sourceOrigin:            { label: 'Source / Origin', tier: 'general' },
  demonicAgreements:       { label: 'Demonic Agreements', tier: 'general' },
  operationalNotes:        { label: 'Operational Notes', tier: 'general' },
  aftercareNotes:          { label: 'Aftercare Notes', tier: 'general' },
  etymologyNotes:          { label: 'Etymology Notes', tier: 'general' },
  archaeologyNotes:        { label: 'Archaeology Notes', tier: 'general' },
  institutionalExpression: { label: 'Institutional Expression', tier: 'general' },
}

const { token: airtableToken } = JSON.parse(process.env.AIRTABLE || '{}')
const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const NAME_FIELD = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'

// Map one `spirits` row -> the SAME camelCase shape the Airtable path builds.
// String fields use `|| ''` so every key is always present (mirrors the Airtable
// path's present/absent behavior exactly, so the strip's `if (k in d)` is a
// no-op equivalence). id is reassigned to a 1..N sequence by the caller.
function mapSpiritRow(row: any, i: number) {
  return {
    id: i + 1,
    uuid: row.id || '',
    slug: row.slug || '',
    airtableId: row.legacy_airtable_id || '',
    createdTime: row.created_at || '',
    name: row.name || '',
    aka: row.aka || '',
    typeRank: row.type_rank || '',
    kingdom: row.kingdom || '',
    description: row.description || '',
    assignment: row.assignment || '',
    // Soldier tier
    function: row.description || '',
    manifestation: row.manifestation || '',
    scripture: row.scripture || '',
    strongman: row.strongman || '',
    // Commander tier
    entryPoints: row.entry_points || '',
    legalRights: row.legal_rights || '',
    // General tier
    symptoms: row.symptoms || '',
    companionSpirits: row.companion_spirits || '',
    wriNotes: row.wri_notes || '',
    sourceOrigin: row.source_origin || '',
    // Operational intel
    hierarchyCategory: row.hierarchy_category || '',
    parentStrongman: row.parent_strongman || '',
    deliveranceSequence: row.deliverance_sequence || '',
    operationalNotes: row.operational_notes || '',
    primaryBattlefield: row.primary_battlefield || '',
    personalityPresentation: row.personality_presentation || '',
    counterScriptures: row.counter_scriptures || '',
    // region: no Supabase column (legacy Airtable Region field was empty/never
    // loaded). Sourced-empty to match the Airtable path (which produced '');
    // pending a future spirit_regions join.
    region: '',
    phonetic: row.phonetic || '',
    images: Array.isArray(row.images) ? row.images : [],
    relatedSpirits: row.related_spirits || '',
    biblicalRank: row.biblical_rank || '',
    caseType: row.case_type || '',
    isGenerational: row.is_generational === true,
    isTerritorial: row.is_territorial === true,
    subKingdom: row.sub_kingdom || '',
    clusterSpirits: row.cluster_spirits || '',
    legalRightsFramework: row.legal_rights_framework || '',
    institutionalExpression: row.institutional_expression || '',
    sessionIndicators: row.session_indicators || '',
    resistanceSignature: row.resistance_signature || '',
    demonicAgreements: row.demonic_agreements || '',
    transmissionVectors: row.transmission_vectors || '',
    etymologyNotes: row.etymology_notes || '',
    archaeologyNotes: row.archaeology_notes || '',
    scriptureContext: row.scripture_context || '',
    prayerPoints: row.prayer_points || '',
    aftercareNotes: row.aftercare_notes || '',
    culturalPresence: Array.isArray(row.cultural_presence) ? row.cultural_presence : [],
    sessionTriggerQuestions: row.session_trigger_questions || '',
  }
}

export const Route = createFileRoute('/api/demons')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authRes = await requireAuth(request)
        if (authRes instanceof Response) return authRes
        try {
          let demons: any[]

          if (USE_SUPABASE_DEMONS) {
            // ── Supabase read path ─────────────────────────────────────────────
            // name-ascending for a deterministic list; id is reassigned to a
            // stable 1..N sequence after fetch (matches the Airtable path's
            // index-based id semantics; exact numbering is source-dependent).
            const supabase = createClient(supabaseUrl, supabaseServiceKey)
            const { data, error } = await supabase
              .from('spirits')
              .select('*')
              .order('name', { ascending: true })

            if (error) {
              console.error('[api.demons] Supabase error:', error.message)
              // Return empty array so the page loads rather than breaking
              return Response.json({ demons: [], total: 0, supabaseError: error.message })
            }

            demons = (data || [])
              .map((row: any, i: number) => mapSpiritRow(row, i))
              // Defensive: skip any stray header-style row
              .filter((d: any) => d.name && d.name !== 'Primary Name')
          } else {
            // ── Legacy Airtable read path (flag-off; kept for instant revert) ──
            const token = airtableToken
            const BASE_ID = 'appVXEj2DLPBTJTtD'
            const TABLE_ID = 'tblcP4lgVykzOhLi4'

            console.log('[api.demons] AIRTABLE_TOKEN present:', !!token)

            if (!token) {
              console.error('[api.demons] AIRTABLE_TOKEN env var is not set')
              // Return empty array so the page loads rather than breaking
              return Response.json({ demons: [], total: 0, error: 'AIRTABLE_TOKEN not configured' })
            }

            const records: any[] = []
            let offset: string | undefined = undefined

            do {
              const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`)
              url.searchParams.set('pageSize', '100')
              url.searchParams.set('view', 'viw1ickrF5zgNGifc')
              if (offset) url.searchParams.set('offset', offset)

              const res = await fetch(url.toString(), {
                headers: { Authorization: `Bearer ${token}` },
              })

              if (!res.ok) {
                const detail = await res.text()
                console.error(`[api.demons] Airtable ${res.status}:`, detail)
                // Return empty array rather than crashing the page
                return Response.json({ demons: [], total: 0, airtableError: `Airtable ${res.status}` })
              }

              const data = await res.json()
              records.push(...data.records)
              offset = data.offset
            } while (offset)

            demons = records
              .map((r: any, i: number) => ({
                id: i + 1,
                slug: '',
                airtableId: r.id,
                createdTime: r.createdTime || '',
                name: r.fields[NAME_FIELD] || '',
                aka: r.fields['Also Known As'] || '',
                typeRank: r.fields['Type / Rank'] || '',
                kingdom: r.fields['Kingdom'] || '',
                description: r.fields['Description'] || '',
                assignment: r.fields['Assignment'] || '',
                // Soldier tier
                function: r.fields['Description'] || '',
                manifestation: r.fields['Manifestiation'] || '',
                scripture: r.fields['Scripture Reference'] || '',
                strongman: r.fields['Strongman'] || '',
                // Commander tier
                entryPoints: r.fields['Entry Points'] || '',
                legalRights: r.fields['Legal Rights'] || '',
                // General tier
                symptoms: r.fields['Symptoms'] || '',
                companionSpirits: r.fields['Companion Spirits'] || '',
                wriNotes: r.fields['WRI Exorcist Notes'] || '',
                sourceOrigin: r.fields['Source / Orgin'] || '',
                // Operational intel (new fields)
                hierarchyCategory: r.fields['Hierarchy Category'] || '',
                parentStrongman: r.fields['Parent Strongman'] || '',
                deliveranceSequence: r.fields['Deliverance Sequence'] || '',
                operationalNotes: r.fields['Operational Notes'] || '',
                primaryBattlefield: r.fields['Primary Battlefield'] || '',
                personalityPresentation: r.fields['Typical Personality Presentation'] || '',
                counterScriptures: r.fields['Counter Scriptures'] || '',
                region: r.fields['Region'] || '', // TODO: Create 'Region' field in Airtable
                // AI-enhanced fields — mapped from new Airtable columns
                phonetic: r.fields['Phonetic'] || '',
                images: r.fields['Images']
                  ? String(r.fields['Images']).split(',').map((s: string) => s.trim()).filter(Boolean)
                  : [],
                relatedSpirits: r.fields['Related Spirits'] || '',
                biblicalRank: r.fields['Biblical Rank'] || '',
                caseType: r.fields['Case Type'] || '',
                isGenerational: r.fields['Is Generational'] === true || r.fields['Is Generational'] === 'true',
                isTerritorial: r.fields['Is Territorial'] === true || r.fields['Is Territorial'] === 'true',
                subKingdom: r.fields['Sub-Kingdom'] || '',
                clusterSpirits: r.fields['Cluster Spirits'] || '',
                legalRightsFramework: r.fields['Legal Rights Framework'] || '',
                institutionalExpression: r.fields['Institutional Expression'] || '',
                sessionIndicators: r.fields['Session Indicators'] || '',
                resistanceSignature: r.fields['Resistance Signature'] || '',
                demonicAgreements: r.fields['Demonic Agreements'] || '',
                transmissionVectors: r.fields['Transmission Vectors'] || '',
                etymologyNotes: r.fields['Etymology Notes'] || '',
                archaeologyNotes: r.fields['Archaeology Notes'] || '',
                scriptureContext: r.fields['Scripture Context'] || '',
                prayerPoints: r.fields['Prayer Points'] || '',
                aftercareNotes: r.fields['Aftercare Notes'] || '',
                culturalPresence: Array.isArray(r.fields['Cultural Presence']) ? r.fields['Cultural Presence'] : [],
                sessionTriggerQuestions: r.fields['Session Trigger Questions'] || '',
              }))
              // Skip the header row (first record has "Primary Name" as the name value)
              .filter((d: any) => d.name && d.name !== 'Primary Name')
          }

          // Server-side strip keyed off the VERIFIED level. Build the cumulative
          // allow-set for the caller, then copy ONLY those keys into each entry —
          // higher-tier values never enter an under-tier payload. Cap at 3 so
          // minister/admin (level >= 4) receive every field.
          const level = Math.max(0, Math.min(3, authRes.level))
          const allowed = new Set<string>()
          for (let l = 0; l <= level; l++) for (const k of TIER_FIELDS[l]) allowed.add(k)

          // Names/tiers of sections above the caller's level — no values.
          const lockedSections: string[] = []
          for (let l = level + 1; l <= 3; l++) {
            for (const k of TIER_FIELDS[l]) {
              const s = SECTION_LABELS[k]
              if (s) lockedSections.push(`${s.label}@${s.tier}`)
            }
          }

          const payload = demons.map((d: any) => {
            const entry: any = {}
            for (const k of allowed) if (k in d) entry[k] = d[k]
            return entry
          })

          return Response.json({ demons: payload, total: payload.length, lockedSections })
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 })
        }
      },
    },
  },
})
