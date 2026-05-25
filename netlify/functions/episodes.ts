import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
const CLERK_SECRET = process.env.CLERK_SECRET_KEY!

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

async function resolveUser(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return null
    const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${CLERK_SECRET}` },
    })
    if (!userRes.ok) return null
    const userData = await userRes.json()
    return { userId, userData }
  } catch { return null }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const auth = await resolveUser(token)
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

  const { userId } = auth
  const url = new URL(req.url)
  const episodeId = url.searchParams.get('id')

  if (req.method === 'GET' && episodeId) {
    const { data: episode } = await supabase
      .from('episodes')
      .select('*')
      .eq('id', episodeId)
      .eq('status', 'published')
      .single()

    if (!episode) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers })

    const { data: attachments } = await supabase
      .from('episode_attachments')
      .select('*')
      .eq('episode_id', episodeId)
      .order('sort_order', { ascending: true })

    const { data: progress } = await supabase
      .from('episode_progress')
      .select('*')
      .eq('episode_id', episodeId)
      .eq('user_id', userId)
      .single()

    return new Response(JSON.stringify({
      episode,
      attachments: attachments || [],
      progress: progress || null,
    }), { status: 200, headers })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
}

export const config = { path: '/api/episodes' }
