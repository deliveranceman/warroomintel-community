import { createClient } from '@supabase/supabase-js'

const supabase    = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const CLERK_SECRET = process.env.CLERK_SECRET_KEY!

async function resolveUser(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return null
    const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!userRes.ok) return null
    const userData = await userRes.json()
    return { userId, userData, meta: userData?.public_metadata }
  } catch { return null }
}

const tierLevel = (t: string) => ({ free: 0, soldier: 1, commander: 2, general: 3 }[t?.toLowerCase()] ?? 0)

export default async function handler(req: Request) {
  const headers = { 'Content-Type': 'application/json' }
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

  const auth = await resolveUser(token)
  if (!auth) return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers })

  const { userId, userData, meta } = auth
  const isMinister = meta?.role === 'minister'
  const submitterTier = (meta?.tier as string) || 'free'
  const isFounder = !!(meta?.foundingMember) || submitterTier.startsWith('charter')

  if (req.method === 'GET') {
    let query = supabase.from('field_reports').select('*').order('created_at', { ascending: false })
    if (!isMinister) query = query.eq('status', 'approved')
    const { data, error } = await query.limit(20)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ reports: data }), { status: 200, headers })
  }

  if (req.method === 'POST') {
    if (tierLevel(meta?.tier) < 2) {
      return new Response(JSON.stringify({ error: 'Commander tier required to submit field reports' }), { status: 403, headers })
    }
    const { spirit_names, manifestations, entry_points, outcome, notes, location_city, location_state } = await req.json()
    if (!spirit_names || !manifestations) {
      return new Response(JSON.stringify({ error: 'spirit_names and manifestations required' }), { status: 400, headers })
    }
    const { data, error } = await supabase.from('field_reports').insert({
      submitted_by_id:   userId,
      submitted_by_name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Anonymous',
      submitted_by_tier: submitterTier,
      is_founder:        isFounder,
      location_city: location_city || null,
      location_state: location_state || null,
      spirit_names, manifestations,
      entry_points: entry_points || null,
      outcome: outcome || null,
      notes: notes || null,
      status: 'pending',
    }).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ report: data, message: 'Submitted for review' }), { status: 201, headers })
  }

  if (req.method === 'PATCH') {
    if (!isMinister) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })
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
