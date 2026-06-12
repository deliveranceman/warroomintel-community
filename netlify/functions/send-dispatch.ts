import { createClient } from '@supabase/supabase-js'
import { sendWebPushToUser } from './_shared/sendWebPush.js'
import { requireAdmin2 } from './_shared/access'

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const TIER_LEVEL: Record<string, number> = {
  watchman: 0, free: 0, soldier: 1, commander: 2, general: 3, minister: 4, commandant: 5,
}

function memberLevel(m: { tier?: string; role?: string }): number {
  const tier = String(m.tier || '').toLowerCase().trim()
  const role = String(m.role || '').toLowerCase().trim()
  const roleBoost = role === 'commandant' ? 5 : (role === 'minister' || role === 'admin') ? 4 : 0
  return Math.max(TIER_LEVEL[tier] ?? 0, roleBoost)
}

function sb() {
  const { url, serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')
  return createClient(url, serviceRoleKey)
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: HEADERS })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
  }

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS })
  }

  const { title, body: msgBody, target, url: notifUrl, audience } = body || {}
  if (!title?.trim()) {
    return new Response(JSON.stringify({ error: 'title required' }), { status: 400, headers: HEADERS })
  }
  if (!msgBody?.trim()) {
    return new Response(JSON.stringify({ error: 'body required' }), { status: 400, headers: HEADERS })
  }
  if (!audience?.kind || !['all', 'tier'].includes(audience.kind)) {
    return new Response(JSON.stringify({ error: 'audience.kind must be "all" or "tier"' }), { status: 400, headers: HEADERS })
  }

  const client = sb()

  const { data: allMembers, error: membersError } = await client
    .from('members')
    .select('clerk_id, tier, role')

  if (membersError) {
    console.error('[send-dispatch] members query error:', membersError.message)
    return new Response(JSON.stringify({ error: membersError.message }), { status: 500, headers: HEADERS })
  }

  const minLevel = audience.kind === 'tier' ? Number(audience.minLevel ?? 0) : 0
  const recipients: string[] = (allMembers || [])
    .filter((m: any) => audience.kind === 'all' || memberLevel(m) >= minLevel)
    .map((m: any) => m.clerk_id)
    .filter(Boolean)

  const uniqueRecipients = [...new Set(recipients)]
  console.log(`[send-dispatch] audience=${JSON.stringify(audience)} recipients=${uniqueRecipients.length}`)

  // Await: batch-insert bell rows for all recipients
  let rowsWritten = 0
  if (uniqueRecipients.length > 0) {
    const rows = uniqueRecipients.map(userId => ({
      user_id: userId,
      title: title.trim(),
      body: msgBody.trim(),
      url: notifUrl || '/community',
      type: 'dispatch',
      ...(target ? { target } : {}),
    }))
    const { error: insertError } = await client.from('user_notifications').insert(rows)
    if (insertError) {
      console.error('[send-dispatch] user_notifications insert error:', insertError.message)
    } else {
      rowsWritten = rows.length
    }
  }

  // Best-effort: push per recipient — missing subscription is not an error
  const pushesAttempted = uniqueRecipients.length
  const pushData: Record<string, string> = { type: 'dispatch' }
  if (target?.section) pushData.section = String(target.section)

  await Promise.allSettled(
    uniqueRecipients.map(userId =>
      sendWebPushToUser(userId, title.trim(), msgBody.trim(), pushData).catch(() => {})
    )
  )

  console.log('[send-dispatch] done:', { rowsWritten, pushesAttempted })
  return new Response(
    JSON.stringify({ ok: true, rowsWritten, pushesAttempted }),
    { status: 200, headers: HEADERS }
  )
}

export const config = { path: '/api/send-dispatch' }
