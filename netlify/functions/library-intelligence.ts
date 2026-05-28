import { createClient } from '@supabase/supabase-js'

const MAX_BOOKS = 20

const headers = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function fetchLibraryBooks() {
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
  if (typeof raw !== 'string') return ''
  return raw
    .replace(/\0/g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function claudeCall(system: string, user: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body:    JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 4000, system, messages: [{ role: 'user', content: user }] }),
  })
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`)
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST')   return new Response('Method not allowed', { status: 405, headers })

  const body = await req.json().catch(() => ({}))
  const { tool, query } = body

  console.log('[LIBRARY-INTEL] tool:', tool, 'query:', query?.slice(0, 80))

  // Safe JWT decode — never throws
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

  if (!userId && tool !== 'gap-analysis' && tool !== 'content-query') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  }

  // ── TOOL 1: Spirit Gap Analysis (cache-only, no external calls) ──────────────
  if (tool === 'gap-analysis') {
    console.log('[GAP] Fast cache-only gap analysis')

    const client = sb()

    const { data: cached, error: cacheErr } = await client
      .from('library_spirit_cache')
      .select('spirit_name, normalized_name, source, confidence')
      .order('confidence', { ascending: false })
      .limit(200)

    if (cacheErr) {
      return new Response(JSON.stringify({ error: cacheErr.message }), { status: 500, headers })
    }

    const { data: books } = await client
      .from('resources')
      .select('title')
      .eq('topic', 'ministry-library')

    const seen = new Set<string>()
    const gaps = (cached || [])
      .filter(r => {
        if (seen.has(r.normalized_name)) return false
        seen.add(r.normalized_name)
        return true
      })
      .map(r => ({
        name:              r.spirit_name,
        description:       'Found in your ministry library',
        source:            r.source,
        suggested_kingdom: 'Unknown',
        confidence:        r.confidence,
      }))

    return new Response(JSON.stringify({
      gaps,
      summary:   `Found ${gaps.length} spirits in your library. Compare against your database to identify gaps.`,
      bookCount: books?.length || 0,
      bookTitles: (books || []).map((b: any) => b.title),
      note:      'Showing all library spirits — cross-reference your demon database manually or via Intel Archive.',
    }), { status: 200, headers })
  }

  // ── TOOL 2: Content Intelligence Query ───────────────────────────────────────
  if (tool === 'content-query') {
    if (!query?.trim()) return new Response(JSON.stringify({ error: 'query required' }), { status: 400, headers })

    const start      = Date.now()
    const books      = await fetchLibraryBooks()
    const bookTitles = books.map((b: any) => `${b.title}${b.author ? ` by ${b.author}` : ''}`)
    if (!books.length) return new Response(JSON.stringify({ error: 'No library content available.' }), { status: 400, headers })

    const libraryText = books.map((b: any) =>
      `[${b.title}${b.author ? ` by ${b.author}` : ''}]:\n${cleanExtractedText(b.extracted_text).slice(0, 3000)}`
    ).join('\n\n---\n\n')

    if (Date.now() - start > 20000) {
      return new Response(JSON.stringify({ error: 'Query took too long — try a more specific question' }), { status: 408, headers })
    }

    const system  = `You are a ministry content strategist for War Room Intel (warroomintel.com), a spiritual warfare platform for deliverance ministers. The platform has: Intel Archive (demon database), Field Ministry (knowledge base articles), Arsenal (scripture library), Assessment (diagnostic wizard), Training (courses/episodes), Fringe Intelligence (articles), Testimony Wall, Prayer Wall, Body Map, Spirit Network, Spiritual Mapping module. You have access to the admin's internal ministry library. Answer questions about what content exists in the library and how it could be used to build out the platform.`
    const userMsg = `${query.trim()}\n\nLibrary documents:\n${libraryText}`

    const response = await claudeCall(system, userMsg)

    return new Response(JSON.stringify({ response, bookTitles }), { status: 200, headers })
  }

  return new Response(JSON.stringify({ error: 'Unknown tool. Use gap-analysis or content-query.' }), { status: 400, headers })
}

export const config = { path: '/api/library-intelligence' }
