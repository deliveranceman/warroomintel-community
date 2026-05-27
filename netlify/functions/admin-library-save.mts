import { createClient } from '@supabase/supabase-js'

function makeSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function getUserId(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return payload.sub || null
  } catch { return null }
}

async function isMinister(userId: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return false
    const data = await res.json()
    return data?.public_metadata?.role === 'minister'
  } catch { return false }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  const userId = getUserId(req.headers.get('authorization'))
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const ok = await isMinister(userId)
  if (!ok) return Response.json({ error: 'Forbidden — minister role required' }, { status: 403 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { title, author, notes, filename, file_size, file_path, ai_generated } = body

  if (!title?.trim() || !file_path) {
    return Response.json({ error: 'title and file_path are required' }, { status: 400 })
  }

  const sb = makeSupabase()

  const { data: row, error } = await sb
    .from('resources')
    .insert({
      title: title.trim(),
      author: author?.trim() || 'Unknown',
      notes: notes?.trim() || '',
      filename: filename || file_path.split('/').pop() || '',
      file_size: file_size || 0,
      file_path,
      topic: 'ministry-library',
      user_id: userId,
      ai_generated: Boolean(ai_generated),
      active: true,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[admin-library-save] insert error:', error.message)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }

  return Response.json({ success: true, book: row })
}

export const config = { path: '/api/admin-library-save' }
