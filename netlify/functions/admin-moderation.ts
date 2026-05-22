const CLERK_SECRET = process.env.CLERK_SECRET_KEY!

async function resolveUser(token: string): Promise<{ userId: string; userData: any } | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return null
    const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${CLERK_SECRET}` },
    })
    if (!userRes.ok) return null
    const userData = await userRes.json()
    return { userId, userData }
  } catch { return null }
}

export default async function handler(req: Request) {
  const headers = { 'Content-Type': 'application/json' }
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

  const auth = await resolveUser(token)
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  if (auth.userData?.public_metadata?.role !== 'minister') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })
  }

  return new Response(JSON.stringify({
    posts: [],
    prayers: [],
    message: 'Connect Stream server-side SDK for full moderation',
  }), { status: 200, headers })
}

export const config = { path: '/api/admin-moderation' }
