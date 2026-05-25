import { createClient } from '@supabase/supabase-js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

async function resolveMinister(token: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return false
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return false
    const data = await res.json()
    return data?.public_metadata?.role === 'minister'
  } catch { return false }
}

// Query library context directly from Supabase — no HTTP round-trip to another function
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
      // Simple keyword search: score chunks by presence of spirit name terms
      const terms = spiritName.toLowerCase().split(/\s+/).filter(w => w.length > 2)
      if (spiritDescription) {
        spiritDescription.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
          .filter(w => w.length > 5).slice(0, 15).forEach(w => terms.push(w))
      }

      interface ScoredChunk { title: string; author: string; text: string; score: number }
      const scored: ScoredChunk[] = []

      for (const book of books) {
        if (!book.extracted_text) continue
        const text = book.extracted_text
        // Split into ~2000 char chunks
        for (let i = 0; i < text.length; i += 1800) {
          const chunk = text.slice(i, i + 2000).trim()
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
        let section = `PERSONAL MINISTRY LIBRARY CONTEXT:\nPassages from the minister's personal theological library — weight these highly:\n\n`
        for (const c of scored.slice(0, 5)) {
          const entry = `[${c.title}${c.author ? ` by ${c.author}` : ''}]:\n${c.text}\n\n`
          if ((preamble + section + entry).length > MAX_CHARS) break
          section += entry
        }
        preamble += section
      }
    }

    return preamble
  } catch {
    return '' // Always graceful — missing library context must never break the core feature
  }
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

CRITICAL SESSION RULES TO REFLECT IN ALL CONTENT:
- Legal rights framework must address: generational sin, trauma/soul wounds, occult involvement, ungodly vows/oaths, unforgiveness, sexual sin, territorial/regional assignment
- Inner healing notes must address the specific wound type this spirit exploits and what healing looks like before expulsion
- Aftercare notes must include: what the person needs to do to keep their freedom, what the mentor should watch for, fill-up scriptures specific to this spirit's territory
- Prayer points must follow the session order: renunciation first, then breaking legal rights, then commanding expulsion, then fill-up blessing

RETURN ONLY VALID JSON. No markdown, no preamble. Only return fields that are missing or incomplete in the existing data.`

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  }

  const ok = await resolveMinister(token)
  if (!ok) {
    return new Response(JSON.stringify({ error: 'Forbidden — minister role required' }), { status: 403, headers })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers })
  }

  const { name, existing = {}, jobId } = body || {}
  if (!name) {
    return new Response(JSON.stringify({ error: 'name required' }), { status: 400, headers })
  }

  const isEmpty = (v: any) => v === null || v === undefined || v === '' || v === false || (Array.isArray(v) && v.length === 0)

  const missingFields = [
    'description', 'type', 'biblicalRank', 'etymologyNotes', 'archaeologyNotes',
    'scriptureContext', 'primaryBattlefield', 'manifestation', 'entryPoints',
    'transmissionVectors', 'caseType', 'isGenerational', 'isTerritorial',
    'clusterSpirits', 'legalRights', 'sessionIndicators', 'resistanceSignature',
    'demonicAgreements', 'institutionalExpression', 'counterScriptures',
    'deliveranceSequence', 'aftercareNotes', 'prayerPoints', 'phonetic',
    'biblicalReferences',
  ].filter(k => isEmpty(existing[k]))

  if (missingFields.length === 0) {
    if (jobId) await sb().from('ai_enhance_jobs').upsert({ id: jobId, status: 'done', spirit_name: name, fields: {} }, { onConflict: 'id' }).catch(() => {})
    return new Response(JSON.stringify({ success: true, spirit: name, fields: {}, fieldCount: 0 }), { status: 200, headers })
  }

  // Everything from here is inside try/catch — no unhandled exceptions possible
  try {
    // Library context query — direct Supabase, no HTTP call, always graceful
    const preamble = await getLibraryPreamble(name, existing.description || '')
    const systemPrompt = preamble ? `${preamble}\n\n${SYSTEM_PROMPT}` : SYSTEM_PROMPT

    const userPrompt = `Research the spirit/demon/entity: "${name}"

Current data on file (DO NOT reproduce these — only provide MISSING fields):
${JSON.stringify(existing, null, 2)}

Fields that need to be filled (return ONLY these): ${missingFields.join(', ')}

Return ONLY valid JSON containing ONLY the missing fields. No preamble, no markdown, no extra fields:

{
  "description": "3-5 sentences: nature and origin, primary assignment in the kingdom of darkness, biblical basis, historical attestation. Graduate theological level, pastorally practical.",
  "type": "Choose from: Principality, Power, Ruler of Darkness, Spiritual Wickedness, Fallen Angel, Strongman, Demon, Familiar Spirit, Spirit of Infirmity, Unclean Spirit, Institutional Power, Occult Entity, False Deity, Seducing Spirit, Lying Spirit, Spirit of Divination",
  "biblicalRank": "Ephesians 6:12 classification with brief rationale.",
  "etymologyNotes": "Full etymology: original language name(s), root words, Semitic language meaning, how the name reveals nature or assignment.",
  "archaeologyNotes": "ANE and archaeological context: ancient texts, excavations, cultural parallels illuminating the biblical profile.",
  "scriptureContext": "Every significant biblical passage — what each reveals, with original language insights.",
  "primaryBattlefield": "Primary domain: Mind, Emotions, Will, Body, Family, Marriage, Church, Government, Region, Nation, Economy, Education, Media, Religion.",
  "manifestation": "What Justin's team watches for in session: physical symptoms, behavioral patterns, emotional signatures, thought patterns, relational dynamics, spiritual symptoms. Actionable.",
  "entryPoints": "Legal rights by category: generational sin, trauma/soul wounds, occult involvement, ungodly vows/oaths, unforgiveness, sexual sin, territorial assignment. Include inner healing wound types this spirit exploits.",
  "transmissionVectors": "How this spirit transmits: bloodline, trauma bonding, occult initiation, soul ties, geographic/territorial exposure, media.",
  "caseType": "Personal Deliverance, Generational/Bloodline, Territorial/Regional, Institutional, Atmospheric/Intercessory, or Multiple.",
  "isGenerational": true,
  "isTerritorial": false,
  "clusterSpirits": "Boss spirit identification AND full subordinate cluster this spirit commands. How the boss maintains authority over the cluster.",
  "legalRights": "Legal grounds by category: generational, trauma-based, vow-based, occult, sexual, territorial. What inner healing must address before expulsion is durable.",
  "sessionIndicators": "What specifically tells Justin and his team this spirit is present in real time: physical manifestations, emotional surges, counterfeit spiritual activity, resistance patterns, verbal indicators.",
  "resistanceSignature": "How this spirit resists expulsion: deception tactics, hiding strategies, legal rights it claims, counterfeit manifestations, how it negotiates or attempts re-entry.",
  "demonicAgreements": "Specific lies, vows, and inner agreements this spirit plants: core identity lies, protective agreements, vows that function as invitations.",
  "institutionalExpression": "Organizations, movements, geographic strongholds, cultural expressions of this spirit's agenda.",
  "counterScriptures": "8-12 most effective scriptures for warfare, selected because they directly address this spirit's legal territory and assignment.",
  "deliveranceSequence": "Numbered steps following Justin's session model: inner healing first, then legal rights renunciation, then binding the boss spirit, then addressing the cluster, then expulsion, then fill-up.",
  "aftercareNotes": "What the person must do to keep freedom, what the mentor watches for, fill-up scriptures specific to this spirit's territory, warning signs of re-entry.",
  "prayerPoints": "3-5 targeted prayer declarations in session order: renunciation → breaking legal rights → commanding expulsion by name → fill-up and blessing.",
  "phonetic": "Correct phonetic pronunciation using syllable capitalization.",
  "biblicalReferences": "Complete reference list — every biblical passage where this entity appears directly or thematically."
}`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-3-5-20241022',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      throw new Error(`Anthropic API error ${anthropicRes.status}: ${errText}`)
    }

    const anthropicData = await anthropicRes.json()
    const rawText: string = anthropicData.content?.[0]?.text || ''

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error(`No JSON in AI response. Raw: ${rawText.slice(0, 300)}`)
    const enhanced = JSON.parse(jsonMatch[0])

    const filtered: Record<string, any> = {}
    for (const [key, value] of Object.entries(enhanced)) {
      if (isEmpty(existing[key])) filtered[key] = value
    }

    if (jobId) {
      await sb().from('ai_enhance_jobs')
        .upsert({ id: jobId, status: 'done', spirit_name: name, fields: filtered }, { onConflict: 'id' })
        .catch(() => {})
    }

    return new Response(
      JSON.stringify({ success: true, spirit: name, fields: filtered, fieldCount: Object.keys(filtered).length }),
      { status: 200, headers }
    )
  } catch (e: any) {
    console.error('AI enhance error:', e)
    if (jobId) {
      await sb().from('ai_enhance_jobs')
        .upsert({ id: jobId, status: 'error', spirit_name: name, error: e.message }, { onConflict: 'id' })
        .catch(() => {})
    }
    return new Response(
      JSON.stringify({ error: e.message || 'Unknown error in AI enhancement' }),
      { status: 500, headers }
    )
  }
}

export const config = { path: '/api/ai-spirit-enhance-background' }
