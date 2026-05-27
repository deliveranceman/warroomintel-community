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
  const { data } = await sb()
    .from('resources')
    .select('title, author, extracted_text')
    .eq('topic', 'ministry-library')
    .eq('active', true)
    .eq('ai_generated', true)
    .limit(MAX_BOOKS)
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

  const books = await fetchLibraryBooks()
  const { text: libraryText, titles: bookTitles } = buildLibraryText(books)

  if (!libraryText) {
    return new Response(JSON.stringify({ error: 'No library content available. Upload books with AI enabled in the Ministry Library tab.' }), { status: 400, headers })
  }

  // ── TOOL 1: Spirit Gap Analysis ──────────────────────────────────────────────
  if (tool === 'gap-analysis') {
    const spiritNames = await fetchAllSpiritNames()
    const nameList = spiritNames.join(', ')

    const system = `You are a deliverance ministry database analyst for War Room Intel. You have been given two things: (1) the complete list of spirits already in the database, and (2) text from ministry library documents. Your job is to identify spirits, demonic entities, principalities, powers, or spiritual forces mentioned in the library documents that are NOT already in the database. Be specific — include exact names, alternate names, and the context in which they appear.

Format your response as a JSON array with no other text:
[
  {
    "spirit_name": "exact name",
    "source_document": "book title",
    "brief_description": "1-2 sentence description",
    "suggested_rank": "one of: Principality / Power / Ruler of Darkness / Spiritual Wickedness in High Places / Fallen Angel / Demon / Familiar Spirit / Spirit of Infirmity",
    "suggested_kingdom": "one of: Hell / Darkness / Air / Water / Earth / Witchcraft / Occult"
  }
]`

    const userMsg = `Here are the spirits already in my database:\n${nameList}\n\nHere are my ministry library documents:\n${libraryText}\n\nIdentify every spirit mentioned in the library documents that is NOT already in my database. Return JSON only.`

    const rawResponse = await claudeCall(system, userMsg)

    let results: any[] = []
    try {
      const jsonMatch = rawResponse.match(/\[[\s\S]*\]/)
      if (jsonMatch) results = JSON.parse(jsonMatch[0])
    } catch {
      results = []
    }

    return new Response(JSON.stringify({ results, bookTitles, spiritCount: spiritNames.length }), { status: 200, headers })
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
