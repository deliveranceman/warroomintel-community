import { createClient } from '@supabase/supabase-js'
import { getMinistryContext } from '../lib/getMinistryContext'
import { checkAndIncrementUsage, getUpgradeMessage } from '../lib/ai-rate-limit'
import { cleanAIOutput } from '../lib/clean-ai-output'
import { requireTier } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

async function searchLibrary(question: string): Promise<string> {
  try {
    const client = sb()
    const keywords = question.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 4)
      .slice(0, 5)
    if (keywords.length === 0) return ''
    const orFilter = keywords.map(k => `title.ilike.%${k}%,description.ilike.%${k}%`).join(',')
    const { data } = await client
      .from('resources')
      .select('title, description, spirit_tags, author')
      .or(orFilter)
      .limit(4)
    if (!data || data.length === 0) return ''
    return data.map(r =>
      `TITLE: ${r.title}${r.author ? ` by ${r.author}` : ''}\n${r.description || ''}\nTags: ${(r.spirit_tags || []).join(', ')}`
    ).join('\n\n')
  } catch { return '' }
}

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}


async function callClaude(
  question: string,
  book: string,
  chapter: number,
  verseText: string,
  conversationHistory: Array<{ role: string; content: string }>,
  libraryContext?: string,
): Promise<string> {
  const systemPrompt = `You are a theological scholar with deep knowledge of Finis Jennings Dake's Annotated Reference Bible.
You answer questions about Scripture passages drawing from:
- Dake's specific annotations, notes, and theological positions
- Greek and Hebrew word studies
- Spiritual warfare implications in the text
- Prophetic significance and prophetic fulfillment
- Deliverance ministry applications

When the user asks about Greek or Hebrew meanings, be specific with the original words.
When they ask about spirits mentioned, name them specifically and give biblical context.
When referencing Dake's notes, begin with "According to Dake," and present his position clearly.
Include Scripture citations in the format Book Chapter:Verse whenever applicable.
Be specific, scholarly, and spiritually practical.
Keep responses focused — typically 2-4 paragraphs.${libraryContext ? `\n\nRelevant ministry library resources for additional context:\n${libraryContext}` : ''}`

  const contextLine = verseText
    ? `Current passage: ${book} ${chapter}\nSelected verse: "${verseText}"`
    : `Current passage: ${book} ${chapter}`

  const messages = [
    ...conversationHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: `${contextLine}\n\n${question}` },
  ]

  const ministryContext = await getMinistryContext()
  const effectiveSystem = ministryContext ? `${ministryContext}\n\n---\n\n${systemPrompt}` : systemPrompt

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      system: effectiveSystem,
      messages,
    }),
    signal: AbortSignal.timeout(25000),
  })

  if (!res.ok) throw new Error(`Claude error ${res.status}`)
  const data = await res.json()
  return cleanAIOutput((data.content?.[0]?.text || '').trim())
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })

  // GET handler for SOL Commentary (Daily Brief)
  if (req.method === 'GET') {
    const url = new URL(req.url)
    if (url.searchParams.get('commentary') !== 'true') {
      return new Response(JSON.stringify({ error: 'commentary=true required' }), { status: 400, headers: HEADERS })
    }
    const reference = url.searchParams.get('reference') || ''
    if (!reference) {
      return new Response(JSON.stringify({ error: 'reference required' }), { status: 400, headers: HEADERS })
    }
    const auth = await requireTier(req, 1)
    if (auth instanceof Response) return auth
    try {
      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 400,
          system: `You are a theological scholar writing brief commentary in the style of Finis Jennings Dake's Annotated Reference Bible. Focus on spiritual warfare applications, prophetic significance, and deliverance ministry insights. Write 2-3 short paragraphs. No headers, plain prose only.`,
          messages: [{ role: 'user', content: `Write a brief Dake-style commentary on ${reference}, focusing on spiritual warfare and deliverance applications.` }],
        }),
        signal: AbortSignal.timeout(20000),
      })
      if (!aiRes.ok) throw new Error(`Claude error ${aiRes.status}`)
      const data = await aiRes.json()
      const commentary = cleanAIOutput((data.content?.[0]?.text || '').trim())
      return new Response(JSON.stringify({ commentary, source: 'SOL · Dake Style' }), { headers: HEADERS })
    } catch (e: any) {
      console.error('[bible-ask] commentary error:', e.message)
      return new Response(JSON.stringify({ error: e.message || 'Commentary failed' }), { status: 500, headers: HEADERS })
    }
  }

  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  const auth = await requireTier(req, 1)
  if (auth instanceof Response) return auth

  const usage = await checkAndIncrementUsage(auth.userId, auth.tier || 'watchman', 'bible_ask', auth.level)
  if (!usage.allowed) {
    return new Response(JSON.stringify({ error: getUpgradeMessage(auth.tier || 'watchman', 'bible_ask'), rateLimited: true, limit: usage.limit, remaining: 0 }), { status: 429, headers: HEADERS })
  }

  let body: any
  try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS }) }

  const { question = '', book = 'Genesis', chapter = 1, verseText = '', conversationHistory = [], useLibrary } = body || {}
  if (!question?.trim()) {
    return new Response(JSON.stringify({ error: 'question is required' }), { status: 400, headers: HEADERS })
  }

  try {
    const libraryContext = useLibrary !== false ? await searchLibrary(question.trim()) : ''
    const response = await callClaude(question.trim(), book, Number(chapter), verseText, conversationHistory, libraryContext)
    return new Response(JSON.stringify({ response }), { status: 200, headers: HEADERS })
  } catch (e: any) {
    console.error('[bible-ask] Error:', e.message)
    return new Response(JSON.stringify({ error: e.message || 'Analysis failed' }), { status: 500, headers: HEADERS })
  }
}

export const config = { path: '/api/bible-ask' }
