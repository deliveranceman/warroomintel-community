import { createClient } from '@supabase/supabase-js'
import { createRequire } from 'module'
import { requireAdmin2, CORS as HEADERS } from './_shared/access'
import { findDuplicateResource } from './_shared/resourceDedup'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')
const require = createRequire(import.meta.url)

const BUCKET = 'ministry-library'
const MAX_CHARS = 120_000

// Exact replica of chunkAndEmbed from library-backfill.ts — same constants, model, insert shape
const CHUNK_SIZE    = 500
const CHUNK_OVERLAP = 50

async function chunkAndEmbed(
  client: ReturnType<typeof makeSupabase>,
  bookId: string,
  bookTitle: string,
  fullText: string,
): Promise<number> {
  const OPENAI_KEY = process.env.OPENAI_API_KEY || ''
  if (!OPENAI_KEY) return 0

  const words  = fullText.split(/\s+/)
  const chunks: string[] = []
  for (let i = 0; i < words.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(' ')
    if (chunk.trim().length > 100) chunks.push(chunk)
  }
  if (!chunks.length) return 0

  console.log(`[LIBRARY-UPLOAD] chunkAndEmbed: ${bookTitle} — ${chunks.length} chunks`)
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
      if (!embRes.ok) { console.error('[LIBRARY-UPLOAD] OpenAI error:', embRes.status); break }
      const embData = await embRes.json()
      const rows = batch.map((chunk, j) => ({
        book_id:     bookId,
        book_title:  bookTitle,
        chunk_index: i + j,
        chunk_text:  chunk,
        embedding:   embData.data[j]?.embedding ?? null,
      }))
      const { error } = await client.from('library_chunks').insert(rows)
      if (error) console.error('[LIBRARY-UPLOAD] Embed insert error:', error.message)
    } catch (e: any) {
      console.error('[LIBRARY-UPLOAD] Embed batch error:', e.message)
    }
  }

  return chunks.length
}

function makeSupabase() {
  return createClient(
    supabaseUrl!,
    supabaseServiceKey!,
  )
}

async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.toLowerCase().split('.').pop()
  if (ext === 'txt') {
    return new TextDecoder('utf-8').decode(buffer).replace(/\0/g, ' ').slice(0, MAX_CHARS)
  }
  if (ext === 'docx') {
    try {
      const mammoth = require('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      return (result.value || '').slice(0, MAX_CHARS)
    } catch (e: any) {
      console.error('[LIBRARY-UPLOAD] mammoth docx error:', e?.message)
      return ''
    }
  }
  if (ext === 'pdf') {
    try {
      const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs') as any
      GlobalWorkerOptions.workerSrc = ''
      const loadingTask = getDocument({ data: new Uint8Array(buffer) })
      const pdfDoc = await loadingTask.promise
      const pages: string[] = []
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i)
        const content = await page.getTextContent()
        const pageText = (content.items as any[]).map((item: any) => item.str || '').join(' ')
        pages.push(pageText)
      }
      const text = pages.join('\n\n').trim().slice(0, MAX_CHARS)
      if (text.length < 50) {
        console.log('[LIBRARY-UPLOAD] PDF appears to be scanned/image-only — no extractable text')
        return ''
      }
      return text
    } catch (e: any) {
      console.error('[LIBRARY-UPLOAD] pdfjs extraction error:', e?.message)
      return ''
    }
  }
  return ''
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: HEADERS })
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth
  const { userId } = auth

  let body: any
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { title, author, notes, spirit_tags, filename, file_size, file_path, ai_generated, sourceType, fileHash } = body
  const source_type: string = sourceType === 'intelligence' ? 'intelligence' : 'christian'

  console.log('[LIBRARY-UPLOAD] Request received', { userId, filename, file_size, file_path })

  if (!title?.trim() || !file_path) {
    return Response.json({ error: 'title and file_path are required' }, { status: 400 })
  }

  const resolvedFilename = filename || file_path.split('/').pop() || ''
  const fileType = resolvedFilename.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt'

  const sb = makeSupabase()

  // ── Belt-and-suspenders dedup (fast, before download/extract/insert) ────────
  const dedup = await findDuplicateResource(sb, {
    filename:    resolvedFilename,
    fileHash:    typeof fileHash === 'string' ? fileHash : null,
    fileSize:    typeof file_size === 'number' ? file_size : null,
    scopeColumn: 'topic',
    scopeValue:  'ministry-library',
  })
  if (dedup.duplicate) {
    return Response.json({
      error:         'duplicate',
      message:       `Already in library: "${dedup.existingTitle}"`,
      existingId:    dedup.existingId,
      existingTitle: dedup.existingTitle,
      matchedOn:     dedup.matchedOn,
    }, { status: 409 })
  }

  console.log('[LIBRARY-UPLOAD] Writing to Supabase resources table...', { title: title.trim(), fileType, file_path })

  const { data: row, error } = await sb
    .from('resources')
    .insert({
      title:        title.trim(),
      author:       author?.trim() || 'Unknown',
      notes:        notes?.trim() || '',
      filename:     resolvedFilename,
      file_size:    file_size || 0,
      file_path,
      file_type:    fileType,
      file_hash:    typeof fileHash === 'string' && fileHash ? fileHash : null,
      topic:        'ministry-library',
      user_id:      userId,
      ai_generated: Boolean(ai_generated),
      active:       true,
      spirit_tags:  Array.isArray(spirit_tags) ? spirit_tags : [],
      source_type,
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

      const extractedText = await extractText(fileBuffer, resolvedFilename)
      console.log('[LIBRARY-UPLOAD] Text extraction result', {
        textLength: extractedText.length,
        preview: extractedText.slice(0, 300),
      })

      if (extractedText && extractedText.length >= 50) {
        const { error: updateErr } = await sb
          .from('resources')
          .update({ extracted_text: extractedText })
          .eq('id', row.id)
        if (updateErr) {
          console.error('[LIBRARY-UPLOAD] FAILED at step: Update extracted_text', updateErr.message)
        } else {
          console.log('[LIBRARY-UPLOAD] extracted_text stored', { chars: extractedText.length, resourceId: row.id })
          // Fire-and-forget: embed the new book so it's immediately searchable via content-query.
          // Not awaited — response returns to the admin without waiting for embedding to complete.
          void chunkAndEmbed(sb, row.id, title.trim(), extractedText).catch(e =>
            console.error('[LIBRARY-UPLOAD] Embed failed:', e.message)
          )
          // AI spirit tag extraction — best effort, non-fatal
          try {
            console.log('[LIBRARY-UPLOAD] Calling Claude for tags...')
            const excerpt = extractedText.slice(0, 8000)
            const aiPrompt = `You are analyzing a deliverance ministry document.

DOCUMENT TEXT (first 8000 chars):
${excerpt}

Your task:
1. Read the full text carefully
2. Identify EVERY demonic spirit, demon name, spiritual entity, or occult force mentioned or strongly implied
3. Include both explicit names (Leviathan, Baal, Jezebel) AND functional spirits (Pride, Rejection, Fear, Witchcraft, Divination)
4. Cross-reference against known demon taxonomy:
   Principalities: Satan, Leviathan, Baal, Jezebel, Python, Belial, Beelzebub, Apollyon, Abaddon, Mammon, Molech, Chemosh, Dagon, Ashtoreth, Baphomet
   Powers: Witchcraft, Divination, Freemasonry spirits, Marine spirits, Religious spirit, Spirit of Death, Infirmity
   Common spirits: Pride, Rejection, Fear, Shame, Lust, Perversion, Addiction, Confusion, Torment, Suicide, Rage, Control, Manipulation, Deception, Rebellion, Bitterness, Unforgiveness, Grief, Trauma
   Occult: Familiar spirits, Ancestral spirits, Incubus, Succubus, Voodoo spirits, Santeria, New Age spirits
5. Identify the document's PRIMARY ministry function
6. Identify the PRIMARY topic category

Return ONLY a raw JSON object. No markdown. No code fences. No explanation before or after. Start with { and end with }.
{
  "title": "clean professional document title",
  "description": "2-3 sentence summary written for a deliverance minister explaining what this document is and how to use it in ministry",
  "spirit_tags": ["Spirit1", "Spirit2"],
  "function_tags": ["Teaching"],
  "topic": "Deliverance Foundations"
}

function_tags must be from: Teaching, Protocol, Worksheet, Session Tool, Scripture Reference, Aftercare, Assessment Tool, Quick Reference, Leader Guide, Self-Deliverance, Group Exercise, Renunciation Prayer
topic must be from: Soul Ties, Generational Curses, Forgiveness, Ungodly Vows, Freemasonry & Secret Societies, Sexual Bondage, Fear, Deliverance Foundations, Witchcraft & Occult, Marine Kingdom, False Religion / Paganism, Death & Destruction, Deception / Lies, Inner Healing, Trauma & Abuse`

            const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY!,
                'anthropic-version': '2023-06-01',
              },
              body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1000,
                system: 'You are a deliverance ministry document analyst. Return ONLY valid JSON. No markdown, no code fences, no explanation. Start with { and end with }.',
                messages: [{ role: 'user', content: aiPrompt }],
              }),
              signal: AbortSignal.timeout(15000),
            })
            if (aiRes.ok) {
              const aiData = await aiRes.json()
              const rawText = (aiData.content?.[0]?.text || '').trim()
              console.log('[LIBRARY-UPLOAD] Claude raw response:', rawText.slice(0, 500))

              let cleaned = rawText
                .replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/```\s*$/im, '').trim()
              const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
              if (jsonMatch) cleaned = jsonMatch[0]

              let parsed: any = { spirit_tags: [], function_tags: [] }
              try {
                parsed = JSON.parse(cleaned)
              } catch {
                console.error('[LIBRARY-UPLOAD] JSON parse failed:', cleaned.slice(0, 300))
              }

              console.log('[LIBRARY-UPLOAD] Parsed spirit_tags:', parsed.spirit_tags)

              const aiUpdate: Record<string, any> = {
                spirit_tags: Array.isArray(parsed.spirit_tags) ? parsed.spirit_tags : [],
                function_tags: Array.isArray(parsed.function_tags) ? parsed.function_tags : [],
              }
              if (parsed.description) aiUpdate.description = parsed.description
              if (parsed.topic) aiUpdate.topic = parsed.topic
              await sb.from('resources').update(aiUpdate).eq('id', row.id)
              console.log('[LIBRARY-UPLOAD] AI tagging stored', { spirits: aiUpdate.spirit_tags.length, topic: aiUpdate.topic })
            }
          } catch (e: any) {
            console.error('[LIBRARY-UPLOAD] AI tagging failed:', e?.message)
          }
        }
      } else {
        console.log('[LIBRARY-UPLOAD] Insufficient text extracted — skipping AI tagging')
      }
    }
  } catch (e: any) {
    console.error('[LIBRARY-UPLOAD] FAILED at step: Text extraction', e?.message)
  }

  return Response.json({ success: true, book: row })
}

export const config = { path: '/api/admin-library-save' }
