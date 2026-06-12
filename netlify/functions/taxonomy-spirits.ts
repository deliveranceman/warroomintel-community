import { createClient } from '@supabase/supabase-js'
import { requireTier } from './_shared/access'

const { token: airtableToken } = JSON.parse(process.env.AIRTABLE || '{}')
// Dedicated endpoint for TaxonomyReview — fetches ALL spirits with ONLY
// the taxonomy fields (Name, Kingdom, Sub-Kingdom, Biblical Rank) directly
// from the Airtable table, NO view filter (bypasses hidden-field issue).
const AIRTABLE_TOKEN = airtableToken!
const BASE_ID        = 'appVXEj2DLPBTJTtD'
const TABLE_ID       = 'tblcP4lgVykzOhLi4'
const NAME_FIELD     = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

// Same switch as admin-demon.ts — one flag governs all demon-base reads/writes
// in the taxonomy editor. true => read from Supabase `spirits`; false => Airtable.
const USE_SUPABASE_DEMON_WRITES = true

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers })
  if (req.method !== 'GET') return new Response(JSON.stringify({ error: 'GET required' }), { status: 405, headers })

  const auth = await requireTier(req, 1)
  if (auth instanceof Response) return auth

  // ── Supabase read path (flag-on) ─────────────────────────────────────────
  if (USE_SUPABASE_DEMON_WRITES) {
    try {
      const sb = createClient(supabaseUrl, supabaseServiceKey)
      const { data, error } = await sb
        .from('spirits')
        .select('name, slug, kingdom, sub_kingdom, biblical_rank')
        .order('name', { ascending: true })
      if (error) throw new Error(error.message)
      const spirits = (data || [])
        .filter(r => r.name && r.name !== 'Primary Name')
        .map(r => ({
          // NOTE: slug is placed in the `recordId` field so the UI (which remaps
          // recordId -> airtableId and keys rows on it) needs zero churn. The
          // patch + AI-suggest endpoints match on this same slug.
          recordId:     r.slug,
          name:         r.name,
          kingdom:      r.kingdom || '',
          subKingdom:   r.sub_kingdom || '',
          biblicalRank: r.biblical_rank || '',
        }))
      return new Response(JSON.stringify({ spirits, total: spirits.length }), { status: 200, headers })
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers })
    }
  }

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
