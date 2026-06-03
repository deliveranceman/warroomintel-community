import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function getSupabase() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

function decodeUserId(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return payload.sub || null
  } catch { return null }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const sb = getSupabase()
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  // GET — list sessions for user
  if (req.method === 'GET') {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
    const userId = token ? decodeUserId(token) : null
    if (!userId) return new Response(JSON.stringify({ sessions: [] }), { status: 200, headers: CORS })

    const { data, error } = await sb
      .from('sessions')
      .select('id,subject_alias,session_number,status,current_phase,created_at,updated_at,started_at,total_elapsed_seconds,spirit_sequence,completed_phases,case_file_id')
      .eq('created_by', userId)
      .order('updated_at', { ascending: false })
      .limit(20)

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })
    return new Response(JSON.stringify({ sessions: data || [] }), { status: 200, headers: CORS })
  }

  // POST — create session
  if (req.method === 'POST') {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
    const userId = token ? decodeUserId(token) : 'anonymous'

    let body: any
    try { body = await req.json() } catch { body = {} }

    const { subject_alias, session_number, case_file_id, spirit_sequence, team_members } = body

    if (!subject_alias?.trim()) {
      return new Response(JSON.stringify({ error: 'subject_alias required' }), { status: 400, headers: CORS })
    }

    const { data, error } = await sb
      .from('sessions')
      .insert({
        created_by: userId,
        subject_alias: subject_alias.trim(),
        session_number: session_number || 1,
        case_file_id: case_file_id || null,
        spirit_sequence: spirit_sequence || [],
        team_members: team_members || [],
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })
    return new Response(JSON.stringify({ session: data }), { status: 201, headers: CORS })
  }

  // PATCH — update session (merge patch)
  if (req.method === 'PATCH') {
    let body: any
    try { body = await req.json() } catch { body = {} }

    const { id: bodyId, ...fields } = body
    const sessionId = id || bodyId
    if (!sessionId) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: CORS })

    const { data, error } = await sb
      .from('sessions')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })
    return new Response(JSON.stringify({ session: data }), { status: 200, headers: CORS })
  }

  // DELETE — soft delete (mark completed)
  if (req.method === 'DELETE' && id) {
    const { error } = await sb.from('sessions').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS })
}

export const config = { path: '/api/sessions' }
