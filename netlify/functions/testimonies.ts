import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
const CLERK_SECRET = process.env.CLERK_SECRET_KEY!

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

async function resolveUser(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return null
    const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${CLERK_SECRET}` },
    })
    if (!userRes.ok) return null
    const userData = await userRes.json()
    return { userId, userData }
  } catch { return null }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const auth = await resolveUser(token)
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

  const { userId, userData } = auth
  const userName = `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || 'Warrior'
  const userTier = userData?.public_metadata?.tier || 'free'
  const userImage = userData?.image_url || ''
  const role = userData?.public_metadata?.role
  const isFounder = !!(userData?.public_metadata?.foundingMember) || userTier.startsWith('charter')
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  // GET testimonies
  if (req.method === 'GET') {
    const showAll = url.searchParams.get('all') === 'true'

    let query = supabase.from('testimonies').select('*').order('created_at', { ascending: false })

    if (!showAll || role !== 'minister') {
      query = query.eq('status', 'approved')
    }

    const { data } = await query
    return new Response(JSON.stringify({ testimonies: data || [] }), { status: 200, headers })
  }

  // POST submit testimony
  if (req.method === 'POST') {
    const { title, body, category, isAnonymous } = await req.json()
    if (!title?.trim() || !body?.trim()) {
      return new Response(JSON.stringify({ error: 'Title and body required' }), { status: 400, headers })
    }
    const { data, error } = await supabase
      .from('testimonies')
      .insert({
        user_id: userId,
        user_name: isAnonymous ? 'Anonymous Warrior' : userName,
        user_tier: userTier,
        user_image: isAnonymous ? '' : userImage,
        is_founder: !isAnonymous && isFounder,
        title: title.trim(),
        body: body.trim(),
        category: category || 'personal',
        is_anonymous: isAnonymous || false,
        status: 'pending',
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

  // PATCH approve/reject (minister only)
  if (req.method === 'PATCH' && id) {
    if (role !== 'minister') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })
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

  // DELETE (minister only)
  if (req.method === 'DELETE' && id) {
    if (role !== 'minister') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })
    await supabase.from('testimonies').delete().eq('id', id)
    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
}

export const config = { path: '/api/testimonies' }
