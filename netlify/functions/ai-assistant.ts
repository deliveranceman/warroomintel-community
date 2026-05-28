const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

const SYSTEM_PROMPT = `You are the War Room Intel AI — a spiritual warfare intelligence assistant for deliverance ministers. You have deep knowledge of demonic hierarchies, spiritual warfare, deliverance protocols, biblical authority, and ministry strategy. Be direct, tactical, and grounded in scripture. Speak like a seasoned deliverance minister — authoritative but pastoral.`

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: CORS })

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS })
  }

  const { message, history = [] } = body || {}
  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: 'message required' }), { status: 400, headers: CORS })
  }

  const messages = [
    ...history.filter((m: any) => m.role && m.content).map((m: any) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message.trim() },
  ]

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages,
    }),
    signal: AbortSignal.timeout(25000),
  })

  if (!res.ok) {
    return new Response(JSON.stringify({ error: `AI error ${res.status}` }), { status: 502, headers: CORS })
  }

  const data = await res.json()
  const response = data.content?.[0]?.text || ''
  return new Response(JSON.stringify({ response }), { status: 200, headers: CORS })
}

export const config = { path: '/api/ai-assistant' }
