import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

async function isMinisterToken(token: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return false
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return false
    const data = await res.json()
    return data?.public_metadata?.role === 'minister'
  } catch { return false }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })

  const supabase = sb()

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('testing_settings')
      .select('testing_visible, testing_message')
      .eq('id', 1)
      .single()
    if (error) return new Response(JSON.stringify({ testing_visible: true, testing_message: '' }), { headers: HEADERS })
    return new Response(JSON.stringify(data), { headers: HEADERS })
  }

  if (req.method === 'PATCH') {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
    const ok = await isMinisterToken(token)
    if (!ok) return new Response(JSON.stringify({ error: 'Minister role required' }), { status: 403, headers: HEADERS })

    let body: any = {}
    try { body = await req.json() } catch {}
    const update: any = {}
    if (typeof body.testing_visible === 'boolean') update.testing_visible = body.testing_visible
    if (typeof body.testing_message === 'string') update.testing_message = body.testing_message

    const { error } = await supabase.from('testing_settings').update(update).eq('id', 1)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ ok: true }), { headers: HEADERS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
}

export const config = { path: '/api/testing-settings' }
