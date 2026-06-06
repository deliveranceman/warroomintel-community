import { createClient } from '@supabase/supabase-js'
import { generateSuggestions } from './scheduled-content-suggestions'
import { cleanAIOutput } from '../lib/clean-ai-output'
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

  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const body = await req.json().catch(() => ({}))
  const topic: string | undefined = body.topic || undefined
  const weekOf = getMondayDate()

  const suggestions = await generateSuggestions(topic)

  const client = sb()
  const rows = suggestions.map((s: any) => ({
    week_of: weekOf,
    content_type: s.content_type,
    title: s.title,
    summary: cleanAIOutput(s.summary || ''),
    full_draft: s.full_draft ? cleanAIOutput(s.full_draft) : null,
    suggested_tier: s.suggested_tier || 'watchman',
    status: 'pending',
    created_by: 'ai-agent',
  }))

  const { data, error } = await client.from('content_suggestions').insert(rows).select('id, title, content_type')
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })

  return new Response(JSON.stringify({ success: true, count: suggestions.length, suggestions: data }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/generate-content-suggestions' }
