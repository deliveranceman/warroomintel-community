import { createClient } from '@supabase/supabase-js'

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!
const AIRTABLE_BASE  = 'appVXEj2DLPBTJTtD'
const AIRTABLE_TABLE = 'tblcP4lgVykzOhLi4'
const PRIMARY_FIELD  = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'
const MAX_BOOKS = 20

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function fetchLibraryBooks() {
  console.log('[LIB-INTEL] Querying Supabase for library books...')
  const { data, error } = await sb()
    .from('resources')
    .select('id, title, author, extracted_text')
    .eq('topic', 'ministry-library')
    .not('extracted_text', 'is', null)
    .limit(MAX_BOOKS)
  console.log('[LIB-INTEL] Books found:', data?.length ?? 0, error?.message ?? null)
  return data || []
}

function cleanExtractedText(raw: unknown): string {
  if (typeof raw !== 'string') {
    console.warn('[LIBRARY] cleanExtractedText: input is not a string, got:', typeof raw)
    return ''
  }
  return raw
    .replace(/\0/g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Extract only spirit-relevant lines from raw text (before whitespace normalization destroys line structure)
function extractSpiritLines(rawText: unknown): string {
  if (typeof rawText !== 'string') return ''
  const sanitized = rawText.replace(/\0/g, ' ').replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ')
  const lines      = sanitized.split(/\r?\n/)
  const keywords   = ['spirit', 'demon', 'cast out', 'rebuke', 'bind', 'loose', 'renounce', 'come out']
  const relevant   = lines.filter(l => keywords.some(k => l.toLowerCase().includes(k)))
  const capsLines  = lines.filter(l => /^[A-Z]{3,}/.test(l.trim()))
  return [...new Set([...relevant, ...capsLines])].join('\n').slice(0, 8000)
}

async function claudeCall(system: string, user: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 4000, system, messages: [{ role: 'user', content: user }] }),
  })
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`)
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers })

  // Parse body first so we know the tool before enforcing auth
  const body = await req.json().catch(() => ({}))
  const { tool, query } = body

  console.log('[LIBRARY-INTEL] tool:', tool, 'query:', query?.slice(0, 80))

  // Safe JWT decode — never throws, handles "Bearer null" / missing tokens
  const authHeader = req.headers.get('Authorization') || ''
  const rawToken   = authHeader.replace('Bearer ', '').trim()
  let userId = ''
  if (rawToken && rawToken.split('.').length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(rawToken.split('.')[1], 'base64url').toString('utf8'))
      userId = payload.sub || payload.userId || ''
    } catch (e) {
      console.error('[LIB-INTEL] JWT decode failed:', e)
    }
  }

  // gap-analysis and content-query read shared library — no per-user auth required
  if (!userId && tool !== 'gap-analysis' && tool !== 'content-query') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  }

  // ── TOOL 1: Spirit Gap Analysis ──────────────────────────────────────────────
  // (gap-analysis does its own fresh books query internally — no pre-fetch needed)
  if (tool === 'gap-analysis') {
    try {
      const t0 = Date.now()
      console.log('[GAP] Starting gap analysis')

      // Check API key before doing any work
      const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
      if (!ANTHROPIC_KEY) {
        console.error('[GAP] ANTHROPIC_API_KEY not set')
        throw new Error('AI service not configured')
      }

      // Fresh books query with explicit error surfacing
      console.log('[GAP] Books query starting...')
      const { data: gapBooks, error: booksError } = await sb()
        .from('resources')
        .select('id, title, extracted_text')
        .eq('topic', 'ministry-library')
        .not('extracted_text', 'is', null)
      console.log('[GAP] Books found:', gapBooks?.length ?? 0, 'error:', booksError?.message ?? null)
      if (booksError) throw new Error(`Books query failed: ${booksError.message}`)
      if (!gapBooks?.length) throw new Error('No indexed books found. Re-analyze at least one book first.')

      // Load existing demon names from Airtable
      console.log('[GAP] Airtable fetch starting...')
      let existingNames: string[] = []
      try {
        const airtableRes = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?fields[]=${encodeURIComponent(PRIMARY_FIELD)}&pageSize=200`,
          { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }, signal: AbortSignal.timeout(10000) }
        )
        if (airtableRes.ok) {
          const airtableData = await airtableRes.json()
          existingNames = (airtableData.records || [])
            .map((r: any) => {
              const f = r.fields || {}
              return f[PRIMARY_FIELD] || f['Name'] || ''
            })
            .filter(Boolean)
          console.log('[GAP] Demon names loaded:', existingNames.length)
        } else {
          console.error('[GAP] Airtable error:', airtableRes.status)
        }
      } catch (e) {
        console.error('[GAP] Airtable fetch failed:', e)
        // Continue with empty list — better to find duplicates than crash
      }

      // Process books in parallel batches of 3 (Haiku for speed)
      const BATCH_SIZE     = 3
      const processedBooks: string[] = []
      const failedBooks:    string[] = []
      const allNewSpirits:  any[]    = []

      const processBook = async (book: any): Promise<{ spirits: any[]; title: string; success: boolean }> => {
        try {
          console.log('[GAP] Processing:', book.title, 'text type:', typeof book.extracted_text)
          const cleanText  = cleanExtractedText(book.extracted_text)
          if (!cleanText || cleanText.length < 50) {
            console.warn('[GAP] Insufficient text:', book.title)
            failedBooks.push(`${book.title}: insufficient text`)
            return { spirits: [], title: book.title, success: false }
          }
          // Use spirit-dense lines (preserves dict entries); fall back to compact clean text
          const spiritText = extractSpiritLines(book.extracted_text) || cleanText.slice(0, 8000)
          console.log('[GAP]', book.title, '— sending', spiritText.length, 'chars to Claude')

          const prompt = `You are a demon database specialist for a deliverance ministry platform. We have ${existingNames.length} spirits in our database.

EXISTING DATABASE (do not include these):
${existingNames.slice(0, 300).join(', ')}

BOOK: "${book.title}"

RELEVANT PASSAGES:
${spiritText}

Task: Find every demon name, spirit name, or spiritual entity in this text that is NOT already in our database above.

Pay special attention to:
- Proper name dictionaries (entries like "ALVAIZEITAN: description")
- Named spirits in ALL CAPS
- Spirits mentioned in renunciation lists
- Named principalities, powers, and entities
- Foreign/ancient names (Babylonian, Egyptian, Canaanite, etc.)

Return ONLY this JSON (no markdown):
{
  "newSpirits": [
    {
      "name": "ALVAIZEITAN",
      "description": "Controller of alcohol, drugs, and murder",
      "source": "${book.title}",
      "context": "Found in proper names section",
      "suggested_kingdom": "Addiction"
    }
  ]
}`

          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
            signal: AbortSignal.timeout(30000),
          })

          if (!res.ok) {
            const errText = await res.text()
            console.error('[GAP] Claude error for', book.title, ':', res.status, errText.slice(0, 200))
            failedBooks.push(`${book.title}: Claude API ${res.status}`)
            return { spirits: [], title: book.title, success: false }
          }

          const data    = await res.json()
          const rawText = (data.content?.[0]?.text || '').trim()
          console.log('[GAP] Claude response for', book.title, 'length:', rawText.length, 'preview:', rawText.slice(0, 100))

          const stripped  = rawText.replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/```\s*$/im, '').trim()
          const jsonMatch = stripped.match(/\{[\s\S]*\}/)
          let result: any = { newSpirits: [] }
          try {
            result = JSON.parse(jsonMatch ? jsonMatch[0] : stripped)
          } catch {
            console.error('[GAP] JSON parse failed for', book.title, 'raw:', rawText.slice(0, 200))
            failedBooks.push(`${book.title}: JSON parse failed`)
            return { spirits: [], title: book.title, success: false }
          }

          const bookSpirits = result.newSpirits || []
          console.log('[GAP] Found', bookSpirits.length, 'spirits in', book.title)
          return { spirits: bookSpirits, title: book.title, success: true }

        } catch (bookErr: any) {
          console.error('[GAP] Book processing failed:', book.title, bookErr.message)
          failedBooks.push(`${book.title}: ${bookErr.message}`)
          return { spirits: [], title: book.title, success: false }
        }
      }

      for (let i = 0; i < gapBooks.length; i += BATCH_SIZE) {
        const batch   = gapBooks.slice(i, i + BATCH_SIZE)
        const results = await Promise.all(batch.map(processBook))
        for (const { spirits, title, success } of results) {
          if (success) processedBooks.push(title)
          allNewSpirits.push(...spirits)
        }
        console.log(`[GAP] Batch ${Math.floor(i / BATCH_SIZE) + 1} done, total spirits so far: ${allNewSpirits.length}`)
      }

      // Deduplicate by name (case-insensitive)
      const seen = new Set<string>()
      const dedupedSpirits = allNewSpirits.filter((s: any) => {
        const key = (s.name || '').toLowerCase().trim()
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })

      console.log(`[GAP] Total: ${dedupedSpirits.length} unique spirits from ${processedBooks.length} books in ${Date.now() - t0}ms`)

      return new Response(JSON.stringify({
        gaps:          dedupedSpirits,
        summary:       `Analyzed ${processedBooks.length} books. Found ${dedupedSpirits.length} spirits not in database.${failedBooks.length > 0 ? ` ${failedBooks.length} books had errors.` : ''}`,
        bookTitles:    processedBooks,
        bookCount:     processedBooks.length,
        failedBooks,
        totalAnalyzed: gapBooks.length,
        spiritCount:   existingNames.length,
      }), { status: 200, headers })
    } catch (e: any) {
      console.error('[GAP] FATAL:', e.message)
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers })
    }
  }

  // ── TOOL 2: Content Intelligence Query ───────────────────────────────────────
  if (tool === 'content-query') {
    if (!query?.trim()) return new Response(JSON.stringify({ error: 'query required' }), { status: 400, headers })

    const books      = await fetchLibraryBooks()
    const bookTitles = books.map((b: any) => `${b.title}${b.author ? ` by ${b.author}` : ''}`)
    if (!books.length) return new Response(JSON.stringify({ error: 'No library content available.' }), { status: 400, headers })

    const libraryText = books.map((b: any) =>
      `[${b.title}${b.author ? ` by ${b.author}` : ''}]:\n${(b.extracted_text || '').slice(0, 3000)}`
    ).join('\n\n---\n\n')

    const system  = `You are a ministry content strategist for War Room Intel (warroomintel.com), a spiritual warfare platform for deliverance ministers. The platform has: Intel Archive (demon database), Field Ministry (knowledge base articles), Arsenal (scripture library), Assessment (diagnostic wizard), Training (courses/episodes), Fringe Intelligence (articles), Testimony Wall, Prayer Wall, Body Map, Spirit Network, Spiritual Mapping module. You have access to the admin's internal ministry library. Answer questions about what content exists in the library and how it could be used to build out the platform.`
    const userMsg = `${query.trim()}\n\nLibrary documents:\n${libraryText}`

    const response = await claudeCall(system, userMsg)

    return new Response(JSON.stringify({ response, bookTitles }), { status: 200, headers })
  }

  return new Response(JSON.stringify({ error: 'Unknown tool. Use gap-analysis or content-query.' }), { status: 400, headers })
}

export const config = { path: '/api/library-intelligence' }
