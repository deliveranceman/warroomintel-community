import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from './_shared/requireAdmin'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

const STOPWORDS = new Set(['about', 'above', 'after', 'also', 'because', 'been', 'before', 'being', 'between', 'during', 'their', 'there', 'these', 'those', 'through', 'under', 'until', 'which', 'while', 'would', 'could', 'should', 'shall', 'other', 'every', 'first', 'second', 'third', 'where', 'when', 'then', 'them', 'they', 'this', 'that', 'from', 'have', 'with', 'into', 'will', 'your', 'more', 'some', 'such'])

function extractTerms(spiritName: string, description: string): string[] {
  const terms: string[] = []
  // Spirit name parts (all parts, even short ones)
  spiritName.toLowerCase().split(/\s+/).forEach(w => { if (w.length > 2) terms.push(w) })
  // Key words from description (longer words, not stopwords)
  if (description) {
    description.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
      .filter(w => w.length > 5 && !STOPWORDS.has(w))
      .slice(0, 20)
      .forEach(w => terms.push(w))
  }
  // Common ministry terms always worth matching
  const ministryTerms = ['generational', 'territorial', 'idolatry', 'deliverance', 'strongman', 'principality', 'witchcraft', 'occult', 'bloodline', 'covenant', 'legal', 'rights', 'familiar']
  if (description) {
    ministryTerms.forEach(t => { if (description.toLowerCase().includes(t)) terms.push(t) })
  }
  return [...new Set(terms)]
}

function chunkText(text: string, chunkSize = 2000): string[] {
  const chunks: string[] = []
  let i = 0
  while (i < text.length) {
    let end = Math.min(i + chunkSize, text.length)
    if (end < text.length) {
      // Try to break at a paragraph boundary near the end
      const nlIdx = text.lastIndexOf('\n', end)
      if (nlIdx > i + chunkSize * 0.6) end = nlIdx
    }
    const chunk = text.slice(i, end).trim()
    if (chunk.length > 150) chunks.push(chunk)
    i = end
  }
  return chunks
}

function scoreChunk(chunk: string, terms: string[]): number {
  const lc = chunk.toLowerCase()
  let score = 0
  for (const term of terms) {
    const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi')
    const matches = lc.match(regex)
    if (matches) {
      score += matches.length * (term.length > 7 ? 3 : 1)
    }
  }
  return score
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const body = await req.json()
  const { spiritName = '', spiritDescription = '' } = body

  const sb = createClient(supabaseUrl!, supabaseServiceKey!)

  // Fetch enabled books and active context in parallel
  const [booksResult, contextResult] = await Promise.all([
    sb.from('resources').select('id,title,author,extracted_text')
      .eq('topic', 'ministry-library')
      .neq('active', false)
      .not('extracted_text', 'is', null)
      .limit(50),
    sb.from('ministry_context').select('context_text').eq('is_active', true).order('updated_at', { ascending: false }).limit(1).single(),
  ])

  const books = booksResult.data || []
  const contextText: string = contextResult.data?.context_text || ''

  // No books — return just context
  if (books.length === 0) {
    return new Response(JSON.stringify({ chunks: [], contextText, totalBooks: 0 }), { status: 200, headers })
  }

  const terms = extractTerms(spiritName, spiritDescription)

  interface ScoredChunk { bookTitle: string; author: string; text: string; score: number }
  const allScored: ScoredChunk[] = []

  for (const book of books) {
    if (!book.extracted_text) continue
    const chunks = chunkText(book.extracted_text)
    for (const chunk of chunks) {
      const score = scoreChunk(chunk, terms)
      if (score > 0) {
        allScored.push({
          bookTitle: book.title,
          author: book.author || '',
          text: chunk.slice(0, 1600), // cap at ~400 tokens
          score,
        })
      }
    }
  }

  // Sort by score descending, take top 5
  allScored.sort((a, b) => b.score - a.score)
  const topChunks = allScored.slice(0, 5).map(({ bookTitle, author, text }) => ({ bookTitle, author, text }))

  return new Response(JSON.stringify({ chunks: topChunks, contextText, totalBooks: books.length }), { status: 200, headers })
}

export const config = { path: '/api/library-chunks' }
