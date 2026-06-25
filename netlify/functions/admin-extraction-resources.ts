import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

function sb() { return createClient(sbUrl!, sbKey!) }

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS })
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const url = new URL(req.url)
  const q   = (url.searchParams.get('q') || '').trim()

  const client = sb()

  // Build query — select extracted_text to compute length; strip before returning
  const baseQuery = client
    .from('resources')
    .select('id, title, author, source_type, topic, created_at, extracted_text')
    .not('extracted_text', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)

  const { data, error } = q
    ? await baseQuery.ilike('title', `%${q}%`)
    : await baseQuery

  if (error) return json({ error: error.message }, 500)

  const resources = (data || [])
    .filter((r: any) => (r.extracted_text as string | null)?.length ?? 0 > 0)
    .map((r: any) => ({
      id:          r.id          as string,
      title:       r.title       as string,
      author:      (r.author     as string | null) ?? null,
      source_type: (r.source_type as string | null) ?? null,
      topic:       (r.topic      as string | null) ?? null,
      created_at:  r.created_at  as string,
      text_len:    ((r.extracted_text as string) || '').length,
    }))

  return json({ resources })
}

export const config = { path: '/api/admin-extraction-resources' }
