import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

async function resolveUser(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return null
    const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!userRes.ok) return null
    const userData = await userRes.json()
    return { userId, userData }
  } catch(e) { return null }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const auth = await resolveUser(token)
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

  const role = auth.userData?.public_metadata?.role
  if (role !== 'minister') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })
  }

  const { spiritName, currentData } = await req.json()
  if (!spiritName) return new Response(JSON.stringify({ error: 'spiritName required' }), { status: 400, headers })

  const prompt = `You are an advanced theological and demonological research system serving a trained Christian deliverance minister who holds advanced degrees in archaeology, etymology, biblical demonology, and theology. This minister operates within an evangelical/charismatic framework with deep respect for Scripture as the primary authority.

Research the spirit/demon/entity: "${spiritName}"

Current data on file:
${JSON.stringify(currentData, null, 2)}

Draw from ALL of the following source categories, clearly prioritizing them in this order:

PRIMARY SOURCES (Scripture — always first):
- Hebrew and Greek original language analysis (name meaning, root words, grammatical context)
- Every direct and indirect biblical reference to this entity or its effects
- Cross-testament appearances and thematic continuity
- Dead Sea Scrolls references (1 Enoch, Book of Giants, War Scroll)
- Intertestamental literature with biblical grounding

HISTORICAL-ARCHAEOLOGICAL SOURCES:
- Ancient Near Eastern (ANE) archaeological context — Ugaritic, Akkadian, Sumerian parallels
- Canaanite religious texts (Baal Cycle, KTU tablets) where relevant
- Egyptian, Babylonian, Assyrian demonological texts that illuminate biblical references
- Etymology across Semitic language families (Hebrew, Aramaic, Ugaritic, Phoenician)
- Greek and Roman sources that intersect with biblical demonology
- Historical demonological texts (Ars Goetia, Pseudomonarchia, Lemegeton) — filtered through biblical lens and noted as secondary

PATRISTIC AND CHURCH HISTORY:
- Early church fathers on demonology (Origen, Tertullian, Justin Martyr, Athanasius, Chrysostom)
- Medieval theological frameworks (Aquinas on angels/demons)
- Reformation and post-Reformation understandings

MODERN DELIVERANCE MINISTRY FRAMEWORKS:
- Derek Prince (legal rights, generational curses, blessing/cursing)
- Charles Kraft (worldview integration, deep healing, power encounter)
- Frank Hammond (Pigs in the Parlor — cluster identification)
- Neil Anderson (Steps to Freedom, identity-based approach)
- Win Worley (binding strongmen, persistent warfare)
- John Eckhardt and apostolic warfare frameworks
- Peter Wagner and territorial spirits research

Return ONLY valid JSON. No preamble, no markdown, no explanation outside the JSON structure:

{
  "description": "Scholarly yet ministerially practical 3-5 sentence description covering: nature and origin of this entity, its primary assignment in the kingdom of darkness, biblical basis, and historical attestation. Write at graduate theological level.",
  "type": "Most precise classification. Choose from: Principality, Power, Ruler of Darkness, Spiritual Wickedness, Fallen Angel, Strongman, Demon, Familiar Spirit, Spirit of Infirmity, Unclean Spirit, Institutional Power, Occult Entity, False Deity, Seducing Spirit, Lying Spirit, Spirit of Divination",
  "biblicalRank": "Ephesians 6:12 classification — one of: Principality, Power, Ruler of Darkness, Spiritual Wickedness in High Places, Fallen Angel, Demon, Familiar Spirit, Spirit of Infirmity. Include brief rationale.",
  "etymologyNotes": "Full etymology: original language name(s), root words, meaning across Semitic languages, how the name reveals the spirit's nature or assignment.",
  "archaeologyNotes": "Archaeological and ANE context: where this entity appears in ancient texts, archaeological discoveries, cultural context.",
  "scriptureContext": "Comprehensive biblical reference analysis: every significant passage, what each reveals about this entity, original language insights.",
  "primaryBattlefield": "Where this spirit primarily operates: Mind, Emotions, Will, Body, Family, Marriage, Church, Government, Region, Nation, Economy, Education, Media, Religion.",
  "manifestation": "Clinical-level description of manifestations: physical symptoms, behavioral patterns, emotional signatures, thought patterns, relational dynamics, spiritual symptoms.",
  "entryPoints": "Specific legal rights and entry points categorized by type.",
  "transmissionVectors": "How this spirit transmits and maintains access.",
  "caseType": "Primary case context: Personal Deliverance, Generational/Bloodline, Territorial/Regional, Institutional, Atmospheric/Intercessory, or Multiple.",
  "isGenerational": true,
  "isTerritorial": false,
  "clusterSpirits": "Comma-separated list of spirits that commonly travel with or are subordinate to this one.",
  "legalRights": "Specific legal grounds this spirit claims, organized by category.",
  "sessionIndicators": "What tells a trained minister THIS specific spirit is present during a session.",
  "resistanceSignature": "How this spirit typically resists expulsion.",
  "demonicAgreements": "The specific lies, vows, and agreements this spirit plants in the person's belief system.",
  "institutionalExpression": "If this spirit animates institutions or systems, what organizations/movements express its agenda.",
  "counterScriptures": "8-12 most effective scriptures for warfare against this spirit specifically.",
  "deliveranceSequence": "Optimal sequence for expulsion as numbered steps.",
  "aftercareNotes": "Specific aftercare required after this spirit's expulsion.",
  "prayerPoints": "3-5 specific targeted prayer declarations effective against this spirit.",
  "phonetic": "Correct phonetic pronunciation using syllable capitalization.",
  "biblicalReferences": "Complete reference list: every biblical passage where this entity appears."
}

CRITICAL INSTRUCTIONS:
- Write at graduate theological/ministerial level
- Be specific and practical
- When uncertain, say so explicitly
- Ground every claim in primary sources where possible
- If a spirit name is extra-biblical, note this and provide what legitimate sources say`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')
    const enhanced = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify({ enhanced }), { status: 200, headers })
  } catch(e: any) {
    console.error('AI enhance error:', e)
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers })
  }
}

export const config = { path: '/api/ai-spirit-enhance' }
