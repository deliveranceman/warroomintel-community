import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
const { token: airtableToken }              = JSON.parse(process.env.AIRTABLE || '{}')

const BASE_ID    = 'appVXEj2DLPBTJTtD'
const TABLE_ID   = 'tblcP4lgVykzOhLi4'
const NAME_FIELD = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'

function cleanFields(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined || v === '') continue
    out[k] = v
  }
  return out
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST')  return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: CORS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth
  const { userId } = auth

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS })
  }

  const { candidateId, confirmed } = body || {}
  if (!candidateId) return new Response(JSON.stringify({ error: 'candidateId required' }), { status: 400, headers: CORS })
  if (confirmed !== true) return new Response(JSON.stringify({ error: 'confirmed must be true' }), { status: 400, headers: CORS })

  const client = createClient(sbUrl, sbKey)

  const { data: candidate, error: fetchErr } = await client
    .from('spirit_candidates')
    .select('*')
    .eq('id', candidateId)
    .eq('status', 'pending')
    .single()

  if (fetchErr || !candidate) {
    return new Response(JSON.stringify({ error: 'Candidate not found or not pending' }), { status: 404, headers: CORS })
  }

  // Push to Airtable
  const fields = cleanFields({
    [NAME_FIELD]:          candidate.name,
    'AKA':                 candidate.also_known_as,
    'Description':         candidate.function,
    'Manifestiation':      candidate.manifestations,
    'Scripture Context':   candidate.scripture_context,
    'Kingdom':             candidate.kingdom,
    'Biblical Rank':       candidate.biblical_rank,
    'Sub-Kingdom':         candidate.sub_kingdom,
    'Source / Orgin':      candidate.source_name,
  })

  const atRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${airtableToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
    signal: AbortSignal.timeout(10000),
  })

  if (!atRes.ok) {
    const errText = await atRes.text().catch(() => String(atRes.status))
    return new Response(JSON.stringify({ error: `Airtable error: ${errText}` }), { status: 502, headers: CORS })
  }

  const atData          = await atRes.json()
  const airtableRecordId = atData.id || ''

  await client.from('spirit_candidates').update({
    status:             'approved',
    airtable_record_id: airtableRecordId,
    reviewed_at:        new Date().toISOString(),
    reviewed_by:        userId,
  }).eq('id', candidateId)

  return new Response(JSON.stringify({ success: true, airtableId: airtableRecordId }), { status: 200, headers: CORS })
}

export const config = { path: '/api/spirit-candidate-confirm' }
