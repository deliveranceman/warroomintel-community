import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
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

async function getPreamble(
  spiritName: string,
  spiritDescription: string,
  isTerritorial: boolean,
  requestedFields: string[]
): Promise<{ preamble: string; usedLibrary: boolean; librarySourceCount: number }> {
  try {
    const client = sb()
    const isSessionRequest = requestedFields.some(f =>
      ['sessionIndicators', 'resistanceSignature', 'prayerPoints', 'aftercareNotes', 'legalRights'].includes(f)
    )
    let usedLibrary = false
    let librarySourceCount = 0

    // Fetch contexts and books in parallel (books from both old ministry_library and new resources table)
    const [contextResult, booksResult, resourceBooksResult] = await Promise.all([
      client.from('ministry_context').select('label, context_text, scope').eq('is_active', true).order('scope'),
      client.from('ministry_library').select('title, author, extracted_text').eq('is_enabled', true).eq('ai_enabled', true),
      client.from('resources').select('title, author, notes, extracted_text').eq('topic', 'ministry-library').eq('active', true),
    ])

    const MAX_CHARS = 8000
    let preamble = ''

    // Inject ministry contexts by scope
    const contexts = contextResult.data || []
    const contextSections: string[] = []
    for (const ctx of contexts) {
      const { scope, label, context_text } = ctx
      if (scope === 'global') {
        contextSections.push(`[${label || 'Ministry Context'}]:\n${context_text}`)
      } else if (scope === 'regional' && isTerritorial) {
        contextSections.push(`[${label || 'Regional Context'}]:\n${context_text}`)
      } else if (scope === 'session' && isSessionRequest) {
        contextSections.push(`[${label || 'Session Context'}]:\n${context_text}`)
      }
    }
    if (contextSections.length) {
      preamble += `MINISTRY CONTEXT:\n${contextSections.join('\n\n---\n\n')}\n\nApply the above ministry framework and voice to all content you generate.\n---\n\n`
    }

    // Inject relevant library book chunks
    const books = booksResult.data || []
    if (books.length > 0) {
      const terms = spiritName.toLowerCase().split(/\s+/).filter(w => w.length > 2)
      if (spiritDescription) {
        spiritDescription.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
          .filter(w => w.length > 5).slice(0, 10).forEach(w => terms.push(w))
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
          if (score > 0) scored.push({ title: book.title, author: book.author || '', text: chunk.slice(0, 1400), score })
        }
      }
      if (scored.length > 0) {
        scored.sort((a, b) => b.score - a.score)
        let bookSection = `PERSONAL MINISTRY LIBRARY:\n`
        let usedBooks = 0
        let usedChars = 0
        for (const c of scored.slice(0, 5)) {
          const entry = `[${c.title}${c.author ? ` by ${c.author}` : ''}]:\n${c.text}\n\n`
          if ((preamble + bookSection + entry).length > MAX_CHARS) break
          bookSection += entry
          usedBooks++
          usedChars += c.text.length
        }
        if (bookSection.length > 30) {
          preamble += bookSection
          usedLibrary = true
          librarySourceCount += usedBooks
          console.log(`[ai-spirit-enhance] Ministry library context loaded: ${usedBooks} books, ${usedChars} characters`)
        }
      } else {
        console.log(`[ai-spirit-enhance] Ministry library: ${books.length} books available, none matched spirit keywords`)
      }

    // Inject uploaded resources library — vector search first, keyword fallback
    const resourceBooks = resourceBooksResult.data || []
    if (resourceBooks.length > 0) {
      let injectedResourceChunks = false

      // ── Vector search path (if OPENAI_API_KEY is set and chunks exist) ───────
      const OPENAI_KEY = process.env.OPENAI_API_KEY || ''
      if (OPENAI_KEY) {
        try {
          const searchQuery = `${spiritName} ${spiritDescription}`.trim()
          const embRes = await fetch('https://api.openai.com/v1/embeddings', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
            body:    JSON.stringify({ model: 'text-embedding-3-small', input: [searchQuery] }),
            signal:  AbortSignal.timeout(5000),
          })
          if (embRes.ok) {
            const embData  = await embRes.json()
            const vector   = embData.data?.[0]?.embedding
            if (vector) {
              const { data: vChunks } = await client.rpc('match_library_chunks', {
                query_embedding: vector,
                match_threshold: 0.65,
                match_count:     5,
              })
              if (vChunks?.length > 0) {
                let vsSection = `PERSONAL MINISTRY LIBRARY (highest authority):\n`
                let usedV = 0
                for (const chunk of vChunks) {
                  const entry = `[From "${chunk.book_title}"]: ${chunk.chunk_text.slice(0, 1400)}\n\n`
                  if ((preamble + vsSection + entry).length > MAX_CHARS) break
                  vsSection += entry
                  usedV++
                }
                if (usedV > 0) {
                  preamble += vsSection
                  usedLibrary = true
                  librarySourceCount += usedV
                  injectedResourceChunks = true
                  console.log(`[ai-spirit-enhance] Vector search: ${usedV} chunks injected for "${spiritName}"`)
                }
              }
            }
          }
        } catch (e: any) {
          console.log('[ai-spirit-enhance] Vector search failed, using keyword fallback:', e.message)
        }
      }

      // ── Keyword fallback (when no vector results or no OpenAI key) ────────────
      if (!injectedResourceChunks) {
      const terms = spiritName.toLowerCase().split(/\s+/).filter(w => w.length > 2)
      if (spiritDescription) {
        spiritDescription.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
          .filter(w => w.length > 5).slice(0, 10).forEach(w => terms.push(w))
      }

      // Books with extracted text — score and include relevant chunks
      interface RChunk { title: string; author: string; text: string; score: number }
      const rScored: RChunk[] = []
      for (const book of resourceBooks) {
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
          if (score > 0) rScored.push({ title: book.title, author: book.author || '', text: chunk.slice(0, 1400), score })
        }
      }
      if (rScored.length > 0) {
        rScored.sort((a, b) => b.score - a.score)
        let rsSection = `MINISTRY LIBRARY (uploaded):\n`
        let usedR = 0
        for (const c of rScored.slice(0, 4)) {
          const entry = `[${c.title}${c.author ? ` by ${c.author}` : ''}]:\n${c.text}\n\n`
          if ((preamble + rsSection + entry).length > MAX_CHARS) break
          rsSection += entry
          usedR++
        }
        if (usedR > 0) {
          preamble += rsSection
          usedLibrary = true
          librarySourceCount += usedR
          console.log(`[ai-spirit-enhance] Injected ${usedR} resource-library text chunks (keyword)`)
        }
      }
      } // end keyword fallback

      // Books without extracted text — fall back to metadata summary
      const metaOnly = resourceBooks.filter(b => !b.extracted_text && b.title)
      if (metaOnly.length > 0 && preamble.length < MAX_CHARS - 500) {
        const entries = metaOnly
          .map(b => `• ${b.title}${b.author ? ` — ${b.author}` : ''}${b.notes ? `: ${b.notes}` : ''}`)
          .join('\n')
        if (entries) {
          preamble += `\nUPLOADED LIBRARY (metadata only — ${metaOnly.length} book${metaOnly.length !== 1 ? 's' : ''}):\n${entries}\n\n`
          console.log(`[ai-spirit-enhance] Injected ${metaOnly.length} resource metadata entries`)
        }
      }
    }
    }

    return { preamble, usedLibrary, librarySourceCount }
  } catch { return { preamble: '', usedLibrary: false, librarySourceCount: 0 } }
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

// Default fields — used when no fields array is provided in the request body
const ENHANCE_FIELDS_DEFAULT = [
  'biblicalRank', 'caseType', 'phonetic',
  'sessionIndicators', 'clusterSpirits', 'legalRights',
  'images',
]

// Map AI key names to canonical camelCase keys matching admin-demon.ts camelToAirtable
const KEY_ALIASES: Record<string, string> = {
  // Identity aliases — canonical keys pass through unchanged
  aka: 'aka',
  description: 'description',
  kingdom: 'kingdom',
  subKingdom: 'subKingdom',
  sub_kingdom: 'subKingdom',
  'sub-kingdom': 'subKingdom',
  secondaryKingdom: 'subKingdom',
  culturalOrigin: 'subKingdom',
  strongman: 'strongman',
  rank: 'rank',
  assignment: 'assignment',
  phonetic: 'phonetic',
  images: 'images',
  relatedSpirits: 'relatedSpirits',
  biblicalRank: 'biblicalRank',
  caseType: 'caseType',
  isGenerational: 'isGenerational',
  isTerritorial: 'isTerritorial',
  // Common AI variations → canonical keys
  manifestation: 'manifestation',
  symptoms: 'manifestation',
  entryPoints: 'entryPoints',
  legalRights: 'legalRights',
  companionSpirits: 'clusterSpirits',
  clusterSpirits: 'clusterSpirits',
  wriNotes: 'wriNotes',
  operationalNotes: 'operationalNotes',
  primaryBattlefield: 'primaryBattlefield',
  personalityPresentation: 'personalityPresentation',
  counterScriptures: 'counterScriptures',
  deliveranceSequence: 'deliveranceSequence',
  protocol: 'deliveranceSequence',
  parentStrongman: 'parentStrongman',
  hierarchyCategory: 'hierarchyCategory',
  sourceOrigin: 'sourceOrigin',
  scripture: 'scripture',
  sessionIndicators: 'sessionIndicators',
  resistanceSignature: 'resistanceSignature',
  demonicAgreements: 'demonicAgreements',
  legalRightsFramework: 'legalRightsFramework',
  transmissionVectors: 'transmissionVectors',
  institutionalExpression: 'institutionalExpression',
  etymologyNotes: 'etymologyNotes',
  archaeologyNotes: 'archaeologyNotes',
  archaeology: 'archaeologyNotes',
  scriptureContext: 'scriptureContext',
  prayerPoints: 'prayerPoints',
  aftercareNotes: 'aftercareNotes',
  culturalPresence: 'culturalPresence',
  sessionTriggerQuestions: 'sessionTriggerQuestions',
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
    biblicalRank: 'Return ONLY one of these exact strings (see CLASSIFICATION RULES above for when to use each): "Principality" | "World Ruler" | "Power" | "Wicked Spirit" | "Fallen Angel" | "Demon" | "Familiar Spirit" | "Spirit of Infirmity". No other text, no punctuation. CRITICAL: Most spirits that indwell individuals = "Demon". Spirits that received mass worship across civilizations = "World Ruler". Do NOT default to Principality.',
    subKingdom: 'Secondary cultural/religious origin system. Return ONLY one of these exact strings: "Norse/Germanic" | "Celtic" | "Greek/Roman" | "Egyptian" | "Babylonian/Sumerian" | "Canaanite/Phoenician" | "Hindu/Eastern" | "Native American" | "African Traditional" | "Freemasonry/Secret Societies" | "Satanism/Luciferianism" | "New Age/Occult" | "Marine/Aquatic" | "Celestial/Astral" | "Infernal/Hell" | "Generational" | "Religious Spirit" | "None". Pick the most specific match.',
    caseType: 'Personal Deliverance, Generational/Bloodline, Territorial/Regional, Institutional, Atmospheric/Intercessory, or Multiple.',
    isGenerational: 'true if primary transmission is through bloodline covenant; false otherwise.',
    isTerritorial: 'true if this spirit primarily operates over regions/lands/peoples atmospherically rather than indwelling individuals directly; false if it primarily indwells.',
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
    relatedSpirits: 'Comma-separated list of spirit names directly related to or subordinate to this spirit. Use exact names only — no descriptions or parenthetical notes. Example: "Jezebel, Ahab, Molech, Asherah"',
  culturalPresence: 'List which cultural categories this spirit appears in from this list ONLY: "Film / Cinema", "Television / Streaming", "Comics / Graphic Novels", "Video Games", "Music / Lyrics", "Literature / Fiction", "Ancient Documents / Texts", "Religious Texts / Scripture", "Secret Society Rituals", "Academic / Occult Literature", "Internet / Social Media", "Tattoo Culture", "Fashion / Aesthetics", "Sports Culture", "New Age / Wellness Industry", "Anime / Manga", "Role Playing Games / D&D", "Astrology / Tarot", "Horror Genre", "True Crime". Return as a JSON array of exact strings from that list only.',
  sessionTriggerQuestions: 'Write 4-6 specific interview questions a deliverance minister would ask to identify if this spirit gained entry through cultural exposure. Be specific — not "did you watch movies" but questions that reference actual titles, franchises, artists, games, or practices. Examples: "Have you been deeply into the Marvel Cinematic Universe, particularly Thor, Loki, or Norse mythology content?", "Did you ever play Dungeons & Dragons, World of Warcraft, or similar games featuring this spirit by name?", "Do you listen to [specific artist] whose lyrics reference this spirit or its themes?". Write as a numbered list, 1 question per line.',
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

  const needsClassification = fields.some(f => ['biblicalRank', 'subKingdom', 'kingdom', 'isTerritorial', 'isGenerational', 'caseType'].includes(f))
  const classificationBlock = needsClassification ? `
CLASSIFICATION RULES — apply these exactly before filling classification fields:

BIBLICAL RANK (Ephesians 6:12 framework):
- "Principality" (archai): ONLY spirits with direct governmental authority over nation-states or government structures. DO NOT default here. Very few spirits qualify.
- "World Ruler" (kosmokrator): High-ranking spirits that received mass worship across civilizations and gained atmospheric/territorial authority through that covenant. Examples: Baal, Leviathan, Thor, Odin, Molech, Ra, Zeus, Artemis. These operate OVER peoples and regions, not inside individuals.
- "Power" (exousia): Spirits with broad authority over an entire domain or sphere — death as a system, lust as a governing force, witchcraft as a kingdom structure. Examples: spirit of death (systemic), Jezebel as a controlling system over churches/regions.
- "Wicked Spirit" (poneria): Spirits operating through deception, chaos, and corruption from within. Examples: Loki, lying spirits, spirits of confusion, deceiving spirits (1 Tim 4:1), Apollyon as destroyer.
- "Demon": Spirits that characteristically INDWELL and harass individuals. The most common category for any spirit that manifests in personal deliverance sessions. Examples: Fear, Anger, Rejection, Pride, Shame, Lust (personal), Infirmity (personal).
- "Familiar Spirit": Spirits with generational bloodline assignment to a specific family. Mimic, counterfeit, and monitor. Examples: familiar spirits from Masonic oaths, witchcraft covenants, ancestral worship systems.
- "Spirit of Infirmity": Spirits that manifest primarily through physical disease, chronic illness, or body-level affliction. Examples: cancer spirit, arthritis spirit, deaf/mute spirit (Mark 9).
- "Fallen Angel": Pre-flood Watchers or named fallen angels with specific cosmic rebellion roles. Examples: Azazel, Semyaza, named Watchers from 1 Enoch, angels bound at the Euphrates (Rev 9:14).

KEY DECISION RULE: Ask first — does this spirit characteristically INDWELL individuals or operate OVER them atmospherically? Indwelling → "Demon". Atmospheric/territorial through worship covenant → "World Ruler". Governing a domain or system → "Power". Deception/chaos agent → "Wicked Spirit".

KINGDOM: Hell/Darkness | Air | Water/Marine | Earth | Witchcraft | Occult | Religion | Infirmity | Mind/Intellect | Sexual Perversion | Death/Destruction | Fear/Torment

SUB-KINGDOM: If the spirit originates in a specific cultural/religious system, name it using the exact strings from the field definition. Default "None" only if no cultural origin applies.

INDWELLING vs TERRITORIAL:
- isTerritorial: true ONLY if the spirit primarily operates over geographic regions, peoples, or lands atmospherically — not through indwelling individuals
- isGenerational: true if primary transmission mechanism is bloodline covenant, ancestral sin, or inherited curse

---

` : ''

  return `Research the spirit/demon/entity: "${name}"

${existingNote}${classificationBlock}Research and return expert-level content for ALL of the following fields. Return ONLY valid JSON — no preamble, no markdown, no explanation outside the JSON:

{
${fieldSchema}
}`
}

async function fetchWikimediaImage(spiritName: string): Promise<string> {
  const names = [
    spiritName,
    spiritName.split(' ')[0],
    spiritName.replace(/[^a-zA-Z]/g, ''),
  ].filter((n, i, a) => n && a.indexOf(n) === i) // deduplicate

  for (const name of names) {
    try {
      const encoded = encodeURIComponent(name)
      // Method 1: Wikipedia REST summary
      const r1 = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
        { signal: AbortSignal.timeout(4000) }
      )
      if (r1.ok) {
        const d = await r1.json()
        const url = d.thumbnail?.source || d.originalimage?.source
        if (url) {
          console.log('[enhance] Image found via summary for', name, ':', url.slice(0, 80))
          return url
        }
      }
      // Method 2: MediaWiki pageimages API
      const r2 = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&titles=${encoded}&prop=pageimages&format=json&pithumbsize=400&origin=*`,
        { signal: AbortSignal.timeout(4000) }
      )
      if (r2.ok) {
        const d = await r2.json()
        const pages = Object.values(d.query?.pages || {}) as any[]
        const url = pages[0]?.thumbnail?.source
        if (url) {
          console.log('[enhance] Image found via pageimages for', name, ':', url.slice(0, 80))
          return url
        }
      }
    } catch (e) {
      console.log('[enhance] Image fetch failed for:', name, (e as any)?.message)
    }
  }
  console.log('[enhance] No image found for:', spiritName)
  return ''
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

  const { name, existing = {}, fields: reqFields } = body || {}
  if (!name) {
    return new Response(JSON.stringify({ error: 'name required' }), { status: 400, headers })
  }
  const requestedFields: string[] = Array.isArray(reqFields) && reqFields.length > 0 ? reqFields : ENHANCE_FIELDS_DEFAULT

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
    const isTerritorial = existing.isTerritorial === true || existing.isTerritorial === 'true'
    const { preamble, usedLibrary, librarySourceCount } = await getPreamble(name, existing.description || '', isTerritorial, requestedFields)
    const systemPrompt = preamble ? `${preamble}\n\n${SYSTEM_PROMPT}` : SYSTEM_PROMPT
    const userPrompt = buildUserPrompt(name, existing, requestedFields)

    console.log('[enhance] Requesting fields:', requestedFields)

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
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
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

      // Log usage — fire and forget, never block or throw
      const inputTokens  = data.usage?.input_tokens  || 0
      const outputTokens = data.usage?.output_tokens || 0
      try {
        const reqUrl = new URL(req.url)
        const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`
        fetch(`${baseUrl}/api/ai-usage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ call_type: 'enhance', spirit_name: name, input_tokens: inputTokens, output_tokens: outputTokens, model: 'claude-sonnet-4-20250514' }),
        }).catch(() => {})
      } catch {}
    } catch (e: any) {
      clearTimeout(timeoutId)
      if (e.name === 'AbortError') throw new Error('AI research timed out — try again')
      throw e
    }

    const rawFields = parseJsonFields(rawText)
    console.log('[enhance] AI raw keys:', Object.keys(rawFields))

    // Remap AI-invented key names to canonical camelCase keys
    const remappedFields: Record<string, any> = {}
    for (const [key, value] of Object.entries(rawFields)) {
      const canonical = KEY_ALIASES[key] || key
      if (!(canonical in remappedFields)) remappedFields[canonical] = value
    }
    console.log('[enhance] After remap keys:', Object.keys(remappedFields))
    console.log('[enhance] fieldCount:', Object.keys(remappedFields).length)

    // Sanitize biblicalRank — must be one of the exact Eph. 6:12 values (new taxonomy)
    const VALID_BIBLICAL_RANKS = [
      // New taxonomy (preferred)
      'Principality', 'World Ruler', 'Power', 'Wicked Spirit',
      'Fallen Angel', 'Demon', 'Familiar Spirit', 'Spirit of Infirmity',
      // Legacy values from old taxonomy — kept for backward compatibility with existing Airtable data
      'Ruler of Darkness', 'Spiritual Wickedness in High Places',
    ]
    if (remappedFields.biblicalRank) {
      const raw = String(remappedFields.biblicalRank)
      const exact = VALID_BIBLICAL_RANKS.find(r => r.toLowerCase() === raw.toLowerCase())
      if (exact) {
        remappedFields.biblicalRank = exact
      } else {
        const partial = VALID_BIBLICAL_RANKS.find(r => raw.toLowerCase().includes(r.toLowerCase()))
        remappedFields.biblicalRank = partial || ''
      }
    }

    // Sanitize subKingdom — must be one of the exact Single Select options
    const VALID_SUB_KINGDOMS = [
      'Norse/Germanic', 'Celtic', 'Greek/Roman', 'Egyptian',
      'Babylonian/Sumerian', 'Canaanite/Phoenician', 'Hindu/Eastern',
      'Native American', 'African Traditional', 'Freemasonry/Secret Societies',
      'Satanism/Luciferianism', 'New Age/Occult', 'Marine/Aquatic',
      'Celestial/Astral', 'Infernal/Hell', 'Generational', 'Religious Spirit', 'None',
    ]
    if (remappedFields.subKingdom) {
      const rawSK = String(remappedFields.subKingdom).replace(/\s*\/\s*/g, '/')
      const exactSK = VALID_SUB_KINGDOMS.find(v => v.toLowerCase() === rawSK.toLowerCase())
      if (exactSK) {
        remappedFields.subKingdom = exactSK
      } else {
        const partialSK = VALID_SUB_KINGDOMS.find(v => rawSK.toLowerCase().includes(v.toLowerCase().split('/')[0]))
        remappedFields.subKingdom = partialSK || ''
      }
    }

    // Sanitize culturalPresence — must be array of exact option strings
    const VALID_CULTURAL_PRESENCE = [
      'Film / Cinema', 'Television / Streaming', 'Comics / Graphic Novels', 'Video Games',
      'Music / Lyrics', 'Literature / Fiction', 'Ancient Documents / Texts', 'Religious Texts / Scripture',
      'Secret Society Rituals', 'Academic / Occult Literature', 'Internet / Social Media',
      'Tattoo Culture', 'Fashion / Aesthetics', 'Sports Culture', 'New Age / Wellness Industry',
      'Anime / Manga', 'Role Playing Games / D&D', 'Astrology / Tarot', 'Horror Genre', 'True Crime',
    ]
    if (remappedFields.culturalPresence !== undefined) {
      const raw = remappedFields.culturalPresence
      if (Array.isArray(raw)) {
        remappedFields.culturalPresence = raw.map((v: any) => {
          const str = String(v).trim()
          return VALID_CULTURAL_PRESENCE.find(opt => opt.toLowerCase() === str.toLowerCase())
            || VALID_CULTURAL_PRESENCE.find(opt => str.toLowerCase().includes(opt.split('/')[0].toLowerCase().trim()))
            || null
        }).filter(Boolean)
      } else {
        delete remappedFields.culturalPresence
      }
    }

    // Wikipedia image — non-blocking, best-effort
    const imageUrl = await fetchWikimediaImage(name).catch(() => '')
    console.log('[enhance] imageUrl result:', imageUrl ? imageUrl.slice(0, 80) : 'EMPTY')
    if (imageUrl) {
      remappedFields.images = imageUrl
    }

    return new Response(
      JSON.stringify({ success: true, spirit: name, fields: remappedFields, fieldCount: Object.keys(remappedFields).length, usedLibrary, librarySourceCount }),
      { status: 200, headers }
    )
  } catch (e: any) {
    console.error('[enhance] Error:', e.message)
    return new Response(
      JSON.stringify({ success: false, error: e.message || 'Unknown error', fields: {}, fieldCount: 0 }),
      { status: 500, headers }
    )
  }
}

export const config = { path: '/api/ai-spirit-enhance-background' }
