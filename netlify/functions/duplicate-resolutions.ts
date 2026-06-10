import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: HEADERS })

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const supabase = sb()

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('duplicate_resolutions')
      .select('spirit_name_a, spirit_name_b, resolution')
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ resolutions: data || [] }), { status: 200, headers: HEADERS })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}))
    const { spirit_name_a, spirit_name_b, resolution } = body
    if (!spirit_name_a || !spirit_name_b) {
      return new Response(JSON.stringify({ error: 'spirit_name_a and spirit_name_b required' }), { status: 400, headers: HEADERS })
    }
    const { error } = await supabase.from('duplicate_resolutions').insert({
      spirit_name_a,
      spirit_name_b,
      resolution: resolution || 'dismissed',
    })
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: HEADERS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
}

export const config = { path: '/api/duplicate-resolutions' }
