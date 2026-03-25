import { createFileRoute } from '@tanstack/react-router'

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN
const BASE_ID = 'appVXEj2DLPBTJTtD'
const ASSESSMENTS_TABLE = 'tblohf2u576ZXiE4y'

export const Route = createFileRoute('/api/assessment-board')({
  server: {
    handlers: {
      GET: async () => {
        if (!AIRTABLE_TOKEN) return Response.json({ error: 'Missing token' }, { status: 500 })
        try {
          const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${ASSESSMENTS_TABLE}`)
          url.searchParams.set('filterByFormula', "{Status} = 'Published'")
          url.searchParams.set('sort[0][field]', 'Submitted At')
          url.searchParams.set('sort[0][direction]', 'desc')
          url.searchParams.set('pageSize', '50')

          const res = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
          })
          const data = await res.json()

          const posts = (data.records || [])
            .filter((r: any) => r.fields['Published Title'] && r.fields['Your Response'])
            .map((r: any) => ({
              id: r.id,
              title: r.fields['Published Title'],
              response: r.fields['Your Response'],
              submittedAt: r.fields['Submitted At'] || r.createdTime,
            }))

          return Response.json({ posts })
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 })
        }
      },
    },
  },
})
