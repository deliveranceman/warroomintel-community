import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: JSON_HEADERS })

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const body = await req.json().catch(() => ({})) as { mood?: string }
  const mood = String(body.mood || '').trim().slice(0, 64)
  if (!mood) return new Response(JSON.stringify({ error: 'mood required' }), { status: 400, headers: JSON_HEADERS })

  const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

  // user_id is the cryptographically verified caller — never a client-supplied value.
  const { error } = await supabase.from('watchman_checkins').insert({ user_id: auth.userId, mood })
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: JSON_HEADERS })

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS })
}

export const config = { path: '/api/watchman-checkin' }
