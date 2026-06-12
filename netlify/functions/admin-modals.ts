import { requireAdmin2 } from './_shared/access'

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

function sbHeaders(prefer?: string) {
  const { serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  // GET — list all modals for admin management UI
  if (req.method === 'GET') {
    const res = await fetch(
      `${sbBase()}/modals?order=priority.desc,created_at.desc`,
      { headers: sbHeaders() },
    )
    if (!res.ok) return json({ error: 'Failed to fetch modals' }, 500)
    const data = await res.json().catch(() => [])
    return json({ modals: data })
  }

  let body: any
  try { body = await req.json() } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { action } = body || {}

  // POST action=create
  if (req.method === 'POST' && action === 'create') {
    const { type, title, body: modalBody, cta_label, cta_link, audience, frequency, requires_acceptance, priority, active } = body
    if (!title?.trim()) return json({ error: 'title required' }, 400)
    if (!modalBody?.trim()) return json({ error: 'body required' }, 400)

    const row: Record<string, unknown> = {
      type:               type || 'announcement',
      title:              title.trim(),
      body:               modalBody.trim(),
      audience:           audience || { kind: 'all' },
      frequency:          frequency || 'once',
      requires_acceptance: requires_acceptance ?? false,
      priority:           Number(priority ?? 0),
      active:             active ?? true,
    }
    if (cta_label) row.cta_label = cta_label
    if (cta_link)  row.cta_link  = cta_link

    const res = await fetch(`${sbBase()}/modals`, {
      method: 'POST',
      headers: sbHeaders('return=representation'),
      body: JSON.stringify(row),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[admin-modals] create error:', err)
      return json({ error: 'Failed to create modal' }, 500)
    }
    const created = await res.json().catch(() => [])
    return json({ ok: true, modal: Array.isArray(created) ? created[0] : created })
  }

  // POST action=update
  if (req.method === 'POST' && action === 'update') {
    const { id, ...updates } = body
    if (!id) return json({ error: 'id required' }, 400)

    // Strip fields that must not be updated via this endpoint
    delete updates.action
    delete updates.id
    delete updates.created_at

    const res = await fetch(`${sbBase()}/modals?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: sbHeaders('return=representation'),
      body: JSON.stringify(updates),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[admin-modals] update error:', err)
      return json({ error: 'Failed to update modal' }, 500)
    }
    const updated = await res.json().catch(() => [])
    return json({ ok: true, modal: Array.isArray(updated) ? updated[0] : updated })
  }

  // POST action=delete
  if (req.method === 'POST' && action === 'delete') {
    const { id } = body
    if (!id) return json({ error: 'id required' }, 400)

    const res = await fetch(`${sbBase()}/modals?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: sbHeaders(),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[admin-modals] delete error:', err)
      return json({ error: 'Failed to delete modal' }, 500)
    }
    return json({ ok: true })
  }

  return json({ error: 'Unknown action' }, 400)
}

export const config = { path: '/api/admin-modals' }
