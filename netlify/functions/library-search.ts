import { createClient } from '@supabase/supabase-js'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS })

  const body = await req.json().catch(() => ({}))
  const { query, limit = 5, threshold = 0.65 } = body

  if (!query?.trim()) {
    return new Response(JSON.stringify({ error: 'query required' }), { status: 400, headers: CORS })
  }

  const OPENAI_KEY = process.env.OPENAI_API_KEY || ''
  if (!OPENAI_KEY) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured', chunks: [] }), { status: 200, headers: CORS })
  }

  // Generate embedding for the query
  const embRes = await fetch('https://api.openai.com/v1/embeddings', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
    body:    JSON.stringify({ model: 'text-embedding-3-small', input: [query.trim()] }),
    signal:  AbortSignal.timeout(10000),
  })

  if (!embRes.ok) {
    const err = await embRes.text()
    return new Response(JSON.stringify({ error: `OpenAI error: ${embRes.status} ${err.slice(0, 100)}`, chunks: [] }), { status: 200, headers: CORS })
  }

  const embData = await embRes.json()
  const vector  = embData.data?.[0]?.embedding

  if (!vector) {
    return new Response(JSON.stringify({ error: 'No embedding returned', chunks: [] }), { status: 200, headers: CORS })
  }

  // Semantic search via pgvector
  const { data: chunks, error } = await sb().rpc('match_library_chunks', {
    query_embedding: vector,
    match_threshold: threshold,
    match_count:     limit,
  })

  if (error) {
    console.error('[LIBRARY-SEARCH] RPC error:', error.message)
    return new Response(JSON.stringify({ error: error.message, chunks: [] }), { status: 200, headers: CORS })
  }

  console.log(`[LIBRARY-SEARCH] query="${query.slice(0, 60)}" → ${chunks?.length ?? 0} results`)

  return new Response(JSON.stringify({ chunks: chunks || [] }), { status: 200, headers: CORS })
}

export const config = { path: '/api/library-search' }
