import { createClient } from '@supabase/supabase-js'
import Busboy from 'busboy'

const BUCKET = 'ministry-library'
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function supabaseClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function isMinister(token: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return false
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return false
    const data = await res.json()
    return data?.public_metadata?.role === 'minister'
  } catch { return false }
}

function parseMultipart(req: Request, bodyBuf: Buffer, contentType: string): Promise<{
  fields: Record<string, string>
  file?: { buffer: Buffer; filename: string; mimeType: string }
}> {
  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {}
    let file: { buffer: Buffer; filename: string; mimeType: string } | undefined
    const busboy = Busboy({ headers: { 'content-type': contentType } })
    busboy.on('field', (name, val) => { fields[name] = val })
    busboy.on('file', (fieldname, stream, info) => {
      const chunks: Buffer[] = []
      stream.on('data', (c: Buffer) => chunks.push(c))
      stream.on('end', () => {
        file = { buffer: Buffer.concat(chunks), filename: info.filename, mimeType: info.mimeType }
      })
    })
    busboy.on('finish', () => resolve({ fields, file }))
    busboy.on('error', reject)
    busboy.write(bodyBuf)
    busboy.end()
  })
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const ok = await isMinister(token)
  if (!ok) return new Response(JSON.stringify({ error: 'Forbidden — minister role required' }), { status: 403, headers })

  const sb = supabaseClient()

  // ── GET — list all books ────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await sb
      .from('resources')
      .select('id,title,author,file_path,file_size,filename,active,ai_generated,created_at,notes,topic,spirit_tags')
      .eq('topic', 'ministry-library')
      .order('created_at', { ascending: false })
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ books: data || [] }), { status: 200, headers })
  }

  // ── POST — upload new book ──────────────────────────────────────────────────
  if (req.method === 'POST') {
    const contentType = req.headers.get('content-type') || ''

    let title = '', author = '', notes = '', fileName = '', fileSize = 0
    let fileBuffer: Buffer | undefined

    if (contentType.includes('multipart/form-data')) {
      // Parse multipart
      const bodyBuf = Buffer.from(await req.arrayBuffer())
      let parsed: Awaited<ReturnType<typeof parseMultipart>>
      try {
        parsed = await parseMultipart(req, bodyBuf, contentType)
      } catch (e: any) {
        return new Response(JSON.stringify({ error: `Multipart parse failed: ${e?.message}` }), { status: 400, headers })
      }
      title    = parsed.fields.title || ''
      author   = parsed.fields.author || ''
      notes    = parsed.fields.notes || ''
      if (parsed.file) {
        fileBuffer = parsed.file.buffer
        fileName   = parsed.file.filename || parsed.fields.filename || 'upload'
        fileSize   = fileBuffer.length
      }
    } else {
      // Fallback: JSON with base64
      const body = await req.json()
      title  = body.title || ''
      author = body.author || ''
      notes  = body.notes || ''
      fileName = body.fileName || ''
      fileSize = body.fileSize || 0
      if (body.fileBase64) {
        fileBuffer = Buffer.from(body.fileBase64, 'base64')
        fileSize = fileBuffer.length
      }
    }

    if (!title.trim() || !fileBuffer || !fileName) {
      return new Response(JSON.stringify({ error: 'title, file, and fileName required' }), { status: 400, headers })
    }

    console.log(`[admin-library] Uploading: ${fileName} (${fileBuffer.length} bytes)`)

    // Upload raw file to Supabase Storage — no text extraction
    const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const isTxt = fileName.toLowerCase().endsWith('.txt')
    const mimeType = isTxt ? 'text/plain' : 'application/pdf'

    const { error: uploadErr } = await sb.storage.from(BUCKET).upload(safeName, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    })
    if (uploadErr) {
      console.error('[admin-library] Storage upload error:', uploadErr.message)
      return new Response(JSON.stringify({ error: `Storage upload failed: ${uploadErr.message}` }), { status: 500, headers })
    }

    // Insert DB record — extracted_text will remain null until a background job processes it
    const { data: row, error: insertErr } = await sb
      .from('ministry_library')
      .insert({
        title: title.trim(),
        author: author?.trim() || null,
        file_path: safeName,
        file_size_bytes: fileSize || fileBuffer.length,
        page_count: 0,
        extracted_text: null,
        notes: notes?.trim() || null,
        is_enabled: true,
        ai_enabled: true,
      })
      .select('id,title,author,file_path,file_size_bytes,page_count,is_enabled,ai_enabled,upload_date,notes')
      .single()

    if (insertErr) {
      await sb.storage.from(BUCKET).remove([safeName])
      console.error('[admin-library] DB insert error:', insertErr.message)
      return new Response(JSON.stringify({ error: `DB insert failed: ${insertErr.message}` }), { status: 500, headers })
    }

    return new Response(JSON.stringify({ success: true, book: row }), { status: 200, headers })
  }

  // ── PATCH — update book metadata ────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const body = await req.json()
    const { id, cleanTitle, ...fields } = body
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })
    const allowed = ['title', 'author', 'notes', 'active', 'ai_generated', 'topic', 'spirit_tags']
    const update: Record<string, any> = {}
    for (const k of allowed) { if (k in fields) update[k] = fields[k] }
    // Strip numeric prefix from title when cleanTitle flag is set
    if (cleanTitle && update.title) {
      update.title = update.title.replace(/^\d+[-\s]*/g, '').trim()
    } else if (cleanTitle) {
      // No title in payload — fetch current title and clean it
      const { data: current } = await sb
        .from('resources')
        .select('title')
        .eq('id', id)
        .eq('topic', 'ministry-library')
        .single()
      if (current?.title) update.title = current.title.replace(/^\d+[-\s]*/g, '').trim()
    }
    const { data, error } = await sb
      .from('resources')
      .update(update)
      .eq('id', id)
      .eq('topic', 'ministry-library')
      .select('id,title,author,file_path,file_size,filename,active,ai_generated,created_at,notes,topic,spirit_tags')
      .single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ success: true, book: data }), { status: 200, headers })
  }

  // ── DELETE — remove book + storage file ─────────────────────────────────────
  if (req.method === 'DELETE') {
    const body = await req.json()
    const { id, file_path } = body
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })
    if (file_path) {
      await sb.storage.from(BUCKET).remove([file_path])
    }
    const { error } = await sb.from('resources').delete().eq('id', id).eq('topic', 'ministry-library')
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/admin-library' }
