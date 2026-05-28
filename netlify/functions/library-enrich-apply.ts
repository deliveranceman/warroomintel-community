import { createClient } from '@supabase/supabase-js'

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || ''
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID || 'appVXEj2DLPBTJTtD'
const AIRTABLE_TABLE = process.env.AIRTABLE_DEMON_TABLE_ID || 'tblcP4lgVykzOhLi4'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

export const config = { path: '/api/library-enrich-apply' }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS })

  // AUTH
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()
  let userId = ''
  if (token && token.split('.').length === 3) {
    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64url').toString('utf8')
      )
      userId = payload.sub || ''
    } catch {}
  }
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const body = await req.json().catch(() => ({}))
  const { suggestionId, action } = body

  // LIST: return all pending suggestions
  if (action === 'list') {
    const { data, error } = await supabase
      .from('library_enrichment_suggestions')
      .select('*')
      .eq('status', 'pending')
      .order('confidence', { ascending: false })
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })
    }
    return new Response(JSON.stringify({ suggestions: data || [] }), { status: 200, headers: CORS })
  }

  if (!suggestionId || !action) {
    return new Response(JSON.stringify({ error: 'suggestionId and action required' }), { status: 400, headers: CORS })
  }

  // Load suggestion
  const { data: suggestion, error: fetchErr } = await supabase
    .from('library_enrichment_suggestions')
    .select('*')
    .eq('id', suggestionId)
    .single()

  if (fetchErr || !suggestion) {
    return new Response(JSON.stringify({ error: 'Suggestion not found' }), { status: 404, headers: CORS })
  }

  if (action === 'reject') {
    await supabase
      .from('library_enrichment_suggestions')
      .update({ status: 'rejected' })
      .eq('id', suggestionId)

    return new Response(JSON.stringify({ success: true, action: 'rejected', spiritName: suggestion.spirit_name }), { status: 200, headers: CORS })
  }

  if (action !== 'approve') {
    return new Response(JSON.stringify({ error: 'action must be approve or reject' }), { status: 400, headers: CORS })
  }

  if (!AIRTABLE_TOKEN) {
    return new Response(JSON.stringify({ error: 'AIRTABLE_TOKEN not configured' }), { status: 500, headers: CORS })
  }

  const proposedFields: Record<string, string> = suggestion.proposed_fields || {}

  try {
    if (suggestion.action === 'enrich' && suggestion.existing_record_id) {
      // Fetch existing record to check which fields are empty
      const existRes = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}/${suggestion.existing_record_id}`,
        { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }, signal: AbortSignal.timeout(8000) }
      )

      if (!existRes.ok) {
        return new Response(JSON.stringify({ error: `Airtable fetch failed: ${existRes.status}` }), { status: 500, headers: CORS })
      }

      const existData = await existRes.json()
      const existFields = existData.fields || {}

      // Merge: empty → set directly; has content → append
      const mergedFields: Record<string, string> = {}
      for (const [fieldName, proposed] of Object.entries(proposedFields)) {
        const current = existFields[fieldName] || ''
        if (!current.trim()) {
          mergedFields[fieldName] = proposed
        } else {
          mergedFields[fieldName] = `${current}\n\n${proposed}`
        }
      }

      if (Object.keys(mergedFields).length > 0) {
        const patchRes = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}/${suggestion.existing_record_id}`,
          {
            method:  'PATCH',
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
            body:    JSON.stringify({ fields: mergedFields }),
            signal:  AbortSignal.timeout(8000),
          }
        )
        if (!patchRes.ok) {
          const errText = await patchRes.text()
          return new Response(JSON.stringify({ error: `Airtable PATCH failed: ${errText.slice(0, 200)}` }), { status: 500, headers: CORS })
        }
      }
    } else if (suggestion.action === 'add') {
      // POST new record
      const newFields: Record<string, string> = {
        '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE': suggestion.spirit_name,
        ...proposedFields,
      }

      const addRes = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`,
        {
          method:  'POST',
          headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({ fields: newFields }),
          signal:  AbortSignal.timeout(8000),
        }
      )
      if (!addRes.ok) {
        const errText = await addRes.text()
        return new Response(JSON.stringify({ error: `Airtable POST failed: ${errText.slice(0, 200)}` }), { status: 500, headers: CORS })
      }
    }

    // Mark suggestion as applied
    await supabase
      .from('library_enrichment_suggestions')
      .update({ status: 'applied', applied_at: new Date().toISOString() })
      .eq('id', suggestionId)

    return new Response(JSON.stringify({ success: true, action: 'approved', spiritName: suggestion.spirit_name }), { status: 200, headers: CORS })
  } catch (e: any) {
    console.error('[ENRICH-APPLY] Error:', e.message)
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS })
  }
}
