import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

async function resolveMinister(token: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return false
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return false
    const data = await res.json()
    return data?.public_metadata?.role === 'minister'
  } catch { return false }
}

// In-process cache (best-effort in serverless)
let _cached: string | null = null
let _cacheExpiry = 0

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const url = new URL(req.url)
  const isAdmin = url.searchParams.get('admin') === 'true'
  const id = url.searchParams.get('id')
  const action = url.searchParams.get('action')

  // ── GET (public) — return active context text with 60s cache ─────────────
  if (req.method === 'GET' && !isAdmin) {
    if (_cached !== null && Date.now() < _cacheExpiry) {
      return new Response(JSON.stringify({ context: _cached }), { status: 200, headers })
    }
    const { data } = await sb()
      .from('ministry_context')
      .select('context_text')
      .eq('is_active', true)
      .single()
    _cached = data?.context_text || null
    _cacheExpiry = Date.now() + 60_000
    return new Response(JSON.stringify({ context: _cached }), { status: 200, headers })
  }

  // All remaining routes require minister auth
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const isMinister = await resolveMinister(token)
  if (!isMinister) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })

  // ── GET ?admin=true — return all versions ordered by version DESC ─────────
  if (req.method === 'GET' && isAdmin) {
    const { data, error } = await sb()
      .from('ministry_context')
      .select('*')
      .order('version', { ascending: false })
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ versions: data || [] }), { status: 200, headers })
  }

  // ── POST — create new version ─────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = await req.json()
    const { label, context_text, notes, activate = true } = body
    if (!label?.trim() || !context_text?.trim()) {
      return new Response(JSON.stringify({ error: 'label and context_text required' }), { status: 400, headers })
    }
    const { data: maxRow } = await sb()
      .from('ministry_context')
      .select('version')
      .order('version', { ascending: false })
      .limit(1)
      .single()
    const nextVersion = (maxRow?.version || 0) + 1

    if (activate) {
      await sb().from('ministry_context').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
      _cached = null // invalidate cache
    }

    const { data, error } = await sb()
      .from('ministry_context')
      .insert({
        version: nextVersion,
        label: label.trim(),
        context_text: context_text.trim(),
        notes: notes?.trim() || null,
        is_active: activate,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ id: data.id, version: data.version }), { status: 201, headers })
  }

  // ── PATCH ?id=xxx&action=activate ─────────────────────────────────────────
  if (req.method === 'PATCH' && id && action === 'activate') {
    await sb().from('ministry_context').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    const { error } = await sb().from('ministry_context').update({ is_active: true }).eq('id', id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    _cached = null // invalidate cache
    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  }

  // ── PATCH ?id=xxx (no action) — update label/notes only ──────────────────
  if (req.method === 'PATCH' && id) {
    const body = await req.json()
    const updates: Record<string, any> = {}
    if (body.label !== undefined) updates.label = body.label.trim()
    if (body.notes !== undefined) updates.notes = body.notes?.trim() || null
    const { error } = await sb().from('ministry_context').update(updates).eq('id', id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
}

export const config = { path: '/api/ministry-context' }
