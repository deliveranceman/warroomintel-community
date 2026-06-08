import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS as headers } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

function supabaseClient() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const sb = supabaseClient()

  // ── GET — return all contexts ────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await sb
      .from('ministry_context')
      .select('id, label, context_text, scope, is_active, updated_at')
      .order('scope')
      .order('updated_at', { ascending: false })
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ contexts: data || [] }), { status: 200, headers })
  }

  // ── POST — create new context ────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = await req.json()
    const { label, context_text, scope = 'global', is_active = true } = body
    if (!context_text?.trim()) return new Response(JSON.stringify({ error: 'context_text required' }), { status: 400, headers })
    if (!['global', 'regional', 'session', 'assessment'].includes(scope)) {
      return new Response(JSON.stringify({ error: 'scope must be global, regional, session, or assessment' }), { status: 400, headers })
    }
    const { data, error } = await sb
      .from('ministry_context')
      .insert({
        label: label?.trim() || 'Ministry Context',
        context_text: context_text.trim(),
        scope,
        is_active,
      })
      .select()
      .single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ success: true, context: data }), { status: 200, headers })
  }

  // ── PATCH — update context by id ────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const body = await req.json()
    const { id, label, context_text, scope, is_active } = body
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })
    if (scope && !['global', 'regional', 'session', 'assessment'].includes(scope)) {
      return new Response(JSON.stringify({ error: 'invalid scope' }), { status: 400, headers })
    }
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (label !== undefined) updates.label = label?.trim() || 'Ministry Context'
    if (context_text !== undefined) updates.context_text = context_text.trim()
    if (scope !== undefined) updates.scope = scope
    if (is_active !== undefined) updates.is_active = is_active
    const { data, error } = await sb.from('ministry_context').update(updates).eq('id', id).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ success: true, context: data }), { status: 200, headers })
  }

  // ── DELETE — delete context by id ───────────────────────────────────────────
  if (req.method === 'DELETE') {
    const body = await req.json()
    const { id } = body
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })
    const { error } = await sb.from('ministry_context').delete().eq('id', id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/admin-context' }
