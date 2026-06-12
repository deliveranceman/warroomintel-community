import { createClient } from '@supabase/supabase-js'
import { requireAdmin2 } from './_shared/access'
import { BIBLICAL_RANK } from './_shared/spiritWrite'

const { token: airtableToken } = JSON.parse(process.env.AIRTABLE || '{}')
const AIRTABLE_TOKEN = airtableToken!
const BASE_ID = 'appVXEj2DLPBTJTtD'
const TABLE_ID = 'tblcP4lgVykzOhLi4'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

// Same switch as admin-demon.ts — one flag governs all demon-base writes.
const USE_SUPABASE_DEMON_WRITES = true

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

const FIELD_MAP: Record<string, string> = {
  kingdom:      'Kingdom',
  subKingdom:   'Sub-Kingdom',
  biblicalRank: 'Biblical Rank',
}

// Supabase snake columns for the same three editable fields.
const COLUMN_MAP: Record<string, string> = {
  kingdom:      'kingdom',
  subKingdom:   'sub_kingdom',
  biblicalRank: 'biblical_rank',
}
const VALID_RANKS = new Set<string>(BIBLICAL_RANK)

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers })
  if (req.method !== 'PATCH') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  let body: any
  try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers }) }

  const { recordId, field, value } = body || {}
  if (!recordId || !field) return new Response(JSON.stringify({ error: 'recordId and field required' }), { status: 400, headers })

  // ── Supabase write path (flag-on) ─────────────────────────────────────────
  // recordId now carries the spirit slug (see taxonomy-spirits repoint).
  if (USE_SUPABASE_DEMON_WRITES) {
    const col = COLUMN_MAP[field]
    if (!col) return new Response(JSON.stringify({ error: `Unknown field: ${field}. Valid: ${Object.keys(COLUMN_MAP).join(', ')}` }), { status: 400, headers })

    let writeVal: string | null
    if (col === 'biblical_rank') {
      // Postgres enum — blank/invalid coerces to NULL (never a 500).
      writeVal = VALID_RANKS.has(String(value)) ? String(value) : null
    } else {
      // kingdom / sub_kingdom are free text; empty clears to ''.
      writeVal = value === '' || value === null || value === undefined ? '' : String(value)
    }

    const sb = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await sb.from('spirits').update({ [col]: writeVal }).eq('slug', recordId).select('slug')
    if (error) {
      console.error('[admin-taxonomy-patch] Supabase error:', error.message)
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    }
    if (!data || data.length === 0) return new Response(JSON.stringify({ error: 'Spirit not found' }), { status: 404, headers })
    return new Response(JSON.stringify({ ok: true, recordId, field, value: writeVal }), { status: 200, headers })
  }

  const airtableField = FIELD_MAP[field]
  if (!airtableField) return new Response(JSON.stringify({ error: `Unknown field: ${field}. Valid: ${Object.keys(FIELD_MAP).join(', ')}` }), { status: 400, headers })

  // Send null to clear, otherwise send the value string
  const fieldValue = value === '' || value === null || value === undefined ? null : String(value)

  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${recordId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { [airtableField]: fieldValue } }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('[admin-taxonomy-patch] Airtable error:', JSON.stringify(err))
    return new Response(JSON.stringify({ error: err?.error?.message || 'Airtable update failed', detail: err }), { status: res.status, headers })
  }

  await res.json() // consume body
  return new Response(JSON.stringify({ ok: true, recordId, field, value: fieldValue }), { status: 200, headers })
}

export const config = { path: '/api/admin-taxonomy-patch' }
