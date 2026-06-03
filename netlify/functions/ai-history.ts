import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Content-Type': 'application/json',
}

function extractUserId(token: string | null): string | null {
  if (!token || token.split('.').length !== 3) return null
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    return payload.sub || null
  } catch { return null }
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: HEADERS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim() || null
  const userId = extractUserId(token)
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })

  const url = new URL(req.url)

  // GET — list history
  if (req.method === 'GET') {
    const tool  = url.searchParams.get('tool') || null
    const saved = url.searchParams.get('saved')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100)

    let query = sb()
      .from('ai_search_history')
      .select('id, tool, query, response, context, saved, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (tool) query = query.eq('tool', tool)
    if (saved === 'true') query = query.eq('saved', true)

    const { data, error } = await query
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ history: data }), { status: 200, headers: HEADERS })
  }

  // POST — insert new record
  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}))
    const { tool, query, response, context } = body
    if (!tool || !query) return new Response(JSON.stringify({ error: 'tool and query required' }), { status: 400, headers: HEADERS })

    const { data, error } = await sb()
      .from('ai_search_history')
      .insert({ user_id: userId, tool, query, response: response || null, context: context || {} })
      .select('id')
      .single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ id: data.id }), { status: 201, headers: HEADERS })
  }

  // PATCH — toggle saved
  if (req.method === 'PATCH') {
    const id = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: HEADERS })

    const body = await req.json().catch(() => ({}))
    const { saved } = body

    const { error } = await sb()
      .from('ai_search_history')
      .update({ saved: Boolean(saved) })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: HEADERS })
  }

  // DELETE — remove record
  if (req.method === 'DELETE') {
    const id = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: HEADERS })

    const { error } = await sb()
      .from('ai_search_history')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: HEADERS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
}
