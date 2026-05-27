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
    // minister always has access; soldier/commander/general also have access
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
    })
    if (!res.ok) return ''
    const data = await res.json()
    const rec = data.records?.[0]
    if (!rec) return ''
    const f = rec.fields || {}
    const parts: string[] = []
    if (f['Description']) parts.push(`Description: ${String(f['Description']).slice(0, 300)}`)
    if (f['Manifestiation']) parts.push(`Manifestations: ${String(f['Manifestiation']).slice(0, 200)}`)
    if (f['Kingdom']) parts.push(`Kingdom: ${f['Kingdom']}`)
    if (f['Biblical Rank']) parts.push(`Biblical Rank: ${f['Biblical Rank']}`)
    if (f['Sub-Kingdom']) parts.push(`Sub-Kingdom: ${f['Sub-Kingdom']}`)
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
  const systemPrompt = `You are a deliverance ministry intelligence analyst for War Room Intel. You have deep knowledge of how demonic spirits gain cultural entry points through media, music, gaming, literature, online subcultures, and social practices. Your job is to help ministers identify every cultural gateway a spirit used to gain access to a person's life so they can conduct a thorough, specific intake interview.

Return ONLY valid JSON. No markdown. No code blocks. Start with { and end with }.`

  const userPrompt = `You are investigating cultural entry points for the spirit: ${spiritName}

${dbContext ? `Database notes on this spirit:\n${dbContext}\n\n` : ''}${personContext ? `Minister's notes about this person:\n${personContext}\n\n` : ''}Research and return a comprehensive cultural gateway report. For each category, list specific titles, artists, games, franchises, communities, or practices — not vague generalities. If a spirit is depicted or glorified by a specific work, name it.

Return this exact JSON structure:
{
  "spiritName": "${spiritName}",
  "databaseContext": "1-2 sentences summarizing what's known about this spirit from our database",
  "mediaGateways": [
    "Specific movie/show title and how it features or glorifies this spirit",
    "..."
  ],
  "musicGateways": [
    "Specific artist name and album/song that references this spirit or its themes",
    "..."
  ],
  "gamingGateways": [
    "Specific video game, tabletop RPG, or card game featuring this spirit",
    "..."
  ],
  "literaryGateways": [
    "Specific book, graphic novel, manga, or online fiction featuring this spirit",
    "..."
  ],
  "onlineGateways": [
    "Specific online communities, social media trends, hashtags, or internet culture tied to this spirit",
    "..."
  ],
  "subcultureGateways": [
    "Specific subculture, practice, fashion trend, or aesthetic tied to this spirit",
    "..."
  ],
  "sessionQuestions": [
    "Specific, targeted intake question referencing actual titles/practices — e.g. 'Have you watched [specific show]?'",
    "...",
    "...",
    "...",
    "...",
    "..."
  ]
}

Rules:
- Each array should have 3-7 specific items — never vague generalities like "horror movies"
- Name actual titles, franchises, artists, or communities — be specific
- Session questions must reference specific things, not generic "did you watch movies" questions
- If you genuinely cannot find items for a category, return an empty array []
- Include 5-6 session questions minimum`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
    signal: AbortSignal.timeout(25000),
  })

  if (!res.ok) throw new Error(`Claude error ${res.status}`)
  const data = await res.json()
  const raw = (data.content?.[0]?.text || '').trim()
    .replace(/^```[\w]*\s*/i, '').replace(/\s*```\s*$/i, '').trim()

  try { return JSON.parse(raw) } catch {
    const m = raw.match(/\{[\s\S]*\}/)
    if (m) { try { return JSON.parse(m[0]) } catch {} }
    throw new Error('Failed to parse AI response')
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

  const { spiritName, personContext = '' } = body || {}
  if (!spiritName?.trim()) return new Response(JSON.stringify({ error: 'spiritName required' }), { status: 400, headers })

  try {
    const [dbContext] = await Promise.all([
      fetchSpiritContext(spiritName.trim()),
    ])

    const report = await callClaude(spiritName.trim(), dbContext, personContext)
    return new Response(JSON.stringify(report), { status: 200, headers })
  } catch (e: any) {
    console.error('[gateway-investigator] Error:', e.message)
    return new Response(JSON.stringify({ error: e.message || 'Investigation failed' }), { status: 500, headers })
  }
}

export const config = { path: '/api/gateway-investigator' }
