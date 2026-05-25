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

  const role = auth.userData?.public_metadata?.role
  if (role !== 'minister') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  // GET all courses (admin sees drafts too)
  if (req.method === 'GET') {
    const { data: courses } = await supabase
      .from('courses')
      .select('*')
      .order('sort_order', { ascending: true })

    const withCounts = await Promise.all(
      (courses || []).map(async (course: any) => {
        const { count } = await supabase
          .from('episodes')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id)
        return { ...course, episodeCount: count || 0 }
      })
    )

    return new Response(JSON.stringify({ courses: withCounts }), { status: 200, headers })
  }

  // POST create course
  if (req.method === 'POST') {
    const body = await req.json()
    const { data, error } = await supabase
      .from('courses')
      .insert({
        title: body.title,
        description: body.description || '',
        thumbnail_url: body.thumbnail_url || '',
        tier: body.tier || 'free',
        status: body.status || 'draft',
        sort_order: body.sort_order || 0,
        course_type: body.courseType || 'course',
      })
      .select()
      .single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ course: data }), { status: 201, headers })
  }

  // PATCH update course
  if (req.method === 'PATCH' && id) {
    const body = await req.json()
    const updateObj: Record<string, any> = { ...body }
    if (body.courseType !== undefined) updateObj.course_type = body.courseType
    delete updateObj.courseType
    const { data, error } = await supabase
      .from('courses')
      .update(updateObj)
      .eq('id', id)
      .select()
      .single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ course: data }), { status: 200, headers })
  }

  // DELETE course
  if (req.method === 'DELETE' && id) {
    await supabase.from('courses').delete().eq('id', id)
    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
}

export const config = { path: '/api/admin-courses' }
