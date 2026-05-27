const AIRTABLE_TOKEN  = process.env.AIRTABLE_TOKEN!
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

async function resolveMinister(token: string): Promise<{ ok: boolean; reason: string }> {
  try {
    if (!token || token.split('.').length !== 3) return { ok: false, reason: 'Invalid JWT' }
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf-8'))
    const userId = payload.sub
    if (!userId || !String(userId).startsWith('user_')) return { ok: false, reason: 'Invalid userId' }
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return { ok: false, reason: `Clerk error ${res.status}` }
    const data = await res.json()
    if (data?.public_metadata?.role !== 'minister') return { ok: false, reason: 'Minister role required' }
    return { ok: true, reason: '' }
  } catch (e: any) {
    return { ok: false, reason: e.message || 'Auth error' }
  }
}

async function fetchAllRecords(): Promise<any[]> {
  const records: any[] = []
  let offset: string | undefined

  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`)
    url.searchParams.set('pageSize', '100')
    url.searchParams.set('fields[]', NAME_FIELD)
    url.searchParams.set('fields[]', 'Description')
    url.searchParams.set('fields[]', 'Manifestiation')
    url.searchParams.set('fields[]', 'Source / Orgin')
    url.searchParams.set('fields[]', 'Kingdom')
    url.searchParams.set('fields[]', 'Biblical Rank')
    url.searchParams.set('fields[]', 'Sub-Kingdom')
    url.searchParams.set('fields[]', 'Also Known As')
    if (offset) url.searchParams.set('offset', offset)

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    })
    if (!res.ok) throw new Error(`Airtable error ${res.status}`)
    const data = await res.json()
    records.push(...(data.records || []))
    offset = data.offset
  } while (offset)

  return records
}

function buildPrompt(r: any): string {
  const f = r.fields || {}
  const name     = f[NAME_FIELD] || '(unknown)'
  const desc     = f['Description'] || ''
  const manif    = f['Manifestiation'] || ''
  const origin   = f['Source / Orgin'] || ''
  const curRank  = f['Biblical Rank'] || ''
  const curKing  = f['Kingdom'] || ''
  const curSub   = f['Sub-Kingdom'] || ''

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

async function runBatches(records: any[], batchSize: number): Promise<any[]> {
  const results: any[] = []
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(classifySpirit))
    results.push(...batchResults.filter(Boolean))
    console.log(`[taxonomy-ai] Processed ${Math.min(i + batchSize, records.length)}/${records.length}`)
  }
  return results
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

  const auth = await resolveMinister(token)
  if (!auth.ok) return new Response(JSON.stringify({ error: auth.reason }), { status: 403, headers })

  try {
    console.log('[taxonomy-ai] Fetching all Airtable records...')
    const allRecords = await fetchAllRecords()
    const records    = allRecords.filter(r => {
      const name = r.fields?.[NAME_FIELD]
      return name && name !== 'Primary Name'
    })
    console.log(`[taxonomy-ai] ${records.length} spirits to classify`)

    // Process in batches of 30 concurrent Haiku calls
    const suggestions = await runBatches(records, 30)

    // Only return spirits where something changed or fields are blank
    const relevant = suggestions.filter(s => s.changed)

    const highCount = relevant.filter(s => s.confidence === 'high').length

    return new Response(JSON.stringify({
      suggestions: relevant,
      total:       records.length,
      changed:     relevant.length,
      highConfidence: highCount,
    }), { status: 200, headers })

  } catch (e: any) {
    console.error('[taxonomy-ai] Error:', e.message)
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers })
  }
}

export const config = { path: '/api/admin-taxonomy-ai' }
