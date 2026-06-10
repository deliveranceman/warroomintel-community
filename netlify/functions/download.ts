import { createClient } from '@supabase/supabase-js'
import { requireAuth, tierLevel } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey, bucket: supabaseBucket } = JSON.parse(process.env.SUPABASE || '{}')

const SUPABASE_URL = supabaseUrl!
const SUPABASE_KEY = supabaseServiceKey!
const EXPIRY_SECS  = 14400 // 4 hours

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function bucketForPath(filePath: string): string {
  return filePath.startsWith('user_') ? 'ministry-library' : (supabaseBucket || 'resources')
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405, headers })

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const url = new URL(req.url)
  const id  = url.searchParams.get('id')
  if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  const { data: resource, error } = await supabase
    .from('resources')
    .select('tier, file_path')
    .eq('id', id)
    .single()

  if (error || !resource) return new Response(JSON.stringify({ error: 'Resource not found' }), { status: 404, headers })

  const resourceLevel = tierLevel(resource.tier)
  if (auth.level < resourceLevel) {
    return new Response(JSON.stringify({ error: `${resource.tier} tier required` }), { status: 403, headers })
  }

  const bucket = bucketForPath(resource.file_path)
  const { data: signed, error: signErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(resource.file_path, EXPIRY_SECS)

  if (signErr || !signed?.signedUrl) {
    return new Response(JSON.stringify({ error: 'Could not generate download link' }), { status: 500, headers })
  }

  return new Response(JSON.stringify({ url: signed.signedUrl }), { status: 200, headers })
}

export const config = { path: '/api/download' }
