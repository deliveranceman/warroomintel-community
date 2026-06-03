import { createFileRoute } from '@tanstack/react-router'

const { token: airtableToken } = JSON.parse(process.env.AIRTABLE || '{}')

const AIRTABLE_TOKEN         = airtableToken
const AIRTABLE_RESOURCES_BASE  = 'apph6wmOeYjovFytC'
const AIRTABLE_RESOURCES_TABLE = 'tblVyx8jWlz2HYoWU'

export const Route = createFileRoute('/api/resources-debug')({
  server: {
    handlers: {
      GET: async () => {
        const res = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_RESOURCES_BASE}/${AIRTABLE_RESOURCES_TABLE}?pageSize=5`,
          { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
        )
        const data = await res.json()
        // Return raw so we can see exact field names and values
        return Response.json(data)
      },
    },
  },
})
