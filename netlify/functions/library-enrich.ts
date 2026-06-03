import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')
const { token: airtableToken } = JSON.parse(process.env.AIRTABLE || '{}')

const AIRTABLE_TOKEN = airtableToken || ''
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID || 'appVXEj2DLPBTJTtD'
const AIRTABLE_TABLE = process.env.AIRTABLE_DEMON_TABLE_ID || 'tblcP4lgVykzOhLi4'
const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY || ''

const FIELD_MAP = {
  name:           'Name',
  description:    'Description',
  kingdom:        'Kingdom',
  rank:           'Rank',
  entryPoints:    'Entry Points',
  manifestations: 'Session Indicators',
  scriptures:     'Counter Scriptures',
  aliases:        'Also Known As',
  notes:          'WRI Notes',
}

const MAX_CANDIDATES  = 25
const TIME_BUDGET_MS  = 18000

export const config = { path: '/api/library-enrich' }

export default async function handler(req: Request) {
  const start = Date.now()

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

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
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const supabase = createClient(
    supabaseUrl!,
    supabaseServiceKey!
  )

  const body = await req.json().catch(() => ({}))
  const { resourceId } = body

  if (!resourceId) {
    return new Response(JSON.stringify({ error: 'resourceId required' }), { status: 400 })
  }

  // LOAD BOOK
  const { data: book, error: bookErr } = await supabase
    .from('resources')
    .select('id, title, extracted_text')
    .eq('id', resourceId)
    .single()

  if (bookErr || !book?.extracted_text) {
    return new Response(JSON.stringify({
      error: bookErr?.message || 'Book not found or not indexed',
    }), { status: 400 })
  }

  console.log('[ENRICH] Book:', book.title, 'chars:', book.extracted_text.length)

  // STEP 1: FULL DOCUMENT REGEX EXTRACTION

  const STOPWORDS = new Set([
    'god','jesus','christ','lord','holy','father','blood','bible',
    'scripture','name','amen','deliverance','prayer','people','family',
    'church','children','things','power','truth','grace','faith','love',
    'heaven','earth','man','men','woman','women','person','body','soul',
    'mind','heart','flesh','satan','devil','enemy','darkness','light',
    'spirit','spirits','demon','demons','evil','sin','sins','curse',
  ])

  function regexScan(text: string): Map<string, { score: number; excerpts: string[] }> {
    const candidates = new Map<string, { score: number; excerpts: string[] }>()

    const patterns = [
      { re: /\ball\s+spirits\s+of\s+([A-Za-z][A-Za-z' \-,]{2,60})/gi, score: 5 },
      { re: /\bspirits?\s+of\s+([A-Za-z][A-Za-z' \-]{2,50})/gi, score: 5 },
      { re: /\bdemons?\s+of\s+([A-Za-z][A-Za-z' \-]{2,50})/gi, score: 4 },
      { re: /^([A-Z]{3,}(?:,\s*[A-Z]{3,})*)\s*(?:--|:)\s*[a-z]/gm, score: 7 },
      { re: /(?:entry|entrance|gateway|door)s?\s+(?:for|of|through)\s+([A-Za-z][A-Za-z' \-]{2,40})/gi, score: 3 },
      { re: /(?:manifestation|symptom|sign)s?\s+of\s+([A-Za-z][A-Za-z' \-]{2,40})/gi, score: 4 },
    ]

    for (const { re, score } of patterns) {
      const fresh = new RegExp(re.source, re.flags)
      let m
      while ((m = fresh.exec(text)) !== null) {
        const parts = m[1].split(/[,;]/)
        for (const part of parts) {
          const name = part.trim()
            .replace(/^the\s+/i, '')
            .replace(/[.!?:]+$/, '')
            .replace(/\s+/g, ' ')
            .trim()

          if (name.length < 3 || name.length > 40) continue
          if (!/^[A-Za-z]/.test(name)) continue

          const nl = name.toLowerCase()
          if (STOPWORDS.has(nl)) continue
          if (nl.split(' ').every(w => STOPWORDS.has(w))) continue

          const existing = candidates.get(nl) || { score: 0, excerpts: [] }
          const pos      = m.index
          const excerpt  = text.slice(Math.max(0, pos - 80), pos + 120).replace(/\s+/g, ' ').trim()

          candidates.set(nl, {
            score:   existing.score + score,
            excerpts: [...existing.excerpts.slice(-2), excerpt],
          })
        }
      }
    }

    return candidates
  }

  const rawCandidates = regexScan(book.extracted_text)
  console.log('[ENRICH] Raw candidates:', rawCandidates.size)

  const qualified = Array.from(rawCandidates.entries())
    .filter(([_, v]) => v.score >= 4)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, MAX_CANDIDATES)

  console.log('[ENRICH] Qualified candidates:', qualified.length)

  // STEP 2: LOAD AIRTABLE DATABASE

  if (!AIRTABLE_TOKEN) {
    return new Response(JSON.stringify({ error: 'AIRTABLE_TOKEN not configured' }), { status: 500 })
  }

  let allRecords: any[] = []
  let offset: string | undefined
  let fieldNamesLogged = false

  do {
    if (Date.now() - start > TIME_BUDGET_MS * 0.4) {
      console.warn('[ENRICH] Time budget reached during Airtable load')
      break
    }

    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`)
    url.searchParams.set('pageSize', '100')
    if (offset) url.searchParams.set('offset', offset)

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      signal:  AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.error('[ENRICH] Airtable fetch failed:', res.status)
      break
    }

    const data = await res.json()

    if (!fieldNamesLogged && data.records?.[0]) {
      console.log('[ENRICH] Airtable field names:',
        JSON.stringify(Object.keys(data.records[0].fields || {})))
      fieldNamesLogged = true
    }

    allRecords.push(...(data.records || []))
    offset = data.offset
  } while (offset)

  console.log('[ENRICH] Airtable records loaded:', allRecords.length)

  // Build lookup: lowercase name → record
  const demonMap = new Map<string, any>()
  for (const r of allRecords) {
    const f    = r.fields || {}
    const name = f[FIELD_MAP.name] || f['⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'] || ''
    if (name) demonMap.set(name.toLowerCase().trim(), r)

    const aliases = f[FIELD_MAP.aliases] || ''
    if (aliases) {
      aliases.split(/[,;]/).forEach((a: string) => {
        const al = a.trim().toLowerCase()
        if (al) demonMap.set(al, r)
      })
    }
  }

  // STEP 3: CLASSIFY IN CODE (not Claude)

  const toEnrich: any[] = []
  const toAdd:    any[] = []

  for (const [nl, data] of qualified) {
    const existing = demonMap.get(nl)
    if (existing) {
      toEnrich.push({ name: nl.replace(/\b\w/g, c => c.toUpperCase()), record: existing, excerpts: data.excerpts, score: data.score })
    } else {
      toAdd.push({ name: nl.replace(/\b\w/g, c => c.toUpperCase()), excerpts: data.excerpts, score: data.score })
    }
  }

  console.log('[ENRICH] To enrich:', toEnrich.length, 'To add:', toAdd.length)

  // STEP 4: CLAUDE VALIDATES AND EXTRACTS FIELD DATA

  const suggestions: any[] = []
  const BATCH_SIZE    = 25
  const allCandidates = [...toEnrich, ...toAdd].slice(0, MAX_CANDIDATES)

  for (let i = 0; i < allCandidates.length; i += BATCH_SIZE) {
    if (Date.now() - start > TIME_BUDGET_MS * 0.8) {
      console.warn('[ENRICH] Time budget reached, stopping batch processing')
      break
    }

    const batch = allCandidates.slice(i, i + BATCH_SIZE)

    const batchPrompt = `You are analyzing excerpts from the deliverance ministry book "${book.title}".

For each spirit/demon below, extract specific information FROM THE EXCERPTS ONLY.
Do not add information not present in the excerpts.

SPIRITS TO ANALYZE:
${batch.map((c, idx) => `
${idx + 1}. Name: ${c.name}
   Action: ${c.record ? 'enrich existing record' : 'potential new entry'}
   Excerpts from document:
   ${c.excerpts.map((e: string) => `"${e}"`).join('\n   ')}
`).join('\n')}

Return ONLY this JSON (no markdown, start with {):
{
  "results": [
    {
      "name": "Spirit Name",
      "isLegitimateSpirit": true,
      "confidence": 8,
      "entryPoints": "specific entry points mentioned in excerpts only",
      "manifestations": "specific manifestations from excerpts only",
      "deliveranceNotes": "specific deliverance approach from excerpts",
      "scriptures": "scriptures mentioned near this spirit in excerpts",
      "description": "brief description based on excerpts only"
    }
  ]
}`

    try {
      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: {
          'Content-Type':    'application/json',
          'x-api-key':       ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 2000,
          messages:   [{ role: 'user', content: batchPrompt }],
        }),
        signal: AbortSignal.timeout(15000),
      })

      const aiData = await aiRes.json()
      const raw    = aiData.content?.[0]?.text || ''
      const cleaned = raw
        .replace(/^```json\s*/im, '')
        .replace(/^```\s*/im, '')
        .replace(/```\s*$/im, '')
        .trim()
      const match = cleaned.match(/\{[\s\S]*\}/)

      let parsed: any = { results: [] }
      try { parsed = JSON.parse(match ? match[0] : cleaned) } catch {}

      for (let j = 0; j < batch.length; j++) {
        const candidate = batch[j]
        const result    = parsed.results?.[j]
        if (!result || !result.isLegitimateSpirit) continue

        const proposedFields: Record<string, string> = {}
        const sourceStamp = `[From: ${book.title}]`

        if (result.entryPoints)     proposedFields[FIELD_MAP.entryPoints]    = `${sourceStamp}\n${result.entryPoints}`
        if (result.manifestations)  proposedFields[FIELD_MAP.manifestations] = `${sourceStamp}\n${result.manifestations}`
        if (result.deliveranceNotes) proposedFields[FIELD_MAP.notes]         = `${sourceStamp}\n${result.deliveranceNotes}`
        if (result.scriptures)      proposedFields[FIELD_MAP.scriptures]     = result.scriptures
        if (result.description && !candidate.record) proposedFields[FIELD_MAP.description] = result.description

        if (Object.keys(proposedFields).length === 0) continue

        suggestions.push({
          resource_id:         resourceId,
          book_title:          book.title,
          spirit_name:         candidate.name,
          existing_record_id:  candidate.record?.id || null,
          action:              candidate.record ? 'enrich' : 'add',
          proposed_fields:     proposedFields,
          confidence:          result.confidence || 5,
          source_excerpt:      candidate.excerpts[0] || '',
          status:              'pending',
        })
      }
    } catch (e: any) {
      console.error('[ENRICH] Batch failed:', e.message)
    }
  }

  // STEP 5: STORE SUGGESTIONS IN SUPABASE

  await supabase
    .from('library_enrichment_suggestions')
    .delete()
    .eq('resource_id', resourceId)
    .eq('status', 'pending')

  // Exclude spirits already rejected for this resource (either via suggestions or enrichment_rejected)
  const { data: rejectedRows } = await supabase
    .from('library_enrichment_suggestions')
    .select('spirit_name')
    .eq('resource_id', resourceId)
    .eq('status', 'rejected')
  const { data: enrichmentRejected } = await supabase
    .from('enrichment_rejected')
    .select('spirit_name')
  const rejectedNames = new Set<string>([
    ...(rejectedRows || []).map((r: any) => (r.spirit_name || '').toLowerCase().trim()),
    ...(enrichmentRejected || []).map((r: any) => (r.spirit_name || '').toLowerCase().trim()),
  ])
  const filteredSuggestions = suggestions.filter(s => !rejectedNames.has((s.spirit_name || '').toLowerCase().trim()))

  let savedCount = 0
  if (filteredSuggestions.length > 0) {
    const { error: saveErr } = await supabase
      .from('library_enrichment_suggestions')
      .insert(filteredSuggestions)

    if (saveErr) {
      console.error('[ENRICH] Save failed:', saveErr.message)
    } else {
      savedCount = filteredSuggestions.length
      console.log('[ENRICH] Saved', savedCount, 'suggestions (filtered', suggestions.length - filteredSuggestions.length, 'previously rejected)')
    }
  }

  const timeUsed    = Date.now() - start
  const enrichCount = filteredSuggestions.filter(s => s.action === 'enrich').length
  const addCount    = filteredSuggestions.filter(s => s.action === 'add').length

  return new Response(JSON.stringify({
    success:              true,
    partial:              qualified.length >= MAX_CANDIDATES,
    timeUsed,
    candidatesFound:      rawCandidates.size,
    candidatesProcessed:  qualified.length,
    suggestions:          savedCount,
    enrichSuggestions:    enrichCount,
    addSuggestions:       addCount,
    message: `Found ${savedCount} suggestions: ${enrichCount} to enrich existing spirits, ${addCount} potential new spirits. Review in admin.`,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
