import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function extractUserId(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return payload.sub || null
  } catch { return null }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const userId = extractUserId(token)
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const action = url.searchParams.get('action')
  const typeFilter = url.searchParams.get('type')

  // GET — list all, ordered by upvotes DESC
  if (req.method === 'GET') {
    let query = supabase.from('platform_feedback').select('*').order('upvotes', { ascending: false }).order('created_at', { ascending: false })
    if (typeFilter) query = query.eq('type', typeFilter)
    const { data, error } = await query
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })

    // Fetch which items this user has upvoted
    const { data: userUpvotes } = await supabase
      .from('feedback_upvotes')
      .select('feedback_id')
      .eq('user_id', userId)
    const upvotedIds = new Set((userUpvotes || []).map((u: any) => u.feedback_id))
    const feedback = (data || []).map((f: any) => ({ ...f, userUpvoted: upvotedIds.has(f.id) }))
    return new Response(JSON.stringify({ feedback }), { status: 200, headers })
  }

  // POST — submit new feedback
  if (req.method === 'POST' && !action) {
    const body = await req.json()
    if (!body.title || !body.type) return new Response(JSON.stringify({ error: 'title and type required' }), { status: 400, headers })
    const { data, error } = await supabase.from('platform_feedback').insert({
      user_id: userId,
      user_name: body.userName || 'Warrior',
      type: body.type,
      title: body.title,
      description: body.description || null,
    }).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ feedback: { ...data, userUpvoted: false } }), { status: 201, headers })
  }

  // PATCH ?id=xxx&action=upvote — toggle upvote
  if (req.method === 'PATCH' && id && action === 'upvote') {
    const { data: existing } = await supabase
      .from('feedback_upvotes')
      .select('feedback_id')
      .eq('feedback_id', id)
      .eq('user_id', userId)
      .single()

    if (existing) {
      // Remove upvote
      await supabase.from('feedback_upvotes').delete().eq('feedback_id', id).eq('user_id', userId)
      await supabase.rpc('decrement_feedback_upvote', { fid: id }).catch(() => {
        supabase.from('platform_feedback').select('upvotes').eq('id', id).single().then(({ data: fd }) => {
          if (fd) supabase.from('platform_feedback').update({ upvotes: Math.max(0, (fd.upvotes || 1) - 1) }).eq('id', id)
        })
      })
      const { data: updated } = await supabase.from('platform_feedback').select('upvotes').eq('id', id).single()
      return new Response(JSON.stringify({ userUpvoted: false, upvotes: updated?.upvotes ?? 0 }), { status: 200, headers })
    } else {
      // Add upvote
      await supabase.from('feedback_upvotes').insert({ feedback_id: id, user_id: userId })
      const { data: fd } = await supabase.from('platform_feedback').select('upvotes').eq('id', id).single()
      const newCount = (fd?.upvotes || 0) + 1
      await supabase.from('platform_feedback').update({ upvotes: newCount }).eq('id', id)
      return new Response(JSON.stringify({ userUpvoted: true, upvotes: newCount }), { status: 200, headers })
    }
  }

  // PATCH ?id=xxx — update status (admin)
  if (req.method === 'PATCH' && id && !action) {
    const body = await req.json()
    const { data, error } = await supabase.from('platform_feedback').update({ status: body.status }).eq('id', id).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ feedback: data }), { status: 200, headers })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
}

export const config = { path: '/api/platform-feedback' }
