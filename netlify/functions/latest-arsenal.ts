import { createClient } from '@supabase/supabase-js'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: HEADERS })
  }

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  }

  let userId: string
  try {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('Invalid JWT')
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    userId = payload.sub
    if (!userId) throw new Error('No sub in JWT')
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized — invalid token' }), { status: 401, headers: HEADERS })
  }

  const supabase = sb()
  const { data, error } = await supabase
    .from('resources')
    .select('id, title, topic, created_at')
    .neq('topic', 'ministry-library')
    .order('created_at', { ascending: false })
    .limit(3)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
  }

  return new Response(JSON.stringify({ resources: data ?? [] }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/latest-arsenal' }
