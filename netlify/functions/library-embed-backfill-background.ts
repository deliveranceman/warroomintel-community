/**
 * library-embed-backfill-background — embed all Ministry Library books that have
 * extracted_text but no library_chunks rows.
 *
 * Netlify background function (-background suffix): Netlify returns 202 to the caller
 * immediately and continues running this handler for up to 15 minutes.
 *
 * Idempotent: skips any book that already has chunks, so re-invoking is safe.
 * Sequential per book so it stays well within the background window.
 *
 * POST /api/library-embed-backfill   (requireAdmin2 — minister/commandant only)
 */

import { createClient } from '@supabase/supabase-js'
import { requireAdmin2 } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

// Exact constants and logic from library-backfill.ts chunkAndEmbed — do not change
const CHUNK_SIZE    = 500
const CHUNK_OVERLAP = 50

async function chunkAndEmbed(
  client: ReturnType<typeof sb>,
  bookId: string,
  bookTitle: string,
  fullText: string,
): Promise<number> {
  const OPENAI_KEY = process.env.OPENAI_API_KEY || ''
  if (!OPENAI_KEY) {
    console.log('[EMBED-BACKFILL] OPENAI_API_KEY not set — skipping embeddings')
    return 0
  }

  const words  = fullText.split(/\s+/)
  const chunks: string[] = []
  for (let i = 0; i < words.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(' ')
    if (chunk.trim().length > 100) chunks.push(chunk)
  }
  if (!chunks.length) return 0

  console.log(`[EMBED-BACKFILL] ${bookTitle}: ${chunks.length} chunks`)
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
        console.error('[EMBED-BACKFILL] OpenAI error:', embRes.status)
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
      if (error) console.error('[EMBED-BACKFILL] Insert error:', error.message)
      else console.log(`[EMBED-BACKFILL] Inserted chunks ${i}–${i + batch.length - 1}`)
    } catch (e: any) {
      console.error('[EMBED-BACKFILL] Batch error:', e.message)
    }
  }

  return chunks.length
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS })

  // Auth gate first — if auth fails we return early and no embedding work happens.
  // Netlify has already sent 202 to the caller so we can't send 401, but the function
  // terminates without doing anything, which is the correct "fail closed" behavior.
  const auth = await requireAdmin2(req)
  if (auth instanceof Response) {
    console.error('[EMBED-BACKFILL] Unauthorized — aborting')
    return auth
  }

  console.log('[EMBED-BACKFILL] Starting embedding backfill for Ministry Library')

  const client = sb()

  // All books with extracted text
  const { data: books, error: booksErr } = await client
    .from('resources')
    .select('id, title, extracted_text')
    .eq('topic', 'ministry-library')
    .not('extracted_text', 'is', null)

  if (booksErr) {
    console.error('[EMBED-BACKFILL] Failed to fetch books:', booksErr.message)
    return new Response(JSON.stringify({ error: booksErr.message }), { status: 500, headers: CORS })
  }

  const allBooks = books || []
  console.log(`[EMBED-BACKFILL] Found ${allBooks.length} books with text`)

  // Single query for all already-embedded book_ids — drives idempotency check in O(1) per book
  const { data: embeddedRows } = await client
    .from('library_chunks')
    .select('book_id')

  const embeddedSet = new Set((embeddedRows || []).map((r: any) => r.book_id as string))
  console.log(`[EMBED-BACKFILL] ${embeddedSet.size} books already embedded — will skip`)

  let embedded    = 0
  let skipped     = 0
  let failed      = 0
  let totalChunks = 0

  for (const book of allBooks) {
    if (embeddedSet.has(book.id)) {
      console.log(`[EMBED-BACKFILL] Skip (already embedded): ${book.title}`)
      skipped++
      continue
    }

    try {
      const n = await chunkAndEmbed(client, book.id, book.title, book.extracted_text)
      if (n > 0) {
        embedded++
        totalChunks += n
        console.log(`[EMBED-BACKFILL] Done: ${book.title} — ${n} chunks`)
      } else {
        console.log(`[EMBED-BACKFILL] Skip (no chunks produced): ${book.title}`)
        skipped++
      }
    } catch (e: any) {
      console.error(`[EMBED-BACKFILL] Failed: ${book.title} — ${e.message}`)
      failed++
    }
  }

  const summary = `Backfill complete: ${embedded} embedded, ${skipped} skipped, ${failed} failed, ${totalChunks} total chunks`
  console.log(`[EMBED-BACKFILL] ${summary}`)

  return new Response(
    JSON.stringify({ embedded, skipped, failed, totalChunks, summary }),
    { status: 200, headers: CORS },
  )
}

export const config = { path: '/api/library-embed-backfill' }
