import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'
import { buildWindows, scanOnce, stageCandidates, WINDOW_SIZE } from './_shared/patristicScan'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
const { token: airtableToken }              = JSON.parse(process.env.AIRTABLE || '{}')

// Same switch as admin-demon.ts — one flag governs all demon-base reads/writes.
const USE_SUPABASE_DEMON_WRITES = true

const BASE_ID    = 'appVXEj2DLPBTJTtD'
const TABLE_ID   = 'tblcP4lgVykzOhLi4'
const NAME_FIELD = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'

function sb() { return createClient(sbUrl, sbKey) }

async function isInAirtable(nameNorm: string): Promise<boolean> {
  if (!airtableToken || !nameNorm) return false
  try {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`)
    url.searchParams.set('maxRecords', '1')
    url.searchParams.set('filterByFormula', `SEARCH("${nameNorm.replace(/"/g, '')}",LOWER({${NAME_FIELD}}))`)
    url.searchParams.append('fields[]', NAME_FIELD)
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${airtableToken}` },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return false
    const data = await res.json()
    return (data.records?.length || 0) > 0
  } catch { return false }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST')  return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: CORS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth
  const { userId, tier } = auth

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS })
  }

  const { resourceId } = body || {}
  if (!resourceId) return new Response(JSON.stringify({ error: 'resourceId required' }), { status: 400, headers: CORS })

  // 'window8k' (default) = original behavior; 'full' = scan the whole text in
  // overlapping windows, unioning candidates de-duped by normalized name.
  const scanMode: 'window8k' | 'full' = body?.scanMode === 'full' ? 'full' : 'window8k'

  const client = sb()

  const { data: resource, error: fetchErr } = await client
    .from('resources')
    .select('id,title,author,extracted_text,topic')
    .eq('id', resourceId)
    .single()

  if (fetchErr || !resource) {
    return new Response(JSON.stringify({ error: 'Resource not found' }), { status: 404, headers: CORS })
  }
  if (!resource.extracted_text) {
    return new Response(JSON.stringify({ error: 'No extracted text — run indexing first' }), { status: 400, headers: CORS })
  }

  await client.from('resources').update({ summary_status: 'processing' }).eq('id', resourceId)

  try {
    const meta = { userId, userTier: tier, callType: 'patristic_scan' }
    const fullText: string = resource.extracted_text

    // Build scan windows
    let windows: string[]
    let truncated = false
    if (scanMode === 'full') {
      ({ windows, truncated } = buildWindows(fullText))
    } else {
      windows = [fullText.substring(0, WINDOW_SIZE)]
    }

    let firstParsed: any = null
    const collected: any[] = []
    for (const w of windows) {
      const result = await scanOnce(w, meta)
      const p = result.parsed
      if (!p) continue
      if (!firstParsed) firstParsed = p
      if (Array.isArray(p.spirit_mentions)) collected.push(...p.spirit_mentions)
    }
    if (!firstParsed) throw new Error('Could not parse AI response as JSON')

    const sourceName = resource.title || resource.author || 'Unknown'
    const { staged, duplicatesSkipped, genericSkipped } = await stageCandidates(
      client, resourceId, sourceName, collected,
    )

    await client.from('resources').update({
      summary_status:  'complete',
      ai_summary:      firstParsed,
      ai_model_used:   'claude-sonnet-4-5',
      ai_generated_at: new Date().toISOString(),
    }).eq('id', resourceId)

    // window8k response stays byte-for-byte as before; full mode adds scan metadata.
    const payload: any = {
      success: true,
      summary: firstParsed.summary,
      spiritsFound: staged,
      duplicatesSkipped,
    }
    if (scanMode === 'full') {
      payload.scanMode       = 'full'
      payload.windowsScanned = windows.length
      payload.truncated      = truncated
      payload.genericSkipped = genericSkipped
    }
    return new Response(JSON.stringify(payload), { status: 200, headers: CORS })

  } catch (e: any) {
    await client.from('resources').update({
      summary_status: 'failed',
      summary_error:  e.message || 'Unknown error',
    }).eq('id', resourceId)
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS })
  }
}

// Suppressed: USE_SUPABASE_DEMON_WRITES=true means isInAirtable is never called.
void USE_SUPABASE_DEMON_WRITES
void isInAirtable

export const config = { path: '/api/library-summarize' }
