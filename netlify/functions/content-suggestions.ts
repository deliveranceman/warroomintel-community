import { createClient } from '@supabase/supabase-js'
import { requireAdmin2 } from './_shared/access'

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

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const url = new URL(req.url)
  const client = sb()

  // ── GET — list suggestions ─────────────────────────────────────────────────
  if (req.method === 'GET') {
    const statusFilter  = url.searchParams.get('status') || null
    const weekOf        = url.searchParams.get('week_of') || null
    const contentType   = url.searchParams.get('content_type') || null

    let query = client
      .from('content_suggestions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (statusFilter) query = query.eq('status', statusFilter)
    if (weekOf)       query = query.eq('week_of', weekOf)
    if (contentType)  query = query.eq('content_type', contentType)

    const { data, error } = await query
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ suggestions: data || [] }), { status: 200, headers: HEADERS })
  }

  // ── PATCH — approve / reject / publish ────────────────────────────────────
  if (req.method === 'PATCH') {
    const id = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: HEADERS })

    const body = await req.json().catch(() => ({}))
    const { action, scheduled_for, title, full_draft, summary, notes } = body

    if (!action || !['approve', 'reject', 'publish'].includes(action)) {
      return new Response(JSON.stringify({ error: 'action must be approve | reject | publish' }), { status: 400, headers: HEADERS })
    }

    // Fetch the suggestion first (needed for publish logic)
    const { data: suggestion, error: fetchErr } = await client
      .from('content_suggestions')
      .select('*')
      .eq('id', id)
      .single()
    if (fetchErr || !suggestion) {
      return new Response(JSON.stringify({ error: 'Suggestion not found' }), { status: 404, headers: HEADERS })
    }

    const now = new Date().toISOString()
    const updates: Record<string, any> = { reviewed_by: auth.userId, reviewed_at: now }
    if (title      !== undefined) updates.title      = title
    if (full_draft !== undefined) updates.full_draft = full_draft
    if (summary    !== undefined) updates.summary    = summary
    if (notes      !== undefined) updates.notes      = notes

    if (action === 'approve') {
      updates.status = 'approved'
      if (scheduled_for) updates.scheduled_for = scheduled_for
    } else if (action === 'reject') {
      updates.status = 'rejected'
    } else if (action === 'publish') {
      updates.status = 'published'
      updates.published_at = now

      const effectiveTitle = title || suggestion.title
      const effectiveDraft = full_draft || suggestion.full_draft || ''
      const effectiveTier  = suggestion.suggested_tier || 'watchman'

      // Auto-publish into target tables based on content_type
      if (suggestion.content_type === 'daily_brief') {
        const today = new Date().toISOString().slice(0, 10)
        await client.from('daily_devotions').insert({
          date: today,
          title: effectiveTitle,
          devotional_text: effectiveDraft,
          min_tier: effectiveTier,
          published: true,
          created_by: 'ai-agent',
        })
      } else if (suggestion.content_type === 'weekly_intel') {
        await client.from('intel_posts').insert({
          title: effectiveTitle,
          body: effectiveDraft,
          post_type: 'briefing',
          published: true,
        })
      }
      // arsenal_pdf / youtube_outline / field_manual: mark as published only (manual action required)
    }

    const { error: updateErr } = await client
      .from('content_suggestions')
      .update(updates)
      .eq('id', id)

    if (updateErr) return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: HEADERS })
    return new Response(JSON.stringify({ success: true, action }), { status: 200, headers: HEADERS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
}

export const config = { path: '/api/content-suggestions' }
