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
      .from('gap_analysis_dismissed')
      .select('spirit_name, source_book')
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ dismissed: data || [] }), { status: 200, headers: HEADERS })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}))
    const rawItems = Array.isArray(body.items) ? body.items : [{ spirit_name: body.spirit_name, source_book: body.source_book }]
    const rows = rawItems
      .filter((item: any) => item?.spirit_name)
      .map((item: any) => ({
        spirit_name: item.spirit_name,
        source_book: item.source_book || null,
        dismissed_by: userId,
      }))
    if (!rows.length) return new Response(JSON.stringify({ error: 'spirit_name required' }), { status: 400, headers: HEADERS })
    const { error } = await supabase.from('gap_analysis_dismissed').insert(rows)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ success: true, count: rows.length }), { status: 200, headers: HEADERS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
}

export const config = { path: '/api/gap-analysis-dismissed' }
