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

const SYSTEM_PROMPT = `You are the personal theological research assistant for Pastor Justin Payne of Staffordtown Church (Church on Fire), Copperhill, Tennessee — a trained deliverance minister holding advanced degrees in Archaeology, Etymology, Biblical Demonology, and Theology.

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

CONCISENESS RULE: Keep each field value tight. String fields: 1-3 sentences max. Array fields: 3-7 items max, each item one sentence. Boolean fields: true or false only. The JSON must be complete and valid — do not truncate.`

// 10 most critical fields — keys match camelToAirtable in admin-demon.ts exactly
const ENHANCE_FIELDS = [
  'biblicalRank',
  'caseType',
  'phonetic',
  'isGenerational',
  'isTerritorial',
  'sessionIndicators',
  'clusterSpirits',
  'resistanceSignature',
  'legalRights',
  'etymologyNotes',
]

// Map AI-invented key names to the canonical camelCase keys used in admin-demon.ts
const KEY_ALIASES: Record<string, string> = {
  companionSpirits: 'clusterSpirits',
  wriNotes: 'aftercareNotes',
  legalRightsFramework: 'legalRights',
  entryPoints: 'transmissionVectors',
  counterScriptures: 'scriptureContext',
  deliveranceSequence: 'prayerPoints',
  personalityPresentation: 'caseType',
  symptoms: 'sessionIndicators',
  scripture: 'scriptureContext',
  protocol: 'prayerPoints',
  operationalNotes: 'aftercareNotes',
  primaryBattlefield: 'sessionIndicators',
  manifestation: 'sessionIndicators',
}

function parseJsonFields(raw: string): Record<string, any> {
  if (!raw || raw.trim() === '') return {}

  // Try direct parse first
  try {
    const direct = JSON.parse(raw.trim())
    if (typeof direct === 'object' && !Array.isArray(direct)) return direct
  } catch {}

  // Strip markdown code fences then try again
  const stripped = raw.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
  try {
    const parsed = JSON.parse(stripped)
    if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch {}

  // Extract largest {...} block and try each from longest to shortest
  const matches = raw.match(/\{[\s\S]*?\}/g) || []
  const allBlocks = raw.match(/\{[\s\S]*\}/g) || []
  const candidates = [...new Set([...allBlocks, ...matches])].sort((a, b) => b.length - a.length)
  for (const block of candidates) {
    try {
      const parsed = JSON.parse(block)
      if (typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
        return parsed
      }
    } catch {}
  }

  console.error('[enhance] Could not parse JSON. raw[:300]:', raw.slice(0, 300))
  return {}
}

function buildUserPrompt(name: string, existing: Record<string, any>, fields: string[]): string {
  const fieldDescriptions: Record<string, string> = {
    phonetic: 'Correct phonetic pronunciation using syllable capitalization.',
    biblicalRank: 'Ephesians 6:12 classification with brief rationale.',
    caseType: 'Personal Deliverance, Generational/Bloodline, Territorial/Regional, Institutional, Atmospheric/Intercessory, or Multiple.',
    isGenerational: 'true or false — is this spirit typically generational/bloodline?',
    isTerritorial: 'true or false — is this spirit typically territorial/regional?',
    clusterSpirits: 'Boss spirit identification AND full subordinate cluster this spirit commands. How the boss maintains authority.',
    strongman: 'The primary strongman spirit this entity operates under, if any. Single name only.',
    assignment: 'The specific demonic assignment/mission of this spirit — what it is tasked to accomplish in the person or region.',
    description: '3-5 sentences: nature and origin, primary assignment in the kingdom of darkness, biblical basis, historical attestation. Graduate theological level, pastorally practical.',
    etymologyNotes: 'Full etymology: original language name(s), root words, Semitic language meaning, how the name reveals nature or assignment.',
    manifestation: "What Justin's team watches for in session: physical symptoms, behavioral patterns, emotional signatures, thought patterns, relational dynamics, spiritual symptoms. Actionable.",
    entryPoints: 'Legal rights by category: generational sin, trauma/soul wounds, occult involvement, ungodly vows/oaths, unforgiveness, sexual sin, territorial assignment. Include inner healing wound types this spirit exploits.',
    transmissionVectors: 'How this spirit transmits: bloodline, trauma bonding, occult initiation, soul ties, geographic/territorial exposure, media.',
    legalRights: 'Legal grounds by category: generational, trauma-based, vow-based, occult, sexual, territorial. What inner healing must address before expulsion is durable.',
    sessionIndicators: "What specifically tells Justin and his team this spirit is present in real time: physical manifestations, emotional surges, counterfeit spiritual activity, resistance patterns, verbal indicators.",
    resistanceSignature: 'How this spirit resists expulsion: deception tactics, hiding strategies, legal rights it claims, counterfeit manifestations, how it negotiates or attempts re-entry.',
    aftercareNotes: "What the person must do to keep freedom, what mentor watches for, fill-up scriptures specific to this spirit's territory, warning signs of re-entry.",
    prayerPoints: '3-5 targeted prayer declarations in session order: renunciation → breaking legal rights → commanding expulsion by name → fill-up and blessing.',
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
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1500,
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
      console.log('[enhance] rawText first 500:', rawText.slice(0, 500))
      console.log('[enhance] rawText last 200:', rawText.slice(-200))
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
      // Don't overwrite if canonical key already set from a more specific entry
      if (!(canonical in fields)) fields[canonical] = value
    }
    console.log('[enhance] After remap keys:', Object.keys(fields))
    console.log('[enhance] fieldCount:', Object.keys(fields).length)

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
