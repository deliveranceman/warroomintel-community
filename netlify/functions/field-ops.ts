import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

const TIER_LEVELS: Record<string, number> = {
  free: 0, watchman: 0, soldier: 1, commander: 2, general: 3, minister: 99,
}

async function resolveUser(token: string): Promise<{ userId: string; name: string; tier: string; role: string } | null> {
  try {
    if (!token || token.split('.').length !== 3) return null
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return null
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.username || 'Warrior'
    const tier = data?.public_metadata?.tier || 'free'
    const role = data?.public_metadata?.role || ''
    return { userId, name, tier, role }
  } catch { return null }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })

  const user = await resolveUser(token)
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })

  const isMinister    = user.role === 'minister'
  const isCommanderPlus = TIER_LEVELS[user.tier] >= 2 || isMinister

  const url      = new URL(req.url)
  const resource = url.searchParams.get('resource')
  const client   = sb()

  // ── CASE FILES ─────────────────────────────────────────────────────────────
  if (resource === 'cases') {

    if (req.method === 'GET') {
      const { data, error } = await client
        .from('case_files')
        .select('*')
        .eq('user_id', user.userId)
        .order('updated_at', { ascending: false })
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
      return new Response(JSON.stringify({ cases: data ?? [] }), { status: 200, headers: HEADERS })
    }

    if (!isCommanderPlus) {
      return new Response(JSON.stringify({ error: 'Commander tier required' }), { status: 403, headers: HEADERS })
    }

    if (req.method === 'POST') {
      let body: any
      try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS }) }

      const { subject_name, subject_alias, gender, age_range, status, primary_issue, tags, spirits_flagged, notes } = body
      if (!subject_name?.trim()) return new Response(JSON.stringify({ error: 'subject_name required' }), { status: 400, headers: HEADERS })

      const row = {
        user_id:         user.userId,
        subject_name:    subject_name.trim().slice(0, 200),
        subject_alias:   subject_alias?.trim().slice(0, 100) || null,
        gender:          gender || null,
        age_range:       age_range || null,
        status:          ['active', 'completed', 'archived'].includes(status) ? status : 'active',
        primary_issue:   primary_issue?.trim().slice(0, 2000) || null,
        tags:            Array.isArray(tags) ? tags.map((t: string) => String(t).trim()).filter(Boolean) : [],
        spirits_flagged: Array.isArray(spirits_flagged) ? spirits_flagged.map((s: string) => String(s).trim()).filter(Boolean) : [],
        notes:   notes?.trim().slice(0, 10000) || null,
        session_count:   0,
      }

      const { data, error } = await client.from('case_files').insert(row).select().single()
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
      return new Response(JSON.stringify({ case: data }), { status: 200, headers: HEADERS })
    }

    if (req.method === 'PATCH') {
      const id = url.searchParams.get('id')
      if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: HEADERS })

      let body: any
      try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS }) }

      const { data: existing } = await client.from('case_files').select('user_id').eq('id', id).single()
      if (!existing || existing.user_id !== user.userId) {
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: HEADERS })
      }

      const updates: Record<string, any> = { updated_at: new Date().toISOString() }
      for (const k of ['subject_name','subject_alias','gender','age_range','status','primary_issue','tags','spirits_flagged','notes','session_count','last_session_at']) {
        if (k in body) updates[k] = body[k]
      }

      const { data, error } = await client.from('case_files').update(updates).eq('id', id).select().single()
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
      return new Response(JSON.stringify({ case: data }), { status: 200, headers: HEADERS })
    }

    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id')
      if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: HEADERS })

      const { data: existing } = await client.from('case_files').select('user_id').eq('id', id).single()
      if (!existing || existing.user_id !== user.userId) {
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: HEADERS })
      }

      // Sessions cascade-delete via FK, but delete explicitly for safety
      await client.from('session_notes').delete().eq('case_file_id', id)
      const { error } = await client.from('case_files').delete().eq('id', id)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: HEADERS })
    }
  }

  // ── SESSION NOTES ───────────────────────────────────────────────────────────
  if (resource === 'sessions') {

    if (req.method === 'GET') {
      const caseId = url.searchParams.get('caseId')
      if (!caseId) return new Response(JSON.stringify({ error: 'caseId required' }), { status: 400, headers: HEADERS })

      const { data: cf } = await client.from('case_files').select('user_id').eq('id', caseId).single()
      if (!cf || cf.user_id !== user.userId) {
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: HEADERS })
      }

      const { data, error } = await client
        .from('session_notes')
        .select('*')
        .eq('case_file_id', caseId)
        .eq('user_id', user.userId)
        .order('session_date', { ascending: false })
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
      return new Response(JSON.stringify({ sessions: data ?? [] }), { status: 200, headers: HEADERS })
    }

    if (!isCommanderPlus) {
      return new Response(JSON.stringify({ error: 'Commander tier required' }), { status: 403, headers: HEADERS })
    }

    if (req.method === 'POST') {
      let body: any
      try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS }) }

      const {
        case_file_id, session_date, duration_minutes, outcome,
        spirits_encountered, breakthroughs, resistances,
        assignments_given, scriptures_used, follow_up_needed, private_notes,
      } = body

      if (!case_file_id) return new Response(JSON.stringify({ error: 'case_file_id required' }), { status: 400, headers: HEADERS })

      const { data: cf } = await client.from('case_files').select('user_id').eq('id', case_file_id).single()
      if (!cf || cf.user_id !== user.userId) {
        return new Response(JSON.stringify({ error: 'Case file not found' }), { status: 404, headers: HEADERS })
      }

      const row = {
        case_file_id,
        user_id:             user.userId,
        session_date:        session_date || new Date().toISOString().split('T')[0],
        duration_minutes:    duration_minutes ? Number(duration_minutes) : null,
        outcome:             ['breakthrough','partial','resistance','incomplete'].includes(outcome) ? outcome : 'incomplete',
        spirits_encountered: Array.isArray(spirits_encountered) ? spirits_encountered.map((s: string) => String(s).trim()).filter(Boolean) : [],
        breakthroughs:       breakthroughs?.trim().slice(0, 10000) || null,
        resistances:         resistances?.trim().slice(0, 10000) || null,
        assignments_given:   assignments_given?.trim().slice(0, 5000) || null,
        scriptures_used:     Array.isArray(scriptures_used) ? scriptures_used.map((s: string) => String(s).trim()).filter(Boolean) : [],
        follow_up_needed:    follow_up_needed === true,
        private_notes:       private_notes?.trim().slice(0, 10000) || null,
      }

      const { data, error } = await client.from('session_notes').insert(row).select().single()
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })

      // Update parent case file counts
      const { count } = await client
        .from('session_notes')
        .select('*', { count: 'exact', head: true })
        .eq('case_file_id', case_file_id)
      await client.from('case_files').update({
        session_count:   count ?? 0,
        last_session_at: new Date().toISOString(),
        updated_at:      new Date().toISOString(),
      }).eq('id', case_file_id)

      return new Response(JSON.stringify({ session: data }), { status: 200, headers: HEADERS })
    }

    if (req.method === 'PATCH') {
      const id = url.searchParams.get('id')
      if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: HEADERS })

      let body: any
      try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS }) }

      const { data: existing } = await client.from('session_notes').select('user_id').eq('id', id).single()
      if (!existing || existing.user_id !== user.userId) {
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: HEADERS })
      }

      const updates: Record<string, any> = { updated_at: new Date().toISOString() }
      for (const k of ['session_date','duration_minutes','outcome','spirits_encountered','breakthroughs','resistances','assignments_given','scriptures_used','follow_up_needed','private_notes']) {
        if (k in body) updates[k] = body[k]
      }

      const { data, error } = await client.from('session_notes').update(updates).eq('id', id).select().single()
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
      return new Response(JSON.stringify({ session: data }), { status: 200, headers: HEADERS })
    }

    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id')
      if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: HEADERS })

      const { data: existing } = await client
        .from('session_notes')
        .select('user_id, case_file_id')
        .eq('id', id)
        .single()
      if (!existing || existing.user_id !== user.userId) {
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: HEADERS })
      }

      const caseFileId = existing.case_file_id
      const { error } = await client.from('session_notes').delete().eq('id', id)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })

      // Recount sessions after delete
      const { count } = await client
        .from('session_notes')
        .select('*', { count: 'exact', head: true })
        .eq('case_file_id', caseFileId)
      await client.from('case_files').update({
        session_count: count ?? 0,
        updated_at:    new Date().toISOString(),
      }).eq('id', caseFileId)

      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: HEADERS })
    }
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: HEADERS })
}

export const config = { path: '/api/field-ops' }
