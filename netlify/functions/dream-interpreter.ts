import { getMinistryContext } from '../lib/getMinistryContext'
import { checkAndIncrementUsage, getUpgradeMessage } from '../lib/ai-rate-limit'
import { cleanAIOutput } from '../lib/clean-ai-output'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}
const { url: _sbUrl, serviceRoleKey: _sbKey } = JSON.parse(process.env.SUPABASE || '{}')

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
    const lvl = (t: string) => ({ free: 0, watchman: 0, soldier: 1, commander: 2, general: 3, minister: 99 }[t?.toLowerCase()] ?? 0)
    return { ok: role === 'minister' || lvl(tier) >= 1, tier, userId }
  } catch { return { ok: false, tier: '', userId: '' } }
}

async function callClaude(dreamDescription: string, dreamerContext: string): Promise<any> {
  const systemPrompt = `You are a prophetic and spiritual dream interpreter for deliverance ministers.
You analyze dreams through three lenses:
1. Biblical/Prophetic — what God may be communicating through symbols and narrative; specific Scripture references
2. Spiritual Warfare — demonic assignments, open doors, or strongholds revealed in the dream
3. Soulical/Trauma — unresolved wounds, fears, or soul wounds manifesting symbolically

You draw from Scripture, prophetic tradition, and deliverance ministry practice.
You name spirits, legal grounds, and Scripture references specifically — no vague generalities.
You MUST respond with ONLY a valid JSON object.
Do NOT include any text before or after the JSON.
Do NOT use markdown code fences.
Start your response with { and end with }.`

  const userPrompt = `Analyze this dream from a deliverance ministry perspective.

Dream: ${dreamDescription}
${dreamerContext ? `\nDreamer context: ${dreamerContext}` : ''}

Return this exact JSON structure:
{
  "verdict": "prophetic" | "warning" | "deliverance" | "trauma" | "mixed",
  "summary": "2-3 sentence executive summary for a deliverance minister — what is happening spiritually",
  "sections": [
    {
      "title": "Key Symbols",
      "items": ["Symbol — Biblical/spiritual meaning with Scripture if applicable", "Symbol 2 — meaning"]
    },
    {
      "title": "Prophetic Message",
      "items": ["Specific message, direction, or confirmation God may be communicating", "Scripture reference and application: Book Chapter:Verse — quote"]
    },
    {
      "title": "Warfare Indicators",
      "items": ["Specific demonic assignment or open door identified in the dream", "Legal ground, stronghold, or spirit named (if applicable)"]
    },
    {
      "title": "Prayer Response",
      "items": ["Declaration: specific proclamation to make over this person", "Renunciation: specific thing to renounce if warfare element present", "Scripture to stand on: Book Chapter:Verse — quote"]
    },
    {
      "title": "Follow-Up Questions",
      "items": ["Specific intake question based on dream content", "Pattern question: Is there a recurring...?"]
    }
  ]
}

Rules:
- Name specific Scripture by Book Chapter:Verse
- Name specific spirits if indicated
- Keep verdict to one of the five exact values
- Each section must have 2-5 specific, actionable items
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
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: effectiveSystem,
      messages: [{ role: 'user', content: userPrompt }],
    }),
    signal: AbortSignal.timeout(25000),
  })

  if (!res.ok) throw new Error(`Claude error ${res.status}`)
  const data = await res.json()
  const rawText = cleanAIOutput((data.content?.[0]?.text || '').trim())

  let result: any = null

  try { result = JSON.parse(rawText) } catch {}

  if (!result) {
    try {
      const stripped = rawText
        .replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/```\s*$/im, '').trim()
      result = JSON.parse(stripped)
    } catch {}
  }

  if (!result) {
    try {
      const match = rawText.match(/\{[\s\S]*\}/)
      if (match) result = JSON.parse(match[0])
    } catch {}
  }

  if (!result) {
    result = {
      verdict: 'mixed',
      summary: 'Analysis complete — see content below.',
      sections: [{ title: 'Dream Analysis', items: [rawText] }],
    }
  }

  return result
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })

  const auth = await resolveUser(token)
  if (!auth.ok) return new Response(JSON.stringify({ error: 'Soldier tier or higher required' }), { status: 403, headers: HEADERS })

  const usage = await checkAndIncrementUsage(auth.userId, auth.tier || 'watchman', 'dream')
  if (!usage.allowed) {
    return new Response(JSON.stringify({ error: getUpgradeMessage(auth.tier || 'watchman', 'dream'), rateLimited: true, limit: usage.limit, remaining: 0 }), { status: 429, headers: HEADERS })
  }

  let body: any
  try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS }) }

  const { dreamDescription = '', dreamerContext = '' } = body || {}
  if (!dreamDescription?.trim()) {
    return new Response(JSON.stringify({ error: 'dreamDescription is required' }), { status: 400, headers: HEADERS })
  }
  if (dreamDescription.trim().length < 20) {
    return new Response(JSON.stringify({ error: 'Please describe the dream in more detail (at least 20 characters).' }), { status: 400, headers: HEADERS })
  }

  try {
    const report = await callClaude(dreamDescription.trim(), dreamerContext?.trim() || '')

    if (auth.userId && _sbUrl && _sbKey) {
      fetch(`${_sbUrl}/rest/v1/ai_search_history`, {
        method: 'POST',
        headers: { apikey: _sbKey, Authorization: `Bearer ${_sbKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: auth.userId, tool: 'dream-interpreter', query: dreamDescription.trim().slice(0, 500), response: JSON.stringify(report).slice(0, 1000), context: {} }),
      }).catch(() => {})
    }

    return new Response(JSON.stringify(report), { status: 200, headers: HEADERS })
  } catch (e: any) {
    console.error('[dream-interpreter] Error:', e.message)
    return new Response(JSON.stringify({ error: e.message || 'Interpretation failed' }), { status: 500, headers: HEADERS })
  }
}

export const config = { path: '/api/dream-interpreter' }
