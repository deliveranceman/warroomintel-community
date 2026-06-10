import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  // GET testimonies
  if (req.method === 'GET') {
    const showAll = url.searchParams.get('all') === 'true'

    let query = supabase.from('testimonies').select('*').order('created_at', { ascending: false })

    if (!showAll || !auth.isAdmin) {
      query = query.eq('status', 'approved')
    }

    const { data } = await query
    return new Response(JSON.stringify({ testimonies: data || [] }), { status: 200, headers })
  }

  // POST submit testimony — Soldier tier required
  if (req.method === 'POST') {
    if (auth.level < 1) {
      return new Response(JSON.stringify({ error: 'Soldier tier required to submit a testimony' }), { status: 403, headers })
    }
    const { title, body, category, isAnonymous } = await req.json()
    if (!title?.trim() || !body?.trim()) {
      return new Response(JSON.stringify({ error: 'Title and body required' }), { status: 400, headers })
    }
    const { data, error } = await supabase
      .from('testimonies')
      .insert({
        user_id:      auth.userId,
        user_name:    isAnonymous ? 'Anonymous Warrior' : auth.displayName,
        user_tier:    auth.tier,
        user_image:   isAnonymous ? '' : auth.imageUrl,
        is_founder:   auth.founding ?? false,
        title:        title.trim(),
        body:         body.trim(),
        category:     category || 'personal',
        is_anonymous: isAnonymous || false,
        status:       'pending',
      })
      .select()
      .single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ testimony: data }), { status: 201, headers })
  }

  // PUT reaction — any authenticated user can react once
  if (req.method === 'PUT' && id) {
    const { data: current } = await supabase.from('testimonies').select('reaction_count').eq('id', id).single()
    const next = ((current?.reaction_count as number) || 0) + 1
    const { error } = await supabase.from('testimonies').update({ reaction_count: next }).eq('id', id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ reaction_count: next }), { status: 200, headers })
  }

  // PATCH approve/reject (admin only — minister+)
  if (req.method === 'PATCH' && id) {
    if (!auth.isAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })
    const { status } = await req.json()
    const { data, error } = await supabase
      .from('testimonies')
      .update({ status, approved_at: status === 'approved' ? new Date().toISOString() : null })
      .eq('id', id)
      .select()
      .single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ testimony: data }), { status: 200, headers })
  }

  // DELETE (admin only — minister+)
  if (req.method === 'DELETE' && id) {
    if (!auth.isAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })
    await supabase.from('testimonies').delete().eq('id', id)
    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
}

export const config = { path: '/api/testimonies' }
