import { createClient } from '@supabase/supabase-js'

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const CATEGORIES = [
  'Spiritual Warfare',
  'Deliverance Ministry',
  'Inspirational / Faith',
  'Prayer & Intercession',
  'Ministry Training',
  'Devotional',
  "Men's Ministry",
  'Healing & Wholeness',
  'Generational / Bloodline',
  'Scripture Study',
]

async function resolveMinister(token: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return false
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return false
    const data = await res.json()
    return data?.public_metadata?.role === 'minister'
  } catch { return false }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: HEADERS })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
  }

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  const ok = await resolveMinister(token)
  if (!ok) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: HEADERS })

  let formData: FormData
  try { formData = await req.formData() } catch {
    return new Response(JSON.stringify({ error: 'Invalid form data' }), { status: 400, headers: HEADERS })
  }

  const file = formData.get('file') as File | null
  if (!file) return new Response(JSON.stringify({ error: 'file is required' }), { status: 400, headers: HEADERS })

  const rawName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ')
  const cleanTitle = rawName.replace(/^WRI[_\s]R?\d+[_\s]/i, '').replace(/\b\w/g, c => c.toUpperCase()).trim()

  const fileBuffer = await file.arrayBuffer()
  const snippet = new TextDecoder('utf-8', { fatal: false }).decode(fileBuffer.slice(0, 8000)).slice(0, 3000)

  const prompt = `You are an assistant for a Christian deliverance ministry arsenal. Given a sermon or teaching PDF filename and optional content snippet, return a JSON object.

Filename: ${file.name}
Content preview:
${snippet}

Return exactly this JSON structure (no markdown, no preamble):
{
  "title": "Clean readable title derived from the filename — remove underscores, extensions, WRI_R01-style prefixes",
  "author": "Author name if detectable from filename or content, otherwise empty string",
  "description": "2-3 sentence summary of what this resource covers, written for a deliverance minister audience",
  "category": "Pick exactly one from: ${CATEGORIES.join(', ')}",
  "tier": "Pick one from: watchman, soldier, commander, general — default watchman unless content is clearly advanced",
  "spirit_tags": ["Array of spirit/demon names mentioned or implied, e.g. Jezebel, Fear, Python — empty array if none"]
}

Return only valid JSON.`

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (aiRes.ok) {
      const aiData = await aiRes.json()
      const text = aiData.content?.[0]?.text || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      return new Response(JSON.stringify(parsed), { status: 200, headers: HEADERS })
    }
  } catch (e: any) {
    console.error('[arsenal-autofill] AI error:', e.message)
  }

  // Fallback
  return new Response(JSON.stringify({
    title: cleanTitle,
    author: '',
    description: '',
    category: 'Spiritual Warfare',
    tier: 'watchman',
    spirit_tags: [],
  }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/arsenal-autofill' }
