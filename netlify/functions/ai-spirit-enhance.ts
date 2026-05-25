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

async function getLibraryPreamble(spiritName: string, spiritDescription: string): Promise<string> {
  try {
    const client = sb()
    const [booksResult, contextResult] = await Promise.all([
      client.from('ministry_library').select('title,author,extracted_text').eq('is_enabled', true),
      client.from('ministry_context').select('context_text').eq('is_active', true).order('updated_at', { ascending: false }).limit(1).single(),
    ])
    const contextText: string = contextResult.data?.context_text || ''
    const books = booksResult.data || []
    let preamble = ''
    const MAX_CHARS = 20000
    if (contextText) {
      preamble += `MINISTRY VOICE AND THEOLOGICAL FRAMEWORK:\n${contextText}\n\nApply this theological framework and voice to all content you generate.\n---\n\n`
    }
    if (books.length > 0) {
      const terms = spiritName.toLowerCase().split(/\s+/).filter(w => w.length > 2)
      if (spiritDescription) {
        spiritDescription.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
          .filter(w => w.length > 5).slice(0, 15).forEach(w => terms.push(w))
      }
      interface ScoredChunk { title: string; author: string; text: string; score: number }
      const scored: ScoredChunk[] = []
      for (const book of books) {
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
          if (score > 0) scored.push({ title: book.title, author: book.author || '', text: chunk.slice(0, 1600), score })
        }
      }
      if (scored.length > 0) {
        scored.sort((a, b) => b.score - a.score)
        let section = `PERSONAL MINISTRY LIBRARY CONTEXT:\nPassages from the minister's personal theological library:\n\n`
        for (const c of scored.slice(0, 5)) {
          const entry = `[${c.title}${c.author ? ` by ${c.author}` : ''}]:\n${c.text}\n\n`
          if ((preamble + section + entry).length > MAX_CHARS) break
          section += entry
        }
        preamble += section
      }
    }
    return preamble
  } catch { return '' }
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

RETURN ONLY VALID JSON. No markdown, no preamble. Only return fields that are missing or incomplete in the existing data.`

// Single call — 13 high-value fields, fast enough for 26s limit
const ENHANCE_FIELDS = [
  'biblicalRank', 'caseType', 'phonetic', 'isGenerational', 'isTerritorial',
  'sessionIndicators', 'transmissionVectors', 'clusterSpirits',
  'resistanceSignature', 'legalRights', 'prayerPoints', 'aftercareNotes',
  'etymologyNotes',
]

function parseJsonFields(rawText: string): Record<string, any> {
  const match = rawText.match(/\{[\s\S]*\}/)
  if (!match) return {}
  try { return JSON.parse(match[0]) } catch { return {} }
}

function buildUserPrompt(name: string, existing: Record<string, any>, fields: string[]): string {
  const fieldDescriptions: Record<string, string> = {
    phonetic: 'Correct phonetic pronunciation using syllable capitalization.',
    biblicalRank: 'Ephesians 6:12 classification with brief rationale.',
    caseType: 'Personal Deliverance, Generational/Bloodline, Territorial/Regional, Institutional, Atmospheric/Intercessory, or Multiple.',
    isGenerational: 'true or false — is this spirit typically generational/bloodline?',
    isTerritorial: 'true or false — is this spirit typically territorial/regional?',
    clusterSpirits: 'Boss spirit identification AND full subordinate cluster this spirit commands. How the boss maintains authority.',
    type: 'Choose from: Principality, Power, Ruler of Darkness, Spiritual Wickedness, Fallen Angel, Strongman, Demon, Familiar Spirit, Spirit of Infirmity, Unclean Spirit, Institutional Power, Occult Entity, False Deity, Seducing Spirit, Lying Spirit, Spirit of Divination',
    primaryBattlefield: 'Primary domain: Mind, Emotions, Will, Body, Family, Marriage, Church, Government, Region, Nation, Economy, Education, Media, Religion.',
    description: '3-5 sentences: nature and origin, primary assignment in the kingdom of darkness, biblical basis, historical attestation. Graduate theological level, pastorally practical.',
    etymologyNotes: 'Full etymology: original language name(s), root words, Semitic language meaning, how the name reveals nature or assignment.',
    archaeologyNotes: 'ANE and archaeological context: ancient texts, excavations, cultural parallels illuminating the biblical profile.',
    scriptureContext: 'Every significant biblical passage — what each reveals, with original language insights.',
    manifestation: 'What Justin\'s team watches for in session: physical symptoms, behavioral patterns, emotional signatures, thought patterns, relational dynamics, spiritual symptoms. Actionable.',
    entryPoints: 'Legal rights by category: generational sin, trauma/soul wounds, occult involvement, ungodly vows/oaths, unforgiveness, sexual sin, territorial assignment. Include inner healing wound types this spirit exploits.',
    transmissionVectors: 'How this spirit transmits: bloodline, trauma bonding, occult initiation, soul ties, geographic/territorial exposure, media.',
    legalRights: 'Legal grounds by category: generational, trauma-based, vow-based, occult, sexual, territorial. What inner healing must address before expulsion is durable.',
    sessionIndicators: 'What specifically tells Justin and his team this spirit is present in real time: physical manifestations, emotional surges, counterfeit spiritual activity, resistance patterns, verbal indicators.',
    resistanceSignature: 'How this spirit resists expulsion: deception tactics, hiding strategies, legal rights it claims, counterfeit manifestations, how it negotiates or attempts re-entry.',
    demonicAgreements: 'Specific lies, vows, and inner agreements this spirit plants: core identity lies, protective agreements, vows that function as invitations.',
    institutionalExpression: 'Organizations, movements, geographic strongholds, cultural expressions of this spirit\'s agenda.',
    counterScriptures: '8-12 most effective scriptures for warfare, selected because they directly address this spirit\'s legal territory and assignment.',
    deliveranceSequence: 'Numbered steps following Justin\'s session model: inner healing first, legal rights renunciation, binding boss spirit, addressing cluster, expulsion, fill-up.',
    aftercareNotes: 'What the person must do to keep freedom, what mentor watches for, fill-up scriptures specific to this spirit\'s territory, warning signs of re-entry.',
    prayerPoints: '3-5 targeted prayer declarations in session order: renunciation → breaking legal rights → commanding expulsion by name → fill-up and blessing.',
    biblicalReferences: 'Complete reference list — every biblical passage where this entity appears directly or thematically.',
  }

  const fieldSchema = fields.map(f => `  "${f}": "${fieldDescriptions[f] || f}"`).join(',\n')

  return `Research the spirit/demon/entity: "${name}"

Current data on file (DO NOT reproduce — only provide MISSING fields):
${JSON.stringify(existing, null, 2)}

Return ONLY valid JSON for these specific fields: ${fields.join(', ')}

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

  const isEmpty = (v: any) => v === null || v === undefined || v === '' || v === false || (Array.isArray(v) && v.length === 0)

  const missingFields = ENHANCE_FIELDS.filter(k => isEmpty(existing[k]))

  if (missingFields.length === 0) {
    return new Response(
      JSON.stringify({ success: true, spirit: name, fields: {}, fieldCount: 0 }),
      { status: 200, headers }
    )
  }

  try {
    const preamble = await getLibraryPreamble(name, existing.description || '')
    const systemPrompt = preamble ? `${preamble}\n\n${SYSTEM_PROMPT}` : SYSTEM_PROMPT
    const userPrompt = buildUserPrompt(name, existing, missingFields)

    console.log('[enhance] Requesting fields:', missingFields)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)

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
    } catch (e: any) {
      clearTimeout(timeoutId)
      if (e.name === 'AbortError') throw new Error('AI research timed out — try again')
      throw e
    }

    const parsed = parseJsonFields(rawText)

    const filtered: Record<string, any> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (isEmpty(existing[key])) filtered[key] = value
    }

    console.log('[enhance] Done, fields returned:', Object.keys(filtered))

    return new Response(
      JSON.stringify({ success: true, spirit: name, fields: filtered, fieldCount: Object.keys(filtered).length }),
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
