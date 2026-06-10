import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const supabase    = createClient(supabaseUrl!, supabaseServiceKey!)

export default async function handler(req: Request) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ feedback: data }), { status: 200, headers })
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const { type, title, description, priority } = body
    if (!title || !description || !type) {
      return new Response(JSON.stringify({ error: 'type, title, description required' }), { status: 400, headers })
    }
    const { data, error } = await supabase.from('feedback').insert({
      type, title, description,
      priority:          priority || 'medium',
      submitted_by_id:   auth.userId,
      submitted_by_name: auth.displayName,
      submitted_by_tier: auth.tier,
      status: 'open',
    }).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ feedback: data }), { status: 201, headers })
  }

  if (req.method === 'PATCH') {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })
    const role = auth.role
    if (role !== 'minister') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })
    const { status, admin_notes } = await req.json()
    const { data, error } = await supabase.from('feedback').update({ status, admin_notes }).eq('id', id).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ feedback: data }), { status: 200, headers })
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })
    const role = auth.role
    if (role !== 'minister') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })
    await supabase.from('feedback').delete().eq('id', id)
    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/feedback' }
