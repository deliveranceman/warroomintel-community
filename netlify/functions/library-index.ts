/**
 * library-index — extract and store plain text from a ministry-library file.
 *
 * Called by admin-library-save after inserting a record.  Auth is a shared
 * internal secret (INTERNAL_API_KEY env var) so this never needs a Clerk JWT.
 *
 * POST /api/library-index
 * Body: { resourceId: string, filePath: string, fileType: 'pdf' | 'txt' | 'docx' }
 */

import { createClient } from '@supabase/supabase-js'

const BUCKET  = 'ministry-library'
const MAX_CHARS = 120_000          // ~30k tokens — enough context without blowing the prompt
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-internal-key',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  )
}

async function extractText(buffer: Buffer, filePath: string): Promise<string | null> {
  const ext = filePath.toLowerCase().split('.').pop() || ''

  if (ext === 'txt') {
    const text = new TextDecoder('utf-8').decode(buffer).replace(/\0/g, ' ').slice(0, MAX_CHARS)
    return text || null
  }

  if (ext === 'pdf') {
    try {
      const pdfParse = (await import('pdf-parse')).default
      const data = await pdfParse(buffer)
      return data.text?.slice(0, MAX_CHARS) || null
    } catch (e: any) {
      console.error('[library-index] PDF extraction failed:', e.message)
      return null
    }
  }

  if (ext === 'docx') {
    try {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      return result.value?.slice(0, MAX_CHARS) || null
    } catch (e: any) {
      console.error('[library-index] DOCX extraction failed:', e.message)
      return null
    }
  }

  return null  // unsupported format — caller will skip
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS })
  }

  // Auth: shared internal key — only set server-side, never exposed to the client
  const internalKey = process.env.INTERNAL_API_KEY || ''
  const callerKey   = req.headers.get('x-internal-key') || ''
  if (!internalKey || callerKey !== internalKey) {
    console.error('[library-index] bad internal key')
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: CORS })
  }

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS })
  }

  const { resourceId, filePath, fileType } = body as {
    resourceId?: string; filePath?: string; fileType?: string
  }

  if (!resourceId || !filePath || !fileType) {
    return new Response(JSON.stringify({ error: 'resourceId, filePath, and fileType required' }), { status: 400, headers: CORS })
  }

  const ext = filePath.toLowerCase().split('.').pop() || ''
  if (!['txt', 'pdf', 'docx'].includes(ext)) {
    console.log(`[library-index] unsupported format: ${filePath}`)
    return new Response(JSON.stringify({ success: true, skipped: true, reason: 'unsupported format' }), { status: 200, headers: CORS })
  }

  console.log(`[library-index] indexing resource=${resourceId} path=${filePath} type=${fileType}`)

  const client = sb()

  // Download file from storage
  const { data: fileBlob, error: dlErr } = await client.storage.from(BUCKET).download(filePath)
  if (dlErr || !fileBlob) {
    console.error('[library-index] download error:', dlErr?.message)
    return new Response(JSON.stringify({ error: `Storage download failed: ${dlErr?.message}` }), { status: 500, headers: CORS })
  }

  const buffer = Buffer.from(await fileBlob.arrayBuffer())
  console.log(`[library-index] downloaded ${buffer.length} bytes`)

  const extractedText = await extractText(buffer, filePath)

  if (!extractedText) {
    console.log('[library-index] no text extracted — leaving extracted_text null')
    return new Response(JSON.stringify({ success: true, extracted: false, chars: 0 }), { status: 200, headers: CORS })
  }

  // Update the resources row
  const { error: updateErr } = await client
    .from('resources')
    .update({ extracted_text: extractedText })
    .eq('id', resourceId)

  if (updateErr) {
    console.error('[library-index] DB update error:', updateErr.message)
    return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: CORS })
  }

  console.log(`[library-index] stored ${extractedText.length} chars for resource ${resourceId}`)
  return new Response(
    JSON.stringify({ success: true, extracted: true, chars: extractedText.length }),
    { status: 200, headers: CORS },
  )
}

export const config = { path: '/api/library-index' }
