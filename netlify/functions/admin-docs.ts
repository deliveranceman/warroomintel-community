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

const VALID_SURFACES = new Set(['help', 'architecture'])

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  // ── GET — list docs ────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const surface = url.searchParams.get('surface') ?? ''

    let query = `${sbBase()}/admin_docs?order=category.asc,sort_order.asc,title.asc&select=id,surface,category,title,body,sort_order,updated_at`
    if (surface && VALID_SURFACES.has(surface)) {
      query += `&surface=eq.${encodeURIComponent(surface)}`
    }

    const res = await fetch(query, { headers: sbHeaders() })
    if (!res.ok) {
      const err = await res.text()
      console.error('[admin-docs] list error:', err)
      return json({ error: 'Failed to fetch docs' }, 500)
    }
    const docs = await res.json().catch(() => [])
    return json({ docs: Array.isArray(docs) ? docs : [] })
  }

  // ── POST — create / update / delete ───────────────────────────────────────
  if (req.method === 'POST') {
    let body: any
    try { body = await req.json() } catch {
      return json({ error: 'Invalid JSON' }, 400)
    }

    const { action } = body || {}

    if (action === 'create') {
      const { surface, category, title, body: docBody, sort_order } = body
      if (!surface || !VALID_SURFACES.has(surface)) return json({ error: 'surface must be "help" or "architecture"' }, 400)
      if (!title?.trim()) return json({ error: 'title required' }, 400)
      if (!docBody?.trim()) return json({ error: 'body required' }, 400)

      const res = await fetch(`${sbBase()}/admin_docs`, {
        method: 'POST',
        headers: sbHeaders('return=representation'),
        body: JSON.stringify({
          surface,
          category: category?.trim() || 'General',
          title: title.trim(),
          body: docBody.trim(),
          sort_order: Number(sort_order ?? 0),
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        console.error('[admin-docs] create error:', err)
        return json({ error: 'Failed to create doc' }, 500)
      }
      const created = await res.json().catch(() => [])
      return json({ ok: true, doc: Array.isArray(created) ? created[0] : created })
    }

    if (action === 'update') {
      const { id, surface, category, title, body: docBody, sort_order } = body
      if (!id) return json({ error: 'id required' }, 400)
      if (surface && !VALID_SURFACES.has(surface)) return json({ error: 'surface must be "help" or "architecture"' }, 400)

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (surface !== undefined)   updates.surface    = surface
      if (category !== undefined)  updates.category   = category?.trim() || 'General'
      if (title !== undefined)     updates.title      = title.trim()
      if (docBody !== undefined)   updates.body       = docBody.trim()
      if (sort_order !== undefined) updates.sort_order = Number(sort_order)

      const res = await fetch(`${sbBase()}/admin_docs?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: sbHeaders('return=representation'),
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const err = await res.text()
        console.error('[admin-docs] update error:', err)
        return json({ error: 'Failed to update doc' }, 500)
      }
      const updated = await res.json().catch(() => [])
      return json({ ok: true, doc: Array.isArray(updated) ? updated[0] : updated })
    }

    if (action === 'delete') {
      const { id } = body
      if (!id) return json({ error: 'id required' }, 400)

      const res = await fetch(`${sbBase()}/admin_docs?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: sbHeaders(),
      })
      if (!res.ok) {
        const err = await res.text()
        console.error('[admin-docs] delete error:', err)
        return json({ error: 'Failed to delete doc' }, 500)
      }
      return json({ ok: true })
    }

    return json({ error: 'Unknown action' }, 400)
  }

  return json({ error: 'Method not allowed' }, 405)
}

export const config = { path: '/api/admin-docs' }
