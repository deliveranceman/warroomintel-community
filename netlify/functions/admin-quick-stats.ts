import { createClient } from '@supabase/supabase-js'
import { requireAdmin, CORS as HEADERS } from './_shared/requireAdmin'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: HEADERS })

  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

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
