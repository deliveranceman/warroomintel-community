import Anthropic from '@anthropic-ai/sdk'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

async function resolveAdminOrMinister(token: string): Promise<{ ok: boolean; reason: string }> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return { ok: false, reason: 'Invalid JWT' }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return { ok: false, reason: 'No userId in token' }

    const clerkRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!clerkRes.ok) return { ok: false, reason: `Clerk error ${clerkRes.status}` }
    const clerkUser = await clerkRes.json()
    const role = clerkUser?.public_metadata?.role
    if (role !== 'admin' && role !== 'minister') {
      return { ok: false, reason: `Forbidden — admin or minister role required (got: ${role ?? 'none'})` }
    }
    return { ok: true, reason: '' }
  } catch (e: unknown) {
    return { ok: false, reason: e instanceof Error ? e.message : 'Auth error' }
  }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
  }

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  }

  const auth = await resolveAdminOrMinister(token)
  if (!auth.ok) {
    const status = auth.reason.startsWith('Forbidden') ? 403 : 401
    return new Response(JSON.stringify({ error: auth.reason }), { status, headers: HEADERS })
  }

  let body: { title?: string; summary?: string; type?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: HEADERS })
  }

  const { title, summary, type } = body
  if (!title || !summary) {
    return new Response(JSON.stringify({ error: 'title and summary are required' }), { status: 400, headers: HEADERS })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system:
      'You are a ministry content writer for War Room Intel, a spiritual warfare and deliverance ministry platform operated by Pastor Justin Payne at Staffordtown Church in Copperhill, TN. Write authoritative, scripturally grounded content for active deliverance ministers. Use a serious, tactical, militaristic tone. Spiritual warfare is real and eternal stakes are high. Always reference Scripture by book, chapter, and verse. Structure in clear Markdown headers.',
    messages: [
      {
        role: 'user',
        content: `Write a complete Field Manual entry in Markdown for:\n\nTitle: ${title}\n\nSummary: ${summary}${type ? `\n\nType: ${type}` : ''}\n\nInclude: theological framework section, key scriptures (at least 5), signs and manifestations, legal ground analysis, step-by-step ministry protocol, assessment questions for the minister to ask, and closing prayer declarations. Minimum 700 words.`,
      },
    ],
  })

  const content = message.content[0]?.type === 'text' ? message.content[0].text : ''

  return new Response(JSON.stringify({ content }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/admin-content-ai' }
