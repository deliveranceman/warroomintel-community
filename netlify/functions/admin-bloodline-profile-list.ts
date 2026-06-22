import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'

export const config = { path: '/api/admin-bloodline-profile-list' }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'GET only' }), {
      status: 405, headers: CORS,
    })
  }

  const env = JSON.parse(process.env.SUPABASE || '{}')
  const supabase = createClient(env.url, env.serviceRoleKey)

  const { data: profiles, error } = await supabase
    .from('bloodline_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[admin-bloodline-profile-list] fetch error:', error.message)
    return new Response(JSON.stringify({ error: 'db_error' }), {
      status: 500, headers: CORS,
    })
  }

  return new Response(
    JSON.stringify({ profiles: profiles ?? [], readOnly: true }),
    { status: 200, headers: CORS }
  )
}
