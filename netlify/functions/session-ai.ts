import { getMinistryContext } from '../lib/getMinistryContext'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

const ANTHROPIC_KEY = () => process.env.ANTHROPIC_API_KEY!
const OPENAI_KEY    = () => process.env.OPENAI_API_KEY!

async function claudeCall(model: string, system: string, userMsg: string, maxTokens = 800) {
  const ministryCtx = await getMinistryContext()
  system = ministryCtx ? `${ministryCtx}\n\n---\n\n${system}` : system
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: userMsg }] }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`Claude error ${res.status}`)
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

// ── SEQUENCE ORDERING ──────────────────────────────────────────────────────────
const RANK_ORDER: Record<string, number> = {
  principality: 0, power: 1, 'world ruler': 2, strongman: 3, 'common spirit': 4, common: 4, gatekeeper: 0,
}

const GATEKEEPERS: Record<string, number> = { leviathan: 1, 'mind control': 2, python: 3 }
const TRAUMA_SPIRITS = new Set(['deep hurt','abandonment','abuse','childhood trauma','rejection trauma','grief'])

function rankSpirit(name: string, rank: string): number {
  const n = name.toLowerCase()
  if (GATEKEEPERS[n] !== undefined) return GATEKEEPERS[n]
  return (RANK_ORDER[rank?.toLowerCase()] ?? 4) + 10
}

// ── BODY REGION KEYWORDS (mirrors BodyMapView) ────────────────────────────────
const REGION_KEYWORDS: Record<string, string[]> = {
  head_mind:    ['head','mind','thoughts','confusion','memory','mental','migraine','dreams','nightmare','brain','cognitive','psychic','voices','hallucination'],
  eyes_vision:  ['eyes','vision','sight','blindness','deception','seeing','third eye','clairvoyance','darkness','light'],
  throat_voice: ['throat','voice','speech','tongue','silence','stuttering','lying','cursing','words','vocal'],
  heart_chest:  ['heart','chest','love','emotion','grief','sorrow','bitterness','fear','anxiety','heartbreak','rejection','loneliness'],
  stomach_gut:  ['stomach','gut','nausea','eating','appetite','gluttony','spirit','abdomen','food','digestive'],
  reproductive: ['sexual','reproductive','lust','perversion','womb','fertility','impurity','fornication','pornography','incubus','succubus'],
  hands_arms:   ['hands','arms','stealing','touching','violence','self-harm','cutting','strength','works'],
  legs_feet:    ['legs','feet','walking','restlessness','flight','running','escape','wandering','rebellion'],
  back_spine:   ['back','spine','burden','oppression','weight','pressure','stiffness','pride'],
  skin_body:    ['skin','body','appearance','shame','self-image','infirmity','disease','sickness','pain'],
}

function getRegionSuggestions(region: string, allDemonData: any[], activeSpirits: string[]): string[] {
  const keywords = REGION_KEYWORDS[region] || []
  const scores: Record<string, number> = {}
  for (const d of allDemonData) {
    if (activeSpirits.includes(d.name)) continue
    let score = 0
    keywords.forEach(kw => {
      const k = kw.toLowerCase()
      if (String(d.battlefield || d.primaryBattlefield || '').toLowerCase().includes(k)) score += 5
      if (String(d.symptoms || '').toLowerCase().includes(k)) score += 3
      if (String(d.manifestation || d.manifestations || '').toLowerCase().includes(k)) score += 2
      if (String(d.description || '').toLowerCase().includes(k)) score += 1
      if (d.name.toLowerCase().includes(k)) score += 1
    })
    if (score > 0) scores[d.name] = score
  }
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name]) => name)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: CORS })

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS })
  }

  const { action, data } = body || {}

  // ── 1. sequence ───────────────────────────────────────────────────────────
  if (action === 'sequence') {
    const { spirits = [], existingDemonData = [] } = data || {}
    if (!spirits.length) return new Response(JSON.stringify({ sequence: [] }), { status: 200, headers: CORS })

    const enriched = spirits.map((name: string) => {
      const demon = existingDemonData.find((d: any) => d.name?.toLowerCase() === name.toLowerCase()) || {}
      return {
        name,
        rank: demon.biblicalRank || demon.rank || 'Common Spirit',
        entryPoints: demon.entryPoints || '',
        companions: demon.companions || '',
        trauma: TRAUMA_SPIRITS.has(name.toLowerCase()),
      }
    })

    const sorted = [...enriched].sort((a, b) => {
      const aGate = GATEKEEPERS[a.name.toLowerCase()]
      const bGate = GATEKEEPERS[b.name.toLowerCase()]
      if (aGate !== undefined && bGate !== undefined) return aGate - bGate
      if (aGate !== undefined) return -1
      if (bGate !== undefined) return 1
      if (a.trauma && !b.trauma) return 1
      if (!a.trauma && b.trauma) return -1
      return rankSpirit(a.name, a.rank) - rankSpirit(b.name, b.rank)
    })

    const system = `You are a deliverance ministry strategist. Order spirits for a session using the given order as a base. For each spirit provide a brief tactical reasoning (1 sentence). Return JSON only.`
    const prompt = `Order these spirits for deliverance: ${sorted.map(s => s.name).join(', ')}. Return JSON array: [{name, rank, label, reasoning}] where label is one of: GATEKEEPER, PRINCIPALITY, POWER, STRONGMAN, CLUSTER, TRAUMA, ROOT SPIRIT, COMPANION. Keep original order — just add label and reasoning.`

    try {
      const text = await claudeCall('claude-haiku-4-5-20251001', system, prompt, 600)
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const sequence = JSON.parse(jsonMatch[0])
        return new Response(JSON.stringify({ sequence }), { status: 200, headers: CORS })
      }
    } catch {}

    const fallback = sorted.map(s => ({
      name: s.name,
      rank: s.rank,
      label: GATEKEEPERS[s.name.toLowerCase()] ? 'GATEKEEPER' : s.trauma ? 'TRAUMA' : s.rank.toUpperCase(),
      reasoning: '',
    }))
    return new Response(JSON.stringify({ sequence: fallback }), { status: 200, headers: CORS })
  }

  // ── 2. region_spirits ─────────────────────────────────────────────────────
  if (action === 'region_spirits') {
    const { region, activeSpirits = [], demonData = [] } = data || {}
    const suggestions = getRegionSuggestions(region, demonData, activeSpirits)
    return new Response(JSON.stringify({ suggestions }), { status: 200, headers: CORS })
  }

  // ── 3. expulsion_prayer ───────────────────────────────────────────────────
  if (action === 'expulsion_prayer') {
    const { spiritName, entryPoints, sessionContext } = data || {}
    const system = `You are a deliverance minister with deep knowledge of biblical authority and spiritual warfare. Write direct, authoritative expulsion prayers. Speak directly to the spirit. Use "I command", "In the name of Jesus", "by the blood of the Lamb". Be specific to the spirit's domain. 2-4 paragraphs maximum.`
    const prompt = `Write an expulsion prayer for the spirit of ${spiritName}. Entry points/legal grounds: ${entryPoints || 'not specified'}. Session context: ${sessionContext || 'standard deliverance session'}. Address the spirit directly with biblical authority. Close with a blessing filling prayer.`

    try {
      const prayer = await claudeCall('claude-haiku-4-5-20251001', system, prompt, 500)
      return new Response(JSON.stringify({ prayer }), { status: 200, headers: CORS })
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS })
    }
  }

  // ── 4. ai_suggestion ─────────────────────────────────────────────────────
  if (action === 'ai_suggestion') {
    const { recentLogs = [], activeSpirit, manifestations = [] } = data || {}
    const system = `You are a seasoned deliverance minister and tactical advisor. Analyze what's happening in a live session and suggest the minister's next best action. Be concise and practical. Cite Win Worley, Frank Hammond, or scripture when relevant.`
    const prompt = `Active spirit: ${activeSpirit || 'unknown'}
Recent log entries: ${recentLogs.slice(-5).join(' | ')}
Manifestations: ${manifestations.join(', ') || 'none reported'}

Suggest the most tactically sound next action for the minister. Respond in 2-3 sentences. Include a source citation if relevant (Win Worley / Pigs in the Parlor, Frank Hammond, scripture ref).`

    try {
      const text = await claudeCall('claude-haiku-4-5-20251001', system, prompt, 300)
      const suggestion = text.trim()
      const sourceMatch = suggestion.match(/(Win Worley|Frank Hammond|Pigs in the Parlor|[A-Z][a-z]+ \d+:\d+)/)
      return new Response(JSON.stringify({
        suggestion,
        action: 'observe',
        source: sourceMatch?.[0] || 'WRI Protocol',
      }), { status: 200, headers: CORS })
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS })
    }
  }

  // ── 5. transcribe_note ────────────────────────────────────────────────────
  if (action === 'transcribe_note') {
    const { type, content, mimeType } = data || {}

    if (type === 'photo') {
      const system = `You are a session recorder for a deliverance ministry. Extract all text, names, and observations from this handwritten or typed note. Structure the output as: spirits mentioned, manifestations observed, breakthroughs, and any other notes. Be thorough.`
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_KEY(),
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 800,
            system,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: content } },
                { type: 'text', text: 'Extract and structure all information from this ministry note.' },
              ],
            }],
          }),
          signal: AbortSignal.timeout(30000),
        })
        if (!res.ok) throw new Error(`Claude vision error ${res.status}`)
        const result = await res.json()
        const transcript = result.content?.[0]?.text || ''
        return new Response(JSON.stringify({ transcript, structured: { raw: transcript } }), { status: 200, headers: CORS })
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS })
      }
    }

    if (type === 'audio') {
      try {
        const audioBuffer = Buffer.from(content, 'base64')
        const formData = new FormData()
        const blob = new Blob([audioBuffer], { type: mimeType || 'audio/wav' })
        formData.append('file', blob, 'recording.wav')
        formData.append('model', 'whisper-1')
        formData.append('response_format', 'text')

        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${OPENAI_KEY()}` },
          body: formData,
          signal: AbortSignal.timeout(30000),
        })
        if (!res.ok) throw new Error(`Whisper error ${res.status}`)
        const transcript = await res.text()
        return new Response(JSON.stringify({ transcript, structured: { raw: transcript } }), { status: 200, headers: CORS })
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS })
      }
    }

    return new Response(JSON.stringify({ error: 'type must be photo or audio' }), { status: 400, headers: CORS })
  }

  // ── 6. session_report ────────────────────────────────────────────────────
  if (action === 'session_report') {
    const { session } = data || {}
    const system = `You are a deliverance ministry recorder. Compile a formal session report from the data provided. Format it clearly for a minister's records. Use professional, pastoral language. No em dashes.`
    const prompt = `Compile a session report:
Subject: ${session.subject_alias} - Session #${session.session_number}
Team: ${JSON.stringify(session.team_members)}
Phases completed: ${JSON.stringify(session.completed_phases)}
Spirit sequence: ${JSON.stringify(session.spirit_sequence?.map((s: any) => ({ name: s.name, status: s.status, breakthroughLevel: s.breakthroughLevel })))}
Log entries: ${JSON.stringify(session.log_entries?.slice(-30))}
Duration: ${Math.round((session.total_elapsed_seconds || 0) / 60)} minutes

Write a structured session report with sections: Summary, Team Present, Pre-Session Status, Spirits Addressed, Breakthroughs, Areas Needing Follow-Up, Aftercare Recommendations.`

    try {
      const report = await claudeCall('claude-sonnet-4-20250514', system, prompt, 1500)
      return new Response(JSON.stringify({ report }), { status: 200, headers: CORS })
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS })
    }
  }

  return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: CORS })
}

export const config = { path: '/api/session-ai' }
