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
  } catch(e) { return null }
}

function tierNum(t: string) {
  const m: Record<string, number> = { free: 0, watchman: 0, soldier: 1, commander: 2, general: 3, minister: 4 }
  return m[t?.toLowerCase()] ?? 0
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const auth = await resolveUser(token)
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

  const { userData } = auth
  const role = userData?.public_metadata?.role
  const userTier = (userData?.public_metadata?.tier || 'free').toLowerCase()
  const url = new URL(req.url)
  const topic = url.searchParams.get('topic')
  const id = url.searchParams.get('id')

  if (req.method === 'GET' && topic) {
    const { data } = await supabase
      .from('fringe_articles')
      .select('id, topic, title, summary, tier, status, author_name, created_at')
      .eq('topic', topic)
      .eq('status', 'published')
      .order('sort_order', { ascending: true })

    const withAccess = (data || []).map((a: any) => ({
      ...a,
      hasAccess: tierNum(userTier) >= tierNum(a.tier),
      body: undefined,
    }))

    return new Response(JSON.stringify({ articles: withAccess }), { status: 200, headers })
  }

  if (req.method === 'GET' && id) {
    const { data: article } = await supabase
      .from('fringe_articles')
      .select('*')
      .eq('id', id)
      .eq('status', 'published')
      .single()

    if (!article) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers })
    if (tierNum(userTier) < tierNum(article.tier)) {
      return new Response(JSON.stringify({ error: 'Upgrade required', requiredTier: article.tier }), { status: 403, headers })
    }
    return new Response(JSON.stringify({ article }), { status: 200, headers })
  }

  if (role !== 'minister') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const { data, error } = await supabase
      .from('fringe_articles')
      .insert({
        topic: body.topic,
        title: body.title,
        body: body.body,
        summary: body.summary || '',
        tier: body.tier || 'free',
        status: body.status || 'draft',
        sort_order: body.sortOrder || 0,
      })
      .select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ article: data }), { status: 201, headers })
  }

  if (req.method === 'PATCH' && id) {
    const body = await req.json()
    const { data, error } = await supabase
      .from('fringe_articles')
      .update(body)
      .eq('id', id)
      .select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ article: data }), { status: 200, headers })
  }

  if (req.method === 'DELETE' && id) {
    await supabase.from('fringe_articles').delete().eq('id', id)
    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
}

export const config = { path: '/api/fringe-articles' }
