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
  const courseId = url.searchParams.get('courseId')
  const action = url.searchParams.get('action')

  // POST attachment — add Arsenal link or upload file to episode
  if (req.method === 'POST' && action === 'attach') {
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const episodeId = formData.get('episodeId') as string
      const file = formData.get('file') as File
      const title = (formData.get('title') as string) || file?.name || 'Attachment'

      if (!episodeId || !file) {
        return new Response(JSON.stringify({ error: 'episodeId and file required' }), { status: 400, headers })
      }

      const fileExt = file.name.split('.').pop()
      const filePath = `${episodeId}/${Date.now()}.${fileExt}`
      const arrayBuffer = await file.arrayBuffer()

      const { error: uploadError } = await supabase.storage
        .from('episode-files')
        .upload(filePath, arrayBuffer, { contentType: file.type })

      if (uploadError) return new Response(JSON.stringify({ error: uploadError.message }), { status: 500, headers })

      const { data, error } = await supabase
        .from('episode_attachments')
        .insert({
          episode_id: episodeId,
          type: 'upload',
          title,
          file_path: filePath,
          file_size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
          mime_type: file.type,
        })
        .select()
        .single()

      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
      return new Response(JSON.stringify({ attachment: data }), { status: 201, headers })

    } else {
      const body = await req.json()
      const { episodeId, resourceId, title } = body

      if (!episodeId || !resourceId) {
        return new Response(JSON.stringify({ error: 'episodeId and resourceId required' }), { status: 400, headers })
      }

      const { data, error } = await supabase
        .from('episode_attachments')
        .insert({
          episode_id: episodeId,
          type: 'arsenal',
          resource_id: resourceId,
          title,
        })
        .select()
        .single()

      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
      return new Response(JSON.stringify({ attachment: data }), { status: 201, headers })
    }
  }

  // DELETE attachment
  if (req.method === 'DELETE' && action === 'detach') {
    const attachId = url.searchParams.get('attachId')
    if (!attachId) return new Response(JSON.stringify({ error: 'attachId required' }), { status: 400, headers })
    await supabase.from('episode_attachments').delete().eq('id', attachId)
    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  }

  // GET episodes for a course
  if (req.method === 'GET' && courseId) {
    const { data: episodes } = await supabase
      .from('episodes')
      .select('*')
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true })

    return new Response(JSON.stringify({ episodes: episodes || [] }), { status: 200, headers })
  }

  // POST create episode
  if (req.method === 'POST') {
    const body = await req.json()
    const { data, error } = await supabase
      .from('episodes')
      .insert({
        course_id: body.courseId,
        title: body.title,
        description: body.description || '',
        youtube_url: body.youtubeUrl || '',
        duration_seconds: body.durationSeconds || null,
        notes: body.notes || '',
        sort_order: body.sortOrder || 0,
        status: body.status || 'draft',
      })
      .select()
      .single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ episode: data }), { status: 201, headers })
  }

  // PATCH update episode
  if (req.method === 'PATCH' && id) {
    const body = await req.json()
    const { data, error } = await supabase
      .from('episodes')
      .update({
        title: body.title,
        description: body.description,
        youtube_url: body.youtubeUrl,
        duration_seconds: body.durationSeconds,
        notes: body.notes,
        sort_order: body.sortOrder,
        status: body.status,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ episode: data }), { status: 200, headers })
  }

  // DELETE episode
  if (req.method === 'DELETE' && id) {
    await supabase.from('episodes').delete().eq('id', id)
    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
}

export const config = { path: '/api/admin-episodes' }
