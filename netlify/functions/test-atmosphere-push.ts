import { requireAdmin2 } from './_shared/access'

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: HEADERS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

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
