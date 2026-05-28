import { createClient } from '@supabase/supabase-js'

const BUCKET   = 'ministry-library'
const MAX_CHARS = 120_000

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function isMinister(token: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId  = payload.sub
    if (!userId) return false
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return false
    const data = await res.json()
    const role  = data?.public_metadata?.role
    const tier  = data?.public_metadata?.tier?.toLowerCase()
    return role === 'minister' || role === 'admin' || ['general', 'commander'].includes(tier)
  } catch { return false }
}

async function extractText(arrayBuffer: ArrayBuffer, filename: string): Promise<string | null> {
  const ext = filename.toLowerCase().split('.').pop()
  console.log(`[REANALYZE] Extracting text: ext=${ext} filename=${filename} bufSize=${arrayBuffer.byteLength}`)

  if (ext === 'docx') {
    try {
      const { createRequire } = await import('module')
      const req     = createRequire(import.meta.url)
      const mammoth = req('mammoth')
      const result  = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) })
      const text    = (result.value || '').slice(0, MAX_CHARS)
      console.log(`[REANALYZE] DOCX extracted: ${text.length} chars`)
      return text || null
    } catch (e: any) {
      console.error('[REANALYZE] mammoth error:', e?.message)
      return null
    }
  }

  // Default: treat as UTF-8 text (covers .txt and any plain text format)
  const text = new TextDecoder('utf-8').decode(arrayBuffer).replace(/\0/g, ' ').slice(0, MAX_CHARS)
  console.log(`[REANALYZE] TXT/text extracted: ${text.length} chars`)
  return text || null
}

// Simple regex extraction fallback (no external deps)
function simpleRegexExtract(text: string): string[] {
  const found = new Set<string>()
  const patterns = [
    /\ball\s+spirits\s+of\s+([A-Za-z][A-Za-z' \-,]{2,80})/gi,
    /\bspirits?\s+of\s+([A-Za-z][A-Za-z' \-]{2,40})/gi,
    /\bdemons?\s+of\s+([A-Za-z][A-Za-z' \-]{2,40})/gi,
  ]
  for (const p of patterns) {
    let m
    while ((m = p.exec(text)) !== null) {
      m[1].split(/[,;]/).forEach(s => {
        const clean = s.trim().replace(/[.!?]+$/, '').replace(/\b\w/g, c => c.toUpperCase())
        if (clean.length > 2 && clean.length < 40 && /^[A-Z]/.test(clean)) found.add(clean)
      })
    }
  }
  return Array.from(found).slice(0, 40)
}

const AI_PROMPT = (excerpt: string) => `You are analyzing a deliverance ministry document.

DOCUMENT TEXT (first 8000 chars):
${excerpt}

Your task:
1. Read the full text carefully
2. Identify EVERY demonic spirit, demon name, spiritual entity, or occult force mentioned or strongly implied
3. Include both explicit names (Leviathan, Baal, Jezebel) AND functional spirits (Pride, Rejection, Fear, Witchcraft, Divination)
4. Identify the document's PRIMARY ministry function
5. Note: topic field in response is for display only and will NOT overwrite library classification

Return ONLY this JSON (no markdown, no code fences):
{
  "title": "clean professional document title",
  "description": "2-3 sentence summary written for a deliverance minister explaining what this document is and how to use it in ministry",
  "spirit_tags": ["Spirit1", "Spirit2"],
  "function_tags": ["Teaching"]
}

function_tags must be from: Teaching, Protocol, Worksheet, Session Tool, Scripture Reference, Aftercare, Assessment Tool, Quick Reference, Leader Guide, Self-Deliverance, Group Exercise, Renunciation Prayer`

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: CORS })

  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })
    const ok = await isMinister(token)
    if (!ok) return new Response(JSON.stringify({ error: 'Minister role required' }), { status: 403, headers: CORS })

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
    if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY not set in environment')

    let body: any
    try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS }) }

    const { resourceId } = body || {}
    if (!resourceId) return new Response(JSON.stringify({ error: 'resourceId required' }), { status: 400, headers: CORS })

    console.log('[REANALYZE] Starting for resourceId:', resourceId)

    const client = sb()

    const { data: resource, error: fetchErr } = await client
      .from('resources')
      .select('id, title, file_path, file_type, filename, topic')
      .eq('id', resourceId)
      .single()

    if (fetchErr || !resource) {
      console.error('[REANALYZE] Resource fetch error:', fetchErr?.message)
      return new Response(JSON.stringify({ error: fetchErr?.message || 'Resource not found' }), { status: 404, headers: CORS })
    }

    console.log('[REANALYZE] Resource found:', resource.id, '| file_path:', resource.file_path, '| topic:', resource.topic)

    const filePath = resource.file_path
    const filename = resource.filename || filePath || ''

    // Step 1: Download file — try primary path, then alternate path formats
    console.log('[REANALYZE] Downloading from path:', filePath)
    let blob: Blob | null = null
    {
      const { data, error: dlErr } = await client.storage.from(BUCKET).download(filePath)
      if (dlErr || !data) {
        console.warn('[REANALYZE] Primary path failed:', dlErr?.message, '— trying alternate paths')
        // Try without leading slash
        const stripped = filePath?.replace(/^\/+/, '')
        const { data: d2, error: e2 } = await client.storage.from(BUCKET).download(stripped)
        if (e2 || !d2) {
          // Try basename only
          const basename = filePath?.split('/').pop() || ''
          const { data: d3, error: e3 } = await client.storage.from(BUCKET).download(basename)
          if (e3 || !d3) {
            const msg = `File not found: tried "${filePath}", "${stripped}", "${basename}" — ${e3?.message || dlErr?.message}`
            console.error('[REANALYZE]', msg)
            return new Response(JSON.stringify({ error: msg }), { status: 404, headers: CORS })
          }
          console.log('[REANALYZE] Downloaded via basename:', basename)
          blob = d3
        } else {
          console.log('[REANALYZE] Downloaded via stripped path:', stripped)
          blob = d2
        }
      } else {
        blob = data
      }
    }

    console.log('[REANALYZE] File downloaded, size:', blob?.size)

    // Step 2: Extract text
    const arrayBuffer  = await blob!.arrayBuffer()
    const extractedText = await extractText(arrayBuffer, filename)

    if (!extractedText) {
      const msg = `Could not extract text from file (filename: ${filename})`
      console.error('[REANALYZE]', msg)
      return new Response(JSON.stringify({ error: msg }), { status: 422, headers: CORS })
    }

    console.log('[REANALYZE] Text extracted, length:', extractedText.length)

    // Step 3: Store extracted text immediately
    await client.from('resources')
      .update({
        extracted_text: extractedText,
        ai_generated:   true,
        indexed_at:     new Date().toISOString(),
        source_char_count: extractedText.length,
      })
      .eq('id', resourceId)

    // Step 4: Run Claude analysis for title/description/spirit_tags/function_tags
    console.log('[REANALYZE] Calling Claude...')
    let parsed: any = null

    try {
      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':    'application/json',
          'x-api-key':       ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 1000,
          system:     'You are a deliverance ministry document analyst. Return ONLY valid JSON. No markdown, no code fences.',
          messages:   [{ role: 'user', content: AI_PROMPT(extractedText.slice(0, 8000)) }],
        }),
        signal: AbortSignal.timeout(20000),
      })

      if (!aiRes.ok) {
        const errText = await aiRes.text()
        console.error('[REANALYZE] Claude error:', aiRes.status, errText.slice(0, 200))
        throw new Error(`Claude API ${aiRes.status}: ${errText.slice(0, 100)}`)
      }

      const aiData = await aiRes.json()
      const raw    = (aiData.content?.[0]?.text || '').trim()
        .replace(/^```[\w]*\n?/i, '').replace(/\n?```$/i, '').trim()
      console.log('[REANALYZE] Claude raw (first 300):', raw.slice(0, 300))

      try { parsed = JSON.parse(raw) } catch {
        const m = raw.match(/\{[\s\S]*\}/)
        if (m) { try { parsed = JSON.parse(m[0]) } catch {} }
      }
    } catch (claudeErr: any) {
      console.warn('[REANALYZE] Claude call failed, using regex fallback:', claudeErr.message)
    }

    // Step 5: Fallback to simple regex if Claude failed
    if (!parsed || !Array.isArray(parsed.spirit_tags)) {
      console.log('[REANALYZE] Using regex fallback for spirit_tags')
      const regexTags = simpleRegexExtract(extractedText)
      console.log('[REANALYZE] Regex fallback found:', regexTags.length, 'tags')
      parsed = parsed || {}
      parsed.spirit_tags = regexTags
    }

    // Step 6: Build update — NEVER overwrite topic (that would remove book from library list)
    // Confirmed columns: title, description, spirit_tags (TEXT[]), function_tags (TEXT[]),
    //                    extraction_method, source_char_count, indexed_at, extracted_text
    const update: Record<string, any> = {
      extraction_method: 'reanalyze-claude',
    }
    if (parsed.title)                        update.title          = parsed.title
    if (parsed.description)                  update.description    = parsed.description
    if (Array.isArray(parsed.spirit_tags))   update.spirit_tags    = parsed.spirit_tags
    if (Array.isArray(parsed.function_tags)) update.function_tags  = parsed.function_tags

    console.log('[REANALYZE] Updating DB:', Object.keys(update), '| spirit_tags count:', update.spirit_tags?.length)

    const { data: updated, error: updateErr } = await client
      .from('resources')
      .update(update)
      .eq('id', resourceId)
      .select()
      .single()

    console.log('[REANALYZE] DB update result:', updateErr?.message || 'success')

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: CORS })
    }

    console.log(`[REANALYZE] Done: ${update.title || resource.title} — ${update.spirit_tags?.length ?? 0} spirit tags`)
    return new Response(JSON.stringify({ success: true, resource: updated }), { status: 200, headers: CORS })

  } catch (e: any) {
    console.error('[REANALYZE] FATAL ERROR:', e.message, e.stack)
    return new Response(JSON.stringify({
      error: e.message,
      stack: e.stack?.slice(0, 500),
    }), { status: 500, headers: CORS })
  }
}

export const config = { path: '/api/library-reanalyze' }
