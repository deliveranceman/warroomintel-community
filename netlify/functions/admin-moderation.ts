import { createClient } from '@supabase/supabase-js'
import { requireAdmin2 } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')

function sb() { return createClient(supabaseUrl!, serviceRoleKey!) }

export default async function handler(req: Request) {
  const headers = { 'Content-Type': 'application/json' }

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const url = new URL(req.url)
  if (url.searchParams.get('count') === 'true') {
    const client = sb()
    const [fbRes, testRes, forumRes] = await Promise.all([
      client.from('feedback').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      client.from('testimonies').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      client.from('forum_posts').select('id', { count: 'exact', head: true }).eq('flagged', true),
    ])
    return new Response(JSON.stringify({
      openFeedback:       fbRes.count    ?? 0,
      pendingTestimonies: testRes.count  ?? 0,
      flaggedPosts:       forumRes.count ?? 0,
      total: (fbRes.count ?? 0) + (testRes.count ?? 0) + (forumRes.count ?? 0),
    }), { status: 200, headers })
  }

  return new Response(JSON.stringify({
    posts: [],
    prayers: [],
    message: 'Connect Stream server-side SDK for full moderation',
  }), { status: 200, headers })
}

export const config = { path: '/api/admin-moderation' }
