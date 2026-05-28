import { createClient } from '@supabase/supabase-js'

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!
const AIRTABLE_BASE = 'appVXEj2DLPBTJTtD'
const AIRTABLE_TABLE = 'tblcP4lgVykzOhLi4'
const PRIMARY_FIELD = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'
const MAX_BOOKS = 8
const CHARS_PER_BOOK = 3000

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

async function fetchAllSpiritNames(): Promise<string[]> {
  const names: string[] = []
  let offset: string | undefined
  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`)
    url.searchParams.set('pageSize', '100')
    url.searchParams.set('fields[]', PRIMARY_FIELD)
    if (offset) url.searchParams.set('offset', offset)
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } })
    if (!res.ok) break
    const data = await res.json()
    for (const r of data.records || []) {
      const name = r.fields?.[PRIMARY_FIELD]
      if (name && name !== 'Primary Name') names.push(name)
    }
    offset = data.offset
  } while (offset)
  return names
}

async function fetchLibraryBooks() {
  console.log('[LIB-INTEL] Querying Supabase...')
  const { data, error } = await sb()
    .from('resources')
    .select('id, title, author, extracted_text')
    .eq('topic', 'ministry-library')
    .not('extracted_text', 'is', null)
    .limit(MAX_BOOKS)
  console.log('[GAP-ANALYSIS] Books found:', data?.length ?? 0, error?.message ?? null)
  return data || []
}

function buildLibraryText(books: any[]): { text: string; titles: string[] } {
  const titles: string[] = []
  const parts: string[] = []
  for (const book of books) {
    if (!book.extracted_text) continue
    const excerpt = book.extracted_text.slice(0, CHARS_PER_BOOK)
    parts.push(`[${book.title}${book.author ? ` by ${book.author}` : ''}]:\n${excerpt}`)
    titles.push(`${book.title}${book.author ? ` by ${book.author}` : ''}`)
  }
  return { text: parts.join('\n\n---\n\n'), titles }
}

async function claudeCall(system: string, user: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`)
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const ok = await resolveMinister(token)
  if (!ok) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })

  const body = await req.json()
  const { tool, query } = body

  console.log('[LIBRARY-SEARCH] Query received', { tool, query: query?.slice(0, 100) })
  const books = await fetchLibraryBooks()
  const { text: libraryText, titles: bookTitles } = buildLibraryText(books)
  console.log('[LIBRARY-SEARCH] Sending to Claude', { contextLength: libraryText.length, bookCount: books.length })

  if (!libraryText) {
    return new Response(JSON.stringify({ error: 'No library content available. Upload books with AI enabled in the Ministry Library tab.' }), { status: 400, headers })
  }

  // ── TOOL 1: Spirit Gap Analysis ──────────────────────────────────────────────
  if (tool === 'gap-analysis') {
    const spiritNames = await fetchAllSpiritNames()

    const combinedText = books.map((b: any) =>
      `=== ${b.title} ===\n${(b.extracted_text || '').slice(0, 2000)}`
    ).join('\n\n')

    const prompt = `You are analyzing ministry library documents to find spiritual entities mentioned that are NOT yet in our demon database.

DEMON DATABASE (spirits we already have — ${spiritNames.length} entries):
${spiritNames.slice(0, 300).join(', ')}

LIBRARY DOCUMENTS TEXT:
${combinedText.slice(0, 6000)}

Task: Identify spiritual entities, demons, or spirits mentioned in the library text that do NOT appear in our demon database list above. Only include spirits that are explicitly named or clearly referenced in the text.

Return ONLY a raw JSON object. No markdown. No code fences. Start with { and end with }.
{
  "gaps": [
    {
      "name": "Spirit Name",
      "context": "Brief quote or context showing where it appeared in the text",
      "source": "Book title it came from",
      "suggested_kingdom": "Witchcraft|Occult|False Religion|Air|Water|Earth|Darkness|Hell"
    }
  ],
  "summary": "One sentence summary of findings"
}`

    const rawResponse = await claudeCall(
      'You are a deliverance ministry database analyst. Return ONLY valid JSON. No markdown, no code fences. Start with { and end with }.',
      prompt
    )

    let cleaned = rawResponse
      .replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/```\s*$/im, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) cleaned = jsonMatch[0]

    let parsed: any = { gaps: [], summary: '' }
    try { parsed = JSON.parse(cleaned) } catch {
      console.error('[GAP-ANALYSIS] JSON parse failed:', cleaned.slice(0, 300))
    }

    return new Response(JSON.stringify({
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      summary: parsed.summary || '',
      bookTitles,
      bookCount: books.length,
      spiritCount: spiritNames.length,
    }), { status: 200, headers })
  }

  // ── TOOL 2: Content Intelligence Query ───────────────────────────────────────
  if (tool === 'content-query') {
    if (!query?.trim()) return new Response(JSON.stringify({ error: 'query required' }), { status: 400, headers })

    const system = `You are a ministry content strategist for War Room Intel (warroomintel.com), a spiritual warfare platform for deliverance ministers. The platform has: Intel Archive (demon database), Field Ministry (knowledge base articles), Arsenal (scripture library), Assessment (diagnostic wizard), Training (courses/episodes), Fringe Intelligence (articles), Testimony Wall, Prayer Wall, Body Map, Spirit Network, Spiritual Mapping module. You have access to the admin's internal ministry library. Answer questions about what content exists in the library and how it could be used to build out the platform.`

    const userMsg = `${query.trim()}\n\nLibrary documents:\n${libraryText}`

    const response = await claudeCall(system, userMsg)

    return new Response(JSON.stringify({ response, bookTitles }), { status: 200, headers })
  }

  return new Response(JSON.stringify({ error: 'Unknown tool. Use gap-analysis or content-query.' }), { status: 400, headers })
}

export const config = { path: '/api/library-intelligence' }
