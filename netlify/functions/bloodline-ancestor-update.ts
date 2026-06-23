import { createClient } from '@supabase/supabase-js'
import { requireTier, CORS } from './_shared/access'
import { requireProfileAccess, bloodlineAccessErrorResponse } from './_shared/bloodlineAccess'

export const config = { path: '/api/bloodline-ancestor-update' }

const VALID_GENDERS  = ['M', 'F', 'unknown']
const VALID_LINEAGES = ['paternal', 'maternal']
const VALID_ABUSE    = ['received', 'perpetrated', 'both', 'unknown']

export default async function handler(req: Request): Promise<Response> {
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

  let body: Record<string, unknown>
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
    console.error('[bloodline-ancestor-update] fetch error:', fetchErr.message)
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
        JSON.stringify({ error: 'forbidden', message: 'read-only access — only the creator can edit ancestors' }),
        { status: 403, headers: CORS }
      )
    }
  } catch (err) {
    return bloodlineAccessErrorResponse(err)
  }

  // Validate any provided enum/range fields
  if (body.gender !== undefined && body.gender !== null) {
    if (!VALID_GENDERS.includes(body.gender as string)) {
      return new Response(
        JSON.stringify({ error: 'validation', message: 'gender must be M, F, unknown, or null' }),
        { status: 400, headers: CORS }
      )
    }
  }

  if (body.parent_lineage !== undefined && body.parent_lineage !== null) {
    if (!VALID_LINEAGES.includes(body.parent_lineage as string)) {
      return new Response(
        JSON.stringify({ error: 'validation', message: 'parent_lineage must be paternal, maternal, or null' }),
        { status: 400, headers: CORS }
      )
    }
  }

  if (body.abuse !== undefined && body.abuse !== null) {
    if (!VALID_ABUSE.includes(body.abuse as string)) {
      return new Response(
        JSON.stringify({ error: 'validation', message: 'abuse must be received, perpetrated, both, unknown, or null' }),
        { status: 400, headers: CORS }
      )
    }
  }

  if (body.generation !== undefined && body.generation !== null) {
    const g = Number(body.generation)
    if (!Number.isInteger(g) || g < 0 || g > 4) {
      return new Response(
        JSON.stringify({ error: 'validation', message: 'generation must be integer 0–4 or null' }),
        { status: 400, headers: CORS }
      )
    }
  }

  if (body.freemasonry_degree !== undefined && body.freemasonry_degree !== null) {
    if (!Number.isInteger(Number(body.freemasonry_degree))) {
      return new Response(
        JSON.stringify({ error: 'validation', message: 'freemasonry_degree must be integer or null' }),
        { status: 400, headers: CORS }
      )
    }
  }

  if (body.birth_year !== undefined && body.birth_year !== null) {
    if (!Number.isInteger(Number(body.birth_year))) {
      return new Response(
        JSON.stringify({ error: 'validation', message: 'birth_year must be integer or null' }),
        { status: 400, headers: CORS }
      )
    }
  }

  if (body.death_year !== undefined && body.death_year !== null) {
    if (!Number.isInteger(Number(body.death_year))) {
      return new Response(
        JSON.stringify({ error: 'validation', message: 'death_year must be integer or null' }),
        { status: 400, headers: CORS }
      )
    }
  }

  if (body.secret_societies !== undefined && body.secret_societies !== null) {
    if (!Array.isArray(body.secret_societies)) {
      return new Response(
        JSON.stringify({ error: 'validation', message: 'secret_societies must be array or null' }),
        { status: 400, headers: CORS }
      )
    }
  }

  if (body.unknown_fields !== undefined && body.unknown_fields !== null) {
    if (!Array.isArray(body.unknown_fields)) {
      return new Response(
        JSON.stringify({ error: 'validation', message: 'unknown_fields must be array or null' }),
        { status: 400, headers: CORS }
      )
    }
  }

  // Build partial patch — only include provided fields
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  const textFields = [
    'name', 'birth_country', 'occupation', 'religion', 'military_service',
    'known_trauma', 'addiction', 'occult_involvement', 'lodge_membership', 'notes',
  ]
  for (const f of textFields) {
    if (body[f] !== undefined) {
      patch[f] = typeof body[f] === 'string' ? (body[f] as string).trim() || null : null
    }
  }

  const nullableEnums = ['gender', 'parent_lineage', 'abuse']
  for (const f of nullableEnums) {
    if (body[f] !== undefined) patch[f] = body[f] ?? null
  }

  const nullableInts = ['generation', 'freemasonry_degree', 'birth_year', 'death_year']
  for (const f of nullableInts) {
    if (body[f] !== undefined) {
      patch[f] = body[f] !== null ? Number(body[f]) : null
    }
  }

  if (body.suicide !== undefined) {
    patch.suicide = body.suicide === true || body.suicide === 'true'
  }

  const arrayFields = ['secret_societies', 'unknown_fields']
  for (const f of arrayFields) {
    if (body[f] !== undefined) patch[f] = body[f] ?? null
  }

  if (Object.keys(patch).length === 1) {
    // Only updated_at — no real fields provided
    return new Response(
      JSON.stringify({ error: 'validation', message: 'no fields to update' }),
      { status: 400, headers: CORS }
    )
  }

  const { data: ancestor, error } = await supabase
    .from('bloodline_ancestors')
    .update(patch)
    .eq('id', ancestorId)
    .select()
    .single()

  if (error) {
    console.error('[bloodline-ancestor-update] update error:', error.message)
    return new Response(JSON.stringify({ error: 'db_error' }), {
      status: 500, headers: CORS,
    })
  }

  return new Response(JSON.stringify({ ancestor }), { status: 200, headers: CORS })
}
