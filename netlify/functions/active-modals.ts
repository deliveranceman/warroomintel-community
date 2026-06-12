import { requireAuth } from './_shared/access'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json' }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}

function sbBase(): string {
  const { url } = JSON.parse(process.env.SUPABASE || '{}')
  return `${url}/rest/v1`
}

function sbHeaders() {
  const { serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS })
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const userLevel = auth.level

  // Fetch all active modals ordered by priority desc
  const modalsRes = await fetch(
    `${sbBase()}/modals?active=eq.true&order=priority.desc`,
    { headers: sbHeaders() },
  )
  if (!modalsRes.ok) return json({ modal: null })

  const modals: any[] = await modalsRes.json().catch(() => [])
  if (!Array.isArray(modals) || modals.length === 0) return json({ modal: null })

  // Fetch this user's modal_events (all time — we need "once" dedup and "daily" dedup)
  const eventsRes = await fetch(
    `${sbBase()}/modal_events?user_id=eq.${encodeURIComponent(auth.userId)}&select=modal_id,action,created_at`,
    { headers: sbHeaders() },
  )
  const events: any[] = eventsRes.ok ? await eventsRes.json().catch(() => []) : []

  // Build lookup: modalId -> most recent event
  const eventByModal: Record<string, { action: string; created_at: string }> = {}
  for (const e of (Array.isArray(events) ? events : [])) {
    const prev = eventByModal[e.modal_id]
    if (!prev || e.created_at > prev.created_at) {
      eventByModal[e.modal_id] = { action: e.action, created_at: e.created_at }
    }
  }

  const now = Date.now()

  for (const modal of modals) {
    // Audience filter
    const audience = modal.audience || { kind: 'all' }
    if (audience.kind === 'tier') {
      const minLevel = Number(audience.minLevel ?? 0)
      if (userLevel < minLevel) continue
    } else if (audience.kind === 'free_only') {
      if (userLevel !== 0) continue  // exclude anyone level >= 1 (soldier+)
    }

    // Frequency filter — canonical vocab: 'once_ever' | 'once_per_day' | 'every_login'
    // Any unrecognized/legacy value (old 'once','daily','always') treated as 'once_per_day'.
    const last = eventByModal[modal.id]
    const freq: string = modal.frequency || 'once_per_day'
    const lastDismissed = last && (last.action === 'dismissed' || last.action === 'accepted')

    if (freq === 'once_ever') {
      if (lastDismissed) continue
    } else if (freq === 'every_login') {
      // never suppress
    } else {
      // 'once_per_day' or any unrecognized legacy value — safe default: suppress within 24h
      if (lastDismissed && now - Date.parse(last!.created_at) < 24 * 60 * 60 * 1000) continue
    }

    // This is the first eligible modal
    return json({ modal })
  }

  return json({ modal: null })
}

export const config = { path: '/api/active-modals' }
