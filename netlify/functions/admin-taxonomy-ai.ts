import { requireAdmin } from './_shared/requireAdmin'

const { token: airtableToken } = JSON.parse(process.env.AIRTABLE || '{}')
const AIRTABLE_TOKEN  = airtableToken!
const ANTHROPIC_KEY   = process.env.ANTHROPIC_API_KEY!
const BASE_ID         = 'appVXEj2DLPBTJTtD'
const TABLE_ID        = 'tblcP4lgVykzOhLi4'
const NAME_FIELD      = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

const VALID_RANKS = [
  'Principality', 'World Ruler', 'Power', 'Wicked Spirit',
  'Demon', 'Familiar Spirit', 'Spirit of Infirmity', 'Fallen Angel',
]
const VALID_KINGDOMS = [
  'Hell / Darkness', 'Air', 'Water / Marine', 'Earth', 'Witchcraft', 'Occult',
  'Religion / False Religion', 'False Religion / Paganism', 'Infirmity / Sickness',
  'Mind / Intellect', 'Sexual Perversion', 'Death / Destruction', 'Fear / Torment',
  'Pride / Self', 'Deception / Lies', 'Anger / Violence', 'Mammon / Greed',
]
const VALID_SUB_KINGDOMS = [
  'Norse / Germanic', 'Celtic / Druidic', 'Greek / Roman', 'Egyptian',
  'Babylonian / Sumerian', 'Canaanite / Phoenician', 'Assyrian / Akkadian',
  'Persian / Zoroastrian', 'Hindu / Vedic', 'Buddhist / Eastern',
  'Native American / Indigenous', 'African Traditional / Vodou',
  'Aztec / Mayan / Mesoamerican', 'Polynesian / Pacific',
  'Freemasonry / Rosicrucian', 'Satanism / Luciferianism', 'New Age / Theosophy',
  'Witchcraft / Wicca', 'Kabbalah / Jewish Mysticism', 'Gnosticism',
  'Hermeticism / Alchemy', 'Marine / Aquatic', 'Celestial / Astral',
  'Infernal / Hellish', 'Generational / Bloodline', 'Religious Spirit / False Religion',
  'Sexual Covenant', 'Death Covenant', 'Mind / Intellect', 'Trauma / Wound',
  'Fallen Angel / Watcher', 'Nephilim / Giant Bloodline', 'Goetic / Solomonic', 'Apocryphal', 'None',
]

/** Fetch one page (batchSize records) from Airtable, starting at the given cursor. */
async function fetchPage(batchSize: number, airtableOffset?: string): Promise<{ records: any[]; nextOffset: string | null; total: number }> {
  const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`)
  url.searchParams.set('pageSize', String(Math.min(batchSize, 100)))
  // Must use append (not set) — set() overwrites the previous fields[] value each time
  for (const f of [NAME_FIELD, 'Description', 'Manifestiation', 'Source / Orgin', 'Kingdom', 'Biblical Rank', 'Sub-Kingdom', 'Also Known As']) {
    url.searchParams.append('fields[]', f)
  }
  if (airtableOffset) url.searchParams.set('offset', airtableOffset)

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
  })
  if (!res.ok) throw new Error(`Airtable error ${res.status}`)
  const data = await res.json()
  return {
    records:    data.records || [],
    nextOffset: data.offset || null,
    total:      0, // Airtable doesn't return total — caller tracks
  }
}

function buildPrompt(r: any): string {
  const f = r.fields || {}
  const name     = f[NAME_FIELD] || '(unknown)'
  const desc     = f['Description'] || ''
  const manif    = f['Manifestiation'] || ''
  const origin   = f['Source / Orgin'] || ''
  const curRank  = f['Biblical Rank'] || ''
  const curKing  = f['Kingdom'] || ''
  return `You are a deliverance ministry taxonomy expert. Classify this spirit using ONLY the exact options listed. Return ONLY valid JSON, no explanation.

Spirit name: ${name}
Known function: ${desc.slice(0, 300)}
Known manifestation: ${manif.slice(0, 200)}
Origin/source: ${origin.slice(0, 150)}
Current Kingdom: ${curKing || '(unset)'}
Current Biblical Rank: ${curRank || '(unset)'}

BIBLICAL RANK — choose exactly one:
- Principality: ONLY if it governs a nation-state or government structure
- World Ruler: High-ranking spirit that received mass worship across a civilization and operates atmospherically OVER people (not indwelling). Examples: Baal, Leviathan, Thor, Odin, Molech, Ra
- Power: Broad authority over a domain/sphere. Examples: spirit of death, Jezebel as a controlling system, spirit of lust as governing force
- Wicked Spirit: Operates through deception and chaos from within. Examples: Loki, lying spirits, confusion, deceiving spirits
- Demon: Characteristically indwells and harasses individuals directly. Most common. Examples: Fear, Anger, Rejection, Pride
- Familiar Spirit: Generational assignment to a specific bloodline. Mimics and counterfeits
- Spirit of Infirmity: Manifests primarily through physical disease or affliction
- Fallen Angel: Named pre-flood Watchers with specific rebellion roles. Examples: Azazel, Semyaza

KINGDOM — choose exactly one:
Hell / Darkness, Air, Water / Marine, Earth, Witchcraft, Occult,
False Religion / Paganism, Religion / False Religion,
Infirmity / Sickness, Mind / Intellect, Sexual Perversion,
Death / Destruction, Fear / Torment, Pride / Self,
Deception / Lies, Anger / Violence, Mammon / Greed

KINGDOM RULES:
- Witchcraft: spirit operates THROUGH active practice of witchcraft, hexes, curses, divination
- Occult: tied to secret society or hidden knowledge system (Freemasonry, Kabbalah, Hermeticism, Satanism)
- False Religion / Paganism: gained authority through organized worship of false gods (Norse, Egyptian, Canaanite, Hindu, Native American, Aztec, etc.)
- Water / Marine: operates from or through water realm

SUB-KINGDOM — choose exactly one or "None":
Norse / Germanic, Celtic / Druidic, Greek / Roman, Egyptian,
Babylonian / Sumerian, Canaanite / Phoenician, Assyrian / Akkadian,
Persian / Zoroastrian, Hindu / Vedic, Buddhist / Eastern,
Native American / Indigenous, African Traditional / Vodou,
Aztec / Mayan / Mesoamerican, Polynesian / Pacific,
Freemasonry / Rosicrucian, Satanism / Luciferianism,
New Age / Theosophy, Witchcraft / Wicca, Kabbalah / Jewish Mysticism,
Gnosticism, Hermeticism / Alchemy, Marine / Aquatic,
Celestial / Astral, Infernal / Hellish, Generational / Bloodline,
Religious Spirit / False Religion, Sexual Covenant, Death Covenant,
Mind / Intellect, Trauma / Wound, Fallen Angel / Watcher,
Nephilim / Giant Bloodline, Goetic / Solomonic, Apocryphal, None

Return ONLY this JSON:
{"biblicalRank":"...","kingdom":"...","subKingdom":"...","confidence":"high|medium|low","reasoning":"one sentence max"}`
}

async function classifySpirit(record: any): Promise<any | null> {
  const f   = record.fields || {}
  const name = f[NAME_FIELD] || ''
  if (!name || name === 'Primary Name') return null

  const prompt = buildPrompt(record)

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: 'Return ONLY valid JSON. No markdown, no code blocks, no explanation. Start with { end with }.',
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) {
      console.warn(`[taxonomy-ai] Claude error ${res.status} for "${name}"`)
      return null
    }

    const data = await res.json()
    const raw  = (data.content?.[0]?.text || '').trim()
      .replace(/^```[\w]*\s*/i, '').replace(/\s*```\s*$/i, '').trim()

    let parsed: any
    try {
      parsed = JSON.parse(raw)
    } catch {
      const m = raw.match(/\{[\s\S]*\}/)
      if (!m) { console.warn(`[taxonomy-ai] Parse failed for "${name}":`, raw.slice(0, 80)); return null }
      try { parsed = JSON.parse(m[0]) } catch { return null }
    }

    // Validate each field against allowed lists
    const biblicalRank = VALID_RANKS.includes(parsed.biblicalRank) ? parsed.biblicalRank : ''
    const kingdom      = VALID_KINGDOMS.includes(parsed.kingdom) ? parsed.kingdom : ''
    const subKingdom   = VALID_SUB_KINGDOMS.includes(parsed.subKingdom) ? parsed.subKingdom : 'None'
    const confidence   = ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium'
    const reasoning    = String(parsed.reasoning || '').slice(0, 200)

    const current = {
      biblicalRank: f['Biblical Rank'] || '',
      kingdom:      f['Kingdom'] || '',
      subKingdom:   f['Sub-Kingdom'] || '',
    }
    const suggested = { biblicalRank, kingdom, subKingdom }

    const changed =
      (!!biblicalRank && biblicalRank !== current.biblicalRank) ||
      (!!kingdom      && kingdom      !== current.kingdom)      ||
      (!!subKingdom   && subKingdom   !== 'None' && subKingdom !== current.subKingdom) ||
      !current.biblicalRank || !current.kingdom || !current.subKingdom

    return {
      recordId:  record.id,
      name,
      current,
      suggested,
      confidence,
      reasoning,
      changed,
    }
  } catch (e: any) {
    console.warn(`[taxonomy-ai] Exception for "${name}":`, e.message)
    return null
  }
}

async function classifyBatch(records: any[]): Promise<any[]> {
  const results = await Promise.all(records.map(classifySpirit))
  return results.filter(Boolean)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers })

  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  let body: any = {}
  try { body = await req.json() } catch { /* no body = first page */ }

  // Paginated mode: process one page at a time (default 20 spirits)
  const limit          = Math.min(Number(body.limit) || 20, 30)
  const airtableOffset = body.airtableOffset || undefined

  try {
    console.log(`[taxonomy-ai] Fetching page (limit=${limit}, offset=${airtableOffset || 'first'})`)
    const { records: allPage, nextOffset } = await fetchPage(limit, airtableOffset)

    const records = allPage.filter(r => {
      const name = r.fields?.[NAME_FIELD]
      return name && name !== 'Primary Name'
    })
    console.log(`[taxonomy-ai] Classifying ${records.length} spirits`)

    // Classify all records in this page concurrently
    const suggestions = await classifyBatch(records)

    // Only return spirits where something changed or fields are blank
    const relevant = suggestions.filter(s => s.changed)
    const highCount = relevant.filter(s => s.confidence === 'high').length

    return new Response(JSON.stringify({
      suggestions:    relevant,
      batchCount:     records.length,
      changed:        relevant.length,
      highConfidence: highCount,
      nextOffset:     nextOffset || null, // null = no more pages
    }), { status: 200, headers })

  } catch (e: any) {
    console.error('[taxonomy-ai] Error:', e.message)
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers })
  }
}

export const config = { path: '/api/admin-taxonomy-ai' }
