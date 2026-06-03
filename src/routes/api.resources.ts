import { createFileRoute } from '@tanstack/react-router'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey, bucket: supabaseBucket, signedUrlExpiry: supabaseExpiry } = JSON.parse(process.env.SUPABASE || '{}')
const { token: airtableToken } = JSON.parse(process.env.AIRTABLE || '{}')

const AIRTABLE_TOKEN         = airtableToken
const AIRTABLE_RESOURCES_BASE  = 'apph6wmOeYjovFytC'
const AIRTABLE_RESOURCES_TABLE = 'tblVyx8jWlz2HYoWU'

const SUPABASE_URL         = supabaseUrl
const SUPABASE_SERVICE_KEY = supabaseServiceKey
const SUPABASE_BUCKET      = supabaseBucket || 'resources'
const SIGNED_URL_EXPIRY    = parseInt(supabaseExpiry || '14400')

const TIER_ORDER: Record<string, number> = { Free: 0, Soldier: 1, Commander: 2, General: 3 }

// ─── GENERATE SUPABASE SIGNED URL ────────────────────────────────────────────
async function getSignedUrl(filePath: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null
  try {
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/sign/${SUPABASE_BUCKET}/${filePath}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          apikey: SUPABASE_SERVICE_KEY,
        },
        body: JSON.stringify({ expiresIn: SIGNED_URL_EXPIRY }),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.signedURL
      ? `${SUPABASE_URL}/storage/v1${data.signedURL}`
      : null
  } catch {
    return null
  }
}

// ─── ROUTE ───────────────────────────────────────────────────────────────────
export const Route = createFileRoute('/api/resources')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!AIRTABLE_TOKEN) {
          return Response.json({ error: 'Missing AIRTABLE_TOKEN' }, { status: 500 })
        }

        const url = new URL(request.url)
        const tier      = url.searchParams.get('tier')      // filter by tier
        const category  = url.searchParams.get('category')  // filter by category
        const withUrls  = url.searchParams.get('withUrls') === 'true' // generate signed URLs

        try {
          // ── Fetch from Airtable ──────────────────────────────────────────
          const records: any[] = []
          let offset: string | undefined

          do {
            const atUrl = new URL(
              `https://api.airtable.com/v0/${AIRTABLE_RESOURCES_BASE}/${AIRTABLE_RESOURCES_TABLE}`
            )
            atUrl.searchParams.set('pageSize', '100')
            if (offset) atUrl.searchParams.set('offset', offset)

            const res = await fetch(atUrl.toString(), {
              headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
            })

            if (!res.ok) {
              const detail = await res.text()
              return Response.json({ error: `Airtable ${res.status}`, detail }, { status: 502 })
            }

            const data = await res.json()
            records.push(...data.records)
            offset = data.offset
          } while (offset)

          // ── Map records ──────────────────────────────────────────────────
          let resources = records.filter((r: any) => !!r.fields['Active']).map((r: any) => ({
            id:          r.id,
            title:       r.fields['Title']       || '',
            description: r.fields['Description'] || '',
            tier:        r.fields['Tier']         || 'Free',
            category:    r.fields['Category']     || '',
            filePath:    r.fields['File Path']    || '',
            pageCount:   r.fields['Page Count']   || null,
            fileSize:    r.fields['File Size']    || '',
            signedUrl:   null as string | null,
          }))

          // ── Filter ───────────────────────────────────────────────────────
          if (tier) {
            const tierLevel = TIER_ORDER[tier] ?? 0
            // Show resources for this tier and below
            resources = resources.filter(r => (TIER_ORDER[r.tier] ?? 0) <= tierLevel)
          }
          if (category) {
            resources = resources.filter(r => r.category === category)
          }

          // ── Sort by tier then title ──────────────────────────────────────
          resources.sort((a, b) => {
            const td = (TIER_ORDER[a.tier] ?? 0) - (TIER_ORDER[b.tier] ?? 0)
            return td !== 0 ? td : a.title.localeCompare(b.title)
          })

          // ── Generate signed URLs if requested ────────────────────────────
          if (withUrls) {
            await Promise.all(
              resources.map(async r => {
                if (r.filePath) {
                  r.signedUrl = await getSignedUrl(r.filePath)
                }
              })
            )
          }

          return Response.json({
            resources,
            total: resources.length,
          })
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 })
        }
      },
    },
  },
})
