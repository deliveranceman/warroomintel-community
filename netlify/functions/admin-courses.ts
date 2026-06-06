import { createClient } from '@supabase/supabase-js'
import { requireAdmin, CORS as headers } from './_shared/requireAdmin'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const supabase = createClient(
  supabaseUrl!,
  supabaseServiceKey!
)

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

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
