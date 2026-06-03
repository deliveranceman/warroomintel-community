import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

function decodeJwt(token: string): any {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString())
  } catch { return null }
}

function getUserId(req: Request): string | null {
  const header = req.headers.get('authorization') || ''
  if (!header.startsWith('Bearer ')) return null
  const payload = decodeJwt(header.slice(7))
  return payload?.sub || null
}

async function checkIsMinister(userId: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return false
    const data = await res.json()
    const role = data?.public_metadata?.role
    return role === 'minister' || role === 'admin'
  } catch { return false }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const url = new URL(req.url)
  const hotspotId = url.searchParams.get('hotspot_id')
  const id = url.searchParams.get('id')

  // ── GET ─────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const userId = getUserId(req)
    if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })

    let query = sb().from('body_map_manifestations').select('*')
    if (hotspotId) query = query.eq('hotspot_id', hotspotId)
    query = query.order('created_at', { ascending: true })

    const { data, error } = await query
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })
    return new Response(JSON.stringify({ manifestations: data || [] }), { status: 200, headers: CORS })
  }

  // ── WRITES — minister only ───────────────────────────────────────────────────
  const userId = getUserId(req)
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })
  const ok = await checkIsMinister(userId)
  if (!ok) return new Response(JSON.stringify({ error: 'Forbidden — minister role required' }), { status: 403, headers: CORS })

  // ── POST ─────────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = await req.json()
    const { hotspot_id, body_part, region, manifestation, spirit_names, spirit_airtable_ids, notes, source } = body
    if (!hotspot_id || !body_part || !region || !manifestation) {
      return new Response(JSON.stringify({ error: 'hotspot_id, body_part, region, and manifestation are required' }), { status: 400, headers: CORS })
    }
    const { data, error } = await sb().from('body_map_manifestations').insert({
      hotspot_id, body_part, region, manifestation,
      spirit_names: spirit_names || [],
      spirit_airtable_ids: spirit_airtable_ids || [],
      notes: notes || null,
      source: source || null,
      created_by: userId,
    }).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })
    return new Response(JSON.stringify({ manifestation: data }), { status: 201, headers: CORS })
  }

  // ── PUT ──────────────────────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: CORS })
    const body = await req.json()
    const { hotspot_id, body_part, region, manifestation, spirit_names, spirit_airtable_ids, notes, source } = body
    const { data, error } = await sb().from('body_map_manifestations').update({
      ...(hotspot_id !== undefined && { hotspot_id }),
      ...(body_part !== undefined && { body_part }),
      ...(region !== undefined && { region }),
      ...(manifestation !== undefined && { manifestation }),
      ...(spirit_names !== undefined && { spirit_names }),
      ...(spirit_airtable_ids !== undefined && { spirit_airtable_ids }),
      ...(notes !== undefined && { notes }),
      ...(source !== undefined && { source }),
    }).eq('id', id).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })
    return new Response(JSON.stringify({ manifestation: data }), { status: 200, headers: CORS })
  }

  // ── DELETE ───────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: CORS })
    const { error } = await sb().from('body_map_manifestations').delete().eq('id', id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS })
}

export const config = { path: '/api/body-map' }
