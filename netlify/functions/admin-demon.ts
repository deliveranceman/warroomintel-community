import { createClient } from '@supabase/supabase-js'
import { requireAdmin2 } from './_shared/access'
import { NAME_FIELD, toColumns, mapRow, uniqueSlug } from './_shared/spiritWrite'

const { token: airtableToken } = JSON.parse(process.env.AIRTABLE || '{}')
const AIRTABLE_TOKEN = airtableToken!
const BASE_ID        = 'appVXEj2DLPBTJTtD'
const TABLE_ID       = 'tblcP4lgVykzOhLi4'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

// Flag-guarded write swap. true => admin edits/creates land in Supabase `spirits`
// (same place reads now come from). false => legacy Airtable path below (kept
// intact for instant revert). Reads were already repointed (api.demons.ts).
const USE_SUPABASE_DEMON_WRITES = true

function cleanFields(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(fields)) {
    // Skip null, undefined, and empty strings — Airtable rejects the entire PATCH
    // if any field name doesn't exist as a column, even with a null value
    if (v === null || v === undefined || v === '') continue
    out[k] = v
  }
  return out
}

async function airtableError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    return body?.error?.message || JSON.stringify(body)
  } catch {
    return res.statusText
  }
}

export default async function handler(req: Request) {
  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const id  = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 })

    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${id}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    })
    if (!res.ok) return new Response(JSON.stringify({ error: await airtableError(res) }), { status: res.status })
    const data = await res.json()
    const mapped = {
      ...data,
      phonetic: data.fields['Phonetic'] || '',
      images: data.fields['Images']
        ? String(data.fields['Images']).split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
      relatedSpirits: data.fields['Related Spirits'] || '',
      biblicalRank: data.fields['Biblical Rank'] || '',
      transmissionVectors: data.fields['Transmission Vectors'] || '',
      caseType: data.fields['Case Type'] || '',
      clusterSpirits: data.fields['Cluster Spirits'] || '',
      sessionIndicators: data.fields['Session Indicators'] || '',
      demonicAgreements: data.fields['Demonic Agreements'] || '',
      aftercareNotes: data.fields['Aftercare Notes'] || '',
      etymologyNotes: data.fields['Etymology Notes'] || '',
      archaeologyNotes: data.fields['Archaeology Notes'] || '',
      scriptureContext: data.fields['Scripture Context'] || '',
      resistanceSignature: data.fields['Resistance Signature'] || '',
      institutionalExpression: data.fields['Institutional Expression'] || '',
      prayerPoints: data.fields['Prayer Points'] || '',
      isGenerational: data.fields['Is Generational'] === true || data.fields['Is Generational'] === 'true',
      isTerritorial: data.fields['Is Territorial'] === true || data.fields['Is Territorial'] === 'true',
      subKingdom: data.fields['Sub-Kingdom'] || '',
      culturalPresence: Array.isArray(data.fields['Cultural Presence']) ? data.fields['Cultural Presence'] : [],
      sessionTriggerQuestions: data.fields['Session Trigger Questions'] || '',
      equivalentSpirits: data.fields['Equivalent Spirits'] || '',
    }
    return new Response(JSON.stringify({ record: mapped }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  if (req.method === 'PATCH') {
    const body = await req.json()
    const { id, slug, fields } = body
    if (!fields) return new Response(JSON.stringify({ error: 'fields required' }), { status: 400 })

    // ── Supabase write path (flag-on) ────────────────────────────────────────
    if (USE_SUPABASE_DEMON_WRITES) {
      const cols = toColumns(fields)
      if (Object.keys(cols).length === 0) {
        return new Response(JSON.stringify({ error: 'no writable fields' }), { status: 400 })
      }
      const sb = createClient(supabaseUrl, supabaseServiceKey)
      const matchSlug = (slug || '').trim()
      let q = sb.from('spirits').update(cols)
      if (matchSlug) q = q.eq('slug', matchSlug)
      else if (cols.name) q = q.eq('name', cols.name) // transitional fallback
      else return new Response(JSON.stringify({ error: 'slug or name required to identify the row' }), { status: 400 })

      const { data, error } = await q.select('*')
      if (error) {
        console.error('[admin-demon] Supabase PATCH error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      }
      if (!data || data.length === 0) {
        return new Response(JSON.stringify({ error: 'Spirit not found' }), { status: 404 })
      }
      return new Response(JSON.stringify({ record: mapRow(data[0]) }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 })

    // Coerce array fields to newline-joined strings before mapping.
    // AI enrichment can return these as arrays; Airtable long-text fields expect a string.
    // culturalPresence is intentionally excluded — it is a Multiple Select and must stay as an array.
    const ARRAY_TO_STRING_FIELDS = [
      'prayerPoints', 'deliveranceSequence', 'entryPoints',
      'manifestations', 'counterScriptures', 'aftercareNotes', 'clusterSpirits',
    ]
    const normalised = { ...fields }
    for (const key of ARRAY_TO_STRING_FIELDS) {
      if (Array.isArray(normalised[key])) {
        normalised[key] = (normalised[key] as string[]).join('\n\n')
      }
    }

    // Map camelCase AI fields to exact Airtable field names
    const airtableFields: Record<string, any> = { ...normalised }
    const camelToAirtable: Record<string, string> = {
      name: '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE',
      aka: 'Also Known As',
      description: 'Description',
      manifestation: 'Manifestiation', // Airtable field has this typo
      scripture: 'Scripture Reference',
      entryPoints: 'Entry Points',
      sourceOrigin: 'Source / Orgin', // Airtable field has this typo
      kingdom: 'Kingdom',
      strongman: 'Strongman',
      legalRights: 'Legal Rights',
      symptoms: 'Symptoms',
      companionSpirits: 'Companion Spirits',
      wriNotes: 'WRI Exorcist Notes',
      assignment: 'Assignment',
      hierarchyCategory: 'Hierarchy Category',
      parentStrongman: 'Parent Strongman',
      deliveranceSequence: 'Deliverance Sequence',
      operationalNotes: 'Operational Notes',
      primaryBattlefield: 'Primary Battlefield',
      personalityPresentation: 'Typical Personality Presentation',
      counterScriptures: 'Counter Scriptures',
      phonetic: 'Phonetic',
      images: 'Images',
      relatedSpirits: 'Related Spirits',
      biblicalRank: 'Biblical Rank',
      caseType: 'Case Type',
      isGenerational: 'Is Generational',
      isTerritorial: 'Is Territorial',
      subKingdom: 'Sub-Kingdom',
      clusterSpirits: 'Cluster Spirits',
      legalRightsFramework: 'Legal Rights Framework',
      institutionalExpression: 'Institutional Expression',
      sessionIndicators: 'Session Indicators',
      resistanceSignature: 'Resistance Signature',
      demonicAgreements: 'Demonic Agreements',
      transmissionVectors: 'Transmission Vectors',
      etymologyNotes: 'Etymology Notes',
      archaeologyNotes: 'Archaeology Notes',
      scriptureContext: 'Scripture Context',
      prayerPoints: 'Prayer Points',
      aftercareNotes: 'Aftercare Notes',
      culturalPresence: 'Cultural Presence',
      sessionTriggerQuestions: 'Session Trigger Questions',
      region: 'Region', // TODO: Create 'Region' field in Airtable
      equivalentSpirits: 'Equivalent Spirits',
    }
    for (const [camel, airtable] of Object.entries(camelToAirtable)) {
      if (camel in airtableFields) {
        const value = airtableFields[camel]
        console.log('[PATCH] Processing field:', camel, '→', airtable, '| value:', JSON.stringify(value))

        // Kingdom is a Single Select — only send known valid options
        if (camel === 'kingdom') {
          const validKingdoms = [
            'Hell / Darkness', 'Air', 'Water / Marine', 'Earth', 'Witchcraft', 'Occult',
            'Religion / False Religion', 'False Religion / Paganism', 'Infirmity / Sickness',
            'Mind / Intellect', 'Sexual Perversion', 'Death / Destruction', 'Fear / Torment',
            'Pride / Self', 'Deception / Lies', 'Anger / Violence', 'Mammon / Greed',
            // Legacy short values kept for backward compat
            'Hell', 'Darkness', 'Water', 'Occult',
          ]
          if (!value || !validKingdoms.includes(value)) {
            delete airtableFields[camel]
            continue
          }
        }

        // Biblical Rank is a Single Select — only send exact Eph. 6:12 values
        if (camel === 'biblicalRank') {
          const validRanks = [
            // New taxonomy
            'Principality', 'World Ruler', 'Power', 'Wicked Spirit',
            'Fallen Angel', 'Demon', 'Familiar Spirit', 'Spirit of Infirmity',
            // Legacy
            'Ruler of Darkness', 'Spiritual Wickedness in High Places',
          ]
          if (!value || !validRanks.includes(value)) {
            delete airtableFields[camel]
            continue
          }
        }

        // Sub-Kingdom is a Single Select — normalize slashes and validate
        if (camel === 'subKingdom') {
          const VALID_SUB_KINGDOMS = [
            'Norse/Germanic', 'Celtic', 'Greek/Roman', 'Egyptian',
            'Babylonian/Sumerian', 'Canaanite/Phoenician', 'Hindu/Eastern',
            'Native American', 'African Traditional', 'Freemasonry/Secret Societies',
            'Satanism/Luciferianism', 'New Age/Occult', 'Marine/Aquatic',
            'Celestial/Astral', 'Infernal/Hell', 'Generational', 'Religious Spirit', 'None',
          ]
          if (!value) {
            delete airtableFields[camel]
            continue
          }
          // Normalize spaces around slashes: "Norse / Germanic" → "Norse/Germanic"
          const normalized = String(value).replace(/\s*\/\s*/g, '/')
          const exact = VALID_SUB_KINGDOMS.find(v => v.toLowerCase() === normalized.toLowerCase())
          if (!exact) {
            console.log('[PATCH] Sub-Kingdom value not recognized, skipping:', value)
            delete airtableFields[camel]
            continue
          }
          // Use the exact Airtable option string
          airtableFields[airtable] = exact
          delete airtableFields[camel]
          continue
        }

        // Cultural Presence is a Multiple Select — send as array of valid strings only
        if (camel === 'culturalPresence') {
          const VALID_CULTURAL = [
            'Film / Cinema', 'Television / Streaming', 'Comics / Graphic Novels', 'Video Games',
            'Music / Lyrics', 'Literature / Fiction', 'Ancient Documents / Texts', 'Religious Texts / Scripture',
            'Secret Society Rituals', 'Academic / Occult Literature', 'Internet / Social Media',
            'Tattoo Culture', 'Fashion / Aesthetics', 'Sports Culture', 'New Age / Wellness Industry',
            'Anime / Manga', 'Role Playing Games / D&D', 'Astrology / Tarot', 'Horror Genre', 'True Crime',
          ]
          if (!Array.isArray(value) || value.length === 0) {
            delete airtableFields[camel]
            continue
          }
          const validated = value.filter((v: any) => VALID_CULTURAL.includes(String(v)))
          if (validated.length === 0) { delete airtableFields[camel]; continue }
          airtableFields[airtable] = validated
          delete airtableFields[camel]
          continue
        }

        airtableFields[airtable] = value
        delete airtableFields[camel]
      }
    }

    // Checkbox fields: Airtable only accepts boolean true — never false, never strings
    for (const checkboxField of ['Is Generational', 'Is Territorial']) {
      if (checkboxField in airtableFields) {
        const v = airtableFields[checkboxField]
        const isTrue = v === true || v === 'true' || v === 'Yes' || v === 'yes'
        if (isTrue) {
          airtableFields[checkboxField] = true
        } else {
          delete airtableFields[checkboxField] // omit false — never send it
        }
      }
    }

    console.log('[admin-demon] PATCH fields being sent to Airtable:', JSON.stringify(Object.keys(airtableFields)))

    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: cleanFields(airtableFields) }),
    })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: { message: res.statusText } }))
      console.error('[admin-demon] Airtable error:', JSON.stringify(errBody))
      return new Response(JSON.stringify({
        error: errBody?.error?.message || 'Airtable update failed',
        detail: JSON.stringify(errBody),
      }), { status: res.status, headers: { 'Content-Type': 'application/json' } })
    }
    const data = await res.json()
    return new Response(JSON.stringify({ record: data }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  if (req.method === 'POST') {
    const body = await req.json()

    // ── Supabase write path (flag-on) ────────────────────────────────────────
    if (USE_SUPABASE_DEMON_WRITES) {
      let rawFields: Record<string, any>
      let nameForCheck = ''
      if (body.fields) {
        rawFields = body.fields
        nameForCheck = body.fields[NAME_FIELD] || body.fields['name'] || ''
      } else {
        const { name, kingdom, description, rank, entry_points, manifestations, scriptures, source } = body
        if (!name) return new Response(JSON.stringify({ error: 'name or fields required' }), { status: 400 })
        nameForCheck = name
        rawFields = {
          name, kingdom, description,
          biblicalRank: rank,
          entryPoints: entry_points,
          manifestation: manifestations,
          counterScriptures: scriptures,
          sourceOrigin: source,
        }
      }
      if (!nameForCheck) return new Response(JSON.stringify({ error: 'name or fields required' }), { status: 400 })

      const sb = createClient(supabaseUrl, supabaseServiceKey)
      // Case-insensitive duplicate check (escape LIKE wildcards in the name).
      const safeName = nameForCheck.replace(/[%_\\]/g, '\\$&')
      const { data: existing } = await sb.from('spirits').select('id').ilike('name', safeName).limit(1)
      if (existing && existing.length > 0) {
        return new Response(JSON.stringify({ conflict: true, message: `"${nameForCheck}" already exists in the database` }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }

      const cols = toColumns(rawFields)
      cols.name = nameForCheck
      cols.slug = await uniqueSlug(sb, nameForCheck)
      cols.legacy_airtable_id = null

      const { data, error } = await sb.from('spirits').insert(cols).select('*')
      if (error) {
        console.error('[admin-demon] Supabase POST error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      }
      return new Response(JSON.stringify({ record: mapRow(data![0]) }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    // Support named-param format (from gap analysis add flow) OR raw { fields } format
    let fields: Record<string, any>
    let nameForCheck = ''
    if (body.fields) {
      fields = body.fields
      nameForCheck = body.fields['⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'] || ''
    } else {
      const { name, kingdom, description, rank, entry_points, manifestations, scriptures, source } = body
      if (!name) return new Response(JSON.stringify({ error: 'name or fields required' }), { status: 400 })
      nameForCheck = name
      fields = {
        '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE': name,
        'Kingdom':          kingdom,
        'Description':      description,
        'Biblical Rank':    rank,
        'Entry Points':     entry_points,
        'Manifestiation':   manifestations,   // Airtable field has this typo
        'Counter Scriptures': scriptures,
        'Source / Orgin':   source,           // Airtable field has this typo
      }
    }

    // Duplicate check — case-insensitive search before inserting
    if (nameForCheck) {
      try {
        const safeNameForCheck = nameForCheck.toLowerCase().replace(/'/g, "\\'")
        const checkUrl = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`)
        checkUrl.searchParams.set('filterByFormula', `LOWER({⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE})='${safeNameForCheck}'`)
        checkUrl.searchParams.append('fields[]', '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE')
        checkUrl.searchParams.set('maxRecords', '1')
        const checkRes = await fetch(checkUrl.toString(), { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } })
        if (checkRes.ok) {
          const checkData = await checkRes.json()
          if ((checkData.records || []).length > 0) {
            return new Response(JSON.stringify({ conflict: true, message: `"${nameForCheck}" already exists in the database` }), { status: 200, headers: { 'Content-Type': 'application/json' } })
          }
        }
      } catch (e: any) {
        console.error('[admin-demon] Duplicate check failed (continuing):', e.message)
      }
    }

    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: cleanFields(fields) }),
    })
    if (!res.ok) return new Response(JSON.stringify({ error: await airtableError(res) }), { status: res.status })
    const data = await res.json()
    return new Response(JSON.stringify({ record: data }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/admin-demon' }
