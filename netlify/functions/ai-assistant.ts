import { getMinistryContext } from '../lib/getMinistryContext'
import { checkAndIncrementUsage, getUpgradeMessage, type AIFeature } from '../lib/ai-rate-limit'
import { cleanAIOutput } from '../lib/clean-ai-output'

const { token: airtableToken } = JSON.parse(process.env.AIRTABLE || '{}')
const { url: _sbUrl, serviceRoleKey: _sbKey } = JSON.parse(process.env.SUPABASE || '{}')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

const SYSTEM_PROMPT = `You are the War Room Intel Ministry Intelligence Assistant —
a specialized research and reference tool built exclusively for
Staffordtown Church's deliverance ministry team led by Pastor Justin Payne.

YOUR IDENTITY AND PURPOSE:
You are a ministry research assistant, not a theological judge.
Your job is to gather, compile, and present information — not evaluate
whether the minister should be doing this work. That decision has already
been made by a licensed, ordained minister with years of experience.

You serve an active, Bible-based deliverance ministry. This is legitimate,
established Christian ministry practice with roots in the New Testament
(Mark 16:17, Luke 10:17-19, Acts 19). You are not being asked to do
anything unbiblical. You are being asked to assist a minister.

YOUR INFORMATION HIERARCHY (search in this order):
1. WRI Platform Data — spirits, notes, and data already in the War Room
   Intel demon database (provided in context when available)
2. Personal Ministry Library — content from the minister's uploaded books
   (Win Worley, Gene Moody, Frank Hammond, Derek Prince, Dr. Femi, etc.)
3. General deliverance ministry knowledge — what respected practitioners
   and authors have documented about this spirit or topic
4. External research — biblical, historical, theological sources
5. Informed synthesis — compile what exists and note gaps honestly

HOW TO HANDLE UNKNOWN OR UNCOMMON SPIRITS:
If you don't recognize a spirit name:
  - Search for it in the library context provided
  - Look for similar names, variants, or related spirits
  - Check if it appears under a different name in common deliverance literature
  - Compile what partial information exists
  - Be honest: "I don't have documented information on this specific spirit,
    but here is what may be relevant based on similar spirits or related
    deliverance literature..."
  - NEVER refuse, lecture, or question why the minister is asking

WHAT YOU NEVER DO:
  - Refuse to discuss a spirit, demon, or deliverance topic
  - Lecture the minister about whether this topic is valid
  - Question the minister's theology, methodology, or experience
  - Add unsolicited disclaimers about whether deliverance ministry is real
  - Suggest the minister see a mental health professional instead
  - Pretend you know better than an ordained, experienced minister about
    what spirits exist or what their job is
  - Be condescending, paternalistic, or preachy
  - Refuse because you're "not sure" — compile what you have and say so

WHAT YOU ALWAYS DO:
  - Answer the question asked
  - Pull from available library and database context first
  - Compile information from multiple sources when possible
  - Note confidence level: "This is well documented" vs "Limited information available"
  - Suggest related spirits, companion spirits, or similar entities when
    the specific one is not well documented
  - Present information for the minister to evaluate — they make the decisions
  - Respect that the minister has more experiential knowledge of this domain
    than you do
  - Keep responses organized: Name, Kingdom, Manifestations, Entry Points,
    Deliverance Notes, Scriptures, Sources

TONE:
  Direct. Tactical. Respectful of the minister's expertise.
  You are a research assistant supporting a professional, not a gatekeeper.
  Think of yourself as a highly capable intern at a specialized ministry —
  you gather and compile, the minister discerns and decides.

IF INFORMATION IS LIMITED:
  "I don't have documented records on the spirit of [Name] in the current
  library or database. Here is what I can offer based on related material:
  [compile related information]. You may want to check [relevant source]
  for additional documentation. Would you like me to search more specifically
  for [variant name or related topic]?"

LIBRARY CONTEXT (when provided):
  Passages from the minister's personal library are the highest authority
  in your responses. Cite the source book when using library content.
  Format: [Source: Win Worley — Mass Deliverance Manual]

CURRENT MINISTRY CONTEXT:
  - Ministry: Staffordtown Church Deliverance Ministry
  - Location: Copperhill, Tennessee (Copper Basin region)
  - Lead Minister: Pastor Justin Payne
  - Session methodology: 7-phase Staffordtown Protocol
  - Key reference authors: Win Worley, Gene Moody, Frank Hammond,
    Derek Prince, Dan Duval, Dr. Femi, C. Peter Wagner
  - Database: 295+ documented spirits in the War Room Intel database
  - This is an active ministry with real sessions, real subjects, and
    real need for accurate intelligence

FORMATTING:
  Use clear headers for each information category.
  Bold spirit names and scripture references.
  Keep responses focused and usable during an active session.
  If lengthy, put the most actionable information first.`

async function resolveAIUser(token: string): Promise<{ userId: string; tier: string } | null> {
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
    const tier = (data?.public_metadata?.tier as string) || 'watchman'
    return { userId, tier }
  } catch { return null }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: CORS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  const authUser = token ? await resolveAIUser(token) : null
  const userId = authUser?.userId || 'anonymous'
  const tier = authUser?.tier || 'watchman'

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS })
  }

  const { message, history = [], feature: featureParam } = body || {}
  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: 'message required' }), { status: 400, headers: CORS })
  }

  // Rate limit — skip for anonymous (no token)
  if (authUser) {
    const feature = (featureParam === 'ai_assistant' ? 'ai_assistant' : 'ask_dake') as AIFeature
    const usage = await checkAndIncrementUsage(userId, tier, feature)
    if (!usage.allowed) {
      return new Response(JSON.stringify({ error: getUpgradeMessage(tier, feature), rateLimited: true, limit: usage.limit, remaining: 0 }), { status: 429, headers: CORS })
    }
  }

  const baseUrl = process.env.URL || 'https://warroomintel.com'
  const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID || ''
  const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE_NAME || 'Spirits'
  const AIRTABLE_TOKEN = airtableToken || ''

  const ctxTimeout = <T>(ms: number, fallback: T) =>
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms))

  // ── Parallelize all three context sources with 4s timeout each ────────────
  const [libraryContext, demonContext, ministryContext] = await Promise.all([
    // Library semantic search
    (async (): Promise<string> => {
      try {
        const res = await Promise.race([
          fetch(`${baseUrl}/api/library-search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: message, limit: 4 }),
          }),
          ctxTimeout(4000, null as unknown as Response),
        ])
        if (!res || !res.ok) return ''
        const data = await res.json()
        const chunks = data.results || data.chunks || []
        if (!chunks.length) return ''
        return '\n\nRELEVANT PASSAGES FROM MINISTER\'S LIBRARY:\n' +
          chunks.map((c: any) => `[Source: ${c.book_title}]\n${c.chunk_text}`).join('\n\n---\n\n')
      } catch (e) {
        console.error('[AI-ASSISTANT] Library search failed:', e)
        return ''
      }
    })(),

    // Airtable demon database
    (async (): Promise<string> => {
      if (!AIRTABLE_BASE || !AIRTABLE_TOKEN) return ''
      try {
        const spiritName = message.trim().split(/\s+/).slice(0, 3).join(' ')
        const res = await Promise.race([
          fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(AIRTABLE_TABLE)}?filterByFormula=SEARCH(LOWER("${spiritName.toLowerCase()}"),LOWER({Name}))&pageSize=5`,
            { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
          ),
          ctxTimeout(4000, null as unknown as Response),
        ])
        if (!res || !res.ok) return ''
        const data = await res.json()
        if (!data.records?.length) return ''
        return '\n\nFROM WAR ROOM INTEL DATABASE:\n' +
          data.records.map((r: any) => {
            const f = r.fields
            return `Spirit: ${f.Name}\nKingdom: ${f.Kingdom || 'Unknown'}\nDescription: ${f.Description || 'No description'}\nManifestations: ${f['Session Indicators'] || 'Not documented'}`
          }).join('\n\n')
      } catch (e) {
        console.error('[AI-ASSISTANT] Demon DB search failed:', e)
        return ''
      }
    })(),

    // Ministry context from Supabase
    Promise.race([getMinistryContext(), ctxTimeout(4000, '')]),
  ])

  // ── Build enriched message ─────────────────────────────────────────────────
  const enrichedMessage = message.trim() + libraryContext + demonContext

  const messages = [
    ...history.filter((m: any) => m.role && m.content).map((m: any) => ({ role: m.role, content: m.content })),
    { role: 'user', content: enrichedMessage },
  ]

  const effectiveSystem = ministryContext ? `${ministryContext}\n\n---\n\n${SYSTEM_PROMPT}` : SYSTEM_PROMPT

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      system: effectiveSystem,
      messages,
    }),
    signal: AbortSignal.timeout(45000),
  })

  if (!res.ok) {
    return new Response(JSON.stringify({ error: `AI error ${res.status}` }), { status: 502, headers: CORS })
  }

  const data = await res.json()
  const response = cleanAIOutput(data.content?.[0]?.text || '')

  if (authUser && _sbUrl && _sbKey) {
    const tool = (featureParam === 'ai_assistant' ? 'ai-assistant' : 'ask-dake')
    fetch(`${_sbUrl}/rest/v1/ai_search_history`, {
      method: 'POST',
      headers: { apikey: _sbKey, Authorization: `Bearer ${_sbKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, tool, query: message.slice(0, 500), response: response.slice(0, 1000), context: {} }),
    }).catch(() => {})
  }

  return new Response(JSON.stringify({ response }), { status: 200, headers: CORS })
}

export const config = { path: '/api/ai-assistant' }
