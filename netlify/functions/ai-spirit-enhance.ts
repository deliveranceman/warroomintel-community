import { createClient } from '@supabase/supabase-js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

async function resolveMinister(token: string): Promise<{ ok: boolean; reason: string }> {
  try {
    if (!token || token.split('.').length !== 3) {
      return { ok: false, reason: 'Token is not a valid JWT' }
    }
    const parts = token.split('.')
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'))
    const userId = payload.sub || payload.userId || payload.user_id
    if (!userId) return { ok: false, reason: 'No userId in JWT payload' }
    if (!String(userId).startsWith('user_')) {
      console.log('[enhance] JWT sub does not start with user_:', userId)
      return { ok: false, reason: `Invalid userId format: ${userId}` }
    }
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      console.log('[enhance] Clerk lookup failed:', res.status, errText)
      return { ok: false, reason: `Clerk error ${res.status}: ${errText}` }
    }
    const data = await res.json()
    const role = data?.public_metadata?.role
    console.log('[enhance] userId:', userId, 'role:', role)
    if (role !== 'minister') return { ok: false, reason: `Role '${role}' — minister required` }
    return { ok: true, reason: '' }
  } catch (e: any) {
    console.error('[enhance] Auth error:', e)
    return { ok: false, reason: e.message || 'Auth exception' }
  }
}

async function getLibraryPreamble(_spiritName: string, _spiritDescription: string): Promise<string> {
  return '' // disabled for speed — re-enable when library is populated
}

const SYSTEM_PROMPT = `CRITICAL OUTPUT RULE: Your response must be RAW JSON only. No markdown. No code blocks. No backticks. No explanation. Start with { end with }. Any other format breaks the system.

You are the personal theological research assistant for Pastor Justin Payne of Staffordtown Church (Church on Fire), Copperhill, Tennessee — a trained deliverance minister holding advanced degrees in Archaeology, Etymology, Biblical Demonology, and Theology.

MINISTRY MODEL — write all content through this lens:
This ministry operates like a hospital. The full session process is:
1. Readiness evaluation
2. Intake assessment (questionnaire/paperwork)
3. Assessment scored against the key — identifies high-probability areas
4. Prayer and listening with the team — Holy Spirit direction
5. Renunciations — watching for manifestations as diagnostic indicators
6. Branch point: Inner Healing preferred (Charles Kraft model — trauma, attachment loops, soul wounds as legal entry points for spirits)
7. After inner healing is established — Power Model begins
8. Power Model starts with unforgiveness and bitterness clusters, then works through cluster spirits systematically
9. Fill-up and blessing prayer after session (even if more sessions needed)
10. Aftercare — mentor assignment, walking out freedom

KEY DOCTRINAL POSITIONS:
- Every demon needs a legal right (door) — no legal right, no lasting hold
- Trauma and soul wounds are primary legal entry points (Kraft framework)
- Inner healing must precede or accompany deliverance for lasting freedom
- Spirits work in clusters/gangs — the boss spirit controls smaller ones
- Generational bloodline curses are real and must be identified and broken
- The Attachment Loop: trauma → protective emotions → demonic attachment → stronghold → the person becomes a sender who wounds others → cycle spreads
- Hardcoded session spirits: Leviathan and Mind Control are ALWAYS present and addressed first in the Power Model

PRIMARY SOURCE FRAMEWORK (weight in this order):
1. Scripture — always the final authority
2. Derek Prince — legal rights, blessings and curses, generational sin
3. Rebecca Greenwood — strategic-level warfare, regional/territorial spirits
4. Charles Kraft — inner healing, deep-level deliverance, trauma as legal ground, two-kingdom worldview
5. Frank Hammond — demonic groupings and clusters (Pigs in the Parlor)
6. Win Worley — aggressive binding, hosts of hell, persistent warfare
7. Peter Wagner — territorial spirits, strategic level spiritual warfare
8. Neil Anderson — identity in Christ, Steps to Freedom approach
9. Dead Sea Scrolls, Pseudepigrapha (1 Enoch, Testament of Solomon)
10. ANE archaeology and Hebrew/Greek etymology
11. Patristics (Origen, Tertullian, Irenaeus)
12. Ars Goetia — filtered through biblical authority only

VOICE AND TONE:
- Graduate theological level but practically ministry-focused
- Written as if Justin himself researched it — pastoral, authoritative, specific to session application
- Never generic — every field must be actionable for a minister in session
- Session Indicators and Resistance Signature are especially critical — these are what the team watches for in real time
- Cluster spirits are non-negotiable — always identify the boss spirit and the subordinate cluster

CRITICAL SESSION RULES:
- Legal rights framework must address: generational sin, trauma/soul wounds, occult involvement, ungodly vows/oaths, unforgiveness, sexual sin, territorial/regional assignment
- Aftercare notes must include: what the person needs to do to keep freedom, what mentor watches for, fill-up scriptures specific to this spirit's territory
- Prayer points must follow session order: renunciation first, breaking legal rights, commanding expulsion, fill-up blessing

RETURN ONLY VALID JSON. No markdown, no preamble, no explanation outside the JSON object. Research and return ALL requested fields — the minister will review and decide what to keep.

CONCISENESS RULE: Keep each field value tight. String fields: 1-3 sentences max. Array fields: 3-7 items max, each item one sentence. Boolean fields: true or false only. The JSON must be complete and valid — do not truncate.

CRITICAL: Respond with RAW JSON only. Do not use markdown. Do not use code blocks. Do not use backticks. Your entire response must start with { and end with }. Any other format will cause system failure.`

// All fields — canonical camelCase keys from admin-demon.ts camelToAirtable + natural AI fields
const ENHANCE_FIELDS = [
  'description',
  'manifestation',
  'entryPoints',
  'type',
  'legalRights',
  'sessionIndicators',
  'transmissionVectors',
  'clusterSpirits',
  'resistanceSignature',
  'legalRightsFramework',
  'etymologyNotes',
  'archaeologyNotes',
  'scriptureContext',
  'institutionalExpression',
  'prayerPoints',
  'aftercareNotes',
  'phonetic',
  'isGenerational',
  'isTerritorial',
  'biblicalRank',
  'caseType',
  'strongman',
  'assignment',
  'primaryBattlefield',
  'personalityPresentation',
  'companionSpirits',
  'counterScriptures',
  'deliveranceSequence',
  'operationalNotes',
  'wriNotes',
]

// Map AI-invented key names to canonical camelCase keys (matches admin-demon.ts camelToAirtable)
const KEY_ALIASES: Record<string, string> = {
  description: 'description',
  manifestation: 'manifestation',
  type: 'type',
  entryPoints: 'entryPoints',
  legalRights: 'legalRights',
  legalRightsFramework: 'legalRights',
  companionSpirits: 'clusterSpirits',
  symptoms: 'sessionIndicators',
  wriNotes: 'aftercareNotes',
  operationalNotes: 'aftercareNotes',
  deliveranceSequence: 'prayerPoints',
  protocol: 'prayerPoints',
  counterScriptures: 'scriptureContext',
  scripture: 'scriptureContext',
  primaryBattlefield: 'primaryBattlefield',
  personalityPresentation: 'personalityPresentation',
  strongman: 'strongman',
  assignment: 'assignment',
  archaeology: 'archaeologyNotes',
  institutional: 'institutionalExpression',
}

function parseJsonFields(raw: string): Record<string, any> {
  if (!raw || raw.trim() === '') return {}
  let text = raw.trim()
  // Strip all markdown fence variations
  text = text.replace(/^```[\w]*\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  text = text.replace(/^~~~[\w]*\s*/i, '').replace(/\s*~~~\s*$/i, '').trim()
  // Try direct parse
  try {
    const parsed = JSON.parse(text)
    if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch {}
  // Extract between first { and last }
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1))
      if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    } catch {}
  }
  // Regex fallback
  const match = raw.match(/\{[\s\S]*\}/)
  if (match) {
    try {
      const parsed = JSON.parse(match[0])
      if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    } catch {}
  }
  console.error('[enhance] Parse failed. Raw preview:', raw.slice(0, 200))
  return {}
}

function buildUserPrompt(name: string, existing: Record<string, any>, fields: string[]): string {
  const fieldDescriptions: Record<string, string> = {
    phonetic: 'Correct phonetic pronunciation using syllable capitalization.',
    biblicalRank: 'Ephesians 6:12 classification with brief rationale.',
    caseType: 'Personal Deliverance, Generational/Bloodline, Territorial/Regional, Institutional, Atmospheric/Intercessory, or Multiple.',
    type: 'Same as caseType — classification of this spirit.',
    isGenerational: 'true or false — is this spirit typically generational/bloodline?',
    isTerritorial: 'true or false — is this spirit typically territorial/regional?',
    clusterSpirits: 'Boss spirit AND full subordinate cluster. How the boss maintains authority.',
    companionSpirits: 'Companion or subordinate spirits that typically accompany this entity.',
    strongman: 'Primary strongman this entity operates under, if any. Single name only.',
    assignment: 'Specific demonic assignment — what it is tasked to accomplish in the person or region.',
    description: '2-3 sentences: nature, origin, primary assignment in the kingdom of darkness, biblical basis.',
    etymologyNotes: 'Full etymology: original language name(s), root words, meaning, how the name reveals assignment.',
    archaeologyNotes: 'Archaeological or historical attestation from ANE, Dead Sea Scrolls, or patristic sources.',
    manifestation: "Physical symptoms, behavioral patterns, emotional signatures, thought patterns the team watches for in session.",
    entryPoints: 'Entry points by category: generational, trauma/soul wounds, occult, ungodly vows, unforgiveness, sexual sin, territorial.',
    transmissionVectors: 'How this spirit transmits: bloodline, trauma bonding, occult initiation, soul ties, geographic exposure.',
    legalRights: 'Legal grounds: generational, trauma-based, vow-based, occult, sexual, territorial. What inner healing must address.',
    legalRightsFramework: 'Same as legalRights — legal grounds that must be addressed for durable freedom.',
    sessionIndicators: "What tells the team this spirit is present in real time: manifestations, emotional surges, resistance patterns, verbal indicators.",
    resistanceSignature: 'How this spirit resists expulsion: deception, hiding, legal claims, counterfeit manifestations, re-entry attempts.',
    scriptureContext: 'Key scriptures for authority, renunciation, and fill-up specific to this spirit.',
    counterScriptures: 'Same as scriptureContext — scriptures used against this spirit.',
    institutionalExpression: 'How this spirit expresses through institutions, organizations, or societal systems.',
    prayerPoints: '3-5 prayer declarations in session order: renunciation → breaking legal rights → commanding expulsion → fill-up and blessing.',
    deliveranceSequence: 'Same as prayerPoints — sequential prayer declarations for session use.',
    aftercareNotes: "What the person must do to keep freedom, what mentor watches for, fill-up scriptures, warning signs of re-entry.",
    operationalNotes: 'Same as aftercareNotes — operational guidance for post-session.',
    wriNotes: 'Same as aftercareNotes — War Room Intel notes for this spirit.',
    primaryBattlefield: 'The primary arena where this spirit operates: mind, will, emotions, body, relationships, finances, calling.',
    personalityPresentation: 'How this spirit presents as a personality pattern or character trait in the host.',
    demonicAgreements: 'Specific agreements, vows, or lies the host must renounce.',
    relatedSpirits: 'Other spirits closely related to or frequently paired with this entity.',
  }

  const fieldSchema = fields.map(f => `  "${f}": "${fieldDescriptions[f] || f}"`).join(',\n')

  // Only include existing values for the fields we are requesting — not the entire demon record
  const relevantExisting: Record<string, any> = {}
  for (const f of fields) {
    const v = existing[f]
    if (v !== null && v !== undefined && v !== '' && v !== false) {
      relevantExisting[f] = v
    }
  }
  const existingNote = Object.keys(relevantExisting).length > 0
    ? `Existing data for these fields (improve upon or confirm as accurate — do not simply repeat):\n${JSON.stringify(relevantExisting, null, 2)}\n\n`
    : ''

  return `Research the spirit/demon/entity: "${name}"

${existingNote}Research and return expert-level content for ALL of the following fields. Return ONLY valid JSON — no preamble, no markdown, no explanation outside the JSON:

{
${fieldSchema}
}`
}

async function fetchWikimediaImage(spiritName: string): Promise<string> {
  try {
    const query = encodeURIComponent(spiritName)
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${query}`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return ''
    const data = await res.json()
    return data.thumbnail?.source || data.originalimage?.source || ''
  } catch {
    return ''
  }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  // Parse body first — need jobId for error tracking before auth
  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers })
  }

  const { name, existing = {} } = body || {}
  if (!name) {
    return new Response(JSON.stringify({ error: 'name required' }), { status: 400, headers })
  }

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  }

  const auth = await resolveMinister(token)
  if (!auth.ok) {
    console.error('[enhance] Auth failed:', auth.reason)
    return new Response(JSON.stringify({ error: auth.reason }), { status: 403, headers })
  }

  try {
    const preamble = await getLibraryPreamble(name, existing.description || '')
    const systemPrompt = preamble ? `${preamble}\n\n${SYSTEM_PROMPT}` : SYSTEM_PROMPT
    const userPrompt = buildUserPrompt(name, existing, ENHANCE_FIELDS)

    console.log('[enhance] Requesting all fields:', ENHANCE_FIELDS)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 24000)

    let rawText: string
    try {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!anthropicRes.ok) {
        const errText = await anthropicRes.text()
        throw new Error(`Anthropic API error ${anthropicRes.status}: ${errText}`)
      }

      const data = await anthropicRes.json()
      rawText = data.content?.[0]?.text || ''
      console.log('[enhance] rawText length:', rawText.length)
      console.log('[enhance] rawText preview:', rawText.slice(0, 100))
      console.log('[enhance] starts with:', rawText.trimStart().slice(0, 10))
    } catch (e: any) {
      clearTimeout(timeoutId)
      if (e.name === 'AbortError') throw new Error('AI research timed out — try again')
      throw e
    }

    const rawFields = parseJsonFields(rawText)
    console.log('[enhance] AI raw keys:', Object.keys(rawFields))

    // Remap AI-invented key names to canonical camelCase keys
    const fields: Record<string, any> = {}
    for (const [key, value] of Object.entries(rawFields)) {
      const canonical = KEY_ALIASES[key] || key
      if (!(canonical in fields)) fields[canonical] = value
    }
    console.log('[enhance] After remap keys:', Object.keys(fields))
    console.log('[enhance] fieldCount:', Object.keys(fields).length)

    // Wikipedia image — non-blocking, best-effort
    const imageUrl = await fetchWikimediaImage(name).catch(() => '')
    if (imageUrl && !fields.images) {
      fields.images = imageUrl
    }

    return new Response(
      JSON.stringify({ success: true, spirit: name, fields, fieldCount: Object.keys(fields).length }),
      { status: 200, headers }
    )
  } catch (e: any) {
    console.error('[enhance] Error:', e.message)
    return new Response(
      JSON.stringify({ error: e.message || 'AI enhancement failed' }),
      { status: 500, headers }
    )
  }
}

export const config = { path: '/api/ai-spirit-enhance-background' }
