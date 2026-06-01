import { createClient } from '@supabase/supabase-js'
import { getMinistryContext } from '../lib/getMinistryContext'
import { checkAndIncrementUsage, getUpgradeMessage } from '../lib/ai-rate-limit'

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
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

async function resolveUser(token: string): Promise<{ ok: boolean; tier: string; userId: string }> {
  try {
    if (!token || token.split('.').length !== 3) return { ok: false, tier: '', userId: '' }
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return { ok: false, tier: '', userId: '' }
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return { ok: false, tier: '', userId: '' }
    const data = await res.json()
    const role = data?.public_metadata?.role
    const tier = data?.public_metadata?.tier || ''
    const lvl = (t: string) => ({ free: 0, watchman: 0, soldier: 1, commander: 2, general: 3, minister: 99 }[t?.toLowerCase()] ?? 0)
    return { ok: role === 'minister' || lvl(tier) >= 1, tier, userId }
  } catch { return { ok: false, tier: '', userId: '' } }
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
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: effectiveSystem,
      messages,
    }),
    signal: AbortSignal.timeout(25000),
  })

  if (!res.ok) throw new Error(`Claude error ${res.status}`)
  const data = await res.json()
  return (data.content?.[0]?.text || '').trim()
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })

  const auth = await resolveUser(token)
  if (!auth.ok) return new Response(JSON.stringify({ error: 'Soldier tier or higher required' }), { status: 403, headers: HEADERS })

  const usage = await checkAndIncrementUsage(auth.userId, auth.tier || 'watchman', 'bible_ask')
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
