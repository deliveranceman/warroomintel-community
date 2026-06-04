const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

const TIER_LEVELS: Record<string, number> = { free: 0, watchman: 0, soldier: 1, commander: 2, general: 3, minister: 4 }

function getTierLevel(tier: string) { return TIER_LEVELS[tier?.toLowerCase()] ?? 0 }

async function resolveUser(token: string): Promise<{ userId: string; name: string; tier: string } | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return null
    // Read tier from JWT — never gate on Clerk availability
    const jwtMeta = payload?.publicMetadata || payload?.public_metadata || {}
    let tier = (jwtMeta.tier as string) || (jwtMeta.role === 'minister' ? 'minister' : 'watchman')
    let name = 'Minister'
    try {
      const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
      })
      if (res.ok) {
        const data = await res.json()
        name = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.username || name
        tier = (data.public_metadata?.tier as string) || (data.public_metadata?.role === 'minister' ? 'minister' : tier)
      }
    } catch {}
    return { userId, name, tier }
  } catch { return null }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })

  const user = await resolveUser(token)
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  if (getTierLevel(user.tier) < 2) return new Response(JSON.stringify({ error: 'Commander tier required' }), { status: 403, headers: HEADERS })

  let body: any = {}
  try { body = await req.json() } catch {}

  const {
    mode = 'spirit',
    spiritData,
    spiritName: bodySpitName = '',
    spiritNames = [],
    includeCluster = true,
    manifestationDescription = '',
    manifestationCandidates = [],
  } = body

  const primaryName = spiritData?.name || bodySpitName || manifestationCandidates?.[0]?.name || 'Unknown Spirit'

  const contextBlock = mode === 'spirit'
    ? `Spirit: "${primaryName}"
${includeCluster && spiritNames.length ? `Cluster spirits: ${spiritNames.join(', ')}` : ''}
${spiritData?.description ? `Description: ${spiritData.description}` : ''}
${spiritData?.manifestation ? `Manifestations: ${spiritData.manifestation}` : ''}`
    : `Symptom investigation — probable spirits: ${(manifestationCandidates as any[]).map((s: any) => s.name).join(', ')}
Symptoms presented: ${manifestationDescription}`

  const userPrompt = `Generate a complete deliverance session protocol.

${contextBlock}

Respond with ONLY this JSON structure (no markdown, no explanation):
{
  "preSessionIntel": {
    "summary": "2-3 sentence operational overview for the minister",
    "keyLegalGrounds": ["ground 1", "ground 2", "ground 3"],
    "keyScriptures": ["Book X:Y — brief quote", "Book X:Y — brief quote"],
    "warningFlags": ["warning 1", "warning 2"]
  },
  "legalGroundChecklist": [
    {"ground": "Ground name", "question": "Diagnostic question to ask", "scripture": "Book X:Y"}
  ],
  "renunciationPrayers": [
    {"title": "Prayer title", "prayer": "Full prayer text (first person — I renounce...)", "notes": "Brief minister notes"}
  ],
  "commandPrayers": [
    {"target": "Spirit name", "command": "Full command prayer (authoritative minister voice)", "authority": "Scripture reference"}
  ],
  "aftercare": {
    "initialSteps": ["Step 1", "Step 2", "Step 3"],
    "dailyPractices": ["Practice 1", "Practice 2"],
    "warningSignsToWatch": ["Sign 1"],
    "followUpQuestions": ["Question 1"]
  }
}

Requirements: 3-5 legal grounds, 2-3 renunciation prayers, 2-3 command prayers, practical aftercare.`

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        system: 'You are a seasoned deliverance ministry protocol generator. Generate scripture-grounded, minister-ready protocols. Respond with valid JSON only — no markdown, no explanation.',
        messages: [{ role: 'user', content: userPrompt }],
      }),
      signal: AbortSignal.timeout(20_000),
    })

    if (!aiRes.ok) {
      const err = await aiRes.text()
      console.error('[deliverance-protocol] Anthropic error:', aiRes.status, err.slice(0, 200))
      return new Response(JSON.stringify({ error: 'AI call failed', detail: err.slice(0, 200) }), { status: 502, headers: HEADERS })
    }

    const aiData = await aiRes.json() as any
    const responseText = aiData.content?.find((b: any) => b.type === 'text')?.text ?? ''
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const protocol = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify({ protocol, arsenalResources: [], spiritData: spiritData || null }), { headers: HEADERS })
  } catch (e: any) {
    console.error('[deliverance-protocol] Error:', e.message)
    return new Response(JSON.stringify({ error: e.message || 'Protocol generation failed' }), { status: 500, headers: HEADERS })
  }
}

export const config = { path: '/api/deliverance-protocol' }
