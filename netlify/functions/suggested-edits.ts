import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const client = sb()

  // ── POST — submit a suggested edit (any authenticated user) ─────────────────
  if (req.method === 'POST') {
    let body: any
    try { body = await req.json() } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS })
    }

    const { content_type, content_id, content_title, issue_type, description, suggestion } = body
    if (!content_type?.trim()) return new Response(JSON.stringify({ error: 'content_type required' }), { status: 400, headers: HEADERS })
    if (!content_id?.trim())   return new Response(JSON.stringify({ error: 'content_id required' }), { status: 400, headers: HEADERS })
    if (!issue_type?.trim())   return new Response(JSON.stringify({ error: 'issue_type required' }), { status: 400, headers: HEADERS })
    if (!description?.trim())  return new Response(JSON.stringify({ error: 'description required' }), { status: 400, headers: HEADERS })

    const { data, error } = await client.from('suggested_edits').insert({
      user_id:       auth.userId,
      user_name:     auth.displayName,
      user_tier:     auth.tier,
      content_type:  content_type.trim(),
      content_id:    content_id.trim(),
      content_title: content_title?.trim() || null,
      issue_type:    issue_type.trim(),
      description:   description.trim(),
      suggestion:    suggestion?.trim() || null,
      status:        'pending',
    }).select().single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ edit: data }), { status: 201, headers: HEADERS })
  }

  // ── GET — list all suggested edits (admin only) ──────────────────────────────
  if (req.method === 'GET') {
    if (!auth.isAdmin) return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: HEADERS })

    const url    = new URL(req.url)
    const status = url.searchParams.get('status')

    let query = client.from('suggested_edits').select('*').order('created_at', { ascending: false })
    if (status && status !== 'all') query = query.eq('status', status)

    const { data, error } = await query
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ edits: data ?? [] }), { status: 200, headers: HEADERS })
  }

  // ── PATCH — update status / admin_notes (admin only) ─────────────────────────
  if (req.method === 'PATCH') {
    if (!auth.isAdmin) return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: HEADERS })

    let body: any
    try { body = await req.json() } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS })
    }

    const { id, status, admin_notes } = body
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: HEADERS })

    const patch: Record<string, any> = {}
    if (status)                       patch.status      = status
    if (admin_notes !== undefined)    patch.admin_notes = admin_notes
    if (status && status !== 'pending') patch.reviewed_at = new Date().toISOString()

    const { data, error } = await client.from('suggested_edits').update(patch).eq('id', id).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ edit: data }), { status: 200, headers: HEADERS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
}

export const config = { path: '/api/suggested-edits' }
