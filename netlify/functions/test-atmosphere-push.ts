const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-internal-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function decodeUserId(authHeader: string | null): string | null {
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return payload.sub ?? null
  } catch { return null }
}

async function isAuthorized(req: Request): Promise<boolean> {
  // 1. x-internal-key header (used by scripts/curl)
  const internalKey = req.headers.get('x-internal-key')
  if (internalKey) {
    const validKey = process.env.INTERNAL_API_KEY || 'wri-internal-2026-backfill'
    if (internalKey === validKey) return true
  }

  // 2. Service role key in Bearer
  const { serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (serviceRoleKey && token === serviceRoleKey) return true

  // 3. Clerk minister JWT
  const userId = decodeUserId(authHeader)
  if (!userId) return false
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (res.ok) {
      const data = await res.json()
      return data?.public_metadata?.role === 'minister'
    }
  } catch {}
  return false
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: HEADERS })

  const authorized = await isAuthorized(req)
  if (!authorized) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })

  const { serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')

  let body: any = {}
  try { body = await req.json() } catch {}

  const {
    title    = '📡 Atmosphere Test Alert',
    message  = 'This is a test of the Watchman Atmosphere push notification system.',
    url: targetUrl = '/community',
    userId,        // optional: send only to this user
    targetUserId,  // alias
  } = body

  const pushPayload: Record<string, string> = { title, body: message, url: targetUrl }
  const recipientId = userId || targetUserId
  if (recipientId) pushPayload.userId = recipientId

  console.log('[test-atmosphere-push] sending to:', recipientId || 'all', 'title:', title)

  const pushRes = await fetch(`${process.env.URL || ''}/api/send-push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceRoleKey}` },
    body: JSON.stringify(pushPayload),
  })

  let pushData: any = {}
  try { pushData = await pushRes.json() } catch {}

  console.log('[test-atmosphere-push] result:', JSON.stringify(pushData))

  return new Response(JSON.stringify({ ok: pushRes.ok, push: pushData }), {
    status: pushRes.ok ? 200 : 502,
    headers: HEADERS,
  })
}

export const config = { path: '/api/test-atmosphere-push' }
