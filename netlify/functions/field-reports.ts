import { createClient } from '@supabase/supabase-js'
import { requireTier } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

export default async function handler(req: Request) {
  const headers = { 'Content-Type': 'application/json' }

  const auth = await requireTier(req, 1)
  if (auth instanceof Response) return auth

  if (req.method === 'GET') {
    let query = supabase.from('field_reports').select('*').order('created_at', { ascending: false })
    if (!auth.isAdmin) query = query.eq('status', 'approved')
    const { data, error } = await query.limit(20)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ reports: data }), { status: 200, headers })
  }

  if (req.method === 'POST') {
    const { spirit_names, manifestations, entry_points, outcome, notes, location_city, location_state } = await req.json()
    if (!spirit_names || !manifestations) {
      return new Response(JSON.stringify({ error: 'spirit_names and manifestations required' }), { status: 400, headers })
    }
    const { data, error } = await supabase.from('field_reports').insert({
      submitted_by_id:   auth.userId,
      submitted_by_name: auth.displayName,
      submitted_by_tier: auth.tier,
      is_founder:        auth.founding ?? false,
      location_city:     location_city || null,
      location_state:    location_state || null,
      spirit_names, manifestations,
      entry_points:  entry_points || null,
      outcome:       outcome || null,
      notes:         notes || null,
      status:        'pending',
    }).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ report: data, message: 'Submitted for review' }), { status: 201, headers })
  }

  if (req.method === 'PATCH') {
    if (!auth.isAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })
    const { id, status } = await req.json()
    if (!id || !['approved', 'rejected'].includes(status)) {
      return new Response(JSON.stringify({ error: 'id and status (approved|rejected) required' }), { status: 400, headers })
    }
    await supabase.from('field_reports').update({ status }).eq('id', id)
    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/field-reports' }
