import { createClient } from '@supabase/supabase-js'
import { requireTier, requireAdmin2 } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const url = new URL(req.url)
  const hotspotId = url.searchParams.get('hotspot_id')
  const id = url.searchParams.get('id')

  // ── GET — Commander+ required ────────────────────────────────────────────────
  if (req.method === 'GET') {
    const auth = await requireTier(req, 2)
    if (auth instanceof Response) return auth

    let query = sb().from('body_map_manifestations').select('*')
    if (hotspotId) query = query.eq('hotspot_id', hotspotId)
    query = query.order('created_at', { ascending: true })

    const { data, error } = await query
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })
    return new Response(JSON.stringify({ manifestations: data || [] }), { status: 200, headers: CORS })
  }

  // ── WRITES — minister/admin only ─────────────────────────────────────────────
  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  // ── POST ─────────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = await req.json()
    const { hotspot_id, body_part, region, manifestation, spirit_names, spirit_airtable_ids, notes, source } = body
    if (!hotspot_id || !body_part || !region || !manifestation) {
      return new Response(JSON.stringify({ error: 'hotspot_id, body_part, region, and manifestation are required' }), { status: 400, headers: CORS })
    }
    const { data, error } = await sb().from('body_map_manifestations').insert({
      hotspot_id, body_part, region, manifestation,
      spirit_names:        spirit_names || [],
      spirit_airtable_ids: spirit_airtable_ids || [],
      notes:      notes || null,
      source:     source || null,
      created_by: auth.userId,
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
      ...(hotspot_id          !== undefined && { hotspot_id }),
      ...(body_part           !== undefined && { body_part }),
      ...(region              !== undefined && { region }),
      ...(manifestation       !== undefined && { manifestation }),
      ...(spirit_names        !== undefined && { spirit_names }),
      ...(spirit_airtable_ids !== undefined && { spirit_airtable_ids }),
      ...(notes               !== undefined && { notes }),
      ...(source              !== undefined && { source }),
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
