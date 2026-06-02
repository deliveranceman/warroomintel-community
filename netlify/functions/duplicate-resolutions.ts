import { createClient } from '@supabase/supabase-js'

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function extractUserId(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return payload.sub || null
  } catch { return null }
}

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: HEADERS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  const userId = extractUserId(token)
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })

  const supabase = sb()

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('duplicate_resolutions')
      .select('spirit_name_a, spirit_name_b, resolution')
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ resolutions: data || [] }), { status: 200, headers: HEADERS })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}))
    const { spirit_name_a, spirit_name_b, resolution } = body
    if (!spirit_name_a || !spirit_name_b) {
      return new Response(JSON.stringify({ error: 'spirit_name_a and spirit_name_b required' }), { status: 400, headers: HEADERS })
    }
    const { error } = await supabase.from('duplicate_resolutions').insert({
      spirit_name_a,
      spirit_name_b,
      resolution: resolution || 'dismissed',
    })
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: HEADERS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
}

export const config = { path: '/api/duplicate-resolutions' }
