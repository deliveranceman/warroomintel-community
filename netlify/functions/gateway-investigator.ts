const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!
const BASE_ID        = 'appVXEj2DLPBTJTtD'
const TABLE_ID       = 'tblcP4lgVykzOhLi4'
const NAME_FIELD     = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

async function resolveUser(token: string): Promise<{ ok: boolean; tier: string }> {
  try {
    if (!token || token.split('.').length !== 3) return { ok: false, tier: '' }
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return { ok: false, tier: '' }
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return { ok: false, tier: '' }
    const data = await res.json()
    const role = data?.public_metadata?.role
    const tier = data?.public_metadata?.tier || ''
    const tierLevel = (t: string) => ({ free: 0, watchman: 0, soldier: 1, commander: 2, general: 3 }[t?.toLowerCase()] ?? 0)
    const hasAccess = role === 'minister' || tierLevel(tier) >= 1
    return { ok: hasAccess, tier }
  } catch { return { ok: false, tier: '' } }
}

async function fetchSpiritContext(spiritName: string): Promise<string> {
  try {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`)
    url.searchParams.set('maxRecords', '1')
    url.searchParams.set('filterByFormula', `LOWER({${NAME_FIELD}}) = "${spiritName.toLowerCase()}"`)
    for (const f of [NAME_FIELD, 'Description', 'Manifestiation', 'Cultural Presence', 'Session Trigger Questions', 'Kingdom', 'Sub-Kingdom', 'Biblical Rank']) {
      url.searchParams.append('fields[]', f)
    }
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return ''
    const data = await res.json()
    const rec = data.records?.[0]
    if (!rec) return ''
    const f = rec.fields || {}
    const parts: string[] = []
    if (f['Description'])   parts.push(`Description: ${String(f['Description']).slice(0, 300)}`)
    if (f['Manifestiation'])parts.push(`Manifestations: ${String(f['Manifestiation']).slice(0, 200)}`)
    if (f['Kingdom'])       parts.push(`Kingdom: ${f['Kingdom']}`)
    if (f['Biblical Rank']) parts.push(`Biblical Rank: ${f['Biblical Rank']}`)
    if (f['Sub-Kingdom'])   parts.push(`Sub-Kingdom: ${f['Sub-Kingdom']}`)
    if (Array.isArray(f['Cultural Presence']) && f['Cultural Presence'].length) {
      parts.push(`Known Cultural Presence: ${f['Cultural Presence'].join(', ')}`)
    }
    if (f['Session Trigger Questions']) {
      parts.push(`Existing Trigger Questions:\n${String(f['Session Trigger Questions']).slice(0, 400)}`)
    }
    return parts.join('\n')
  } catch { return '' }
}

async function callClaude(spiritName: string, dbContext: string, personContext: string): Promise<any> {
  const mode = spiritName && personContext ? 'combined'
             : spiritName                  ? 'spirit_lookup'
             : 'exposure_analysis'

  const subject = spiritName || personContext.slice(0, 60)

  const prompt = `You are a deliverance ministry intelligence analyst with deep knowledge of spiritual warfare, demonology, and cultural influences.

Mode: ${mode}
Spirit name: ${spiritName || 'not provided'}
Cultural exposure or context: ${personContext || 'not provided'}
Database notes on this spirit: ${dbContext || 'not in our database'}

${mode === 'exposure_analysis'
  ? 'Analyze this cultural exposure and identify what spiritual entities, doorways, and legal rights it may carry. Think deeply about the spiritual content, themes, and what spirits are glorified or invoked.'
  : mode === 'spirit_lookup'
  ? 'Identify every cultural gateway where this spirit appears or gains entry. Use your knowledge of movies, music, games, books, subcultures, and occult practices. Be specific with real titles and names.'
  : 'Use both the spirit information and the cultural exposure context together to build a complete gateway report.'
}

Return ONLY valid JSON in this exact structure. No markdown. No code blocks. Start with { and end with }.

{
  "title": "Gateway Intelligence Report: ${subject}",
  "mode": "${mode}",
  "identifiedSpirits": ["spirit1", "spirit2"],
  "sections": {
    "mediaGateways": {
      "heading": "Media Gateways",
      "items": ["Specific movie/show title: explanation of how it features or glorifies this spirit"]
    },
    "musicGateways": {
      "heading": "Music Gateways",
      "items": ["Specific artist or song: explanation of the spiritual connection"]
    },
    "gamingGateways": {
      "heading": "Gaming Gateways",
      "items": ["Specific video game, tabletop RPG, or card game: explanation"]
    },
    "literaryGateways": {
      "heading": "Literary Gateways",
      "items": ["Specific book, graphic novel, manga, or online fiction: explanation"]
    },
    "occultGateways": {
      "heading": "Occult and Ritual Gateways",
      "items": ["Specific occult practice, ritual, or system: how it opens this door"]
    },
    "culturalGateways": {
      "heading": "Cultural and Subcultural Gateways",
      "items": ["Specific subculture, aesthetic, practice, or trend: explanation"]
    },
    "sessionQuestions": {
      "heading": "Session Interview Questions",
      "items": ["Specific question referencing real titles or practices"]
    },
    "generationalPatterns": {
      "heading": "Generational Patterns",
      "items": ["Specific family or ancestral pattern that may be relevant"]
    }
  },
  "warningFlags": ["any urgent spiritual warfare notes for the minister"],
  "relatedSpirits": ["connected spirits to investigate in the same session"]
}

Rules:
- Each section should have 3 to 6 specific items, never vague generalities
- Name actual titles, franchises, artists, communities by name
- Session questions must reference specific things the person may have been exposed to
- If you genuinely cannot find items for a category return an empty array
- Include at least 5 session questions
- For identified spirits, list specifically named demonic entities (not general concepts)

Return ONLY a raw JSON object. No markdown. No code fences. No explanation before or after. Start your response with { and end with }.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: 'You are a deliverance ministry intelligence analyst. Return ONLY valid JSON. No markdown, no code blocks, no explanation. Start with { and end with }.',
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(20000),
  })

  if (!res.ok) throw new Error(`Claude error ${res.status}`)
  const data = await res.json()
  const rawText = (data.content?.[0]?.text || '').trim()

  let cleaned = rawText
    .replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/```\s*$/im, '').trim()
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) cleaned = jsonMatch[0]

  try { return JSON.parse(cleaned) } catch (e: any) {
    console.error('[gateway-investigator] Parse failed. Raw:', rawText.slice(0, 500))
    throw new Error('AI response could not be parsed. Please try again.')
  }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

  const auth = await resolveUser(token)
  if (!auth.ok) return new Response(JSON.stringify({ error: 'Soldier tier or higher required' }), { status: 403, headers })

  let body: any
  try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers }) }

  const { spiritName = '', personContext = '' } = body || {}
  if (!spiritName?.trim() && !personContext?.trim()) {
    return new Response(JSON.stringify({ error: 'Provide a spirit name, cultural exposure context, or both.' }), { status: 400, headers })
  }

  try {
    // Fetch spirit context from Airtable in parallel with nothing else — don't block Claude start
    const dbContext = spiritName?.trim() ? await fetchSpiritContext(spiritName.trim()) : ''
    const report = await callClaude(spiritName?.trim() || '', dbContext, personContext?.trim() || '')
    return new Response(JSON.stringify(report), { status: 200, headers })
  } catch (e: any) {
    console.error('[gateway-investigator] Error:', e.message)
    return new Response(JSON.stringify({ error: e.message || 'Investigation failed' }), { status: 500, headers })
  }
}

export const config = { path: '/api/gateway-investigator' }
