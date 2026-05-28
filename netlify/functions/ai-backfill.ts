const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!
const AIRTABLE_BASE  = 'appVXEj2DLPBTJTtD'
const AIRTABLE_TABLE = 'tblcP4lgVykzOhLi4'
const NAME_FIELD     = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

// Valid single-select values used by Airtable
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

  // ── Step 1: Fetch all Airtable records (paginated) ─────────────────────────
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

  // ── Step 2: Filter records with empty description or kingdom ───────────────
  const emptyRecords = allRecords.filter(r => {
    const f    = r.fields || {}
    const name = f[NAME_FIELD] || f['Name'] || ''
    if (!name) return false
    return !f['Description'] || !f['Kingdom']
  })

  console.log('[AI-BACKFILL] Records needing fill:', emptyRecords.length)

  // ── Step 3: Process the current batch ─────────────────────────────────────
  const batch     = emptyRecords.slice(startFrom, startFrom + batchSize)
  const updated:  string[] = []
  const failed:   string[] = []

  for (const record of batch) {
    const f    = record.fields || {}
    const name = f[NAME_FIELD] || f['Name'] || 'Unknown'

    console.log('[AI-BACKFILL] Processing:', name)

    try {
      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 600,
          messages: [{
            role: 'user',
            content: `You are a demonic intelligence specialist for a deliverance ministry database.

Provide accurate information about the demonic entity: "${name}"

Return ONLY this JSON (no markdown, start with {):
{
  "description": "2-3 sentence description of this spirit's nature, origin, and primary function",
  "kingdom": "MUST be one of exactly: Hell / Darkness, Air, Water / Marine, Earth, Witchcraft, Occult, Religion / False Religion, False Religion / Paganism, Infirmity / Sickness, Mind / Intellect, Sexual Perversion, Death / Destruction, Fear / Torment, Pride / Self, Deception / Lies, Anger / Violence, Mammon / Greed",
  "rank": "MUST be one of exactly: Principality, World Ruler, Power, Wicked Spirit, Fallen Angel, Demon, Familiar Spirit, Spirit of Infirmity",
  "entry_points": "2-3 common entry points, semicolon-separated",
  "manifestations": "2-3 common manifestations, semicolon-separated",
  "scriptures": "1-2 most relevant scripture references",
  "also_known_as": "other names for this spirit, comma-separated, or empty string"
}`,
          }],
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

      // Build update — only fill EMPTY fields, never overwrite
      const updateFields: Record<string, any> = {}

      if (!f['Description'] && parsed.description) {
        updateFields['Description'] = parsed.description
      }
      if (!f['Kingdom'] && parsed.kingdom && VALID_KINGDOMS.includes(parsed.kingdom)) {
        updateFields['Kingdom'] = parsed.kingdom
      }
      if (!f['Biblical Rank'] && parsed.rank && VALID_RANKS.includes(parsed.rank)) {
        updateFields['Biblical Rank'] = parsed.rank
      }
      if (!f['Also Known As'] && parsed.also_known_as) {
        updateFields['Also Known As'] = parsed.also_known_as
      }
      if (!f['Entry Points'] && parsed.entry_points) {
        updateFields['Entry Points'] = parsed.entry_points
      }
      if (!f['Manifestiation'] && parsed.manifestations) {
        updateFields['Manifestiation'] = parsed.manifestations  // Airtable field has this typo
      }
      if (!f['Counter Scriptures'] && parsed.scriptures) {
        updateFields['Counter Scriptures'] = parsed.scriptures
      }

      if (Object.keys(updateFields).length === 0) {
        console.log('[AI-BACKFILL] Nothing to update for:', name)
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

      await new Promise(r => setTimeout(r, 250))  // stay under Airtable rate limit

    } catch (e: any) {
      console.error('[AI-BACKFILL] Error on:', name, e.message)
      failed.push(name)
    }
  }

  const remaining = emptyRecords.length - startFrom - batch.length
  const message   = `Updated ${updated.length} of ${batch.length} spirits. ${remaining > 0 ? `${remaining} remaining.` : 'All done!'}`
  console.log('[AI-BACKFILL]', message)

  return new Response(JSON.stringify({
    success:          true,
    processed:        batch.length,
    updated:          updated.length,
    failed:           failed.length,
    updatedNames:     updated,
    failedNames:      failed,
    totalNeedingFill: emptyRecords.length,
    nextStartFrom:    startFrom + batchSize,
    hasMore:          remaining > 0,
    message,
  }), { status: 200, headers: CORS })
}

export const config = { path: '/api/ai-backfill' }
