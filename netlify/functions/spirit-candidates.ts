import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')

function sb() { return createClient(sbUrl, sbKey) }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth
  const { userId } = auth

  const client = sb()

  // ── GET — list candidates + optional stats ─────────────────────────────────
  if (req.method === 'GET') {
    const url        = new URL(req.url)
    const status     = url.searchParams.get('status') || 'all'
    const search     = url.searchParams.get('search') || ''
    const withStats  = url.searchParams.get('stats') === 'true'

    let query = client
      .from('spirit_candidates')
      .select('id,name,name_normalized,also_known_as,function,manifestations,scripture_context,kingdom,biblical_rank,sub_kingdom,source_name,source_type,confidence,status,duplicate_of,ai_notes,enrichment_status,enrichment_error,ai_model_used,ai_generated_at,created_at,reviewed_at,reviewed_by,rejection_reason,airtable_record_id,is_adversarial,possible_duplicate_of,possible_duplicate_confidence,last_extraction_at,last_extraction_error')
      .order('created_at', { ascending: false })

    if (status !== 'all') query = query.eq('status', status)
    if (search)           query = query.ilike('name', `%${search}%`)

    const { data: candidates, error } = await query
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })

    // Join library_enrichment_suggestions by case-insensitive spirit_name match.
    // Constrain to status='pending' — applied/rejected rows must not surface as live data.
    const { data: suggestions } = await client
      .from('library_enrichment_suggestions')
      .select('id,spirit_name,proposed_fields,confidence,source_excerpt')
      .eq('status', 'pending')

    const suggMap: Record<string, any> = {}
    for (const s of suggestions || []) {
      const key = (s.spirit_name || '').toLowerCase()
      if (key && !suggMap[key]) suggMap[key] = s
    }

    const enrichedCandidates = (candidates || []).map((c: any) => {
      const sugg = suggMap[(c.name || '').toLowerCase()]
      const hasLayer2 = !!(sugg?.proposed_fields && typeof sugg.proposed_fields === 'object' && Object.keys(sugg.proposed_fields).length > 0)
      return {
        ...c,
        _hasLayer2:            hasLayer2,
        _suggestionConfidence: sugg?.confidence ?? null,
        _proposedFields:       hasLayer2 ? sugg!.proposed_fields : null,
        _suggestionId:         sugg?.id ?? null,
        _sourceExcerpt:        sugg?.source_excerpt ?? null,
      }
    })

    let stats: any = null
    if (withStats) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [pendingRes, approvedWeekRes, dupRes] = await Promise.all([
        client.from('spirit_candidates').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        client.from('spirit_candidates').select('id', { count: 'exact', head: true }).eq('status', 'approved').gte('reviewed_at', sevenDaysAgo),
        client.from('spirit_candidates').select('id', { count: 'exact', head: true }).eq('status', 'duplicate'),
      ])

      stats = {
        pending:       pendingRes.count      || 0,
        approvedWeek:  approvedWeekRes.count || 0,
        duplicates:    dupRes.count          || 0,
        total:         candidates?.length    || 0,
      }
    }

    return new Response(JSON.stringify({ candidates: enrichedCandidates, stats }), { status: 200, headers: CORS })
  }

  // ── POST — reject or toggle duplicate status ───────────────────────────────
  if (req.method === 'POST') {
    let body: any
    try { body = await req.json() } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS })
    }

    const { action, candidateId, rejectionReason } = body || {}
    if (!candidateId) return new Response(JSON.stringify({ error: 'candidateId required' }), { status: 400, headers: CORS })

    if (action === 'reject') {
      await client.from('spirit_candidates').update({
        status:           'rejected',
        rejection_reason: rejectionReason || 'No reason given',
        reviewed_at:      new Date().toISOString(),
        reviewed_by:      userId,
      }).eq('id', candidateId)
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS })
    }

    if (action === 'unmark-duplicate') {
      await client.from('spirit_candidates').update({
        status:       'pending',
        duplicate_of: null,
      }).eq('id', candidateId)
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS })
    }

    if (action === 'mark-duplicate') {
      await client.from('spirit_candidates').update({
        status: 'duplicate',
      }).eq('id', candidateId)
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: CORS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS })
}

export const config = { path: '/api/spirit-candidates' }
