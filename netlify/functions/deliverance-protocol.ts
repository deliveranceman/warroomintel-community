import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

const MAX_PREAMBLE_CHARS = 8000
const TIER_LEVELS: Record<string, number> = { free: 0, watchman: 0, soldier: 1, commander: 2, general: 3, minister: 4 }

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

function getTierLevel(tier: string) { return TIER_LEVELS[tier?.toLowerCase()] ?? 0 }

async function resolveUser(token: string): Promise<{ userId: string; name: string; tier: string } | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return null
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.username || 'Anonymous'
    const tier = (data.public_metadata?.tier as string) || (data.public_metadata?.role === 'minister' ? 'minister' : 'watchman')
    return { userId, name, tier }
  } catch { return null }
}

async function buildPreamble(spiritName: string, spiritDescription: string, isTerritorial: boolean): Promise<string> {
  const client = sb()
  let preamble = ''

  const [contextResult, booksResult, resourceBooksResult] = await Promise.all([
    client.from('ministry_context').select('label, context_text, scope').eq('is_active', true).order('scope'),
    client.from('ministry_library').select('title, author, extracted_text').eq('is_enabled', true).eq('ai_enabled', true),
    client.from('resources').select('title, author, notes, extracted_text').eq('topic', 'ministry-library').eq('active', true),
  ])

  const contexts = contextResult.data || []
  const contextSections: string[] = []
  for (const ctx of contexts) {
    if (ctx.scope === 'global') {
      contextSections.push(`[${ctx.label || 'Ministry Context'}]:\n${ctx.context_text}`)
    } else if (ctx.scope === 'regional' && isTerritorial) {
      contextSections.push(`[${ctx.label || 'Regional Context'}]:\n${ctx.context_text}`)
    } else if (ctx.scope === 'session') {
      contextSections.push(`[${ctx.label || 'Session Context'}]:\n${ctx.context_text}`)
    }
  }
  if (contextSections.length) {
    preamble += `MINISTRY CONTEXT:\n${contextSections.join('\n\n---\n\n')}\n\nApply the above ministry framework and voice to all content you generate.\n---\n\n`
  }

  const terms = spiritName.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  if (spiritDescription) {
    spiritDescription.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
      .filter(w => w.length > 5).slice(0, 10).forEach(w => terms.push(w))
  }

  interface ScoredChunk { title: string; author: string; text: string; score: number }
  const scored: ScoredChunk[] = []

  for (const book of (booksResult.data || [])) {
    if (!book.extracted_text) continue
    for (let i = 0; i < book.extracted_text.length; i += 1800) {
      const chunk = book.extracted_text.slice(i, i + 2000).trim()
      if (chunk.length < 150) continue
      const lc = chunk.toLowerCase()
      let score = 0
      for (const term of terms) {
        const matches = (lc.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
        if (matches) score += matches * (term.length > 6 ? 3 : 1)
      }
      if (score > 0) scored.push({ title: book.title, author: book.author || '', text: chunk.slice(0, 1400), score })
    }
  }

  for (const book of (resourceBooksResult.data || [])) {
    if (!book.extracted_text) continue
    for (let i = 0; i < book.extracted_text.length; i += 1800) {
      const chunk = book.extracted_text.slice(i, i + 2000).trim()
      if (chunk.length < 150) continue
      const lc = chunk.toLowerCase()
      let score = 0
      for (const term of terms) {
        const matches = (lc.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
        if (matches) score += matches * (term.length > 6 ? 3 : 1)
      }
      if (score > 0) scored.push({ title: book.title, author: book.author || '', text: chunk.slice(0, 1400), score })
    }
  }

  if (scored.length > 0) {
    scored.sort((a, b) => b.score - a.score)
    let bookSection = `PERSONAL MINISTRY LIBRARY:\n`
    for (const c of scored.slice(0, 5)) {
      const entry = `[${c.title}${c.author ? ` by ${c.author}` : ''}]:\n${c.text}\n\n`
      if ((preamble + bookSection + entry).length > MAX_PREAMBLE_CHARS) break
      bookSection += entry
    }
    if (bookSection.length > 30) preamble += bookSection
  }

  return preamble
}

async function scoreArsenalResources(spiritNames: string[], supabase: ReturnType<typeof sb>): Promise<any[]> {
  const { data: resources } = await supabase
    .from('resources')
    .select('id, title, description, tier, category, tags, file_path')
    .eq('source_type', 'arsenal')
    .eq('active', true)
    .limit(100)

  if (!resources?.length) return []

  const terms = spiritNames.flatMap((n: string) => n.toLowerCase().split(/\s+/).filter(w => w.length > 2))
  if (!terms.length) return []

  const scored = resources.map((r: any) => {
    const searchText = `${r.title} ${r.description || ''} ${r.tags || ''} ${r.category || ''}`.toLowerCase()
    let score = 0
    for (const term of terms) {
      if (searchText.includes(term)) score += term.length > 6 ? 3 : 1
    }
    return { ...r, score }
  }).filter((r: any) => r.score > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 8)

  return scored
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })

  const user = await resolveUser(token)
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  if (getTierLevel(user.tier) < 2) return new Response(JSON.stringify({ error: 'Commander tier required' }), { status: 403, headers: HEADERS })

  let body: any = {}
  try { body = await req.json() } catch {}

  const {
    mode = 'spirit',
    spiritData,
    spiritNames = [],
    includeCluster = true,
    manifestationDescription = '',
    manifestationCandidates = [],
  } = body

  if (!spiritData && mode === 'spirit') {
    return new Response(JSON.stringify({ error: 'spiritData required for spirit mode' }), { status: 400, headers: HEADERS })
  }

  const supabase = sb()
  const primaryName = spiritData?.name || manifestationCandidates?.[0]?.name || 'Unknown Spirit'
  const description = spiritData?.description || ''
  const isTerritorial = spiritData?.isTerritorial || false

  const allSpiritNames: string[] = mode === 'spirit'
    ? [primaryName, ...(includeCluster ? (spiritNames as string[]) : [])]
    : (manifestationCandidates as any[]).map((s: any) => s.name)

  const [preamble, arsenalResources] = await Promise.all([
    buildPreamble(primaryName, description, isTerritorial),
    scoreArsenalResources(allSpiritNames, supabase),
  ])

  let contextBlock = ''
  if (mode === 'spirit' && spiritData) {
    contextBlock = `SPIRIT DOSSIER:
Name: ${spiritData.name}
Also Known As: ${spiritData.aka || 'N/A'}
Biblical Rank: ${spiritData.biblicalRank || 'N/A'}
Kingdom: ${spiritData.kingdom || 'N/A'}
Description: ${spiritData.description || 'N/A'}
Manifestations: ${spiritData.manifestation || spiritData.symptoms || 'N/A'}
Entry Points: ${spiritData.entryPoints || 'N/A'}
Legal Rights: ${spiritData.legalRights || 'N/A'}
Deliverance Sequence: ${spiritData.deliveranceSequence || 'N/A'}
Counter Scriptures: ${spiritData.counterScriptures || 'N/A'}
Prayer Points: ${spiritData.prayerPoints || 'N/A'}
Aftercare Notes: ${spiritData.aftercareNotes || 'N/A'}
Cluster Spirits: ${includeCluster ? (spiritNames.join(', ') || 'None listed') : 'Not included'}`
  } else if (mode === 'manifestation') {
    contextBlock = `SYMPTOM INVESTIGATION RESULTS:
Symptoms/Manifestations Presented: ${manifestationDescription}
Probable Spirits Identified: ${(manifestationCandidates as any[]).map((s: any) => `${s.name} (${s.confidence} confidence — ${s.reason})`).join('; ')}`
  }

  const arsenalContext = arsenalResources.length > 0
    ? `\nAVAILABLE ARSENAL RESOURCES (reference relevant ones by ID in recommendedResources):\n${arsenalResources.map((r: any) => `- "${r.title}" (${r.category || 'Resource'}) [ID: ${r.id}]`).join('\n')}\n`
    : ''

  const systemPrompt = preamble
    ? `${preamble}\n\nYou are a seasoned deliverance ministry protocol generator. Generate detailed, scripture-grounded, minister-ready session protocols. Always operate from Kingdom authority and biblical precedent. Respond with JSON only.`
    : `You are a seasoned deliverance ministry protocol generator. Generate detailed, scripture-grounded, minister-ready session protocols. Always operate from Kingdom authority and biblical precedent. Respond with JSON only.`

  const userPrompt = `Generate a complete deliverance session protocol for the following:

${contextBlock}
${arsenalContext}

Return a JSON object with this exact structure:
{
  "preSessionIntel": {
    "summary": "2-3 sentence operational overview for the minister",
    "keyLegalGrounds": ["ground 1", "ground 2"],
    "keyScriptures": ["Book X:Y — brief quote", "..."],
    "warningFlags": ["warning 1", "..."]
  },
  "legalGroundChecklist": [
    { "ground": "Ground name", "question": "Question to ask the person", "scripture": "Book X:Y" }
  ],
  "renunciationPrayers": [
    { "title": "Prayer title", "prayer": "Full prayer text (first person for the recipient)", "notes": "Brief minister notes" }
  ],
  "intercession": {
    "opening": "Opening intercession prayer text",
    "declarations": ["Declaration 1", "Declaration 2"],
    "binding": "Binding prayer text"
  },
  "commandPrayers": [
    { "target": "Spirit name", "command": "Full command prayer (authoritative, minister speaks)", "authority": "Scripture reference grounding this command" }
  ],
  "aftercare": {
    "initialSteps": ["Step 1", "Step 2"],
    "dailyPractices": ["Practice 1", "Practice 2"],
    "warningSignsToWatch": ["Sign 1", "Sign 2"],
    "followUpQuestions": ["Question 1", "Question 2"]
  },
  "recommendedResources": [
    { "id": "resource_id_from_list", "title": "Title", "relevance": "Why this applies" }
  ]
}

Requirements:
- Include 5-8 legal grounds with pointed diagnostic questions
- Include 3-5 renunciation prayers covering identified legal grounds
- Include 2-4 command prayers targeting the spirit(s) by name
- Aftercare must be practical and Spirit-led
- Only include resource IDs from the provided Arsenal Resources list
- Prayers should be substantive but concise (2-5 sentences each)
- Renunciation prayers: first person for the recipient ("I renounce...")
- Command prayers: authoritative minister voice ("I command you, spirit of X...")
`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const protocol = JSON.parse(jsonMatch[0])

    const recommendedIds = new Set((protocol.recommendedResources || []).map((r: any) => String(r.id)))
    const matchedResources = arsenalResources
      .filter((r: any) => recommendedIds.has(String(r.id)))
      .map((r: any) => ({
        ...r,
        relevance: (protocol.recommendedResources || []).find((pr: any) => String(pr.id) === String(r.id))?.relevance || '',
      }))

    return new Response(JSON.stringify({
      protocol,
      arsenalResources: matchedResources,
      spiritData: spiritData || null,
    }), { headers: HEADERS })

  } catch (e: any) {
    console.error('[deliverance-protocol] Error:', e)
    return new Response(JSON.stringify({ error: e.message || 'Protocol generation failed' }), { status: 500, headers: HEADERS })
  }
}

export const config = { path: '/api/deliverance-protocol' }
