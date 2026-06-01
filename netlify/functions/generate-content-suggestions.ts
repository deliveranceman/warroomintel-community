import { createClient } from '@supabase/supabase-js'
import { generateSuggestions } from './scheduled-content-suggestions'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

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

function getMondayDate(): string {
  const now = new Date()
  const day = now.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() + diff)
  return monday.toISOString().slice(0, 10)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  const isMinister = await resolveMinister(token)
  if (!isMinister) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: HEADERS })

  const body = await req.json().catch(() => ({}))
  const topic: string | undefined = body.topic || undefined
  const weekOf = getMondayDate()

  const suggestions = await generateSuggestions(topic)

  const client = sb()
  const rows = suggestions.map((s: any) => ({
    week_of: weekOf,
    content_type: s.content_type,
    title: s.title,
    summary: s.summary,
    full_draft: s.full_draft || null,
    suggested_tier: s.suggested_tier || 'watchman',
    status: 'pending',
    created_by: 'ai-agent',
  }))

  const { data, error } = await client.from('content_suggestions').insert(rows).select('id, title, content_type')
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })

  return new Response(JSON.stringify({ success: true, count: suggestions.length, suggestions: data }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/generate-content-suggestions' }
