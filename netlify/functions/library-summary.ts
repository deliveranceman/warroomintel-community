import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function supabaseClient() {
  return createClient(
    supabaseUrl!,
    supabaseServiceKey!,
  )
}

async function isMinister(token: string): Promise<boolean> {
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })
  const ok = await isMinister(token)
  if (!ok) return new Response(JSON.stringify({ error: 'Forbidden — minister role required' }), { status: 403, headers: CORS })

  const sb = supabaseClient()
  const { data, error } = await sb
    .from('resources')
    .select('id,title,author,notes,file_size,active,ai_generated,created_at')
    .eq('topic', 'ministry-library')
    .order('created_at', { ascending: false })

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })

  const books = data || []
  const total = books.length
  const activeCount = books.filter((b: any) => b.active !== false).length
  const aiCount = books.filter((b: any) => b.ai_generated).length

  const summary = [
    `You have ${total} book${total !== 1 ? 's' : ''} in your ministry library.`,
    `${activeCount} ${activeCount === 1 ? 'is' : 'are'} active in AI context.`,
    'When enhancing spirits in the Intel Archive, Claude reads your library metadata to inform its analysis.',
    `Books marked AI=ON are referenced as theological context.`,
    `${aiCount > 0 ? `${aiCount} book${aiCount !== 1 ? 's were' : ' was'} catalogued by AI auto-fill. ` : ''}Full text extraction is not yet active — books contribute their title, author, and notes to AI prompts.`,
  ].join(' ')

  return new Response(JSON.stringify({ books, summary }), { status: 200, headers: CORS })
}

export const config = { path: '/api/library-summary' }
