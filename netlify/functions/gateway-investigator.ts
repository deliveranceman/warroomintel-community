import { getMinistryContext } from '../lib/getMinistryContext'
import { checkAndIncrementUsage, getUpgradeMessage } from '../lib/ai-rate-limit'
import { cleanAIOutput } from '../lib/clean-ai-output'

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!
const BASE_ID        = 'appVXEj2DLPBTJTtD'
const TABLE_ID       = 'tblcP4lgVykzOhLi4'
const NAME_FIELD     = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

async function resolveUser(token: string): Promise<{ ok: boolean; tier: string; userId: string }> {
  try {
    if (!token || token.split('.').length !== 3) return { ok: false, tier: '', userId: '' }
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return { ok: false, tier: '', userId: '' }
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return { ok: false, tier: '', userId: '' }
    const data = await res.json()
    const role = data?.public_metadata?.role
    const tier = data?.public_metadata?.tier || ''
    const tierLevel = (t: string) => ({ free: 0, watchman: 0, soldier: 1, commander: 2, general: 3 }[t?.toLowerCase()] ?? 0)
    const hasAccess = role === 'minister' || tierLevel(tier) >= 1
    return { ok: hasAccess, tier, userId }
  } catch { return { ok: false, tier: '', userId: '' } }
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
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return ''
    const data = await res.json()
    const rec = data.records?.[0]
    if (!rec) return ''
    const f = rec.fields || {}
    const parts: string[] = []
    if (f['Description'])    parts.push(`Description: ${String(f['Description']).slice(0, 300)}`)
    if (f['Manifestiation']) parts.push(`Manifestations: ${String(f['Manifestiation']).slice(0, 200)}`)
    if (f['Kingdom'])        parts.push(`Kingdom: ${f['Kingdom']}`)
    if (f['Biblical Rank'])  parts.push(`Biblical Rank: ${f['Biblical Rank']}`)
    if (f['Sub-Kingdom'])    parts.push(`Sub-Kingdom: ${f['Sub-Kingdom']}`)
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
  const subject = spiritName || personContext.slice(0, 60) || 'General Analysis'

  const systemPrompt = `You are a spiritual warfare intelligence system specializing in demonic gateway analysis for deliverance ministers.
You MUST respond with ONLY a valid JSON object.
Do NOT include any text before or after the JSON.
Do NOT use markdown code fences.
Start your response with { and end with }.`

  const userPrompt = `Analyze the demonic gateways and entry points for this case.
${spiritName ? `Spirit/demon: ${spiritName}` : ''}
${dbContext ? `Database intel on this spirit:\n${dbContext}` : ''}
${personContext ? `Cultural exposure or session context: ${personContext}` : ''}

Return this exact JSON structure:
{
  "spirit": "${subject}",
  "summary": "2-3 sentence executive summary of the gateway profile for a deliverance minister",
  "sections": [
    {
      "title": "Primary Entry Points",
      "items": ["specific entry point 1", "specific entry point 2", "specific entry point 3"]
    },
    {
      "title": "Legal Grounds",
      "items": ["legal ground 1 — sin, trauma, vow, or ancestral tie", "legal ground 2"]
    },
    {
      "title": "Generational Patterns",
      "items": ["family pattern 1", "family pattern 2"]
    },
    {
      "title": "Cultural and Exposure Gateways",
      "items": ["specific media/music/game/book title and explanation", "specific subculture or practice"]
    },
    {
      "title": "Session Questions",
      "items": ["Have you ever...? (specific intake question)", "Did you or a family member...? (specific question)", "Were you exposed to...? (specific question)", "Have you participated in...?", "Did you experience...?"]
    },
    {
      "title": "Recommended Deliverance Sequence",
      "items": ["Step 1: confess and renounce...", "Step 2: break legal ground of...", "Step 3: command the spirit of... to go"]
    }
  ]
}

Rules:
- Each section must have 3-6 specific items — no vague generalities
- Name actual titles, artists, practices, and communities by name
- Session questions must reference specific things the person may have been exposed to
- Return ONLY the JSON. Nothing else.`

  const ministryContext = await getMinistryContext()
  const effectiveSystem = ministryContext ? `${ministryContext}\n\n---\n\n${systemPrompt}` : systemPrompt

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: effectiveSystem,
      messages: [{ role: 'user', content: userPrompt }],
    }),
    signal: AbortSignal.timeout(25000),
  })

  if (!res.ok) throw new Error(`Claude error ${res.status}`)
  const data = await res.json()
  const rawText = cleanAIOutput((data.content?.[0]?.text || '').trim())

  console.log('[GATEWAY] Raw Claude response (first 1000 chars):')
  console.log(rawText.slice(0, 1000))
  console.log('[GATEWAY] Response length:', rawText.length)

  // Strategy 1: direct parse
  let result: any = null
  try {
    result = JSON.parse(rawText)
    console.log('[GATEWAY] Parse strategy 1 succeeded (direct)')
  } catch {}

  // Strategy 2: strip markdown fences
  if (!result) {
    try {
      const stripped = rawText
        .replace(/^```json\s*/im, '')
        .replace(/^```\s*/im, '')
        .replace(/```\s*$/im, '')
        .trim()
      result = JSON.parse(stripped)
      console.log('[GATEWAY] Parse strategy 2 succeeded (fence strip)')
    } catch {}
  }

  // Strategy 3: extract first {...} block
  if (!result) {
    try {
      const match = rawText.match(/\{[\s\S]*\}/)
      if (match) {
        result = JSON.parse(match[0])
        console.log('[GATEWAY] Parse strategy 3 succeeded (brace extract)')
      }
    } catch {}
  }

  // Strategy 4: build minimal valid response from plain text
  if (!result) {
    console.error('[GATEWAY] All parse strategies failed. Raw:', rawText.slice(0, 500))
    result = {
      spirit: subject,
      summary: 'Analysis complete — see content below.',
      sections: [
        {
          title: 'Gateway Analysis',
          items: [rawText],
        },
      ],
    }
  }

  return result
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

  const auth = await resolveUser(token)
  if (!auth.ok) return new Response(JSON.stringify({ error: 'Soldier tier or higher required' }), { status: 403, headers })

  const usage = await checkAndIncrementUsage(auth.userId, auth.tier || 'watchman', 'gateway')
  if (!usage.allowed) {
    return new Response(JSON.stringify({ error: getUpgradeMessage(auth.tier || 'watchman', 'gateway'), rateLimited: true, limit: usage.limit, remaining: 0 }), { status: 429, headers })
  }

  let body: any
  try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers }) }

  const { spiritName = '', personContext = '' } = body || {}
  if (!spiritName?.trim() && !personContext?.trim()) {
    return new Response(JSON.stringify({ error: 'Provide a spirit name, cultural exposure context, or both.' }), { status: 400, headers })
  }

  try {
    const dbContext = spiritName?.trim() ? await fetchSpiritContext(spiritName.trim()) : ''
    const report = await callClaude(spiritName?.trim() || '', dbContext, personContext?.trim() || '')
    return new Response(JSON.stringify(report), { status: 200, headers })
  } catch (e: any) {
    console.error('[gateway-investigator] Error:', e.message)
    return new Response(JSON.stringify({ error: e.message || 'Investigation failed' }), { status: 500, headers })
  }
}

export const config = { path: '/api/gateway-investigator' }
