import { requireAuth } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')
const { token: airtableToken } = JSON.parse(process.env.AIRTABLE || '{}')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}
const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json' }

const BASE_ID   = 'appVXEj2DLPBTJTtD'
const TABLE_ID  = 'tblcP4lgVykzOhLi4'
const NAME_FIELD = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'

const SB = (p: string) => `${supabaseUrl}/rest/v1${p}`
const sbH: Record<string, string> = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

// Day-of-week Kingdom theme keywords for filterByFormula
const DAY_THEMES: Record<number, string> = {
  0: 'revival',
  1: 'control',
  2: 'warfare',
  3: 'deception',
  4: 'oppression',
  5: 'affliction',
  6: 'infirmity',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}

async function fetchFromAirtable(formula: string): Promise<any[]> {
  const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`)
  url.searchParams.set('pageSize', '20')
  url.searchParams.set('filterByFormula', formula)
  for (const f of [NAME_FIELD, 'Manifestiation', 'Legal Rights', 'Scripture Context', 'Kingdom']) {
    url.searchParams.append('fields[]', f)
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${airtableToken}` },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.records || []
}

async function getRecentSpiritIds(): Promise<Set<string>> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const from = sevenDaysAgo.toISOString().slice(0, 10)

  const res = await fetch(
    SB(`/spirit_of_day_cache?cache_date=gte.${from}&select=spirit_id`),
    { headers: sbH },
  )
  const rows: any[] = await res.json().catch(() => [])
  return new Set(Array.isArray(rows) ? rows.map(r => r.spirit_id).filter(Boolean) : [])
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const url   = new URL(req.url)
  const today = url.searchParams.get('date') || new Date().toISOString().slice(0, 10)

  // Check cache first
  const cacheRes = await fetch(SB(`/spirit_of_day_cache?cache_date=eq.${today}&select=*`), { headers: sbH })
  const cacheRows: any[] = await cacheRes.json().catch(() => [])
  if (Array.isArray(cacheRows) && cacheRows[0]) {
    const r = cacheRows[0]
    return json({
      spirit: {
        name: r.spirit_name,
        manifestation: r.manifestation,
        legalGround: r.legal_ground,
        scripture: r.scripture,
        spiritId: r.spirit_id,
      },
    })
  }

  // Not cached — fetch from Airtable
  const dayOfWeek = new Date(today + 'T12:00:00').getDay()
  const theme = DAY_THEMES[dayOfWeek] || 'warfare'
  const recentIds = await getRecentSpiritIds()

  // Try themed filter first, fall back to unfiltered
  let records = await fetchFromAirtable(
    `SEARCH("${theme}", LOWER({Kingdom})) > 0`,
  )
  if (!records.length) {
    records = await fetchFromAirtable(`{${NAME_FIELD}} != ""`)
  }

  // Pick first record not used in last 7 days
  const pick = records.find(r => r.id && !recentIds.has(r.id)) || records[0]
  if (!pick) return json({ spirit: null })

  const f = pick.fields
  const name = (f[NAME_FIELD] || '').trim()
  const manifestation = (f['Manifestiation'] || '').slice(0, 120).trim()
  const legalGround   = (f['Legal Rights'] || '').slice(0, 100).trim()
  // Extract first scripture reference (e.g. "John 8:44" from longer text)
  const scriptureRaw  = f['Scripture Context'] || ''
  const scriptureMatch = scriptureRaw.match(/[1-3]?\s?[A-Z][a-z]+\.?\s+\d+:\d+[-\d]*/)?.[0] || scriptureRaw.slice(0, 60)
  const scripture = scriptureMatch.trim()

  if (!name) return json({ spirit: null })

  // Cache it
  const row = {
    cache_date: today,
    spirit_name: name,
    manifestation: manifestation || null,
    legal_ground: legalGround || null,
    scripture: scripture || null,
    spirit_id: pick.id,
  }
  await fetch(SB('/spirit_of_day_cache'), {
    method: 'POST',
    headers: sbH,
    body: JSON.stringify(row),
  }).catch(() => {})

  return json({
    spirit: {
      name,
      manifestation: manifestation || null,
      legalGround: legalGround || null,
      scripture: scripture || null,
      spiritId: pick.id,
    },
  })
}

export const config = { path: '/api/spirit-of-day' }
