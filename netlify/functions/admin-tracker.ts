import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS as HEADERS } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth
  const { userId: ministerUserId } = auth

  const client = sb()

  // ── GET ──────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const category = url.searchParams.get('category')
    let query = client.from('admin_tracker').select('*').order('category').order('name')
    if (category) query = query.eq('category', category) as any
    const { data, error } = await query
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ items: data }), { status: 200, headers: HEADERS })
  }

  // ── POST ─────────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    let body: any
    try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS }) }
    const { category, name, route, description, status, notes, priority, external_url, metadata } = body || {}
    if (!category || !name) return new Response(JSON.stringify({ error: 'category and name required' }), { status: 400, headers: HEADERS })

    const { data, error } = await client.from('admin_tracker').insert({
      category, name, route, description,
      status: status || 'in_progress',
      notes, priority: priority || 'medium',
      external_url, metadata: metadata || {},
    }).select().single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ item: data }), { status: 200, headers: HEADERS })
  }

  // ── PATCH ─────────────────────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    let body: any
    try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS }) }
    const { id, ...fields } = body || {}
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: HEADERS })

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    for (const k of ['status', 'notes', 'priority', 'name', 'description', 'route', 'external_url', 'metadata']) {
      if (k in fields) updates[k] = fields[k]
    }
    // Auto-set approved_by / approved_at when status → approved
    if (fields.status === 'approved') {
      updates.approved_by = ministerUserId
      updates.approved_at = new Date().toISOString()
    } else if (fields.status && fields.status !== 'approved') {
      // Clear approval if un-approving
      updates.approved_by = null
      updates.approved_at = null
    }

    const { data, error } = await client.from('admin_tracker').update(updates).eq('id', id).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ item: data }), { status: 200, headers: HEADERS })
  }

  // ── DELETE ────────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const url = new URL(req.url)
    const id  = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: HEADERS })
    const { error } = await client.from('admin_tracker').delete().eq('id', id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: HEADERS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
}

export const config = { path: '/api/admin-tracker' }
