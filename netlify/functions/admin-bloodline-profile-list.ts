import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'

export const config = { path: '/api/admin-bloodline-profile-list' }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'GET only' }), {
      status: 405, headers: CORS,
    })
  }

  const env = JSON.parse(process.env.SUPABASE || '{}')
  const supabase = createClient(env.url, env.serviceRoleKey)

  const { data: profiles, error } = await supabase
    .from('bloodline_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[admin-bloodline-profile-list] fetch error:', error.message)
    return new Response(JSON.stringify({ error: 'db_error' }), {
      status: 500, headers: CORS,
    })
  }

  // Resolve created_by Clerk IDs to display names via members table (one query, no N+1)
  const rows       = profiles ?? []
  const creatorIds = [...new Set(rows.map((p: any) => p.created_by as string))]
  const memberMap  = new Map<string, { display_name: string | null; username: string | null }>()
  if (creatorIds.length > 0) {
    const { data: membersData } = await supabase
      .from('members')
      .select('clerk_id, display_name, username')
      .in('clerk_id', creatorIds)
    for (const m of (membersData ?? [])) {
      memberMap.set(m.clerk_id, { display_name: m.display_name, username: m.username })
    }
  }

  const annotated = rows.map((p: any) => {
    const m = memberMap.get(p.created_by)
    return {
      ...p,
      creator_name:     m?.display_name ?? m?.username ?? null,
      creator_username: m?.username ?? null,
    }
  })

  return new Response(
    JSON.stringify({ profiles: annotated, readOnly: true }),
    { status: 200, headers: CORS }
  )
}
