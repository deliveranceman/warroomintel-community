import type { Handler } from '@netlify/functions'

export const handler: Handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  try {
    const { userId, bio, location } = JSON.parse(event.body || '{}')
    if (!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId required' }) }

    const clerkSecret = process.env.CLERK_SECRET_KEY
    if (!clerkSecret) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing CLERK_SECRET_KEY' }) }

    const getRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${clerkSecret}` }
    })
    const existing = await getRes.json()
    const existingMeta = existing.public_metadata || {}

    const patchRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${clerkSecret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        public_metadata: {
          ...existingMeta,
          ...(bio !== undefined && { bio }),
          ...(location !== undefined && { location }),
        }
      })
    })

    if (!patchRes.ok) {
      const err = await patchRes.text()
      return { statusCode: 500, headers, body: JSON.stringify({ error: err }) }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
