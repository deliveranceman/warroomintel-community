import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_shared/access'
import { generateSlug, toColumns, createSpirit, findSpiritSlugByName, insertFieldSnapshots } from './_shared/spiritWrite'
import { solCall } from './_shared/solClient'
import { LAYER2_FIELD_GENERATION_SYSTEM } from './_shared/prompts/layer2Extraction'
import { applySpiritRegions } from './_shared/applySpiritRegions'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')
const { token: airtableToken } = JSON.parse(process.env.AIRTABLE || '{}')

const AIRTABLE_TOKEN = airtableToken || ''
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID || 'appVXEj2DLPBTJTtD'
const AIRTABLE_TABLE = process.env.AIRTABLE_DEMON_TABLE_ID || 'tblcP4lgVykzOhLi4'

// Same switch as admin-demon.ts — one flag governs all demon-base writes.
// true => enrichment lands in Supabase `spirits`; false => legacy Airtable path.
const USE_SUPABASE_DEMON_WRITES = true

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
  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const supabase = createClient(
    supabaseUrl!,
    supabaseServiceKey!
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
    const { error: rejectErr } = await supabase
      .from('library_enrichment_suggestions')
      .update({ status: 'rejected' })
      .eq('id', suggestionId)
    if (rejectErr) {
      console.error('[ENRICH-APPLY] reject failed:', rejectErr.message)
      return new Response(JSON.stringify({ error: `Reject failed: ${rejectErr.message}` }), { status: 500, headers: CORS })
    }
    // Also record in enrichment_rejected for future generation exclusion
    await supabase.from('enrichment_rejected').insert({
      spirit_name: suggestion.spirit_name,
      source_book: suggestion.book_title || null,
    }).then(null, () => {})
    return new Response(JSON.stringify({ success: true, action: 'rejected', spiritName: suggestion.spirit_name }), { status: 200, headers: CORS })
  }

  if (action === 'patch_fields') {
    const { fields } = body
    if (!fields || typeof fields !== 'object') {
      return new Response(JSON.stringify({ error: 'fields object required' }), { status: 400, headers: CORS })
    }
    const { error: patchErr } = await supabase
      .from('library_enrichment_suggestions')
      .update({ proposed_fields: fields })
      .eq('id', suggestionId)
    if (patchErr) return new Response(JSON.stringify({ error: patchErr.message }), { status: 500, headers: CORS })
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS })
  }

  if (action === 'ai_fill_field') {
    const { fieldName, currentValue, spiritName, bookTitle } = body
    if (!fieldName) return new Response(JSON.stringify({ error: 'fieldName required' }), { status: 400, headers: CORS })

    // Belt-and-suspenders: match both straight and curly apostrophes (U+2019).
    const APOS = `['']`
    const REFUSAL_PATTERNS = [
      new RegExp(`I can${APOS}t (help|create|generate|provide|assist|improve|write|produce|make)`, 'i'),
      /I cannot (help|create|generate|provide|assist|improve|write|produce|make)/i,
      new RegExp(`I won${APOS}t (help|create|generate|provide|assist|improve)`, 'i'),
      new RegExp(`I${APOS}m not able to`, 'i'),
      /I am not able to/i,
      /as an AI/i,
      /as a language model/i,
      /vulnerable individuals/i,
      /psychological harm/i,
      new RegExp(`I${APOS}m designed to`, 'i'),
      /I (am|am not) designed to/i,
      /against my (guidelines|values|principles)/i,
      /not appropriate for me to/i,
      /unable to provide content/i,
      new RegExp(`can${APOS}t engage with`, 'i'),
    ]
    function isRefusal(text: string): boolean {
      if (!text || text.length < 20) return false
      // Normalize curly quotes to straight so patterns fire on either form.
      const normalized = text.replace(/’/g, "'").replace(/[“”]/g, '"')
      return REFUSAL_PATTERNS.some(p => p.test(normalized)) || REFUSAL_PATTERNS.some(p => p.test(text))
    }

    const sourceExcerpt = suggestion.source_excerpt
      ? `Source excerpt from "${bookTitle}":\n"${suggestion.source_excerpt}"\n\n`
      : ''

    try {
      const result = await solCall({
        tier:   'standard',
        system: LAYER2_FIELD_GENERATION_SYSTEM,
        messages: [{
          role: 'user',
          content: `You are researching the spirit "${spiritName}" using source material from "${bookTitle}".

${sourceExcerpt}Complete or improve the following field using only what the source material supports. If the source is silent on this field, return an empty string — do not hallucinate or draw from general knowledge outside the source.

Field: ${fieldName}
Current value: ${currentValue || '(empty)'}

Return only the improved field text. No labels, no preamble, no explanation. If the source has nothing to add, return an empty string.`,
        }],
        maxTokens: 400,
        timeoutMs: 30000,
        meta: { userId: auth.userId, userTier: 'admin', callType: 'library_enrich_field' },
      })

      const value = result.text.trim()

      console.log('[ai_fill_field]', {
        fieldName,
        spiritName,
        rawLength: result.text.length,
        preview: value.slice(0, 120),
        isRefusalResult: isRefusal(value),
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      })

      if (isRefusal(value)) {
        console.warn('[library-enrich-apply] ai_fill_field refusal for', fieldName, ':', value.slice(0, 200))
        return new Response(JSON.stringify({
          error:   'refusal_detected',
          message: 'Model refused this field — system prompt may need strengthening',
          raw:     value,
        }), { status: 502, headers: CORS })
      }

      return new Response(JSON.stringify({ success: true, value }), { status: 200, headers: CORS })
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS })
    }
  }

  if (action !== 'approve') {
    return new Response(JSON.stringify({ error: 'action must be approve, reject, patch_fields, or ai_fill_field' }), { status: 400, headers: CORS })
  }

  if (!USE_SUPABASE_DEMON_WRITES && !AIRTABLE_TOKEN) {
    return new Response(JSON.stringify({ error: 'AIRTABLE_TOKEN not configured' }), { status: 500, headers: CORS })
  }

  // Accept caller-supplied field overrides (e.g. after AI-fill edits)
  const proposedFields: Record<string, string> = body.proposedFields || suggestion.proposed_fields || {}

  try {
    // ── Supabase demon-base write path (flag-on) ─────────────────────────────
    // Only the spirit row read/write moves; the suggestion-status updates and
    // enrichment_rejected insert stay on Supabase regardless.
    let regionApplyResult: any = null
    if (USE_SUPABASE_DEMON_WRITES) {
      if (suggestion.action === 'enrich') {
        let row: any = null

        // 1. Stored slug (existing_record_id) — set by classifier, most precise
        if (suggestion.existing_record_id) {
          const { data } = await supabase.from('spirits').select('*').eq('slug', suggestion.existing_record_id).limit(1)
          if (data && data.length > 0) row = data[0]
        }

        // 2. Exact name match (case-insensitive)
        if (!row) {
          const slug = (await findSpiritSlugByName(supabase, suggestion.spirit_name)) || generateSlug(suggestion.spirit_name)
          const { data } = await supabase.from('spirits').select('*').eq('slug', slug).limit(1)
          if (data && data.length > 0) row = data[0]
        }

        // 3. Aka fallback — catches Anamalech→Anammelech-style mismatches where
        //    isInSupabaseArchive matched on aka but slug was left empty in classifier
        if (!row) {
          const safe = suggestion.spirit_name.replace(/[%_\\]/g, '\\$&')
          const { data } = await supabase.from('spirits').select('*').ilike('aka', `%${safe}%`).limit(1)
          if (data && data.length > 0) row = data[0]
        }

        if (!row) {
          return new Response(JSON.stringify({ error: `Spirit not found in Supabase for "${suggestion.spirit_name}"` }), { status: 404, headers: CORS })
        }
        // Normalize the Airtable-named proposed fields to snake columns, then
        // apply the SAME merge: empty current → set; non-empty → append '\n\n'.
        const proposedCols = toColumns(proposedFields)
        const merged: Record<string, any> = {}
        for (const [col, val] of Object.entries(proposedCols)) {
          const current = row[col]
          if (typeof val === 'string' && typeof current === 'string' && current.trim()) {
            merged[col] = `${current}\n\n${val}`
          } else {
            merged[col] = val
          }
        }
        if (Object.keys(merged).length > 0) {
          const snapErr = await insertFieldSnapshots(supabase, row, merged, { jobId: null, appliedBy: auth.userId, source: 'library_enrich' })
          if (snapErr) {
            console.error('[library-enrich-apply] snapshot failed:', snapErr)
            return new Response(JSON.stringify({ error: `Snapshot failed — aborting: ${snapErr}` }), { status: 500, headers: CORS })
          }
          const { error: upErr } = await supabase.from('spirits').update(merged).eq('slug', row.slug)
          if (upErr) return new Response(JSON.stringify({ error: `Supabase update failed: ${upErr.message}` }), { status: 500, headers: CORS })
        }

        // Body-region fan-out — non-blocking; failure does not abort approval
        const regionPayloads = (suggestion.layer2_raw?.layer5_body_regions ?? []) as any[]
        if (regionPayloads.length > 0) {
          try {
            regionApplyResult = await applySpiritRegions(supabase, row.id, regionPayloads, suggestionId)
          } catch (rErr: any) {
            console.error('[library-enrich-apply] region fan-out failed:', rErr.message)
          }
        }
      } else if (suggestion.action === 'add') {
        const { error: createErr } = await createSpirit(supabase, proposedFields, suggestion.spirit_name)
        if (createErr) return new Response(JSON.stringify({ error: `Supabase create failed: ${createErr}` }), { status: 500, headers: CORS })
      }
    } else if (suggestion.action === 'enrich' && suggestion.existing_record_id) {
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

    return new Response(JSON.stringify({ success: true, action: 'approved', spiritName: suggestion.spirit_name, regionApply: regionApplyResult }), { status: 200, headers: CORS })
  } catch (e: any) {
    console.error('[ENRICH-APPLY] Error:', e.message)
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS })
  }
}
