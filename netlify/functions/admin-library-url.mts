import { createClient } from '@supabase/supabase-js'
import { requireAdmin2 } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const BUCKET = 'ministry-library'

function makeSupabase() {
  return createClient(
    supabaseUrl!,
    supabaseServiceKey!,
  )
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

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth
  const { userId } = auth

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
