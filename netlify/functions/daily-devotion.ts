import { createClient } from '@supabase/supabase-js'
import { requireAuth, requireAdmin2 } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const url = new URL(req.url)
  const dateParam = url.searchParams.get('date')
  const archive   = url.searchParams.get('archive')

  // Admin writes require verified auth + minister role
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    const auth = await requireAdmin2(req)
    if (auth instanceof Response) return auth

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
        date:                body.date,
        title:               body.title,
        morning_prayer:      body.morningPrayer      || null,
        evening_prayer:      body.eveningPrayer      || null,
        devotional_text:     body.devotionalText     || null,
        scripture:           body.scripture          || null,
        scripture_reference: body.scriptureReference || null,
        youtube_url:         body.youtubeUrl         || null,
        min_tier:            body.minTier            || 'watchman',
        published:           body.published ?? false,
      }).eq('id', id).select().single()
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
      return new Response(JSON.stringify({ devotion: data }), { status: 200, headers })
    }

    // POST — create
    const { data, error } = await supabase.from('daily_devotions').insert({
      date:                body.date,
      title:               body.title,
      morning_prayer:      body.morningPrayer      || null,
      evening_prayer:      body.eveningPrayer      || null,
      devotional_text:     body.devotionalText     || null,
      scripture:           body.scripture          || null,
      scripture_reference: body.scriptureReference || null,
      youtube_url:         body.youtubeUrl         || null,
      min_tier:            body.minTier            || 'watchman',
      published:           body.published ?? false,
      created_by:          auth.userId,
    }).select().single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ devotion: data }), { status: 201, headers })
  }

  // GET — public reads (published only via RLS, service key bypasses for admin)
  if (req.method === 'GET') {
    // Drafts — unpublished entries for admin review (requires verified auth + minister)
    if (url.searchParams.get('drafts') === 'true') {
      const auth = await requireAdmin2(req)
      if (auth instanceof Response) return auth
      const { data } = await supabase
        .from('daily_devotions')
        .select('*')
        .eq('published', false)
        .order('date', { ascending: false })
        .limit(20)
      return new Response(JSON.stringify({ drafts: data || [] }), { status: 200, headers })
    }

    // Archive — last 30 days (admin gets all, public gets published only)
    if (archive === 'true') {
      const archiveAuth = await requireAuth(req)
      const isAdminCall = !(archiveAuth instanceof Response) && archiveAuth.isAdmin
      const since = new Date(); since.setDate(since.getDate() - 30)
      let query = supabase
        .from('daily_devotions')
        .select('id, date, title, published, created_by')
        .gte('date', since.toISOString().slice(0, 10))
        .order('date', { ascending: false })
      if (!isAdminCall) query = query.eq('published', true)
      const { data } = await query
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
