import { createAPIFileRoute } from '@tanstack/react-start/api'

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN
const BASE_ID = 'appVXEj2DLPBTJTtD'
const TABLE_ID = 'tblcP4lgVykzOhLi4'

export const APIRoute = createAPIFileRoute('/api/demons')({
  GET: async () => {
    if (!AIRTABLE_TOKEN) {
      return new Response(JSON.stringify({ error: 'Missing Airtable token' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      const records: any[] = []
      let offset: string | undefined = undefined

      // Paginate through all records (Airtable returns max 100 per page)
      do {
        const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`)
        url.searchParams.set('pageSize', '100')
        url.searchParams.set('view', 'viw1ickrF5zgNGifc')
        if (offset) url.searchParams.set('offset', offset)

        const res = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json',
          },
        })

        if (!res.ok) {
          const err = await res.text()
          return new Response(JSON.stringify({ error: `Airtable error: ${res.status}`, detail: err }), {
            status: res.status,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const data = await res.json()
        records.push(...data.records)
        offset = data.offset
      } while (offset)

      // Map Airtable fields to our shape
      const demons = records.map((r: any, i: number) => ({
        id: i + 1,
        name: r.fields['Primary Name'] || r.fields['⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'] || '',
        aka: r.fields['Also Known As'] || '',
        type: r.fields['Type / Rank'] || '',
        function: r.fields['Function / Role'] || '',
      })).filter((d: any) => d.name)

      return new Response(JSON.stringify({ demons, total: demons.length }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 's-maxage=300, stale-while-revalidate=600', // cache 5 min on CDN
        },
      })
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
})
