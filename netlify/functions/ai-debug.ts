export default async (req: Request) => {
  const key = process.env.ANTHROPIC_API_KEY || ''

  const controller = new AbortController()
  setTimeout(() => controller.abort(), 24000)

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: 'Return ONLY valid JSON, no markdown. Example: {"test": "value"}',
        messages: [{
          role: 'user',
          content: 'Return this exact JSON: {"biblicalRank": "Principality", "caseType": "Territorial Strongman", "phonetic": "BAY-al", "isGenerational": true, "isTerritorial": true, "sessionIndicators": "Manifestation of pride and false authority", "clusterSpirits": "Jezebel, Ahab, Ashtoreth", "resistanceSignature": "Denies lordship of Christ", "legalRights": "Idol worship, Freemasonry, sexual sin", "etymologyNotes": "From Hebrew ba-al meaning lord or master"}',
        }],
      }),
      signal: controller.signal,
    })

    const data = await res.json()
    const rawText = data.content?.[0]?.text || ''

    let parsed: Record<string, any> = {}
    try { parsed = JSON.parse(rawText) } catch {}

    return new Response(JSON.stringify({
      status: res.status,
      rawText,
      rawTextLength: rawText.length,
      parsed,
      parsedKeys: Object.keys(parsed),
      stopReason: data.stop_reason,
      usage: data.usage,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}

export const config = { path: '/api/ai-debug' }
