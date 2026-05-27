// Dedicated endpoint for TaxonomyReview — fetches ALL spirits with ONLY
// the taxonomy fields (Name, Kingdom, Sub-Kingdom, Biblical Rank) directly
// from the Airtable table, NO view filter (bypasses hidden-field issue).
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!
const BASE_ID        = 'appVXEj2DLPBTJTtD'
const TABLE_ID       = 'tblcP4lgVykzOhLi4'
const NAME_FIELD     = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers })
  if (req.method !== 'GET') return new Response(JSON.stringify({ error: 'GET required' }), { status: 405, headers })

  try {
    const records: any[] = []
    let offset: string | undefined

    do {
      const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`)
      url.searchParams.set('pageSize', '100')
      // Explicitly fetch each field — no view, no hidden-field problem
      for (const f of [NAME_FIELD, 'Kingdom', 'Sub-Kingdom', 'Biblical Rank']) {
        url.searchParams.append('fields[]', f)
      }
      if (offset) url.searchParams.set('offset', offset)

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      })
      if (!res.ok) throw new Error(`Airtable ${res.status}`)
      const data = await res.json()
      records.push(...(data.records || []))
      offset = data.offset
    } while (offset)

    const spirits = records
      .map(r => ({
        recordId:     r.id,
        name:         r.fields[NAME_FIELD] || '',
        kingdom:      r.fields['Kingdom'] || '',
        subKingdom:   r.fields['Sub-Kingdom'] || '',
        biblicalRank: r.fields['Biblical Rank'] || '',
      }))
      .filter(s => s.name && s.name !== 'Primary Name')

    return new Response(JSON.stringify({ spirits, total: spirits.length }), { status: 200, headers })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers })
  }
}

export const config = { path: '/api/taxonomy-spirits' }
