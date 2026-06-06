import { createClient } from '@supabase/supabase-js'
import Busboy from 'busboy'
import { requireAdmin } from './_shared/requireAdmin'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const BUCKET = 'ministry-library'
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function supabaseClient() {
  return createClient(
    supabaseUrl!,
    supabaseServiceKey!,
  )
}

function parseMultipart(_req: Request, bodyBuf: Buffer, contentType: string): Promise<{
  fields: Record<string, string>
  file?: { buffer: Buffer; filename: string; mimeType: string }
}> {
  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {}
    let file: { buffer: Buffer; filename: string; mimeType: string } | undefined
    const busboy = Busboy({ headers: { 'content-type': contentType } })
    busboy.on('field', (name, val) => { fields[name] = val })
    busboy.on('file', (_fieldname, stream, info) => {
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

  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const sb = supabaseClient()

  // ── GET — list all books (or single book with content) ─────────────────────
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const bookId = url.searchParams.get('id')

    // Single book fetch with extracted_text (for admin reader)
    if (bookId) {
      const { data: book, error } = await sb
        .from('resources')
        .select('id,title,author,file_path,file_size,filename,active,ai_generated,created_at,notes,topic,spirit_tags,extracted_text,description,function_tags,source_type')
        .eq('topic', 'ministry-library')
        .eq('id', bookId)
        .single()
      if (error || !book) return new Response(JSON.stringify({ error: error?.message || 'Not found' }), { status: 404, headers })
      return new Response(JSON.stringify({ book }), { status: 200, headers })
    }

    // Pending books sub-query — returns full ai_summary fields for review UI
    const statusFilter = url.searchParams.get('status')
    if (statusFilter === 'pending') {
      const { data: pending, error: pendErr } = await sb
        .from('resources')
        .select('id,title,author,notes,topic,spirit_tags,created_at,ai_summary,summary_status,summary_error,source_public_domain_confirmed,status,description')
        .eq('topic', 'ministry-library')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (pendErr) return new Response(JSON.stringify({ error: pendErr.message }), { status: 500, headers })
      return new Response(JSON.stringify({ books: pending || [] }), { status: 200, headers })
    }

    const { data, error } = await sb
      .from('resources')
      .select('id,title,author,file_path,file_size,filename,active,ai_generated,created_at,notes,topic,spirit_tags,extracted_text,source_type')
      .eq('topic', 'ministry-library')
      .order('created_at', { ascending: false })
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })

    const books = (data || []).map(b => ({
      ...b,
      // Strip extracted_text from response — only send indexed flag
      extracted_text: undefined,
      is_indexed: !!(b.extracted_text && b.extracted_text.length > 100),
      file_url: '',
    }))

    // Generate signed URLs for PDF files (best-effort, non-fatal)
    await Promise.all(books.map(async b => {
      if (b.filename?.toLowerCase().endsWith('.pdf') && b.file_path) {
        try {
          const { data: signed } = await sb.storage.from(BUCKET).createSignedUrl(b.file_path, 3600)
          b.file_url = signed?.signedUrl || ''
        } catch { /* ignore */ }
      }
    }))

    return new Response(JSON.stringify({ books }), { status: 200, headers })
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
    const allowed = ['title', 'author', 'notes', 'active', 'ai_generated', 'topic', 'spirit_tags', 'source_type']
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
      .select('id,title,author,file_path,file_size,filename,active,ai_generated,created_at,notes,topic,spirit_tags,source_type')
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
