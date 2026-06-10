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
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: HEADERS })
  }

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const supabase = sb()
  const { data, error } = await supabase
    .from('resources')
    .select('id, title, topic, created_at')
    .neq('topic', 'ministry-library')
    .order('created_at', { ascending: false })
    .limit(3)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
  }

  return new Response(JSON.stringify({ resources: data ?? [] }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/latest-arsenal' }
