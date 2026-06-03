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

function decodeJwt(token: string): any {
  try {
    const payload = token.split('.')[1]
    const decoded = Buffer.from(payload, 'base64url').toString('utf8')
    return JSON.parse(decoded)
  } catch { return null }
}

function getAuth(req: Request): { userId: string | null; tier: string; role: string } {
  const auth = req.headers.get('Authorization') || ''
  const token = auth.replace('Bearer ', '')
  if (!token) return { userId: null, tier: 'free', role: '' }
  const payload = decodeJwt(token)
  const meta = payload?.publicMetadata || payload?.['public_metadata'] || {}
  return { userId: payload?.sub || null, tier: meta.tier || 'free', role: meta.role || '' }
}

function tierLevel(t: string): number {
  return ({ free: 0, watchman: 0, soldier: 1, commander: 2, general: 3, minister: 3 }[t?.toLowerCase()] ?? 0)
}

function isAdmin(role: string, tier: string): boolean {
  return role === 'admin' || role === 'minister' || tierLevel(tier) >= 3
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: HEADERS })

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const tag = url.searchParams.get('tag')
    const { tier } = getAuth(req)
    const level = tierLevel(tier)

    let query = sb()
      .from('fringe_articles')
      .select('id, title, summary, wri_take, tag, source_type, source_url, source_name, significance, tier_required, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(60)

    if (tag && tag !== 'all') query = query.eq('tag', tag)

    const { data, error } = await query
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })

    const visible = (data || []).filter((a: any) => {
      if (a.tier_required === 'soldier' && level < 1) return false
      if (a.tier_required === 'commander' && level < 2) return false
      return true
    })
    return new Response(JSON.stringify(visible), { status: 200, headers: HEADERS })
  }

  if (req.method === 'POST') {
    const { userId, tier, role } = getAuth(req)
    if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
    if (!isAdmin(role, tier)) return new Response(JSON.stringify({ error: 'Admin only' }), { status: 403, headers: HEADERS })
    let body: any
    try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS }) }
    const { title, summary, wri_take, tag = 'disclosure', source_type = 'article', source_url, source_name, significance = 3, tier_required = 'free', status = 'pending' } = body
    if (!title || !summary) return new Response(JSON.stringify({ error: 'title and summary required' }), { status: 400, headers: HEADERS })
    const insert: any = { title, summary, tag, source_type, significance, tier_required, status }
    if (wri_take) insert.wri_take = wri_take
    if (source_url) insert.source_url = source_url
    if (source_name) insert.source_name = source_name
    if (status === 'published') insert.published_at = new Date().toISOString()
    const { data, error } = await sb().from('fringe_articles').insert(insert).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify(data), { status: 201, headers: HEADERS })
  }

  if (req.method === 'PATCH') {
    const { userId, tier, role } = getAuth(req)
    if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
    if (!isAdmin(role, tier)) return new Response(JSON.stringify({ error: 'Admin only' }), { status: 403, headers: HEADERS })
    let body: any
    try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS }) }
    const { id, status, wri_take, tag, significance, tier_required } = body
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: HEADERS })
    const updates: Record<string, any> = { reviewed_by: userId, reviewed_at: new Date().toISOString() }
    if (status !== undefined) { updates.status = status; if (status === 'published') updates.published_at = new Date().toISOString() }
    if (wri_take !== undefined) updates.wri_take = wri_take
    if (tag !== undefined) updates.tag = tag
    if (significance !== undefined) updates.significance = significance
    if (tier_required !== undefined) updates.tier_required = tier_required
    const { data, error } = await sb().from('fringe_articles').update(updates).eq('id', id).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify(data), { status: 200, headers: HEADERS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
}

export const config = { path: '/api/fringe-articles' }
