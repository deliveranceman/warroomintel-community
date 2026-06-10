import { createClient } from '@supabase/supabase-js'
import { requireAdmin2 } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('intel_links')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(10)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ links: data }), { status: 200, headers })
  }

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  if (req.method === 'POST') {
    const { title, url, note, source, tier_required } = await req.json()
    if (!title || !url) return new Response(JSON.stringify({ error: 'title and url required' }), { status: 400, headers })
    const { data, error } = await supabase.from('intel_links')
      .insert({ title, url, note: note || null, source: source || null, tier_required: tier_required || 'Free' })
      .select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ link: data }), { status: 201, headers })
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })
    await supabase.from('intel_links').update({ active: false }).eq('id', id)
    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/intel-links' }
