import { createClient } from '@supabase/supabase-js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function supabaseClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
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

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const ok = await resolveMinister(token)
  if (!ok) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })

  const sb = supabaseClient()

  // ── GET — return active context ──────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await sb.from('ministry_context').select('*').eq('is_active', true).order('updated_at', { ascending: false }).limit(1).single()
    if (error && error.code !== 'PGRST116') {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    }
    return new Response(JSON.stringify({ context: data || null }), { status: 200, headers })
  }

  // ── POST — upsert context ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = await req.json()
    const { context_text, label } = body
    if (!context_text?.trim()) return new Response(JSON.stringify({ error: 'context_text required' }), { status: 400, headers })

    // Check for existing active record
    const { data: existing } = await sb.from('ministry_context').select('id').eq('is_active', true).limit(1).single()

    let result
    if (existing?.id) {
      const { data, error } = await sb.from('ministry_context')
        .update({ context_text: context_text.trim(), label: label?.trim() || 'Main Ministry Voice', updated_at: new Date().toISOString() })
        .eq('id', existing.id).select().single()
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
      result = data
    } else {
      const { data, error } = await sb.from('ministry_context')
        .insert({ context_text: context_text.trim(), label: label?.trim() || 'Main Ministry Voice', is_active: true })
        .select().single()
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
      result = data
    }

    return new Response(JSON.stringify({ success: true, context: result }), { status: 200, headers })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/admin-context' }
