import { createClient } from '@supabase/supabase-js'
import { requireTier } from './_shared/access'

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

  const auth = await requireTier(req, 1)
  if (auth instanceof Response) return auth

  const supabase = sb()

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('bug_reports')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ bugs: data }), { headers: HEADERS })
  }

  if (req.method === 'POST') {
    let body: any = {}
    try { body = await req.json() } catch {}
    const { title, description, steps_to_reproduce, expected_behavior, actual_behavior, severity, category, screenshot_url } = body
    if (!title || !description) {
      return new Response(JSON.stringify({ error: 'title and description required' }), { status: 400, headers: HEADERS })
    }
    const { data, error } = await supabase
      .from('bug_reports')
      .insert({
        title, description,
        steps_to_reproduce: steps_to_reproduce || null,
        expected_behavior: expected_behavior || null,
        actual_behavior: actual_behavior || null,
        severity: severity || 'medium',
        category: category || 'other',
        screenshot_url: screenshot_url || null,
        submitted_by: auth.userId,
        submitted_by_name: auth.displayName,
        submitted_by_tier: auth.tier,
      })
      .select()
      .single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ bug: data }), { status: 201, headers: HEADERS })
  }

  if (req.method === 'PATCH') {
    // admin: update status / resolved_note
    let body: any = {}
    try { body = await req.json() } catch {}
    const { id, status, resolved_note } = body
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: HEADERS })
    const update: any = {}
    if (status) update.status = status
    if (resolved_note !== undefined) update.resolved_note = resolved_note
    if (status === 'resolved') update.resolved_at = new Date().toISOString()
    const { error } = await supabase.from('bug_reports').update(update).eq('id', id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ ok: true }), { headers: HEADERS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
}

export const config = { path: '/api/testing-bugs' }
