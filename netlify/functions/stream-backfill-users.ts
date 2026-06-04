import crypto from 'crypto'

const { apiKey, apiSecret } = JSON.parse(process.env.STREAM || '{}')

const HEADERS = { 'Content-Type': 'application/json' }

function streamJWT(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body   = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig    = crypto.createHmac('sha256', apiSecret ?? '').update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })

  const internalKey = req.headers.get('x-internal-key')
  if (!internalKey || internalKey !== process.env.INTERNAL_API_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  }

  // Fetch all users from Clerk
  const clerkRes = await fetch('https://api.clerk.com/v1/users?limit=100', {
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
  })
  if (!clerkRes.ok) {
    const err = await clerkRes.text()
    return new Response(JSON.stringify({ error: 'Clerk API error', detail: err }), { status: 500, headers: HEADERS })
  }

  const clerkUsers = await clerkRes.json() as any[]
  if (!clerkUsers.length) {
    return new Response(JSON.stringify({ upserted: 0 }), { headers: HEADERS })
  }

  // Build batch upsert payload (Stream accepts up to 100 per POST)
  const users: Record<string, { id: string; name: string; role: string }> = {}
  for (const u of clerkUsers) {
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.id
    users[u.id] = { id: u.id, name, role: 'user' }
  }

  const serverToken = streamJWT({ server: true })
  const upsertRes = await fetch(`https://chat.stream-io-api.com/users?api_key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: serverToken,
      'stream-auth-type': 'jwt',
    },
    body: JSON.stringify({ users }),
  })

  if (!upsertRes.ok) {
    const err = await upsertRes.json().catch(() => ({}))
    return new Response(JSON.stringify({ error: 'Stream upsert failed', detail: err }), { status: 502, headers: HEADERS })
  }

  console.log(`[stream-backfill] Upserted ${Object.keys(users).length} users into Stream`)
  return new Response(JSON.stringify({ upserted: Object.keys(users).length }), { headers: HEADERS })
}

export const config = { path: '/api/stream-backfill-users' }
