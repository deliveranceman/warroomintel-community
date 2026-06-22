import { createClient } from '@supabase/supabase-js'
import { requireTier, CORS } from './_shared/access'

export const config = { path: '/api/bloodline-profile-create' }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  const auth = await requireTier(req, 3)
  if (auth instanceof Response) return auth

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405, headers: CORS,
    })
  }

  let body: { subject_name?: unknown; notes?: unknown }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400, headers: CORS,
    })
  }

  const subjectName = typeof body.subject_name === 'string' ? body.subject_name.trim() : ''
  if (!subjectName || subjectName.length > 200) {
    return new Response(
      JSON.stringify({ error: 'validation', message: 'subject_name required, 1-200 chars' }),
      { status: 400, headers: CORS }
    )
  }

  const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null

  const env = JSON.parse(process.env.SUPABASE || '{}')
  const supabase = createClient(env.url, env.serviceRoleKey)

  const { data: profile, error } = await supabase
    .from('bloodline_profiles')
    .insert({
      created_by:   auth.userId,
      subject_name: subjectName,
      status:       'active',
      notes,
    })
    .select()
    .single()

  if (error) {
    console.error('[bloodline-profile-create] insert error:', error.message)
    return new Response(JSON.stringify({ error: 'db_error' }), {
      status: 500, headers: CORS,
    })
  }

  return new Response(JSON.stringify({ profile }), { status: 201, headers: CORS })
}
