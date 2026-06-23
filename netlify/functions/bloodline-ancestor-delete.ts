import { createClient } from '@supabase/supabase-js'
import { requireTier, CORS } from './_shared/access'
import { requireProfileAccess, bloodlineAccessErrorResponse } from './_shared/bloodlineAccess'

export const config = { path: '/api/bloodline-ancestor-delete' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'method_not_allowed' }),
      { status: 405, headers: CORS }
    )
  }

  const auth = await requireTier(req, 3)
  if (auth instanceof Response) return auth

  let body: { id?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400, headers: CORS,
    })
  }

  const ancestorId = typeof body.id === 'string' ? body.id.trim() : ''
  if (!ancestorId) {
    return new Response(
      JSON.stringify({ error: 'validation', message: 'id required' }),
      { status: 400, headers: CORS }
    )
  }

  const env = JSON.parse(process.env.SUPABASE || '{}')
  const supabase = createClient(env.url, env.serviceRoleKey)

  // Fetch ancestor to resolve profile_id
  const { data: existing, error: fetchErr } = await supabase
    .from('bloodline_ancestors')
    .select('profile_id')
    .eq('id', ancestorId)
    .maybeSingle()

  if (fetchErr) {
    console.error('[bloodline-ancestor-delete] fetch error:', fetchErr.message)
    return new Response(JSON.stringify({ error: 'db_error' }), {
      status: 500, headers: CORS,
    })
  }
  if (!existing) {
    return new Response(
      JSON.stringify({ error: 'not_found', message: 'ancestor not found' }),
      { status: 404, headers: CORS }
    )
  }

  const profileId = existing.profile_id
  const isCommandant = auth.level >= 5

  try {
    const { canWrite } = await requireProfileAccess(
      supabase, profileId, auth.userId,
      { allowCommandantOverride: isCommandant }
    )
    if (!canWrite) {
      return new Response(
        JSON.stringify({ error: 'forbidden', message: 'read-only access — only the creator can delete ancestors' }),
        { status: 403, headers: CORS }
      )
    }
  } catch (err) {
    return bloodlineAccessErrorResponse(err)
  }

  // bloodline_events.ancestor_id and bloodline_oaths.ancestor_id are ON DELETE SET NULL —
  // deleting this ancestor orphans those rows gracefully (they stay on the profile)
  const { error } = await supabase
    .from('bloodline_ancestors')
    .delete()
    .eq('id', ancestorId)

  if (error) {
    console.error('[bloodline-ancestor-delete] delete error:', error.message)
    return new Response(
      JSON.stringify({ error: 'delete_failed', message: error.message }),
      { status: 500, headers: CORS }
    )
  }

  return new Response(
    JSON.stringify({ deleted: true, id: ancestorId }),
    { status: 200, headers: CORS }
  )
}
