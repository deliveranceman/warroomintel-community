import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

function resolveUserId(token: string): string {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return ''
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    return payload.sub || ''
  } catch { return '' }
}

async function semanticSearch(query: string, limit = 5): Promise<any[]> {
  const OPENAI_KEY = process.env.OPENAI_API_KEY || ''
  if (!OPENAI_KEY) return []
  try {
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
      body:    JSON.stringify({ model: 'text-embedding-3-small', input: [query] }),
      signal:  AbortSignal.timeout(8000),
    })
    if (!embRes.ok) return []
    const embData = await embRes.json()
    const vector  = embData.data?.[0]?.embedding
    if (!vector) return []
    const { data: chunks } = await sb().rpc('match_library_chunks', {
      query_embedding: vector,
      match_threshold: 0.6,
      match_count:     limit,
    })
    return chunks || []
  } catch (e: any) {
    console.log('[admin-chat] semantic search failed:', e.message)
    return []
  }
}

async function keywordSearch(query: string, limit = 5): Promise<any[]> {
  const terms  = query.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 5)
  if (!terms.length) return []
  const { data: books } = await sb()
    .from('resources')
    .select('title, extracted_text')
    .eq('topic', 'ministry-library')
    .not('extracted_text', 'is', null)
    .limit(20)
  if (!books?.length) return []

  interface Chunk { book_title: string; chunk_text: string; similarity: number }
  const scored: Chunk[] = []
  for (const book of books) {
    const text = book.extracted_text || ''
    for (let i = 0; i < text.length; i += 1800) {
      const chunk = text.slice(i, i + 2000)
      if (chunk.length < 100) continue
      const lc    = chunk.toLowerCase()
      let score   = 0
      for (const term of terms) score += (lc.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
      if (score > 0) scored.push({ book_title: book.title, chunk_text: chunk.slice(0, 1200), similarity: score / 10 })
    }
  }
  scored.sort((a, b) => b.similarity - a.similarity)
  return scored.slice(0, limit)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS })

  const token  = req.headers.get('Authorization')?.replace('Bearer ', '').trim() || ''
  const userId = resolveUserId(token)
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || ''
  if (!ANTHROPIC_KEY) return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 500, headers: CORS })

  const body = await req.json().catch(() => ({}))
  const { message, history = [], contextMode = 'both' } = body

  if (!message?.trim()) return new Response(JSON.stringify({ error: 'message required' }), { status: 400, headers: CORS })

  // ── Step 1: Semantic search library ────────────────────────────────────────
  let libraryChunks: any[] = []
  if (contextMode === 'library' || contextMode === 'both') {
    libraryChunks = await semanticSearch(message, 5)
    if (!libraryChunks.length) {
      libraryChunks = await keywordSearch(message, 5)
    }
  }

  const sources = [...new Set(libraryChunks.map((c: any) => c.book_title).filter(Boolean))] as string[]

  // ── Step 2: Build system prompt ────────────────────────────────────────────
  const librarySection = libraryChunks.length > 0
    ? `\nPERSONAL MINISTRY LIBRARY (highest authority — cite these by book title):\n${libraryChunks.map((c: any) => `[${c.book_title}]: ${c.chunk_text}`).join('\n\n---\n\n')}\n`
    : ''

  const systemPrompt = `You are the War Room Intel Command AI — a private intelligence assistant for Pastor Justin Payne, founder of War Room Intel and Staffordtown Church (Church on Fire), Copperhill, Tennessee.

You have access to:
- Justin's personal ministry library (${libraryChunks.length} relevant passages retrieved)
- 295+ spirits in the War Room Intel demon database
- Full WRI platform context and ministry methodology

PERSONAL MINISTRY CONTEXT:
- Session methodology: 5-phase (Prep > Opening > Renunciations > Deliverance > Fill/Close)
- Hardcoded primary spirits every session: Leviathan and Mind Control
- Reference framework: Dan Duval / Bride Ministries two-movement methodology
- Active territory: Copper Basin, Tennessee (Appalachian strongholds)
- Key regional spirits: Leviathan (pride/isolation), Jezebel (witchcraft/control), Poverty (Appalachian poverty spirit)
- Freemasonry lineage: Great-grandfather William Frazier Payne (33rd degree)
- Primary source framework: Derek Prince, Rebecca Greenwood, Charles Kraft (inner healing), Frank Hammond (Pigs in the Parlor), Win Worley

WRI PLATFORM MODULES:
Intel Archive (demon database), Field Ministry (KB articles), Arsenal (scripture library), Assessment (diagnostic wizard), Training (courses), Fringe Intelligence (articles), Testimony Wall, Prayer Wall, Body Map, Spirit Network, Spiritual Mapping
${librarySection}
RESPONSE STYLE:
- Direct, tactical, grounded in scripture
- When referencing library passages, cite the book title in brackets
- Graduate theological level but practically ministry-focused
- Never fabricate — if uncertain, say so
- Format with markdown: headers for sections, bullets for lists`

  // ── Step 3: Build message history ──────────────────────────────────────────
  const clampedHistory = (history as any[]).slice(-20)
  const messages = [
    ...clampedHistory,
    { role: 'user', content: message },
  ]

  // ── Step 4: Call Claude Sonnet ─────────────────────────────────────────────
  console.log(`[admin-chat] userId=${userId} mode=${contextMode} libChunks=${libraryChunks.length} msgLen=${message.length}`)

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system:     systemPrompt,
      messages,
    }),
    signal: AbortSignal.timeout(25000),
  })

  if (!aiRes.ok) {
    const err = await aiRes.text()
    return new Response(JSON.stringify({ error: `Claude error ${aiRes.status}: ${err.slice(0, 200)}` }), { status: 500, headers: CORS })
  }

  const aiData = await aiRes.json()
  const response = aiData.content?.[0]?.text || ''

  return new Response(JSON.stringify({ response, sources }), { status: 200, headers: CORS })
}

export const config = { path: '/api/admin-chat' }
