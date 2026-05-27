import { createClient } from '@supabase/supabase-js'
import pdfParse from 'pdf-parse'

const BUCKET = 'ministry-library'
const MAX_CHARS = 120_000

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function makeSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function getUserId(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return payload.sub || null
  } catch { return null }
}

async function isMinister(userId: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return false
    const data = await res.json()
    return data?.public_metadata?.role === 'minister'
  } catch { return false }
}

async function extractText(buffer: Buffer, fileType: string): Promise<string | null> {
  if (fileType === 'txt') {
    const text = buffer.toString('utf-8').replace(/\0/g, ' ').slice(0, MAX_CHARS)
    return text || null
  }
  if (fileType === 'pdf') {
    try {
      const result = await pdfParse(buffer)
      const raw = result.text || ''
      return raw
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, MAX_CHARS) || null
    } catch (e: any) {
      console.error('[LIBRARY-UPLOAD] pdf-parse error:', e?.message)
      return null
    }
  }
  return null
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: HEADERS })
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  const userId = getUserId(req.headers.get('authorization'))
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const ok = await isMinister(userId)
  if (!ok) return Response.json({ error: 'Forbidden — minister role required' }, { status: 403 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { title, author, notes, spirit_tags, filename, file_size, file_path, ai_generated } = body

  console.log('[LIBRARY-UPLOAD] Request received', { userId, filename, file_size, file_path })

  if (!title?.trim() || !file_path) {
    return Response.json({ error: 'title and file_path are required' }, { status: 400 })
  }

  const resolvedFilename = filename || file_path.split('/').pop() || ''
  const fileType = resolvedFilename.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt'

  const sb = makeSupabase()

  console.log('[LIBRARY-UPLOAD] Writing to Supabase resources table...', { title: title.trim(), fileType, file_path })

  const { data: row, error } = await sb
    .from('resources')
    .insert({
      title: title.trim(),
      author: author?.trim() || 'Unknown',
      notes: notes?.trim() || '',
      filename: resolvedFilename,
      file_size: file_size || 0,
      file_path,
      file_type: fileType,
      topic: 'ministry-library',
      user_id: userId,
      ai_generated: Boolean(ai_generated),
      active: true,
      spirit_tags: Array.isArray(spirit_tags) ? spirit_tags : [],
    })
    .select()
    .single()

  if (error) {
    console.error('[LIBRARY-UPLOAD] FAILED at step: Supabase insert', error.message)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }

  console.log('[LIBRARY-UPLOAD] Supabase insert result', { id: row.id, fileType })

  // Extract text inline — best effort, non-fatal if it fails
  try {
    console.log('[LIBRARY-UPLOAD] Downloading file from storage for text extraction...', { file_path })
    const { data: fileBlob, error: dlErr } = await sb.storage.from(BUCKET).download(file_path)
    if (dlErr || !fileBlob) {
      console.error('[LIBRARY-UPLOAD] FAILED at step: Storage download', dlErr?.message)
    } else {
      const fileBuffer = Buffer.from(await fileBlob.arrayBuffer())
      console.log('[LIBRARY-UPLOAD] File downloaded from storage', { bytes: fileBuffer.length })

      const extractedText = await extractText(fileBuffer, fileType)
      console.log('[LIBRARY-UPLOAD] Text extraction result', {
        textLength: extractedText?.length ?? 0,
        preview: extractedText?.slice(0, 200) ?? '(none)',
      })

      if (extractedText) {
        const { error: updateErr } = await sb
          .from('resources')
          .update({ extracted_text: extractedText })
          .eq('id', row.id)
        if (updateErr) {
          console.error('[LIBRARY-UPLOAD] FAILED at step: Update extracted_text', updateErr.message)
        } else {
          console.log('[LIBRARY-UPLOAD] extracted_text stored', { chars: extractedText.length, resourceId: row.id })
        }
      } else {
        console.log('[LIBRARY-UPLOAD] No text extracted — extracted_text remains null')
      }
    }
  } catch (e: any) {
    console.error('[LIBRARY-UPLOAD] FAILED at step: Text extraction', e?.message)
  }

  return Response.json({ success: true, book: row })
}

export const config = { path: '/api/admin-library-save' }
