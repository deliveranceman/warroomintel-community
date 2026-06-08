import { createClient } from '@supabase/supabase-js'
import { requireAdmin2 } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}


export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // GET: fetch latest active record (public)
  if (req.method === 'GET') {
    const { data, error } = await sb()
      .from('spirit_of_week')
      .select('*')
      .eq('active', true)
      .order('published_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return new Response(JSON.stringify({ sotw: null }), { status: 200, headers: CORS })
    }
    return new Response(JSON.stringify({ sotw: data }), { status: 200, headers: CORS })
  }

  // POST: requires minister auth
  if (req.method === 'POST') {
    const auth = await requireAdmin2(req)
    if (auth instanceof Response) return auth

    const body = await req.json().catch(() => ({}))
    const { spirit_name, minister_note, deliverance_tip } = body

    if (!spirit_name?.trim()) {
      return new Response(JSON.stringify({ error: 'spirit_name required' }), { status: 400, headers: CORS })
    }

    // Deactivate all existing records
    await sb().from('spirit_of_week').update({ active: false }).eq('active', true)

    // Insert new
    const { data, error } = await sb()
      .from('spirit_of_week')
      .insert({
        spirit_name:    spirit_name.trim(),
        minister_note:  minister_note?.trim() || null,
        deliverance_tip: deliverance_tip?.trim() || null,
        active:         true,
        created_by:     auth.userId,
      })
      .select('*')
      .single()

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })
    }

    return new Response(JSON.stringify({ success: true, sotw: data }), { status: 200, headers: CORS })
  }

  return new Response('Method not allowed', { status: 405, headers: CORS })
}

export const config = { path: '/api/spirit-of-week' }
