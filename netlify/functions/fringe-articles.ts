import { createClient } from '@supabase/supabase-js'
import { requireAuth, requireAdmin2 } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: HEADERS })

  if (req.method === 'GET') {
    // Any authenticated user may call GET; tier from the verified Clerk record determines
    // which articles are visible (Watchman=basic, Commander=classified).
    const auth = await requireAuth(req)
    if (auth instanceof Response) return auth

    const level = auth.level

    const url = new URL(req.url)
    const tag  = url.searchParams.get('tag')

    let query = sb()
      .from('fringe_articles')
      .select('id, title, summary, wri_take, tag, source_type, source_url, source_name, significance, tier_required, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(60)

    if (tag && tag !== 'all') query = query.eq('tag', tag)

    const { data, error } = await query
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })

    // Filter by tier using the canonical ladder from _shared/access (minister=4, not 3).
    const visible = (data || []).filter((a: any) => {
      if (a.tier_required === 'soldier'   && level < 1) return false
      if (a.tier_required === 'commander' && level < 2) return false
      return true
    })
    return new Response(JSON.stringify(visible), { status: 200, headers: HEADERS })
  }

  if (req.method === 'POST') {
    // Admin (minister+) only.
    const auth = await requireAdmin2(req)
    if (auth instanceof Response) return auth

    let body: any
    try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS }) }

    const { title, summary, wri_take, tag = 'disclosure', source_type = 'article', source_url, source_name, significance = 3, tier_required = 'free', status = 'pending' } = body
    if (!title || !summary) return new Response(JSON.stringify({ error: 'title and summary required' }), { status: 400, headers: HEADERS })

    const insert: any = { title, summary, tag, source_type, significance, tier_required, status }
    if (wri_take)    insert.wri_take    = wri_take
    if (source_url)  insert.source_url  = source_url
    if (source_name) insert.source_name = source_name
    if (status === 'published') insert.published_at = new Date().toISOString()

    const { data, error } = await sb().from('fringe_articles').insert(insert).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify(data), { status: 201, headers: HEADERS })
  }

  if (req.method === 'PATCH') {
    // Admin (minister+) only.
    const auth = await requireAdmin2(req)
    if (auth instanceof Response) return auth

    let body: any
    try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS }) }

    const { id, status, wri_take, tag, significance, tier_required } = body
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: HEADERS })

    const updates: Record<string, any> = {
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
    }
    if (status !== undefined)        { updates.status = status; if (status === 'published') updates.published_at = new Date().toISOString() }
    if (wri_take !== undefined)       updates.wri_take    = wri_take
    if (tag !== undefined)            updates.tag         = tag
    if (significance !== undefined)   updates.significance = significance
    if (tier_required !== undefined)  updates.tier_required = tier_required

    const { data, error } = await sb().from('fringe_articles').update(updates).eq('id', id).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify(data), { status: 200, headers: HEADERS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
}

export const config = { path: '/api/fringe-articles' }
