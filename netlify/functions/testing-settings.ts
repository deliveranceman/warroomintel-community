import { createClient } from '@supabase/supabase-js'
import { requireAdmin2 } from './_shared/access'

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

  const supabase = sb()

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('testing_settings')
      .select('testing_visible, testing_message')
      .eq('id', 1)
      .single()
    if (error) return new Response(JSON.stringify({ testing_visible: true, testing_message: '' }), { headers: HEADERS })
    return new Response(JSON.stringify(data), { headers: HEADERS })
  }

  if (req.method === 'PATCH') {
    const auth = await requireAdmin2(req)
    if (auth instanceof Response) return auth

    let body: any = {}
    try { body = await req.json() } catch {}
    const update: any = {}
    if (typeof body.testing_visible === 'boolean') update.testing_visible = body.testing_visible
    if (typeof body.testing_message === 'string')  update.testing_message = body.testing_message

    const { error } = await supabase.from('testing_settings').update(update).eq('id', 1)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ ok: true }), { headers: HEADERS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
}

export const config = { path: '/api/testing-settings' }
