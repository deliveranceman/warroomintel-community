import { createClient } from '@supabase/supabase-js'
import { requireTier } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })

  const auth = await requireTier(req, 1)
  if (auth instanceof Response) return auth

  const supabase = sb()

  if (req.method === 'GET') {
    // Fetch resources from the resources table (excluding ministry-library topic)
    const { data: resources, error: resErr } = await supabase
      .from('resources')
      .select('id, title, tier, file_path, topic, created_at')
      .neq('topic', 'ministry-library')
      .order('created_at', { ascending: false })

    if (resErr) return new Response(JSON.stringify({ error: resErr.message }), { status: 500, headers: HEADERS })

    // Get existing document_reviews
    const { data: reviews, error: revErr } = await supabase
      .from('document_reviews')
      .select('*')

    if (revErr) return new Response(JSON.stringify({ error: revErr.message }), { status: 500, headers: HEADERS })

    const reviewMap = new Map((reviews || []).map((r: any) => [r.document_id, r]))

    // Ensure every resource has a review row (auto-create pending)
    const missing = (resources || []).filter((r: any) => !reviewMap.has(String(r.id)))
    if (missing.length > 0) {
      const inserts = missing.map((r: any) => ({
        document_id: String(r.id),
        document_title: r.title,
        document_tier: (r.tier || 'free').toLowerCase(),
        document_url: r.file_path || null,
        status: 'pending',
      }))
      await supabase.from('document_reviews').insert(inserts)
      // Reload reviews
      const { data: updated } = await supabase.from('document_reviews').select('*')
      return new Response(JSON.stringify({ reviews: updated, resources: resources }), { headers: HEADERS })
    }

    return new Response(JSON.stringify({ reviews: reviews, resources: resources }), { headers: HEADERS })
  }

  if (req.method === 'POST') {
    let body: any = {}
    try { body = await req.json() } catch {}
    const { document_id, status, review_issues, review_notes } = body
    if (!document_id || !status) {
      return new Response(JSON.stringify({ error: 'document_id and status required' }), { status: 400, headers: HEADERS })
    }
    const { error } = await supabase
      .from('document_reviews')
      .update({
        status,
        review_issues: review_issues || [],
        review_notes: review_notes || null,
        reviewed_by: auth.userId,
        reviewed_by_name: '',
        reviewed_at: new Date().toISOString(),
      })
      .eq('document_id', document_id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ ok: true }), { headers: HEADERS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
}

export const config = { path: '/api/testing-documents' }
