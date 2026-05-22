import { createClient } from '@supabase/supabase-js'

const CLERK_SECRET = process.env.CLERK_SECRET_KEY!
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!
const BUCKET       = process.env.SUPABASE_BUCKET || 'resources'

async function verifyMinister(token: string): Promise<string | null> {
  const verifyRes = await fetch('https://api.clerk.com/v1/sessions/verify', {
    method: 'POST',
    headers: { Authorization: `Bearer ${CLERK_SECRET}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }),
  })
  if (!verifyRes.ok) return null
  const session = await verifyRes.json()
  const userId = session.user_id
  if (!userId) return null

  const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: { Authorization: `Bearer ${CLERK_SECRET}` },
  })
  if (!userRes.ok) return null
  const userData = await userRes.json()
  if (userData.public_metadata?.role !== 'minister') return null
  return userId
}

export default async function handler(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const userId = await verifyMinister(token)
  if (!userId) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    return new Response(JSON.stringify({ resources: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url)
    const id  = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 })

    // Get file path before deleting row
    const { data: row, error: fetchErr } = await supabase
      .from('resources')
      .select('file_path')
      .eq('id', id)
      .single()

    if (fetchErr || !row) return new Response(JSON.stringify({ error: 'Resource not found' }), { status: 404 })

    // Delete from storage
    await supabase.storage.from(BUCKET).remove([row.file_path])

    // Delete row
    const { error: deleteErr } = await supabase.from('resources').delete().eq('id', id)
    if (deleteErr) return new Response(JSON.stringify({ error: deleteErr.message }), { status: 500 })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/admin-resources' }
