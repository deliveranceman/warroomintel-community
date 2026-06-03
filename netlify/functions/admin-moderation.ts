import { createClient } from '@supabase/supabase-js'

const CLERK_SECRET = process.env.CLERK_SECRET_KEY!
const { url: supabaseUrl, serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')

function sb() { return createClient(supabaseUrl!, serviceRoleKey!) }

async function resolveUser(token: string): Promise<{ userId: string; userData: any } | null> {
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
  const headers = { 'Content-Type': 'application/json' }
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

  const auth = await resolveUser(token)
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  if (auth.userData?.public_metadata?.role !== 'minister') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })
  }

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
