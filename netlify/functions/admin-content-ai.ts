import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin, CORS as HEADERS } from './_shared/requireAdmin'

function buildPrompt(title: string, type: string): string {
  switch (type) {
    case 'daily_brief':
      return `You are SOL, the AI ministry intelligence engine for War Room Intel, built by Pastor Justin Payne of Staffordtown Church, Copperhill TN. Generate a complete Daily Brief entry for ministers.
Title: ${title}
Return JSON only with these exact keys:
{
  "morningPrayer": "150-200 words, militaristic prayer tone, addresses the theme, references blood of Jesus and authority",
  "scripture": "book chapter:verse format, most relevant verse",
  "scriptureText": "the verse text",
  "devotional": "400-500 words markdown, tactical ministry tone, practical application, 2-3 subheadings",
  "eveningPrayer": "100-150 words, closing prayer, thanksgiving and protection declaration"
}`

    case 'field_manual':
      return `Generate a complete Field Manual entry for War Room Intel ministers.
Title: ${title}
Return JSON only:
{
  "summary": "2-3 sentence overview",
  "draft": "full markdown, 700+ words, includes: theological framework, key scriptures with references, manifestations, legal ground, ministry protocol steps, assessment questions, prayer declarations"
}`

    case 'weekly_intel':
      return `Generate a Weekly Intel briefing for War Room Intel.
Title: ${title}
Return JSON only:
{
  "summary": "compelling 1-2 sentence hook",
  "body": "markdown, 300-500 words, ministry intelligence briefing tone, actionable intel for ministers",
  "tags": ["3-5 relevant tags as array of strings"]
}`

    case 'fringe_article':
      return `Generate a Fringe Intelligence article for War Room Intel.
Title: ${title}
Return JSON only:
{
  "category": "one of: open-intel, classified, the-feed, intel-faq",
  "body": "markdown, 400-600 words, investigative tone, covers occult/spiritual warfare intelligence"
}`

    default:
      return `Generate a complete Field Manual entry for War Room Intel ministers.
Title: ${title}
Return JSON only:
{
  "summary": "2-3 sentence overview",
  "draft": "full markdown, 700+ words, includes: theological framework, key scriptures, manifestations, legal ground, ministry protocol, prayer declarations"
}`
  }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: HEADERS })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
  }

  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  let body: { title?: string; summary?: string; type?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: HEADERS })
  }

  const { title, type = 'field_manual' } = body
  if (!title) {
    return new Response(JSON.stringify({ error: 'title is required' }), { status: 400, headers: HEADERS })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const prompt = buildPrompt(title, type)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    system: 'You are SOL, the AI ministry intelligence engine for War Room Intel — a spiritual warfare and deliverance ministry platform operated by Pastor Justin Payne at Staffordtown Church in Copperhill, TN. Always respond with valid JSON only. No markdown code blocks, no preamble, no explanation — just the raw JSON object.',
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = message.content[0]?.type === 'text' ? message.content[0].text : ''

  // Try to parse as structured JSON
  try {
    const clean = rawText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim()
    const parsed = JSON.parse(clean)
    return new Response(JSON.stringify(parsed), { status: 200, headers: HEADERS })
  } catch {
    // Fallback: return as { content } for legacy callers
    return new Response(JSON.stringify({ content: rawText }), { status: 200, headers: HEADERS })
  }
}

export const config = { path: '/api/admin-content-ai' }
