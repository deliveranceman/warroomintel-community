import { createClient } from '@supabase/supabase-js'

const CLERK_SECRET  = process.env.CLERK_SECRET_KEY!
const SUPABASE_URL  = process.env.SUPABASE_URL!
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY!
const BUCKET        = process.env.SUPABASE_BUCKET || 'resources'

const ALLOWED_TYPES: Record<string, { maxBytes: number }> = {
  'application/pdf':                                                             { maxBytes: 25 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':    { maxBytes: 25 * 1024 * 1024 },
  'audio/mpeg':                                                                  { maxBytes: 50 * 1024 * 1024 },
  'image/png':                                                                   { maxBytes:  5 * 1024 * 1024 },
  'image/jpeg':                                                                  { maxBytes:  5 * 1024 * 1024 },
}

// Supabase resources table DDL — run once in Supabase SQL editor:
// CREATE TABLE IF NOT EXISTS resources (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   title text NOT NULL,
//   description text,
//   tier text NOT NULL,
//   category text NOT NULL,
//   file_path text NOT NULL,
//   file_type text NOT NULL,
//   file_size integer NOT NULL,
//   created_at timestamptz DEFAULT now()
// );

async function resolveUser(token: string): Promise<{ userId: string; userData: any } | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      console.error('Token is not a JWT — parts:', parts.length)
      return null
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    console.log('JWT payload sub:', payload.sub)
    console.log('JWT payload azp:', payload.azp)

    const userId = payload.sub
    if (!userId) {
      console.error('No sub in JWT payload')
      return null
    }

    const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${CLERK_SECRET}` },
    })
    console.log('User fetch status:', userRes.status)
    if (!userRes.ok) return null
    const userData = await userRes.json()
    console.log('publicMetadata:', JSON.stringify(userData?.public_metadata))
    return { userId, userData }
  } catch (e) {
    console.error('resolveUser error:', e)
    return null
  }
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const headers = { 'Content-Type': 'application/json' }

  const authHeader = req.headers.get('Authorization')
  const sessionToken = authHeader?.replace('Bearer ', '').trim()
  if (!sessionToken) {
    return new Response(JSON.stringify({ error: 'No auth token provided' }), { status: 401, headers })
  }

  const auth = await resolveUser(sessionToken)
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized — invalid session' }), { status: 401, headers })
  const role = auth.userData?.public_metadata?.role
  if (role !== 'minister') {
    return new Response(JSON.stringify({
      error: 'Forbidden — minister role required',
      debug: { userId: auth.userId, role, publicMetadata: auth.userData?.public_metadata },
    }), { status: 403, headers })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid form data' }), { status: 400 })
  }

  const file        = formData.get('file') as File | null
  const title       = (formData.get('title') as string || '').trim()
  const description = (formData.get('description') as string || '').trim()
  const tier        = (formData.get('tier') as string) || 'Free'
  const category    = (formData.get('category') as string) || 'Reference'
  const tagsRaw     = formData.get('tags') as string
  const tags        = tagsRaw ? JSON.parse(tagsRaw) : []

  if (!file || !title) {
    return new Response(JSON.stringify({ error: 'file and title are required' }), { status: 400 })
  }

  // Validate type
  const allowed = ALLOWED_TYPES[file.type]
  if (!allowed) {
    return new Response(JSON.stringify({ error: `File type ${file.type} not allowed` }), { status: 400 })
  }

  // Validate size
  if (file.size > allowed.maxBytes) {
    return new Response(JSON.stringify({ error: `File too large (max ${allowed.maxBytes / 1024 / 1024}MB for this type)` }), { status: 400 })
  }

  const supabase  = createClient(SUPABASE_URL, SUPABASE_KEY)
  const ext       = file.name.split('.').pop() || ''
  const safeName  = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const filePath  = `${tier.toLowerCase()}/${safeName}`

  // Upload to Supabase Storage
  const buffer = await file.arrayBuffer()
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, { contentType: file.type, upsert: false })

  if (uploadErr) {
    return new Response(JSON.stringify({ error: `Storage upload failed: ${uploadErr.message}` }), { status: 500 })
  }

  // Insert metadata row
  const { data: row, error: insertErr } = await supabase
    .from('resources')
    .insert({
      title,
      description: description || null,
      tier,
      category,
      tags: tags.length > 0 ? tags : [],
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
    })
    .select()
    .single()

  if (insertErr) {
    // Attempt to clean up the uploaded file
    await supabase.storage.from(BUCKET).remove([filePath])
    return new Response(JSON.stringify({ error: `DB insert failed: ${insertErr.message}` }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true, resource: row }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = { path: '/api/admin-upload' }
