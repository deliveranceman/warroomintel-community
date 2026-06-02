import { createClient } from '@supabase/supabase-js'

const BUCKET = 'ministry-library'

function makeSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
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

  const { filename, contentType } = await req.json()
  if (!filename) return Response.json({ error: 'filename required' }, { status: 400 })

  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `${userId}/${Date.now()}-${safe}`

  const sb = makeSupabase()
  const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(filePath)

  if (error || !data) {
    console.error('[admin-library-url] createSignedUploadUrl error:', error?.message)
    return Response.json({ error: error?.message || 'Failed to create upload URL' }, { status: 500 })
  }

  return Response.json({ signedUrl: data.signedUrl, filePath, token: data.token })
}

export const config = { path: '/api/admin-library-url' }
