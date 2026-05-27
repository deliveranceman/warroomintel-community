import { createClient } from '@supabase/supabase-js'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { PDFParse } from 'pdf-parse'

const BUCKET = 'ministry-library'
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function supabaseClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

async function resolveMinister(token: string): Promise<boolean> {
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

async function extractPdfText(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const tmpPath = join('/tmp', `wri-pdf-${randomUUID()}.pdf`)
  try {
    await writeFile(tmpPath, buffer)
    const parser = new PDFParse({ url: tmpPath })
    const result = await parser.getText()
    const text = result.text || ''
    console.log(`[admin-library] PDF text extracted: ${text.length} chars, ${result.numpages || 0} pages`)
    return { text, pageCount: result.numpages || 0 }
  } catch (e: any) {
    console.error('[admin-library] PDF parse error:', e?.message || e)
    return { text: '', pageCount: 0 }
  } finally {
    await unlink(tmpPath).catch(() => {})
  }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const ok = await resolveMinister(token)
  if (!ok) return new Response(JSON.stringify({ error: 'Forbidden — minister role required' }), { status: 403, headers })

  const sb = supabaseClient()

  // ── GET — list all books ────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await sb
      .from('ministry_library')
      .select('id,title,author,file_path,file_size_bytes,page_count,is_enabled,ai_enabled,upload_date,notes')
      .order('upload_date', { ascending: false })
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ books: data || [] }), { status: 200, headers })
  }

  // ── POST — upload new book ──────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = await req.json()
    const { title, author, notes, fileBase64, fileName, fileSize } = body
    if (!title || !fileBase64 || !fileName) {
      return new Response(JSON.stringify({ error: 'title, fileName, and fileBase64 required' }), { status: 400, headers })
    }

    const buffer = Buffer.from(fileBase64, 'base64')
    const isTxt = fileName.toLowerCase().endsWith('.txt')
    console.log(`[admin-library] Uploading: ${fileName} (${buffer.length} bytes, isTxt=${isTxt})`)

    // Extract text — UTF-8 for .txt, pdf-parse v2 temp file for .pdf
    let extractedText = ''
    let pageCount = 0
    if (isTxt) {
      extractedText = buffer.toString('utf-8')
      console.log(`[admin-library] TXT decoded: ${extractedText.length} chars`)
    } else {
      const result = await extractPdfText(buffer)
      extractedText = result.text
      pageCount = result.pageCount
    }

    // Upload to Supabase storage
    const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const contentType = isTxt ? 'text/plain' : 'application/pdf'
    const { error: uploadErr } = await sb.storage.from(BUCKET).upload(safeName, buffer, { contentType, upsert: false })
    if (uploadErr) return new Response(JSON.stringify({ error: `Storage upload failed: ${uploadErr.message}` }), { status: 500, headers })

    // Insert DB record
    const { data: row, error: insertErr } = await sb.from('ministry_library').insert({
      title: title.trim(),
      author: author?.trim() || null,
      file_path: safeName,
      file_size_bytes: fileSize || buffer.length,
      page_count: pageCount,
      extracted_text: extractedText || null,
      notes: notes?.trim() || null,
      is_enabled: true,
      ai_enabled: true,
    }).select('id,title,author,file_path,file_size_bytes,page_count,is_enabled,ai_enabled,upload_date,notes').single()

    if (insertErr) {
      await sb.storage.from(BUCKET).remove([safeName])
      return new Response(JSON.stringify({ error: `DB insert failed: ${insertErr.message}` }), { status: 500, headers })
    }

    return new Response(JSON.stringify({
      success: true,
      book: row,
      pagesExtracted: pageCount,
      textLength: extractedText.length,
    }), { status: 200, headers })
  }

  // ── PATCH — update book metadata ────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const body = await req.json()
    const { id, ...fields } = body
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })
    const allowed = ['title', 'author', 'notes', 'is_enabled', 'ai_enabled']
    const update: Record<string, any> = {}
    for (const k of allowed) { if (k in fields) update[k] = fields[k] }
    const { data, error } = await sb.from('ministry_library').update(update).eq('id', id)
      .select('id,title,author,file_path,file_size_bytes,page_count,is_enabled,ai_enabled,upload_date,notes').single()
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
    const { error } = await sb.from('ministry_library').delete().eq('id', id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/admin-library' }
