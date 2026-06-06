import { createClient } from '@supabase/supabase-js'
import { buildDailyBrief } from './scheduled-daily-brief'
import { requireAdmin } from './_shared/requireAdmin'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

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
