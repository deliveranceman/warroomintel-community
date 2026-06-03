import { createClient } from '@supabase/supabase-js'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

async function resolveUser(token: string): Promise<{ userId: string } | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return null
    return { userId }
  } catch { return null }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  const user = await resolveUser(token)
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })

  let body: any = {}
  try { body = await req.json() } catch {}
  const { item_type, item_id } = body
  if (!item_type || !item_id) {
    return new Response(JSON.stringify({ error: 'item_type and item_id required' }), { status: 400, headers: HEADERS })
  }
  if (!['bug', 'feature'].includes(item_type)) {
    return new Response(JSON.stringify({ error: 'item_type must be bug or feature' }), { status: 400, headers: HEADERS })
  }

  const supabase = sb()
  const table = item_type === 'bug' ? 'bug_reports' : 'feature_requests'

  // Check existing upvote
  const { data: existing } = await supabase
    .from('test_upvotes')
    .select('id')
    .eq('item_type', item_type)
    .eq('item_id', item_id)
    .eq('user_id', user.userId)
    .maybeSingle()

  if (existing) {
    // Remove upvote
    await supabase.from('test_upvotes').delete().eq('id', existing.id)
    const { data: row } = await supabase.from(table).select('upvotes').eq('id', item_id).single()
    const newCount = Math.max(0, (row?.upvotes || 1) - 1)
    await supabase.from(table).update({ upvotes: newCount }).eq('id', item_id)
    return new Response(JSON.stringify({ upvoted: false, count: newCount }), { headers: HEADERS })
  } else {
    // Add upvote
    await supabase.from('test_upvotes').insert({ item_type, item_id, user_id: user.userId })
    const { data: row } = await supabase.from(table).select('upvotes').eq('id', item_id).single()
    const newCount = (row?.upvotes || 0) + 1
    await supabase.from(table).update({ upvotes: newCount }).eq('id', item_id)
    return new Response(JSON.stringify({ upvoted: true, count: newCount }), { headers: HEADERS })
  }
}

export const config = { path: '/api/testing-upvote' }
