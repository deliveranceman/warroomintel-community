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

async function resolveMinister(token: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId  = payload.sub
    if (!userId) return false
    const res  = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return false
    const data = await res.json()
    return data?.public_metadata?.role === 'minister'
  } catch { return false }
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

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const ok = await resolveMinister(token)
  if (!ok) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })

  const body       = await req.json()
  const { tool, query } = body

  console.log('[LIBRARY-INTEL] tool:', tool, 'query:', query?.slice(0, 80))

  const books = await fetchLibraryBooks()
  const bookTitles = books.map((b: any) => `${b.title}${b.author ? ` by ${b.author}` : ''}`)

  if (!books.length) {
    return new Response(JSON.stringify({ error: 'No library content available. Upload books with AI enabled in the Ministry Library tab.' }), { status: 400, headers })
  }

  // ── TOOL 1: Spirit Gap Analysis ──────────────────────────────────────────────
  if (tool === 'gap-analysis') {
    try {
      const t0 = Date.now()
      console.log('[GAP] Starting gap analysis')

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

      // Analyze each book with Claude Sonnet
      const allGaps = new Map<string, { name: string; description: string; source: string; context: string; suggested_kingdom: string }>()

      for (const book of gapBooks) {
        if (!book.extracted_text) continue
        console.log('[GAP] Processing book:', book.title, 'text length:', book.extracted_text?.length)

        const prompt = `You are a demon database specialist for a deliverance ministry platform. We have ${existingNames.length} spirits in our database.

EXISTING DATABASE (do not include these):
${existingNames.slice(0, 300).join(', ')}

BOOK: "${book.title}"

FULL TEXT:
${book.extracted_text}

Task: Find every demon name, spirit name, or spiritual entity in this text that is NOT already in our database above.

Pay special attention to:
- Proper name dictionaries (entries like "ALVAIZEITAN: description")
- Named spirits in ALL CAPS
- Spirits mentioned in renunciation lists
- Named principalities, powers, and entities
- Foreign/ancient names (Babylonian, Egyptian, Canaanite, etc.)

For each new spirit found, provide the exact name, a brief description from context, and a kingdom category.

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

        try {
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
            signal: AbortSignal.timeout(50000),
          })

          if (!res.ok) {
            const errText = await res.text()
            console.error(`[GAP] Claude error for ${book.title}:`, res.status, errText.slice(0, 200))
            continue
          }

          const data = await res.json()
          const raw  = (data.content?.[0]?.text || '').trim()
            .replace(/^```[\w]*\n?/i, '').replace(/\n?```$/i, '').trim()

          let parsed: any = null
          try { parsed = JSON.parse(raw) } catch {
            const m = raw.match(/\{[\s\S]*\}/)
            if (m) { try { parsed = JSON.parse(m[0]) } catch {} }
          }

          const spirits = parsed?.newSpirits
          console.log('[GAP] Claude found spirits:', spirits?.length ?? 0, 'for', book.title)

          if (Array.isArray(spirits)) {
            for (const spirit of spirits) {
              if (!spirit.name) continue
              const key = spirit.name.toLowerCase().trim()
              if (!allGaps.has(key)) {
                allGaps.set(key, {
                  name:              spirit.name,
                  description:       spirit.description || '',
                  source:            spirit.source || book.title,
                  context:           spirit.context || 'Found in library document',
                  suggested_kingdom: spirit.suggested_kingdom || 'Unknown',
                })
              }
            }
          }
        } catch (e) {
          console.error(`[GAP] Failed to analyze ${book.title}:`, e)
        }
      }

      const gaps = Array.from(allGaps.values())
      console.log(`[GAP] Total: ${gaps.length} unique new spirits in ${Date.now() - t0}ms`)

      return new Response(JSON.stringify({
        gaps,
        summary: `Analyzed ${gapBooks.length} books. Found ${gaps.length} spirits not in database.`,
        bookTitles,
        bookCount:   gapBooks.length,
        spiritCount: existingNames.length,
      }), { status: 200, headers })
    } catch (e: any) {
      console.error('[GAP] FATAL:', e.message)
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers })
    }
  }

  // ── TOOL 2: Content Intelligence Query ───────────────────────────────────────
  if (tool === 'content-query') {
    if (!query?.trim()) return new Response(JSON.stringify({ error: 'query required' }), { status: 400, headers })

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
