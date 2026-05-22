import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const { filename, content_preview } = await req.json()
  if (!filename) return new Response(JSON.stringify({ error: 'filename required' }), { status: 400 })

  const systemPrompt = `You are a ministry document analyst for War Room Intel, a deliverance ministry platform. When given a filename and optional document preview, return ONLY valid JSON with these exact fields:
{
  "title": "Clean readable title (remove underscores, fix capitalization)",
  "description": "1-2 sentence description of what this document is and how ministers would use it",
  "category": "One of exactly: Session Tools | Teaching | Protocol | Reference | Renunciation | Worksheet",
  "tags": ["array", "of", "3-6", "lowercase", "ministry", "tags"]
}

Available tags to choose from (pick the most relevant):
deliverance, prayer, freemasonry, soul-ties, generational, forgiveness, warfare, inner-healing, renunciation, assessment, protocol, worksheet, teaching, occult, sexual-bondage, rejection, fear, witchcraft, marine-kingdom, strongman, legal-rights, aftercare, session, intake

Return ONLY the JSON object. No markdown, no explanation.`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: 'user', content: `Filename: ${filename}\n\nDocument preview:\n${content_preview || 'No preview available'}` }],
  })

  const text  = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const clean = text.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)

  return new Response(JSON.stringify(parsed), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = { path: '/api/analyze-upload' }
