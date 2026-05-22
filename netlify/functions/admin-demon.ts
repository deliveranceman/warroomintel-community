const CLERK_SECRET   = process.env.CLERK_SECRET_KEY!
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!
const BASE_ID        = 'appVXEj2DLPBTJTtD'
const TABLE_ID       = 'tblcP4lgVykzOhLi4'

async function verifyMinister(token: string): Promise<string | null> {
  const verifyRes = await fetch('https://api.clerk.com/v1/sessions/verify', {
    method: 'POST',
    headers: { Authorization: `Bearer ${CLERK_SECRET}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }),
  })
  if (!verifyRes.ok) return null
  const session = await verifyRes.json()
  const userId = session.user_id
  if (!userId) return null
  const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: { Authorization: `Bearer ${CLERK_SECRET}` },
  })
  if (!userRes.ok) return null
  const userData = await userRes.json()
  if (userData.public_metadata?.role !== 'minister') return null
  return userId
}

function cleanFields(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined) continue
    out[k] = v === '' ? null : v
  }
  return out
}

async function airtableError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    return body?.error?.message || JSON.stringify(body)
  } catch {
    return res.statusText
  }
}

export default async function handler(req: Request) {
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const id  = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 })

    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${id}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    })
    if (!res.ok) return new Response(JSON.stringify({ error: await airtableError(res) }), { status: res.status })
    const data = await res.json()
    return new Response(JSON.stringify({ record: data }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  const userId = await verifyMinister(token)
  if (!userId) return new Response(JSON.stringify({ error: 'Forbidden — minister role required' }), { status: 403 })

  if (req.method === 'PATCH') {
    const body = await req.json()
    const { id, fields } = body
    if (!id || !fields) return new Response(JSON.stringify({ error: 'id and fields required' }), { status: 400 })

    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: cleanFields(fields) }),
    })
    if (!res.ok) return new Response(JSON.stringify({ error: await airtableError(res) }), { status: res.status })
    const data = await res.json()
    return new Response(JSON.stringify({ record: data }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const { fields } = body
    if (!fields) return new Response(JSON.stringify({ error: 'fields required' }), { status: 400 })

    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: cleanFields(fields) }),
    })
    if (!res.ok) return new Response(JSON.stringify({ error: await airtableError(res) }), { status: res.status })
    const data = await res.json()
    return new Response(JSON.stringify({ record: data }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/admin-demon' }
