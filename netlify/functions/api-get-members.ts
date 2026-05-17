import type { Handler } from '@netlify/functions'

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  const clerkSecret = process.env.CLERK_SECRET_KEY
  if (!clerkSecret) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing CLERK_SECRET_KEY' }) }

  try {
    const res = await fetch('https://api.clerk.com/v1/users?limit=500', {
      headers: {
        Authorization: `Bearer ${clerkSecret}`,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Clerk API error:', err)
      return { statusCode: 500, headers, body: JSON.stringify({ error: err }) }
    }

    const raw = await res.json()
    console.log('Clerk raw response type:', typeof raw, Array.isArray(raw) ? 'array len=' + raw.length : 'keys=' + Object.keys(raw).join(','))

    // Clerk v1 returns a plain array; guard for future envelope shapes
    const users = Array.isArray(raw) ? raw : (raw.data || raw.users || [])

    const members = users.map((u: any) => ({
      id: u.id,
      firstName: u.first_name || '',
      lastName: u.last_name || '',
      username: u.username || '',
      imageUrl: u.image_url || '',
      publicMetadata: {
        tier: u.public_metadata?.tier || 'Watchman',
        role: u.public_metadata?.role || 'member',
        bio: u.public_metadata?.bio || '',
        location: u.public_metadata?.location || '',
      },
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ members, debug: { rawType: typeof raw, isArray: Array.isArray(raw), length: users.length } }),
    }
  } catch (err: any) {
    console.error('get-members exception:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
