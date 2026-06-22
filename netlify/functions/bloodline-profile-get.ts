import { createClient } from '@supabase/supabase-js'
import { requireTier, CORS } from './_shared/access'
import { requireProfileAccess, bloodlineAccessErrorResponse } from './_shared/bloodlineAccess'

export const config = { path: '/api/bloodline-profile-get' }

export default async function handler(req: Request) {
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
  const profileId = url.searchParams.get('id') ?? ''

  if (!profileId) {
    return new Response(
      JSON.stringify({ error: 'validation', message: 'id required' }),
      { status: 400, headers: CORS }
    )
  }

  const env = JSON.parse(process.env.SUPABASE || '{}')
  const supabase = createClient(env.url, env.serviceRoleKey)

  try {
    const { profile, canWrite } = await requireProfileAccess(supabase, profileId, auth.userId)
    return new Response(JSON.stringify({ profile, canWrite }), { status: 200, headers: CORS })
  } catch (err) {
    return bloodlineAccessErrorResponse(err)
  }
}
