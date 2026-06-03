import { createClient } from '@supabase/supabase-js'
import { buildDailyBrief } from './scheduled-daily-brief'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
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

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  const isMinister = await resolveMinister(token)
  if (!isMinister) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: HEADERS })

  const body = await req.json().catch(() => ({}))
  const date: string = body.date || new Date().toISOString().slice(0, 10)

  const brief = await buildDailyBrief(date)
  if (!brief) return new Response(JSON.stringify({ error: 'Generation failed' }), { status: 500, headers: HEADERS })

  const client = sb()
  const { data, error } = await client.from('daily_devotions').insert({
    date,
    title: brief.title,
    morning_prayer: brief.morning_prayer,
    scripture: brief.scripture,
    scripture_reference: brief.scripture_reference,
    devotional_text: brief.devotional_text,
    evening_prayer: brief.evening_prayer,
    min_tier: 'watchman',
    published: false,
    created_by: 'ai-agent',
  }).select().single()

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })

  return new Response(JSON.stringify({ success: true, devotion: data }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/generate-daily-brief' }
