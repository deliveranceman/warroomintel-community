import { createClient } from '@supabase/supabase-js'
import { requireAdmin, CORS as headers } from './_shared/requireAdmin'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const BUCKET = 'episode-files'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

  if (req.method === 'DELETE') {
    const url = new URL(req.url)
    const attachmentId = url.searchParams.get('id')
    if (!attachmentId) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers })

    const { data: att } = await supabase.from('episode_attachments').select('*').eq('id', attachmentId).single()
    if (att?.file_url) {
      const storagePrefix = `/storage/v1/object/public/${BUCKET}/`
      const idx = att.file_url.indexOf(storagePrefix)
      if (idx !== -1) {
        const path = att.file_url.slice(idx + storagePrefix.length)
        await supabase.storage.from(BUCKET).remove([path])
      }
    }
    await supabase.from('episode_attachments').delete().eq('id', attachmentId)
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  const contentType = req.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    return new Response(JSON.stringify({ error: 'Expected multipart/form-data' }), { status: 400, headers })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const type = formData.get('type') as string
  const courseId = formData.get('courseId') as string | null
  const episodeId = formData.get('episodeId') as string | null

  if (!file) return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400, headers })

  const buffer = Buffer.from(await file.arrayBuffer())
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')

  let filePath: string
  if (type === 'thumbnail') {
    const id = courseId || `temp_${Date.now()}`
    filePath = `thumbnails/${id}/${safeName}`
  } else if (type === 'attachment') {
    if (!episodeId) return new Response(JSON.stringify({ error: 'episodeId required for attachments' }), { status: 400, headers })
    filePath = `attachments/${episodeId}/${safeName}`
  } else {
    return new Response(JSON.stringify({ error: 'Invalid type' }), { status: 400, headers })
  }

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, buffer, {
    contentType: file.type,
    upsert: true,
  })

  if (uploadError) return new Response(JSON.stringify({ error: uploadError.message }), { status: 500, headers })

  const fileUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${filePath}`

  if (type === 'attachment') {
    const fileSizeKb = Math.round(file.size / 1024)
    const fileSizeLabel = fileSizeKb >= 1024
      ? `${(fileSizeKb / 1024).toFixed(1)} MB`
      : `${fileSizeKb} KB`

    const { data: att, error: dbError } = await supabase.from('episode_attachments').insert({
      episode_id: episodeId,
      type: 'file',
      file_path: fileUrl,
      title: file.name,
      mime_type: file.type,
      file_size: fileSizeLabel,
    }).select().single()

    if (dbError) return new Response(JSON.stringify({ error: dbError.message }), { status: 500, headers })
    return new Response(JSON.stringify({ url: fileUrl, id: att.id, fileName: file.name, fileSize: fileSizeLabel }), { status: 200, headers })
  }

  return new Response(JSON.stringify({ url: fileUrl }), { status: 200, headers })
}

export const config = { path: '/api/admin-episode-upload' }
