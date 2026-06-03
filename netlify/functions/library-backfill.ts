/**
 * library-backfill — storage-first re-index for all ministry-library books.
 * 1. Lists ALL files in storage bucket (root + user subfolder)
 * 2. Processes existing resources rows with null extracted_text
 * 3. Creates resources rows for storage files that have no DB record
 * 4. Skips anything that already has extracted_text
 *
 * POST /api/library-backfill   (minister auth required)
 */

import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const BUCKET    = 'ministry-library'
const MAX_CHARS = 120_000
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(
    supabaseUrl!,
    supabaseServiceKey!,
  )
}

async function resolveMinister(token: string): Promise<{ ok: boolean; userId: string }> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return { ok: false, userId: '' }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return { ok: false, userId: '' }
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return { ok: false, userId }
    const data = await res.json()
    return { ok: data?.public_metadata?.role === 'minister', userId }
  } catch { return { ok: false, userId: '' } }
}

async function extractText(buf: ArrayBuffer, filePath: string): Promise<string | null> {
  const ext = filePath.toLowerCase().split('.').pop() || ''

  if (ext === 'txt') {
    const raw = new TextDecoder('utf-8').decode(buf)
    return raw
      .replace(/\0/g, ' ')
      .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_CHARS) || null
  }

  if (ext === 'pdf') {
    try {
      const pdfParse = (await import('pdf-parse')).default
      const data = await pdfParse(Buffer.from(buf))
      return data.text?.slice(0, MAX_CHARS) || null
    } catch (e: any) {
      console.error('[BACKFILL] PDF extraction failed:', e.message)
      return null
    }
  }

  if (ext === 'docx') {
    try {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buf) })
      return result.value?.slice(0, MAX_CHARS) || null
    } catch (e: any) {
      console.error('[BACKFILL] DOCX extraction failed:', e.message)
      return null
    }
  }

  return null  // unsupported format
}

const CHUNK_SIZE   = 500
const CHUNK_OVERLAP = 50

async function chunkAndEmbed(
  client: ReturnType<typeof sb>,
  bookId: string,
  bookTitle: string,
  fullText: string,
): Promise<number> {
  const OPENAI_KEY = process.env.OPENAI_API_KEY || ''
  if (!OPENAI_KEY) {
    console.log('[EMBED] OPENAI_API_KEY not set — skipping embeddings')
    return 0
  }

  const words  = fullText.split(/\s+/)
  const chunks: string[] = []
  for (let i = 0; i < words.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(' ')
    if (chunk.trim().length > 100) chunks.push(chunk)
  }
  if (!chunks.length) return 0

  console.log(`[EMBED] ${bookTitle}: ${chunks.length} chunks`)
  await client.from('library_chunks').delete().eq('book_id', bookId)

  for (let i = 0; i < chunks.length; i += 10) {
    const batch = chunks.slice(i, i + 10)
    try {
      const embRes = await fetch('https://api.openai.com/v1/embeddings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
        body:    JSON.stringify({ model: 'text-embedding-3-small', input: batch }),
        signal:  AbortSignal.timeout(20000),
      })
      if (!embRes.ok) {
        console.error('[EMBED] OpenAI error:', embRes.status)
        break
      }
      const embData = await embRes.json()
      const rows = batch.map((chunk, j) => ({
        book_id:     bookId,
        book_title:  bookTitle,
        chunk_index: i + j,
        chunk_text:  chunk,
        embedding:   embData.data[j]?.embedding ?? null,
      }))
      const { error } = await client.from('library_chunks').insert(rows)
      if (error) console.error('[EMBED] Insert error:', error.message)
      else console.log(`[EMBED] Inserted chunks ${i}–${i + batch.length - 1}`)
    } catch (e: any) {
      console.error('[EMBED] Batch error:', e.message)
    }
  }

  return chunks.length
}

function regexExtractCandidates(text: string): string[] {
  const found = new Set<string>()
  const patterns: RegExp[] = [
    /\bspirits?\s+of\s+([A-Za-z][A-Za-z' \-]{2,40})/gi,
    /\bdemons?\s+of\s+([A-Za-z][A-Za-z' \-]{2,40})/gi,
    /(?:cast out|bind|rebuke|command)\s+(?:the\s+)?([A-Z][a-zA-Z]{2,30})/g,
    /^([A-Z]{3,}(?:[- ][A-Z]{3,})*)\s*[:\-—]/gm,
  ]
  for (const p of patterns) {
    let m
    while ((m = p.exec(text)) !== null) {
      for (const part of m[1].split(/[,;]/)) {
        const clean = part.trim().replace(/[.!?]+$/, '').replace(/\b\w/g, c => c.toUpperCase())
        if (clean.length > 2 && clean.length < 40 && /^[A-Z]/.test(clean)) found.add(clean)
      }
    }
  }
  return Array.from(found).slice(0, 50)
}

async function populateSpiritCache(
  client: ReturnType<typeof sb>,
  bookId: string,
  bookTitle: string,
  tags: string[],
): Promise<void> {
  if (!tags.length) return
  await client.from('library_spirit_cache').delete().eq('book_id', bookId)
  const rows = tags.map(name => ({
    book_id:         bookId,
    spirit_name:     name,
    normalized_name: name.toLowerCase().trim(),
    confidence:      4,
    source:          bookTitle,
  }))
  const { error } = await client.from('library_spirit_cache').insert(rows)
  if (error) console.error('[BACKFILL] Cache insert error:', error.message)
  else console.log(`[BACKFILL] Cached ${rows.length} spirits for: ${bookTitle}`)
}

function titleFromPath(filePath: string): string {
  const name = filePath.split('/').pop() || filePath
  return name
    .replace(/^\d+[-_]/, '')           // strip timestamp prefix like 1234567890-
    .replace(/[-_]/g, ' ')
    .replace(/\.[^.]+$/, '')           // strip extension
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim() || 'Untitled'
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })

  const { ok, userId } = await resolveMinister(token)
  if (!ok) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: CORS })

  const client = sb()
  let processed      = 0
  let skipped        = 0
  let skippedFormat  = 0
  let skippedNoText  = 0
  let errors         = 0
  const log: string[] = []
  const errorDetails: { filename: string; error: string; code?: string }[] = []

  // Download helper with 25s timeout — Supabase SDK doesn't expose AbortSignal so use Promise.race
  const dlWithTimeout = (path: string) =>
    Promise.race([
      client.storage.from(BUCKET).download(path),
      new Promise<{ data: null; error: { message: string; name: string } }>(resolve =>
        setTimeout(() => resolve({ data: null, error: { message: 'Download timeout after 25s', name: 'AbortError' } }), 25000)
      ),
    ])

  // ── Step 1: Load all existing resources rows ────────────────────────────────
  const { data: existingRows, error: rowsErr } = await client
    .from('resources')
    .select('id, title, file_path, extracted_text')
    .eq('topic', 'ministry-library')

  if (rowsErr) {
    return new Response(JSON.stringify({ error: rowsErr.message }), { status: 500, headers: CORS })
  }

  const byPath = new Map<string, { id: string; title: string; extracted_text: string | null }>(
    (existingRows || []).map(r => [r.file_path, r])
  )
  console.log(`[BACKFILL] Existing DB rows: ${byPath.size}`)
  log.push(`DB rows: ${byPath.size}`)

  // ── Step 2: List all files in storage bucket ────────────────────────────────
  const allPaths: string[] = []

  // Root level files
  const { data: rootFiles, error: rootErr } = await client.storage.from(BUCKET).list('', { limit: 200 })
  if (rootErr) console.error('[BACKFILL] Root list error:', rootErr.message)
  for (const f of rootFiles || []) {
    if (f.name && !f.id?.endsWith('/') && f.name !== '.emptyFolderPlaceholder') {
      allPaths.push(f.name)
    }
  }

  // User subfolder (files uploaded via Supabase client direct upload)
  if (userId) {
    const { data: userFiles, error: userErr } = await client.storage.from(BUCKET).list(userId, { limit: 200 })
    if (userErr) console.error('[BACKFILL] User folder list error:', userErr.message)
    for (const f of userFiles || []) {
      if (f.name && f.name !== '.emptyFolderPlaceholder') {
        allPaths.push(`${userId}/${f.name}`)
      }
    }
  }

  console.log(`[BACKFILL] Storage files found: ${allPaths.length}`, allPaths)
  log.push(`Storage files: ${allPaths.length}`)

  // ── Step 3: Process existing rows with null extracted_text ──────────────────
  for (const row of existingRows || []) {
    if (row.extracted_text) {
      skipped++
      continue
    }
    if (!row.file_path) {
      log.push(`skip (no file_path): ${row.title}`)
      errorDetails.push({ filename: row.title, error: 'No file_path in database record', code: 'NO_PATH' })
      errors++
      continue
    }

    const ext1 = row.file_path.toLowerCase().split('.').pop() || ''
    if (!['txt', 'pdf', 'docx'].includes(ext1)) {
      log.push(`skip (unsupported format): ${row.title}`)
      skippedFormat++
      continue
    }

    console.log(`[BACKFILL] Processing existing row: ${row.title} — ${row.file_path}`)
    try {
      const { data: blob, error: dlErr } = await dlWithTimeout(row.file_path)
      if (dlErr || !blob) {
        const msg = dlErr?.message || 'Unknown download error'
        const code = (dlErr as any)?.name === 'AbortError' ? 'TIMEOUT' : 'DOWNLOAD_FAILED'
        console.error(`[BACKFILL] Download failed: ${row.file_path}`, msg)
        log.push(`error (${code.toLowerCase()}): ${row.title}`)
        errorDetails.push({ filename: row.file_path, error: msg, code })
        errors++
        continue
      }
      const buf  = await blob.arrayBuffer()
      const text = await extractText(buf, row.file_path)
      if (!text || text.length < 50) {
        log.push(`skip (no text extracted): ${row.title}`)
        skippedNoText++
        continue
      }
      const { error: updateErr } = await client
        .from('resources')
        .update({ extracted_text: text })
        .eq('id', row.id)
      if (updateErr) {
        log.push(`error (update): ${row.title} — ${updateErr.message}`)
        errorDetails.push({ filename: row.file_path, error: `DB update failed: ${updateErr.message}`, code: 'UPDATE_FAILED' })
        errors++
      } else {
        log.push(`ok (${text.length} chars): ${row.title}`)
        processed++
        const tags = regexExtractCandidates(text)
        await populateSpiritCache(client, row.id, row.title, tags)
        await chunkAndEmbed(client, row.id, row.title, text)
      }
    } catch (e: any) {
      console.error('[BACKFILL] Failed on:', row.title, { error: e.message, stack: e.stack?.slice(0, 200) })
      log.push(`error (exception): ${row.title} — ${e?.message}`)
      errorDetails.push({ filename: row.file_path || row.title, error: `Exception: ${e?.message}`, code: 'EXCEPTION' })
      errors++
    }
  }

  // ── Step 4: Create rows for storage files with no DB record ─────────────────
  for (const filePath of allPaths) {
    if (byPath.has(filePath)) continue  // already handled above

    const ext2 = filePath.toLowerCase().split('.').pop() || ''
    if (!['txt', 'pdf', 'docx'].includes(ext2)) {
      log.push(`skip (unsupported format): ${filePath}`)
      skippedFormat++
      continue
    }

    console.log(`[BACKFILL] Storage-only file (no DB row): ${filePath}`)
    try {
      const { data: blob, error: dlErr } = await dlWithTimeout(filePath)
      if (dlErr || !blob) {
        const msg = dlErr?.message || 'Unknown download error'
        const code = (dlErr as any)?.name === 'AbortError' ? 'TIMEOUT' : 'DOWNLOAD_FAILED'
        console.error(`[BACKFILL] Download failed: ${filePath}`, msg)
        log.push(`error (${code.toLowerCase()}): ${filePath}`)
        errorDetails.push({ filename: filePath, error: msg, code })
        errors++
        continue
      }
      // Capture buffer once — used for both text extraction and file_size
      const buf      = await blob.arrayBuffer()
      const fileSize = buf.byteLength
      const text     = await extractText(buf, filePath)
      if (!text || text.length < 50) {
        log.push(`skip (no text extracted): ${filePath}`)
        skippedNoText++
        continue
      }
      const title = titleFromPath(filePath)
      const { data: newRow, error: insertErr } = await client.from('resources').insert({
        title,
        file_path: filePath,
        file_type: filePath.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt',
        file_size: fileSize || 0,
        topic: 'ministry-library',
        // source_type MUST be set — arsenal-resources.ts filter only includes source_type='arsenal'
        source_type: 'library',
        extracted_text: text,
        active: true,
        ai_generated: true,
        spirit_tags: [],
        user_id: userId || null,
      }).select('id').single()
      if (insertErr) {
        log.push(`error (insert): ${filePath} — ${insertErr.message}`)
        errorDetails.push({ filename: filePath, error: `DB insert failed: ${insertErr.message}`, code: 'INSERT_FAILED' })
        errors++
      } else {
        log.push(`ok (new row, ${text.length} chars): ${title}`)
        processed++
        if (newRow?.id) {
          const tags = regexExtractCandidates(text)
          await populateSpiritCache(client, newRow.id, title, tags)
          await chunkAndEmbed(client, newRow.id, title, text)
        }
      }
    } catch (e: any) {
      console.error('[BACKFILL] Failed on:', filePath, { error: e.message, stack: e.stack?.slice(0, 200) })
      log.push(`error (exception): ${filePath} — ${e?.message}`)
      errorDetails.push({ filename: filePath, error: `Exception: ${e?.message}`, code: 'EXCEPTION' })
      errors++
    }
  }

  const message = `Reindex complete: ${processed} indexed, ${skipped} already done, ${skippedFormat} unsupported format, ${skippedNoText} no text extracted${errors ? `, ${errors} errors` : ''}.`
  console.log(`[BACKFILL] ${message}`)

  return new Response(
    JSON.stringify({ processed, skipped, skippedFormat, skippedNoText, errors, message, log, errorDetails }),
    { status: 200, headers: CORS },
  )
}

export const config = { path: '/api/library-backfill' }
