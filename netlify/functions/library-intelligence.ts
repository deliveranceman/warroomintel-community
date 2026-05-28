import { createClient } from '@supabase/supabase-js'

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!
const AIRTABLE_BASE  = 'appVXEj2DLPBTJTtD'
const AIRTABLE_TABLE = 'tblcP4lgVykzOhLi4'
const PRIMARY_FIELD  = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'
const MAX_BOOKS      = 20
const CHARS_PER_BOOK = 10000

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

// ─── SHARED EXTRACTION PIPELINE ───────────────────────────────────────────────

const STOPWORDS = new Set([
  'god', 'jesus', 'christ', 'lord', 'holy spirit', 'father',
  'blood', 'bible', 'scripture', 'name', 'amen', 'deliverance',
  'prayer', 'people', 'family', 'church', 'children', 'things',
  'power', 'truth', 'grace', 'faith', 'love', 'peace', 'joy',
  'heaven', 'earth', 'man', 'men', 'woman', 'women', 'person',
  'him', 'her', 'them', 'they', 'you', 'we', 'us', 'me', 'i',
  'this', 'that', 'these', 'those', 'what', 'which', 'who',
  'all', 'any', 'every', 'some', 'none', 'the', 'a', 'an',
  'holy', 'spirit', 'spirits', 'demon', 'demons', 'evil',
  'sin', 'sins', 'curse', 'curses', 'bond', 'bondage',
  'satan', 'devil', 'enemy', 'darkness', 'light',
  'pastor', 'minister', 'leader', 'group', 'meeting',
  'body', 'soul', 'mind', 'heart', 'flesh', 'blood',
])

const CONTEXT_WORDS = ['come out', 'rebuke', 'renounce', 'bind', 'loose', 'cast out', 'command', 'leave', 'go now', 'depart']

function regexExtractCandidates(text: string): Map<string, { score: number; canonical: string }> {
  const patterns = [
    /\ball\s+spirits\s+of\s+([A-Za-z][A-Za-z' \-,\/&]{2,120})/gi,
    /\bspirits?\s+of\s+([A-Za-z][A-Za-z' \-]{2,60})/gi,
    /\bdemons?\s+of\s+([A-Za-z][A-Za-z' \-]{2,60})/gi,
    /\bspirit\s+([A-Z][a-zA-Z]{2,30})\b/g,
  ]
  const scores    = new Map<string, number>()
  const canonical = new Map<string, string>()
  const textLower = text.toLowerCase()

  for (const pattern of patterns) {
    const isAllSpirits = pattern.source.includes('all\\s+spirits')
    const isSpiritOf   = pattern.source.includes('spirits?\\s+of')
    let match
    while ((match = pattern.exec(text)) !== null) {
      const parts = match[1].split(/[,;\/]|\s+and\s+|\s+or\s+|&/)
      for (const part of parts) {
        let name = part.trim()
          .replace(/^the\s+/i, '')
          .replace(/[.!?:]+$/, '')
          .replace(/\s+/g, ' ')
          .trim()
        if (name.length < 3 || name.length > 50) continue
        if (!/^[A-Z]/.test(name)) continue
        name = name.replace(/\b\w/g, c => c.toUpperCase())
        const nl = name.toLowerCase()
        if (STOPWORDS.has(nl) || nl.split(' ').every(w => STOPWORDS.has(w))) continue
        if (!canonical.has(nl)) canonical.set(nl, name)
        const cur   = scores.get(nl) || 0
        const bonus = isAllSpirits ? 4 : isSpiritOf ? 5 : 3
        scores.set(nl, cur + bonus)
        const pos    = match.index
        const window = textLower.slice(Math.max(0, pos - 100), Math.min(textLower.length, pos + 150))
        if (CONTEXT_WORDS.some(w => window.includes(w))) scores.set(nl, (scores.get(nl) || 0) + 2)
      }
    }
  }

  // Frequency bonus
  for (const [nl, score] of scores.entries()) {
    const occ = (textLower.match(new RegExp(nl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
    if (occ >= 3)      scores.set(nl, score + 3)
    else if (occ >= 2) scores.set(nl, score + 1)
  }

  const result = new Map<string, { score: number; canonical: string }>()
  for (const [nl, score] of scores.entries()) {
    if (score >= 4) result.set(nl, { score, canonical: canonical.get(nl) || nl })
  }
  return result
}

async function validateUnknownsWithClaude(
  unknownCandidates: string[],
  books: any[],
): Promise<Array<{ name: string; context: string; source: string; suggested_kingdom: string }>> {
  if (unknownCandidates.length === 0) return []

  const BATCH_SIZE = 40
  const allGaps: Array<{ name: string; context: string; source: string; suggested_kingdom: string }> = []

  // Build a quick lookup: spirit name → book that mentions it
  const textCorpus = books.map(b => ({
    title: b.title,
    text: (b.extracted_text || '').slice(0, CHARS_PER_BOOK).toLowerCase(),
  }))

  for (let i = 0; i < unknownCandidates.length; i += BATCH_SIZE) {
    const batch = unknownCandidates.slice(i, i + BATCH_SIZE)
    const prompt = `You are validating candidate spirit/demon names from deliverance ministry books to determine if they are NOT in our database yet.

CANDIDATES (confirm which are real spiritual entities not commonly found in databases):
${batch.map((n, idx) => `${idx + 1}. ${n}`).join('\n')}

For each confirmed spiritual entity, suggest a kingdom category.

Return ONLY this JSON (no markdown, start with {):
{
  "confirmed": [
    {
      "name": "Spirit Name",
      "suggested_kingdom": "Witchcraft|Occult|False Religion|Air|Water|Earth|Darkness|Hell"
    }
  ]
}`
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1200, messages: [{ role: 'user', content: prompt }] }),
      })
      const data = await res.json()
      const raw  = data.content[0].text
      const cleaned = raw.replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/```\s*$/im, '').trim()
      const m = cleaned.match(/\{[\s\S]*\}/)
      const result = JSON.parse(m ? m[0] : cleaned)

      for (const item of (result.confirmed || [])) {
        // Find which book mentions it
        const nameLower = item.name.toLowerCase()
        const sourceBook = textCorpus.find(b => b.text.includes(nameLower))
        allGaps.push({
          name:              item.name,
          context:           `Mentioned in library document`,
          source:            sourceBook?.title || 'Library document',
          suggested_kingdom: item.suggested_kingdom || 'Unknown',
        })
      }
    } catch (e) {
      console.error('[GAP-ANALYSIS] Batch validation failed:', e)
      // Fallback: add all from batch as unvalidated
      for (const name of batch) {
        const nameLower = name.toLowerCase()
        const sourceBook = textCorpus.find(b => b.text.includes(nameLower))
        allGaps.push({ name, context: 'Extracted via regex scan', source: sourceBook?.title || 'Library document', suggested_kingdom: 'Unknown' })
      }
    }
  }

  return allGaps
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
    const t0 = Date.now()
    const spiritNames = await fetchAllSpiritNames()
    console.log(`[GAP-ANALYSIS] Loaded ${spiritNames.length} spirit names in ${Date.now() - t0}ms`)

    // Step 1: Run full-doc regex scan across all books
    const globalScores = new Map<string, { score: number; canonical: string }>()
    for (const book of books) {
      const text = (book.extracted_text || '').slice(0, CHARS_PER_BOOK)
      const bookMap = regexExtractCandidates(text)
      for (const [nl, entry] of bookMap.entries()) {
        const existing = globalScores.get(nl)
        if (!existing || entry.score > existing.score) {
          globalScores.set(nl, entry)
        } else {
          globalScores.set(nl, { score: existing.score + entry.score, canonical: existing.canonical })
        }
      }
    }

    const allCandidates = Array.from(globalScores.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .map(([_, v]) => v.canonical)

    console.log(`[GAP-ANALYSIS] ${allCandidates.length} total candidates across ${books.length} books`)

    // Step 2: Filter against existing database
    const existingLower = new Set(spiritNames.map(n => n.toLowerCase()))
    const unknownCandidates = allCandidates.filter(name => {
      const nl = name.toLowerCase()
      if (existingLower.has(nl)) return false
      for (const ex of existingLower) {
        if (ex.includes(nl) || nl.includes(ex)) return false
      }
      return true
    })

    console.log(`[GAP-ANALYSIS] ${unknownCandidates.length} unknown candidates after DB filter`)

    // Step 3: Batch Claude validation
    const gaps = await validateUnknownsWithClaude(unknownCandidates, books)

    console.log(`[GAP-ANALYSIS] Confirmed ${gaps.length} gaps in ${Date.now() - t0}ms total`)

    return new Response(JSON.stringify({
      gaps,
      summary: `Scanned ${books.length} books. Found ${allCandidates.length} spirit candidates, ${unknownCandidates.length} not in database, confirmed ${gaps.length} new spirits.`,
      bookTitles,
      bookCount:    books.length,
      spiritCount:  spiritNames.length,
      totalCandidates: allCandidates.length,
    }), { status: 200, headers })
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
