import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/demons')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = process.env.AIRTABLE_TOKEN
        const BASE_ID = 'appVXEj2DLPBTJTtD'
        const TABLE_ID = 'tblcP4lgVykzOhLi4'

        if (!token) {
          return Response.json({ error: 'Missing AIRTABLE_TOKEN env var' }, { status: 500 })
        }

        try {
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
              return Response.json({ error: `Airtable ${res.status}`, detail }, { status: 502 })
            }

            const data = await res.json()
            records.push(...data.records)
            offset = data.offset
          } while (offset)

          // Expose raw field names from first record for debugging
          const debugFields = records.length > 0 ? Object.keys(records[0].fields) : []
          const debugSample = records.length > 0 ? records[0].fields : {}

          const demons = records
            .map((r: any, i: number) => ({
              id: i + 1,
              name: r.fields['Primary Name'] || r.fields['Name'] || Object.values(r.fields)[0] || '',
              aka: r.fields['Also Known As'] || r.fields['AKA'] || '',
              type: r.fields['Type / Rank'] || r.fields['Type'] || '',
              function: r.fields['Function / Role'] || r.fields['Function'] || '',
            }))
            .filter((d: any) => d.name)

          return Response.json({ demons, total: demons.length, debug: { fieldNames: debugFields, sampleRecord: debugSample } })
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 })
        }
      },
    },
  },
})
