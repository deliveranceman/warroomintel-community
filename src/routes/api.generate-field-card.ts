import { createFileRoute } from '@tanstack/react-router'

const NAME_FIELD = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'
const BASE_ID = 'appVXEj2DLPBTJTtD'
const TABLE_ID = 'tblcP4lgVykzOhLi4'

export const Route = createFileRoute('/api/generate-field-card')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = process.env.AIRTABLE_TOKEN
        if (!token) {
          return Response.json({ error: 'Missing AIRTABLE_TOKEN env var' }, { status: 500 })
        }

        const { searchParams } = new URL(request.url)
        const idParam = searchParams.get('id')
        const targetId = idParam ? parseInt(idParam, 10) : NaN

        if (isNaN(targetId) || targetId < 1) {
          return Response.json({ error: 'Missing or invalid id parameter' }, { status: 400 })
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

          // Replicate the same filter as api.demons.ts to keep IDs consistent
          const filtered = records.filter(
            (r: any) => r.fields[NAME_FIELD] && r.fields[NAME_FIELD] !== 'Primary Name'
          )

          const record = filtered[targetId - 1]
          if (!record) {
            return Response.json({ error: 'Entry not found' }, { status: 404 })
          }

          const f = record.fields
          const entry = {
            id: targetId,
            name: f[NAME_FIELD] || '',
            aka: f['Also Known As'] || '',
            type: f['Rank'] || '',
            kingdom: f['Kingdom'] || '',
            description: f['Description'] || '',
            assignment: f['Assignment'] || '',
            // Soldier tier
            function: f['Function / Role'] || '',
            manifestation: f['Manifestations'] || '',
            scripture: f['Scripture References'] || '',
            strongman: f['Strongman'] || '',
            // Commander tier
            entryPoints: f['Entry Points'] || '',
            legalRights: f['Legal Rights'] || '',
            protocol: f['Deliverance Protocol'] || '',
            // General tier
            symptoms: f['Symptoms'] || '',
            companionSpirits: f['Companion Spirits'] || '',
            wriNotes: f['WRI Exorcist Notes'] || '',
          }

          return Response.json({ entry })
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 })
        }
      },
    },
  },
})
