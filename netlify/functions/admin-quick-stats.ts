import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

async function resolveMinister(token: string): Promise<string | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return null
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    const role = data?.public_metadata?.role
    return role === 'minister' || role === 'admin' ? userId : null
  } catch { return null }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: HEADERS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })

  const userId = await resolveMinister(token)
  if (!userId) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: HEADERS })

  const supabase = sb()
  const today = new Date().toISOString().split('T')[0]

  const [aiRes, testimoniesRes, membersRes] = await Promise.allSettled([
    // AI calls today
    supabase
      .from('ai_usage')
      .select('call_count')
      .eq('date', today),

    // Pending testimonies
    supabase
      .from('testimonies')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),

    // New members this week via Clerk
    fetch(
      `https://api.clerk.com/v1/users?limit=100&order_by=-created_at`,
      { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } }
    ).then(r => r.json()),
  ])

  let callsToday = 0
  if (aiRes.status === 'fulfilled' && aiRes.value.data) {
    for (const row of aiRes.value.data) callsToday += Number(row.call_count) || 0
  }

  let pendingTestimonies = 0
  if (testimoniesRes.status === 'fulfilled') {
    pendingTestimonies = (testimoniesRes.value as any).count ?? 0
  }

  let newMembersThisWeek = 0
  if (membersRes.status === 'fulfilled' && Array.isArray(membersRes.value)) {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    newMembersThisWeek = membersRes.value.filter((u: any) => (u.created_at || 0) >= cutoff).length
  }

  return new Response(
    JSON.stringify({ callsToday, pendingTestimonies, newMembersThisWeek, spiritCount: null }),
    { status: 200, headers: HEADERS },
  )
}

export const config = { path: '/api/admin-quick-stats' }
