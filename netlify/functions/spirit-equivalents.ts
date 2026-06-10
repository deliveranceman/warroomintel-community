import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from './_shared/access'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('', { headers: CORS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS })

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const body = await req.json().catch(() => ({}))
  const { spiritName, kingdom, description, aka } = body
  if (!spiritName) return new Response(JSON.stringify({ error: 'spiritName required' }), { status: 400, headers: CORS })

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const prompt = `You are a demonology research assistant for a Christian deliverance ministry database. Your task is to identify cross-cultural equivalents for a spirit or demon.

Spirit Name: ${spiritName}
Kingdom/Category: ${kingdom || 'Unknown'}
Also Known As: ${aka || 'None listed'}
Description: ${description || 'None provided'}

Identify ALL known cross-cultural equivalents for this spirit across different mythological, religious, and occult traditions. Focus on spirits that share the same root assignment, function, or worship pattern.

Return ONLY a JSON object in this exact format with no preamble or explanation:
{
  "equivalents": [
    { "name": "Spirit Name", "tradition": "Tradition Name", "confidence": 9, "notes": "Brief reason for the match" },
    { "name": "Spirit Name", "tradition": "Tradition Name", "confidence": 7, "notes": "Brief reason for the match" }
  ],
  "summary": "One sentence explaining the cross-cultural pattern"
}

Confidence is 1-10. Only include equivalents with confidence 6 or higher.
Traditions to consider: Hebrew/Biblical, Greek, Roman, Norse, Egyptian, Babylonian/Sumerian, Assyrian, Canaanite, Hindu, Aztec/Mayan, Celtic, Persian/Zoroastrian, Philistine, Moabite, Freemasonry, Voodoo/Santeria, Native American, Occult/Modern.
If no equivalents exist with confidence 6+, return an empty equivalents array.`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const match = clean.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(match ? match[0] : clean)

    return new Response(JSON.stringify(parsed), { headers: CORS })
  } catch (err: any) {
    console.error('[spirit-equivalents]', err)
    return new Response(JSON.stringify({ error: 'AI lookup failed', details: err.message }), { status: 500, headers: CORS })
  }
}

export const config = { path: '/api/spirit-equivalents' }
