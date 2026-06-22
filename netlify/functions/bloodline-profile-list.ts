import { createClient } from '@supabase/supabase-js'
import { requireTier, CORS } from './_shared/access'

export const config = { path: '/api/bloodline-profile-list' }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  const auth = await requireTier(req, 3)
  if (auth instanceof Response) return auth

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'GET only' }), {
      status: 405, headers: CORS,
    })
  }

  const env = JSON.parse(process.env.SUPABASE || '{}')
  const supabase = createClient(env.url, env.serviceRoleKey)

  // Fetch profiles created by this user
  const { data: owned, error: ownedErr } = await supabase
    .from('bloodline_profiles')
    .select('*')
    .eq('created_by', auth.userId)
    .order('created_at', { ascending: false })

  if (ownedErr) {
    console.error('[bloodline-profile-list] owned fetch error:', ownedErr.message)
    return new Response(JSON.stringify({ error: 'db_error' }), {
      status: 500, headers: CORS,
    })
  }

  // Fetch profile IDs shared with this user
  const { data: shares, error: sharesErr } = await supabase
    .from('bloodline_profile_shares')
    .select('profile_id')
    .eq('member_id', auth.userId)

  if (sharesErr) {
    console.error('[bloodline-profile-list] shares fetch error:', sharesErr.message)
    return new Response(JSON.stringify({ error: 'db_error' }), {
      status: 500, headers: CORS,
    })
  }

  const sharedIds = (shares ?? []).map((s: { profile_id: string }) => s.profile_id)

  let sharedProfiles: any[] = []
  if (sharedIds.length > 0) {
    const { data: shared, error: sharedErr } = await supabase
      .from('bloodline_profiles')
      .select('*')
      .in('id', sharedIds)
      .order('created_at', { ascending: false })

    if (sharedErr) {
      console.error('[bloodline-profile-list] shared fetch error:', sharedErr.message)
      return new Response(JSON.stringify({ error: 'db_error' }), {
        status: 500, headers: CORS,
      })
    }
    sharedProfiles = shared ?? []
  }

  const ownedWithFlag = (owned ?? []).map((p: any) => ({ ...p, isMine: true }))
  const sharedWithFlag = sharedProfiles.map((p: any) => ({ ...p, isMine: false }))

  const profiles = [...ownedWithFlag, ...sharedWithFlag]

  return new Response(JSON.stringify({ profiles }), { status: 200, headers: CORS })
}
