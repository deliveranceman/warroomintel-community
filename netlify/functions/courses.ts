import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function tierNum(tier: string): number {
  const map: Record<string, number> = { free: 0, watchman: 0, soldier: 1, commander: 2, general: 3, minister: 4 }
  return map[tier?.toLowerCase()] ?? 0
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const url = new URL(req.url)
  const courseId = url.searchParams.get('id')

  // GET single course with episodes
  if (req.method === 'GET' && courseId) {
    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('status', 'published')
      .single()

    if (!course) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers })
    if (auth.level < tierNum(course.tier)) {
      return new Response(JSON.stringify({ error: 'Upgrade required', requiredTier: course.tier }), { status: 403, headers })
    }

    const { data: episodes } = await supabase
      .from('episodes')
      .select('*')
      .eq('course_id', courseId)
      .eq('status', 'published')
      .order('sort_order', { ascending: true })

    const episodeIds = (episodes || []).map((e: any) => e.id)
    const { data: progress } = await supabase
      .from('episode_progress')
      .select('*')
      .eq('user_id', auth.userId)
      .in('episode_id', episodeIds)

    return new Response(JSON.stringify({ course, episodes: episodes || [], progress: progress || [] }), { status: 200, headers })
  }

  // GET all courses
  if (req.method === 'GET') {
    const { data: courses } = await supabase
      .from('courses')
      .select('*')
      .eq('status', 'published')
      .order('sort_order', { ascending: true })

    const accessible = await Promise.all(
      (courses || []).map(async (course: any) => {
        const hasAccess = auth.level >= tierNum(course.tier)
        const { count } = await supabase
          .from('episodes')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id)
          .eq('status', 'published')

        const { data: episodes } = await supabase
          .from('episodes')
          .select('id')
          .eq('course_id', course.id)
          .eq('status', 'published')

        const episodeIds = (episodes || []).map((e: any) => e.id)
        const { count: watchedCount } = await supabase
          .from('episode_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', auth.userId)
          .eq('watched', true)
          .in('episode_id', episodeIds)

        return { ...course, episodeCount: count || 0, watchedCount: watchedCount || 0, hasAccess }
      })
    )

    return new Response(JSON.stringify({ courses: accessible }), { status: 200, headers })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
}

export const config = { path: '/api/courses' }
