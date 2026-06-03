import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

const TIER_ORDER: Record<string, number> = {
  free: 0, watchman: 0, soldier: 1, commander: 2, general: 3, minister: 4,
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

async function resolveUser(token: string): Promise<{ userId: string; tier: number; isMinister: boolean } | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return null
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    const role = (data?.public_metadata?.role as string) || ''
    const tierStr = (data?.public_metadata?.tier as string)?.toLowerCase() || 'free'
    const isMinister = role === 'minister'
    const tier = isMinister ? TIER_ORDER.minister : (TIER_ORDER[tierStr] ?? 0)
    return { userId, tier, isMinister }
  } catch { return null }
}

async function requireMinister(req: Request): Promise<{ userId: string } | Response> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const user = await resolveUser(token)
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  if (!user.isMinister) return new Response(JSON.stringify({ error: 'Minister role required' }), { status: 403, headers })
  return { userId: user.userId }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const url = new URL(req.url)
  const id  = url.searchParams.get('id')

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    let userTierNum = 0
    let isMinister  = false
    const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
    if (token) {
      const user = await resolveUser(token)
      if (user) { userTierNum = user.tier; isMinister = user.isMinister }
    }

    const showAll = url.searchParams.get('all') === '1' && isMinister

    let query = sb()
      .from('field_manual')
      .select('id, category, category_slug, category_order, category_icon, title, slug, content, youtube_url, min_tier, is_published, created_at')
      .order('category_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (!showAll) query = query.eq('is_published', true)

    const { data, error } = await query

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })

    // Group by category, gate content by tier
    const catMap: Record<string, any> = {}
    for (const row of data || []) {
      const minTierNum = TIER_ORDER[row.min_tier] ?? 0
      const locked = !showAll && userTierNum < minTierNum

      if (!catMap[row.category_slug]) {
        catMap[row.category_slug] = {
          category: row.category,
          category_slug: row.category_slug,
          category_order: row.category_order,
          category_icon: row.category_icon,
          articles: [],
        }
      }
      catMap[row.category_slug].articles.push({
        id: row.id,
        title: row.title,
        slug: row.slug,
        min_tier: row.min_tier,
        youtube_url: row.youtube_url || '',
        is_published: row.is_published,
        content: locked ? null : (row.content || ''),
        locked,
      })
    }

    const categories = Object.values(catMap).sort((a, b) => a.category_order - b.category_order)
    return new Response(JSON.stringify({ categories }), { status: 200, headers })
  }

  // ── POST ─────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const auth = await requireMinister(req)
    if (auth instanceof Response) return auth

    const body = await req.json()
    const { category, category_slug, category_order, category_icon, title, slug, content, youtube_url, min_tier, is_published } = body
    if (!category || !title || !slug) {
      return new Response(JSON.stringify({ error: 'category, title, and slug are required' }), { status: 400, headers })
    }

    const { data, error } = await sb()
      .from('field_manual')
      .insert({
        category: category.trim(),
        category_slug: (category_slug || category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')).trim(),
        category_order: category_order ?? 0,
        category_icon: category_icon || '📖',
        title: title.trim(),
        slug: slug.trim(),
        content: content || '',
        youtube_url: youtube_url || '',
        min_tier: min_tier || 'free',
        is_published: is_published ?? false,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ article: data }), { status: 201, headers })
  }

  // ── PATCH ─────────────────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const auth = await requireMinister(req)
    if (auth instanceof Response) return auth
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })

    const body = await req.json()
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    const allowed = ['category', 'category_slug', 'category_order', 'category_icon', 'title', 'slug', 'content', 'youtube_url', 'min_tier', 'is_published']
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    const { data, error } = await sb()
      .from('field_manual')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ article: data }), { status: 200, headers })
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const auth = await requireMinister(req)
    if (auth instanceof Response) return auth
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })

    const { error } = await sb().from('field_manual').delete().eq('id', id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
  }

  return new Response('Method not allowed', { status: 405, headers })
}

export const config = { path: '/api/field-manual' }
