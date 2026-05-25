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

function tierNum(tier: string): number {
  const map: Record<string, number> = { free: 0, watchman: 0, soldier: 1, commander: 2, general: 3, minister: 4 }
  return map[tier?.toLowerCase()] ?? 0
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const auth = await resolveUser(token)
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

  const { userId, userData } = auth
  const userTier = (userData?.public_metadata?.tier as string || 'free').toLowerCase()
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
    if (tierNum(userTier) < tierNum(course.tier)) {
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
      .eq('user_id', userId)
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
        const hasAccess = tierNum(userTier) >= tierNum(course.tier)
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
          .eq('user_id', userId)
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
