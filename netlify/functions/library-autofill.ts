const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function getUserId(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return payload.sub || null
  } catch { return null }
}

export default async function handler(req: Request) {
  console.log('[library-autofill] called:', req.method)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS })

  const authHeader = req.headers.get('authorization')
  const userId = getUserId(authHeader)
  console.log('[library-autofill] userId:', userId, 'hasAuth:', !!authHeader)
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized — valid Clerk JWT required' }), { status: 401, headers: CORS })

  // Auth check: require only a valid Clerk userId — no role restriction
  // (minister check removed; any authenticated user may call this endpoint)

  const body = await req.json().catch(() => ({}))
  const { filename, contentSnippet } = body as { filename?: string; contentSnippet?: string }
  if (!filename) return new Response(JSON.stringify({ error: 'filename required' }), { status: 400, headers: CORS })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[library-autofill] ANTHROPIC_API_KEY is not set')
    return new Response(JSON.stringify({ error: 'Server configuration error: ANTHROPIC_API_KEY is missing' }), { status: 500, headers: CORS })
  }

  const snippetBlock = contentSnippet?.trim()
    ? `\n\nFile content (first ~2000 chars):\n"""\n${contentSnippet.slice(0, 2000)}\n"""`
    : ''

  const prompt = `Based on this filename${snippetBlock ? ' and content excerpt' : ''}, identify the book. Return ONLY valid JSON with these exact fields (no markdown, no explanation):
{"title": "full book title", "author": "author full name", "notes": "1-2 sentence description relevant to deliverance ministry"}

Filename: "${filename}"${snippetBlock}

Rules:
- Clean underscores/hyphens in filename to produce a readable title
- If author is uncertain, return null for author
- Use proper title case, remove file extension from title
- notes should describe the book's relevance to spiritual warfare or deliverance ministry
- If you don't recognize the book, set notes to null`

  let anthropicRes: Response
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
  } catch (fetchErr: any) {
    console.error('[library-autofill] fetch to Anthropic threw:', fetchErr?.message)
    return new Response(JSON.stringify({ error: `Network error calling Anthropic: ${fetchErr?.message}` }), { status: 500, headers: CORS })
  }

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text()
    console.error('[library-autofill] Anthropic error:', anthropicRes.status, errText)
    return new Response(JSON.stringify({ error: `Anthropic API error ${anthropicRes.status}: ${errText.slice(0, 300)}` }), { status: 500, headers: CORS })
  }

  const data = await anthropicRes.json()
  const raw = data.content?.[0]?.text?.trim() || ''
  console.log('[library-autofill] raw response:', raw)

  let title: string | null = null
  let author: string | null = null
  let notes: string | null = null
  try {
    const parsed = JSON.parse(raw)
    title = parsed.title || null
    author = parsed.author || null
    notes = parsed.notes || null
  } catch {
    title = filename.replace(/\.(pdf|txt|docx?)$/i, '').replace(/[_-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
  }

  return new Response(JSON.stringify({ title, author, notes }), { status: 200, headers: CORS })
}

export const config = { path: '/api/library-autofill' }
