import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
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

  const url = new URL(req.url)
  const dateParam = url.searchParams.get('date')
  const archive = url.searchParams.get('archive')

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()

  // Admin writes require auth + minister role
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
    const auth = await resolveUser(token)
    if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
    const role = auth.userData?.public_metadata?.role
    if (role !== 'minister') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })

    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id')
      if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })
      await supabase.from('daily_devotions').delete().eq('id', id)
      return new Response(JSON.stringify({ success: true }), { status: 200, headers })
    }

    const body = await req.json()

    if (req.method === 'PUT') {
      const id = url.searchParams.get('id')
      if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })
      const { data, error } = await supabase.from('daily_devotions').update({
        date: body.date,
        title: body.title,
        morning_prayer: body.morningPrayer || null,
        evening_prayer: body.eveningPrayer || null,
        devotional_text: body.devotionalText || null,
        scripture: body.scripture || null,
        scripture_reference: body.scriptureReference || null,
        youtube_url: body.youtubeUrl || null,
        min_tier: body.minTier || 'watchman',
        published: body.published ?? false,
      }).eq('id', id).select().single()
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
      return new Response(JSON.stringify({ devotion: data }), { status: 200, headers })
    }

    // POST — create
    const { data, error } = await supabase.from('daily_devotions').insert({
      date: body.date,
      title: body.title,
      morning_prayer: body.morningPrayer || null,
      evening_prayer: body.eveningPrayer || null,
      devotional_text: body.devotionalText || null,
      scripture: body.scripture || null,
      scripture_reference: body.scriptureReference || null,
      youtube_url: body.youtubeUrl || null,
      min_tier: body.minTier || 'watchman',
      published: body.published ?? false,
      created_by: auth.userId,
    }).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ devotion: data }), { status: 201, headers })
  }

  // GET — public reads (published only via RLS, service key bypasses for admin)
  if (req.method === 'GET') {
    // Archive — last 30 days
    if (archive === 'true') {
      const since = new Date(); since.setDate(since.getDate() - 30)
      const { data } = await supabase
        .from('daily_devotions')
        .select('id, date, title, published')
        .eq('published', true)
        .gte('date', since.toISOString().slice(0, 10))
        .order('date', { ascending: false })
      return new Response(JSON.stringify({ devotions: data || [] }), { status: 200, headers })
    }

    const targetDate = dateParam || new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('daily_devotions')
      .select('*')
      .eq('date', targetDate)
      .eq('published', true)
      .single()

    return new Response(JSON.stringify({ devotion: data || null }), { status: 200, headers })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
}

export const config = { path: '/api/daily-devotion' }
