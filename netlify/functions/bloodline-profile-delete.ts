import { createClient } from '@supabase/supabase-js'
import { requireTier, CORS } from './_shared/access'
import {
  requireProfileAccess,
  bloodlineAccessErrorResponse,
} from './_shared/bloodlineAccess'

export const config = { path: '/api/bloodline-profile-delete' }

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

  if (!body.id) {
    return new Response(
      JSON.stringify({ error: 'missing_id' }),
      { status: 400, headers: CORS }
    )
  }

  const isCommandant = auth.level >= 5

  const env = JSON.parse(process.env.SUPABASE || '{}')
  const supabase = createClient(env.url, env.serviceRoleKey)

  try {
    const { canWrite } = await requireProfileAccess(
      supabase, body.id, auth.userId,
      { allowCommandantOverride: isCommandant }
    )

    if (!canWrite) {
      return new Response(
        JSON.stringify({ error: 'forbidden', message: 'only creator or commandant can delete' }),
        { status: 403, headers: CORS }
      )
    }

    // Cascade deletes handle ancestors/events/oaths/pattern_clusters/shares
    const { error } = await supabase
      .from('bloodline_profiles')
      .delete()
      .eq('id', body.id)

    if (error) {
      console.error('[bloodline-profile-delete] delete failed:', error.message)
      return new Response(
        JSON.stringify({ error: 'delete_failed', message: error.message }),
        { status: 500, headers: CORS }
      )
    }

    return new Response(
      JSON.stringify({ deleted: true, id: body.id }),
      { status: 200, headers: CORS }
    )
  } catch (err) {
    return bloodlineAccessErrorResponse(err)
  }
}
