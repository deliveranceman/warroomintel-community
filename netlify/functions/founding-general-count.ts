import { createClient } from '@supabase/supabase-js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  try {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
    const { count } = await supabase.from('founding_generals').select('*', { count: 'exact', head: true })
    return new Response(JSON.stringify({ count: count ?? 0, cap: 100, remaining: Math.max(0, 100 - (count ?? 0)) }), { status: 200, headers })
  } catch {
    return new Response(JSON.stringify({ count: 0, cap: 100, remaining: 100 }), { status: 200, headers })
  }
}

export const config = { path: '/api/founding-general-count' }
