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

  // Auth: require only a valid Clerk userId — no role restriction
  const authHeader = req.headers.get('authorization')
  const userId = getUserId(authHeader)
  console.log('[library-autofill] userId:', userId, 'hasAuth:', !!authHeader)
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized — valid Clerk JWT required' }), { status: 401, headers: CORS })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[library-autofill] ANTHROPIC_API_KEY is not set')
    return new Response(JSON.stringify({ error: 'Server configuration error: ANTHROPIC_API_KEY is missing' }), { status: 500, headers: CORS })
  }

  const body = await req.json().catch(() => ({}))
  const { filename, contentSnippet } = body as { filename?: string; contentSnippet?: string }
  if (!filename) return new Response(JSON.stringify({ error: 'filename required' }), { status: 400, headers: CORS })

  const snippetBlock = contentSnippet?.trim()
    ? `\n\nFile content (first ~2000 chars):\n"""\n${contentSnippet.slice(0, 2000)}\n"""`
    : ''

  const prompt = `Based on this filename${snippetBlock ? ' and content excerpt' : ''}, identify the book and return metadata. Return ONLY valid JSON — no markdown, no explanation, no code fences.

Filename: "${filename}"${snippetBlock}

Return this exact JSON shape:
{
  "title": "full book title in proper title case, no file extension",
  "author": "author full name, or null if uncertain",
  "notes": "1-2 sentences describing the book's relevance to deliverance ministry or spiritual warfare, or null if unrecognised",
  "topic": "ministry-library",
  "spirit_tags": ["Spirit1", "Spirit2"]
}

Rules:
- Clean underscores/hyphens in filename to produce a readable title
- Use proper title case; remove file extension from title
- topic is always "ministry-library"

SPIRIT TAGS — CRITICAL RULES:
You MUST return specific NAMED spirits only — never categories or concepts.

GOOD examples (use these): Leviathan, Jezebel, Baal, Python, Ahab, Fear, Rejection, Pride,
  Lust, Death, Witchcraft, Control, Deception, Bitterness, Rebellion, Infirmity, Shame,
  Unforgiveness, Perversion, Confusion, Wormwood, Apollyon, Dagon, Molech, Asherah, Belial,
  Marine spirits, Freemasonry, Occult, Python spirit, Spirit of Fear, Spirit of Death.

BAD examples — NEVER use these category/concept words:
  "Demons", "Territorial Spirits", "Supernatural Forces", "Evil Spirits",
  "Demonic Forces", "Dark Forces", "Spiritual Entities", "Evil Forces",
  "Spiritual Forces", "Principalities", "Powers", "Evil Beings".

RULES:
- If the filename itself contains a spirit name (e.g. "BAAL", "jezebel", "marine"), ALWAYS include it.
- If a spirit has a compound name like "Spirit of Fear" or "Marine Spirits", include the full compound name.
- Return empty array [] if no specifically named spirits are found — do NOT return generic category words.
- Maximum 10 entries. Return proper case (e.g. "Baal", "Jezebel", "Leviathan").`

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
        max_tokens: 400,
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
  let topic = 'ministry-library'
  let spirit_tags: string[] = []

  try {
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```[\w]*\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    title       = parsed.title  || null
    author      = parsed.author || null
    notes       = parsed.notes  || null
    topic       = parsed.topic  || 'ministry-library'
    spirit_tags = Array.isArray(parsed.spirit_tags)
      ? parsed.spirit_tags.filter((t: any) => typeof t === 'string' && t.trim()).slice(0, 10)
      : []
  } catch {
    // Fallback: derive title from filename, leave other fields empty
    title = filename
      .replace(/\.(pdf|txt|docx?)$/i, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase())
  }

  console.log('[library-autofill] parsed — title:', title, 'spirit_tags:', spirit_tags)
  return new Response(JSON.stringify({ title, author, notes, topic, spirit_tags }), { status: 200, headers: CORS })
}

export const config = { path: '/api/library-autofill' }
