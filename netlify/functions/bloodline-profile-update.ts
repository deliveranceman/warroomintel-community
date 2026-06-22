import { createClient } from '@supabase/supabase-js'
import { requireTier, CORS } from './_shared/access'
import { requireProfileAccess, bloodlineAccessErrorResponse } from './_shared/bloodlineAccess'
import type { BloodlineStatus } from './_shared/bloodlineTypes'

export const config = { path: '/api/bloodline-profile-update' }

const VALID_STATUSES: BloodlineStatus[] = ['active', 'closed', 'paused']

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  const auth = await requireTier(req, 3)
  if (auth instanceof Response) return auth

  if (req.method !== 'PATCH') {
    return new Response(JSON.stringify({ error: 'PATCH only' }), {
      status: 405, headers: CORS,
    })
  }

  let body: { id?: unknown; subject_name?: unknown; notes?: unknown; status?: unknown }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400, headers: CORS,
    })
  }

  const profileId = typeof body.id === 'string' ? body.id.trim() : ''
  if (!profileId) {
    return new Response(
      JSON.stringify({ error: 'validation', message: 'id required' }),
      { status: 400, headers: CORS }
    )
  }

  // Build partial update — only include fields that were provided
  const patch: Record<string, unknown> = {}

  if (body.subject_name !== undefined) {
    const name = typeof body.subject_name === 'string' ? body.subject_name.trim() : ''
    if (!name || name.length > 200) {
      return new Response(
        JSON.stringify({ error: 'validation', message: 'subject_name must be 1-200 chars' }),
        { status: 400, headers: CORS }
      )
    }
    patch.subject_name = name
  }

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as BloodlineStatus)) {
      return new Response(
        JSON.stringify({ error: 'validation', message: 'status must be active, closed, or paused' }),
        { status: 400, headers: CORS }
      )
    }
    patch.status = body.status
  }

  if (body.notes !== undefined) {
    patch.notes = typeof body.notes === 'string' ? body.notes.trim() || null : null
  }

  if (Object.keys(patch).length === 0) {
    return new Response(
      JSON.stringify({ error: 'validation', message: 'no fields to update' }),
      { status: 400, headers: CORS }
    )
  }

  const env = JSON.parse(process.env.SUPABASE || '{}')
  const supabase = createClient(env.url, env.serviceRoleKey)

  const isCommandant = auth.level >= 5

  let canWrite: boolean
  try {
    const access = await requireProfileAccess(
      supabase, profileId, auth.userId,
      { allowCommandantOverride: isCommandant }
    )
    canWrite = access.canWrite
  } catch (err) {
    return bloodlineAccessErrorResponse(err)
  }

  if (!canWrite) {
    return new Response(
      JSON.stringify({ error: 'forbidden', message: 'read-only access — only the creator can edit' }),
      { status: 403, headers: CORS }
    )
  }

  const { data: profile, error } = await supabase
    .from('bloodline_profiles')
    .update(patch)
    .eq('id', profileId)
    .select()
    .single()

  if (error) {
    console.error('[bloodline-profile-update] update error:', error.message)
    return new Response(JSON.stringify({ error: 'db_error' }), {
      status: 500, headers: CORS,
    })
  }

  return new Response(JSON.stringify({ profile }), { status: 200, headers: CORS })
}
