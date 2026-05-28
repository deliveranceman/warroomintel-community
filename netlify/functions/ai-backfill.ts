const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!
const AIRTABLE_BASE  = 'appVXEj2DLPBTJTtD'
const AIRTABLE_TABLE = 'tblcP4lgVykzOhLi4'
const NAME_FIELD     = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

const VALID_KINGDOMS = [
  'Hell / Darkness', 'Air', 'Water / Marine', 'Earth', 'Witchcraft', 'Occult',
  'Religion / False Religion', 'False Religion / Paganism', 'Infirmity / Sickness',
  'Mind / Intellect', 'Sexual Perversion', 'Death / Destruction', 'Fear / Torment',
  'Pride / Self', 'Deception / Lies', 'Anger / Violence', 'Mammon / Greed',
]
const VALID_RANKS = [
  'Principality', 'World Ruler', 'Power', 'Wicked Spirit',
  'Fallen Angel', 'Demon', 'Familiar Spirit', 'Spirit of Infirmity',
]

const CONFIDENCE_THRESHOLD = 75

function scoreFieldQuality(fieldValue: string | undefined): number {
  if (!fieldValue || fieldValue.trim().length === 0) return 0
  const v = fieldValue.trim()

  if (v.length < 10) return 10
  if (v.length < 30) return 25

  const lowQualityPatterns = [
    /^see\s+/i,
    /^unknown$/i,
    /^n\/a$/i,
    /^tbd$/i,
    /^various$/i,
    /^\w{1,3}$/,
    /^[A-Z\s]+$/,
  ]
  if (lowQualityPatterns.some(p => p.test(v))) return 15

  if (v.length > 100) return 85
  if (v.length > 50)  return 65
  return 50
}

function resolveUserId(token: string): string {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return ''
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    return payload.sub || ''
  } catch { return '' }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS })

  const token  = req.headers.get('Authorization')?.replace('Bearer ', '').trim() || ''
  const userId = resolveUserId(token)
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || ''
  const body = await req.json().catch(() => ({}))
  const startFrom: number = body.startFrom ?? 0
  const batchSize = 20

  // Fetch all Airtable records
  const allRecords: any[] = []
  let offset: string | undefined

  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`)
    url.searchParams.set('pageSize', '100')
    if (offset) url.searchParams.set('offset', offset)

    const res  = await fetch(url.toString(), { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } })
    const data = await res.json()
    allRecords.push(...(data.records || []))
    offset = data.offset
  } while (offset)

  console.log('[AI-BACKFILL] Total records fetched:', allRecords.length)
  if (allRecords[0]) {
    console.log('[AI-BACKFILL] Sample field names:', Object.keys(allRecords[0].fields || {}))
  }

  // Define enrichable fields
  const enrichableFields = [
    { at: 'Description',      key: 'description' },
    { at: 'Kingdom',          key: 'kingdom' },
    { at: 'Biblical Rank',    key: 'rank' },
    { at: 'Also Known As',    key: 'also_known_as' },
    { at: 'Entry Points',     key: 'entry_points' },
    { at: 'Manifestiation',   key: 'manifestations' }, // Airtable typo
    { at: 'Counter Scriptures', key: 'scriptures' },
  ]

  // Filter: records where any field scores below threshold
  const needsEnrich = allRecords.filter(r => {
    const f    = r.fields || {}
    const name = f[NAME_FIELD] || f['Name'] || ''
    if (!name) return false
    return enrichableFields.some(field => scoreFieldQuality(f[field.at]) < CONFIDENCE_THRESHOLD)
  })

  console.log('[AI-BACKFILL] Records needing enrichment:', needsEnrich.length)

  // Process current batch
  const batch    = needsEnrich.slice(startFrom, startFrom + batchSize)
  const updated: string[] = []
  const skipped: string[] = []
  const failed:  string[] = []

  for (const record of batch) {
    const f    = record.fields || {}
    const name = f[NAME_FIELD] || f['Name'] || 'Unknown'

    console.log('[AI-BACKFILL] Processing:', name)

    // Score all fields, collect those needing improvement
    const fieldsToImprove: Array<{ at: string; key: string; current: string; currentScore: number }> = []
    for (const field of enrichableFields) {
      const currentScore = scoreFieldQuality(f[field.at])
      if (currentScore < CONFIDENCE_THRESHOLD) {
        fieldsToImprove.push({ ...field, current: f[field.at] || '', currentScore })
      }
    }

    if (fieldsToImprove.length === 0) {
      console.log('[AI-BACKFILL] All fields high quality for:', name)
      skipped.push(name)
      continue
    }

    try {
      const prompt = `You are filling a deliverance ministry spirit database entry.

Spirit: "${name}"
${f['Kingdom'] ? `Current Kingdom: ${f['Kingdom']}` : ''}

Fields needing improvement (current quality < 75%):
${fieldsToImprove.map(field =>
  `- ${field.key}: ${field.current ? `"${field.current}" (quality score: ${field.currentScore}%)` : 'EMPTY'}`
).join('\n')}

Provide the BEST POSSIBLE values for each field listed above.
Only return fields that need filling. Be specific and detailed.

Kingdom MUST be one of exactly: Hell / Darkness, Air, Water / Marine, Earth, Witchcraft, Occult, Religion / False Religion, False Religion / Paganism, Infirmity / Sickness, Mind / Intellect, Sexual Perversion, Death / Destruction, Fear / Torment, Pride / Self, Deception / Lies, Anger / Violence, Mammon / Greed
Rank MUST be one of exactly: Principality, World Ruler, Power, Wicked Spirit, Fallen Angel, Demon, Familiar Spirit, Spirit of Infirmity

Return ONLY JSON (no markdown, start with {):
{
  "description": "...",
  "kingdom": "...",
  "rank": "...",
  "also_known_as": "...",
  "entry_points": "...",
  "manifestations": "...",
  "scriptures": "..."
}`

      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 600,
          messages:   [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(15000),
      })

      const aiData = await aiRes.json()
      const rawText = (aiData.content?.[0]?.text || '')
        .replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/```\s*$/im, '').trim()
      const m = rawText.match(/\{[\s\S]*\}/)

      let parsed: any = {}
      try { parsed = JSON.parse(m ? m[0] : rawText) } catch {
        console.error('[AI-BACKFILL] JSON parse failed for:', name)
        failed.push(name)
        continue
      }

      // Build update — only overwrite fields that are low quality
      const updateFields: Record<string, any> = {}

      for (const field of fieldsToImprove) {
        const aiValue = parsed[field.key]
        if (!aiValue || !aiValue.trim()) continue

        // Validate single-select fields
        if (field.at === 'Kingdom') {
          if (!VALID_KINGDOMS.includes(aiValue)) continue
        }
        if (field.at === 'Biblical Rank') {
          if (!VALID_RANKS.includes(aiValue)) continue
        }

        updateFields[field.at] = aiValue
      }

      if (Object.keys(updateFields).length === 0) {
        console.log('[AI-BACKFILL] Nothing to update for:', name)
        skipped.push(name)
        continue
      }

      const updateRes = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}/${record.id}`,
        {
          method:  'PATCH',
          headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: updateFields }),
        },
      )

      if (updateRes.ok) {
        console.log('[AI-BACKFILL] Updated:', name, Object.keys(updateFields))
        updated.push(name)
      } else {
        const err = await updateRes.json().catch(() => ({}))
        console.error('[AI-BACKFILL] Update failed:', name, err)
        failed.push(name)
      }

      await new Promise(r => setTimeout(r, 250))

    } catch (e: any) {
      console.error('[AI-BACKFILL] Error on:', name, e.message)
      failed.push(name)
    }
  }

  const remaining = needsEnrich.length - startFrom - batch.length
  const message   = `Updated ${updated.length}, skipped ${skipped.length} (high quality), failed ${failed.length}. ${remaining > 0 ? `${remaining} remaining.` : 'All done!'}`
  console.log('[AI-BACKFILL]', message)

  return new Response(JSON.stringify({
    success:           true,
    processed:         batch.length,
    updated:           updated.length,
    skipped:           skipped.length,
    failed:            failed.length,
    updatedNames:      updated,
    skippedNames:      skipped,
    failedNames:       failed,
    totalNeedingFill:  needsEnrich.length,
    nextStartFrom:     startFrom + batchSize,
    hasMore:           remaining > 0,
    message,
  }), { status: 200, headers: CORS })
}

export const config = { path: '/api/ai-backfill' }
