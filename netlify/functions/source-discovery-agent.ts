import { createClient } from '@supabase/supabase-js'
import { sendWebPushToUser } from './_shared/sendWebPush'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')

// Justin's Clerk user ID for push notifications
const JUSTIN_USER_ID = 'user_3DlxgBsnfU83SRVMjkVxCkIr7tk'

function sb() {
  return createClient(sbUrl!, sbKey!)
}

export default async function handler() {
  const client = sb()
  console.log('[source-discovery-agent] Starting weekly source discovery run')

  // Load existing source names to avoid duplicates
  const { data: existingRows, error: fetchErr } = await client
    .from('ministry_sources')
    .select('name')
  if (fetchErr) {
    console.error('[source-discovery-agent] Failed to load existing sources:', fetchErr.message)
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 })
  }

  const existingNames = (existingRows || []).map((r: any) => r.name as string)
  console.log(`[source-discovery-agent] ${existingNames.length} existing sources loaded`)

  // Call Claude Sonnet to suggest 5 new sources
  let suggestions: any[] = []
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        system: `You are a ministry intelligence researcher for War Room Intel, a deliverance ministry platform. Return ONLY valid JSON.
Never suggest sources that promote false doctrine, New Age practices, or heretical theology as if they are safe.`,
        messages: [{
          role: 'user',
          content: `You are helping build a curated source library for a deliverance ministry platform. The platform currently uses these authors:
${existingNames.join(', ')}

Identify 5 NEW authors, speakers, or ministers NOT in that list who have written or taught on these topics:
- Spiritual warfare and deliverance ministry
- Demonology and exorcism
- Generational curses and bloodline ministry
- Prayer and intercession for spiritual warfare
- Christian healing and inner healing

For each person return this exact JSON structure:
{
  "name": "Full Name",
  "type": "author|speaker|minister|deliverance-minister|theologian",
  "brief": "2-3 sentences on who they are and what they teach. Note their theological tradition and any concerns.",
  "known_works": ["Title 1", "Title 2"],
  "public_domain": true/false,
  "source_urls": ["url1"],
  "ministry_alignment": "how their work relates to deliverance ministry",
  "cultural_tags": ["charismatic","deliverance","healing"],
  "initial_assessment": "safe|monitor|dangerous",
  "warnings": "any concerns about their theology or approach, or empty string if none"
}

Return as JSON array of 5 objects. No markdown.`,
        }],
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) throw new Error(`Claude error ${res.status}`)
    const data = await res.json()
    const raw = (data.content?.[0]?.text || '').trim()

    // Parse JSON — try direct, then extract array
    try {
      suggestions = JSON.parse(raw)
    } catch {
      const match = raw.match(/\[[\s\S]*\]/)
      if (match) suggestions = JSON.parse(match[0])
    }

    if (!Array.isArray(suggestions)) suggestions = []
    console.log(`[source-discovery-agent] Claude suggested ${suggestions.length} sources`)
  } catch (err: any) {
    console.error('[source-discovery-agent] Claude call failed:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }

  // Insert new sources, skip duplicates
  const existingNormalized = new Set(existingNames.map((n: string) => n.toLowerCase().trim()))
  let inserted = 0
  let skipped  = 0

  for (const s of suggestions) {
    if (!s.name) { skipped++; continue }

    const nameLower = String(s.name).toLowerCase().trim()
    if (existingNormalized.has(nameLower)) {
      console.log(`[source-discovery-agent] SKIP duplicate: ${s.name}`)
      skipped++
      continue
    }

    const { error: insertErr } = await client.from('ministry_sources').insert({
      name:               String(s.name).trim(),
      type:               s.type || null,
      status:             'pending',
      brief:              s.brief || null,
      known_works:        Array.isArray(s.known_works) ? s.known_works : [],
      public_domain:      s.public_domain === true,
      source_urls:        Array.isArray(s.source_urls) ? s.source_urls : [],
      ministry_alignment: s.ministry_alignment || null,
      cultural_tags:      Array.isArray(s.cultural_tags) ? s.cultural_tags : [],
      warnings:           s.warnings || null,
      ai_model_used:      'claude-sonnet-4-6',
      discovered_at:      new Date().toISOString(),
    })

    if (insertErr) {
      console.error(`[source-discovery-agent] Insert failed for ${s.name}:`, insertErr.message)
      skipped++
    } else {
      console.log(`[source-discovery-agent] INSERTED: ${s.name}`)
      existingNormalized.add(nameLower)
      inserted++
    }
  }

  console.log(`[source-discovery-agent] Done: ${inserted} inserted, ${skipped} skipped`)

  // Send push notification to Justin if any new sources were found
  if (inserted > 0) {
    try {
      await sendWebPushToUser(
        JUSTIN_USER_ID,
        '⚔ Source Discovery',
        `${inserted} new ministry author${inserted === 1 ? '' : 's'} found — review in Admin`,
        { url: '/admin' },
      )
      console.log('[source-discovery-agent] Push notification sent to Justin')
    } catch (err: any) {
      console.error('[source-discovery-agent] Push failed:', err.message)
    }
  }

  return new Response(JSON.stringify({ inserted, skipped, total: suggestions.length }), { status: 200 })
}

export const config = { schedule: '0 9 * * 0' }
