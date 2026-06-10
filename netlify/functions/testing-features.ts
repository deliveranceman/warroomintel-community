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

  const supabase = sb()

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('feature_requests')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ features: data }), { headers: HEADERS })
  }

  if (req.method === 'POST') {
    let body: any = {}
    try { body = await req.json() } catch {}
    const { title, description, expected_behavior } = body
    if (!title || !description) {
      return new Response(JSON.stringify({ error: 'title and description required' }), { status: 400, headers: HEADERS })
    }
    const { data, error } = await supabase
      .from('feature_requests')
      .insert({
        title, description,
        expected_behavior:  expected_behavior || null,
        submitted_by:       auth.userId,
        submitted_by_name:  auth.displayName,
        submitted_by_tier:  auth.tier,
      })
      .select()
      .single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ feature: data }), { status: 201, headers: HEADERS })
  }

  if (req.method === 'PATCH') {
    if (!auth.isAdmin) return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: HEADERS })
    let body: any = {}
    try { body = await req.json() } catch {}
    const { id, status, admin_note } = body
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: HEADERS })
    const update: any = {}
    if (status)                update.status     = status
    if (admin_note !== undefined) update.admin_note = admin_note
    const { error } = await supabase.from('feature_requests').update(update).eq('id', id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ ok: true }), { headers: HEADERS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
}

export const config = { path: '/api/testing-features' }
