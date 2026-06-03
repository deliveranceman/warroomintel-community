
const { token: airtableToken } = JSON.parse(process.env.AIRTABLE || '{}')
const AIRTABLE_TOKEN = airtableToken!
const BASE_ID = 'appVXEj2DLPBTJTtD'
const TABLE_ID = 'tblcP4lgVykzOhLi4'

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

const FIELD_MAP: Record<string, string> = {
  kingdom:      'Kingdom',
  subKingdom:   'Sub-Kingdom',
  biblicalRank: 'Biblical Rank',
}

async function resolveMinister(token: string): Promise<{ ok: boolean; reason: string }> {
  try {
    if (!token || token.split('.').length !== 3) return { ok: false, reason: 'Invalid JWT' }
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf-8'))
    const userId = payload.sub
    if (!userId || !String(userId).startsWith('user_')) return { ok: false, reason: 'Invalid userId' }
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return { ok: false, reason: `Clerk error ${res.status}` }
    const data = await res.json()
    if (data?.public_metadata?.role !== 'minister') return { ok: false, reason: 'Minister role required' }
    return { ok: true, reason: '' }
  } catch (e: any) {
    return { ok: false, reason: e.message || 'Auth error' }
  }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers })
  if (req.method !== 'PATCH') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

  const auth = await resolveMinister(token)
  if (!auth.ok) return new Response(JSON.stringify({ error: auth.reason }), { status: 403, headers })

  let body: any
  try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers }) }

  const { recordId, field, value } = body || {}
  if (!recordId || !field) return new Response(JSON.stringify({ error: 'recordId and field required' }), { status: 400, headers })

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
