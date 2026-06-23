import { createClient } from '@supabase/supabase-js'
import { requireTier, CORS } from './_shared/access'
import { requireProfileAccess, bloodlineAccessErrorResponse } from './_shared/bloodlineAccess'

export const config = { path: '/api/bloodline-ancestor-add' }

const VALID_GENDERS    = ['M', 'F', 'unknown']
const VALID_LINEAGES   = ['paternal', 'maternal']
const VALID_ABUSE      = ['received', 'perpetrated', 'both', 'unknown']

export default async function handler(req: Request): Promise<Response> {
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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400, headers: CORS,
    })
  }

  const profileId = typeof body.profile_id === 'string' ? body.profile_id.trim() : ''
  if (!profileId) {
    return new Response(
      JSON.stringify({ error: 'validation', message: 'profile_id required' }),
      { status: 400, headers: CORS }
    )
  }

  // Validate enum + range fields
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
    const fd = Number(body.freemasonry_degree)
    if (!Number.isInteger(fd)) {
      return new Response(
        JSON.stringify({ error: 'validation', message: 'freemasonry_degree must be integer or null' }),
        { status: 400, headers: CORS }
      )
    }
  }

  if (body.birth_year !== undefined && body.birth_year !== null) {
    const by = Number(body.birth_year)
    if (!Number.isInteger(by)) {
      return new Response(
        JSON.stringify({ error: 'validation', message: 'birth_year must be integer or null' }),
        { status: 400, headers: CORS }
      )
    }
  }

  if (body.death_year !== undefined && body.death_year !== null) {
    const dy = Number(body.death_year)
    if (!Number.isInteger(dy)) {
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

  const env = JSON.parse(process.env.SUPABASE || '{}')
  const supabase = createClient(env.url, env.serviceRoleKey)

  const isCommandant = auth.level >= 5

  try {
    const { canWrite } = await requireProfileAccess(
      supabase, profileId, auth.userId,
      { allowCommandantOverride: isCommandant }
    )
    if (!canWrite) {
      return new Response(
        JSON.stringify({ error: 'forbidden', message: 'read-only access — only the creator can add ancestors' }),
        { status: 403, headers: CORS }
      )
    }
  } catch (err) {
    return bloodlineAccessErrorResponse(err)
  }

  const row: Record<string, unknown> = {
    profile_id: profileId,
  }

  const textFields = [
    'name', 'birth_country', 'occupation', 'religion', 'military_service',
    'known_trauma', 'addiction', 'occult_involvement', 'lodge_membership', 'notes',
  ]
  for (const f of textFields) {
    if (body[f] !== undefined) {
      row[f] = typeof body[f] === 'string' ? (body[f] as string).trim() || null : null
    }
  }

  const nullableEnums = ['gender', 'parent_lineage', 'abuse']
  for (const f of nullableEnums) {
    if (body[f] !== undefined) row[f] = body[f] ?? null
  }

  const nullableInts = ['generation', 'freemasonry_degree', 'birth_year', 'death_year']
  for (const f of nullableInts) {
    if (body[f] !== undefined) {
      row[f] = body[f] !== null ? Number(body[f]) : null
    }
  }

  if (body.suicide !== undefined) {
    row.suicide = body.suicide === true || body.suicide === 'true'
  }

  const arrayFields = ['secret_societies', 'unknown_fields']
  for (const f of arrayFields) {
    if (body[f] !== undefined) row[f] = body[f] ?? null
  }

  const { data: ancestor, error } = await supabase
    .from('bloodline_ancestors')
    .insert(row)
    .select()
    .single()

  if (error) {
    console.error('[bloodline-ancestor-add] insert error:', error.message)
    return new Response(JSON.stringify({ error: 'db_error' }), {
      status: 500, headers: CORS,
    })
  }

  return new Response(JSON.stringify({ ancestor }), { status: 201, headers: CORS })
}
