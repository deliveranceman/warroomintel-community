import { createClient } from '@supabase/supabase-js'
import { requireTier, CORS } from './_shared/access'
import { requireProfileAccess, bloodlineAccessErrorResponse } from './_shared/bloodlineAccess'

export const config = { path: '/api/bloodline-ancestor-list' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  const auth = await requireTier(req, 3)
  if (auth instanceof Response) return auth

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'GET only' }), {
      status: 405, headers: CORS,
    })
  }

  const url = new URL(req.url)
  const profileId = url.searchParams.get('profile_id') ?? ''

  if (!profileId) {
    return new Response(
      JSON.stringify({ error: 'validation', message: 'profile_id required' }),
      { status: 400, headers: CORS }
    )
  }

  const env = JSON.parse(process.env.SUPABASE || '{}')
  const supabase = createClient(env.url, env.serviceRoleKey)

  // Read access sufficient — creator or any shared user may list ancestors
  try {
    await requireProfileAccess(supabase, profileId, auth.userId)
  } catch (err) {
    return bloodlineAccessErrorResponse(err)
  }

  const { data: ancestors, error } = await supabase
    .from('bloodline_ancestors')
    .select('*')
    .eq('profile_id', profileId)
    .order('generation', { ascending: true, nullsFirst: false })
    .order('parent_lineage', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('[bloodline-ancestor-list] fetch error:', error.message)
    return new Response(JSON.stringify({ error: 'db_error' }), {
      status: 500, headers: CORS,
    })
  }

  return new Response(JSON.stringify({ ancestors: ancestors ?? [] }), {
    status: 200, headers: CORS,
  })
}
