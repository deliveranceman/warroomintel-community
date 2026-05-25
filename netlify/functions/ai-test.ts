export default async (req: Request) => {
  const key = process.env.ANTHROPIC_API_KEY || 'MISSING'
  const clerkKey = process.env.CLERK_SECRET_KEY || 'MISSING'

  // Test Anthropic directly
  let anthropicResult = 'not tested'
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-3-5-20241022',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Say: WORKING' }],
      }),
    })
    const data = await res.json()
    anthropicResult = `status:${res.status} text:${data.content?.[0]?.text || JSON.stringify(data)}`
  } catch(e: any) {
    anthropicResult = `error:${e.message}`
  }

  return new Response(JSON.stringify({
    anthropicKeyPrefix: key.slice(0, 20),
    clerkKeyPrefix: clerkKey.slice(0, 20),
    anthropicResult,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

export const config = { path: '/api/ai-test' }
