import { requireAdmin2, CORS } from './_shared/access'
import { createClient } from '@supabase/supabase-js'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')

function sb() {
  return createClient(sbUrl!, sbKey!)
}

const headers = CORS

async function generateBrief(name: string, type: string, knownWorks: string[]): Promise<{
  brief: string; ministry_alignment: string; cultural_tags: string[]; warnings: string; initial_assessment: string
} | null> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: 'You are a ministry intelligence researcher for War Room Intel, a deliverance ministry platform. Return ONLY valid JSON. Never suggest sources that promote false doctrine, New Age practices, or heretical theology as if they are safe.',
        messages: [{
          role: 'user',
          content: `Provide a brief intelligence assessment for this ministry source.

Name: ${name}
Type: ${type}
Known Works: ${knownWorks.length ? knownWorks.join(', ') : 'Unknown'}

Return this exact JSON (no markdown):
{
  "brief": "2-3 sentences on who they are and what they teach. Note their theological tradition and any concerns.",
  "ministry_alignment": "how their work relates to deliverance ministry in 1 sentence",
  "cultural_tags": ["charismatic","deliverance","healing"],
  "initial_assessment": "safe|monitor|dangerous",
  "warnings": "any concerns about their theology or approach, or empty string if none"
}`,
        }],
      }),
      signal: AbortSignal.timeout(18000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const raw = (data.content?.[0]?.text || '').trim()
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    return JSON.parse(match[0])
  } catch { return null }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const client = sb()

  // ── GET: list sources ────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const url   = new URL(req.url)
    const status = url.searchParams.get('status') || ''
    const search = url.searchParams.get('search') || ''

    let q = client.from('ministry_sources').select('*').order('created_at', { ascending: false })
    if (status && status !== 'all') q = q.eq('status', status)
    if (search) q = q.ilike('name', `%${search}%`)

    const { data, error } = await q
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ sources: data }), { status: 200, headers })
  }

  // ── POST: add new source ─────────────────────────────────────────────────────
  if (req.method === 'POST') {
    let body: any
    try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers }) }

    const { name, type, known_works = [] } = body
    if (!name?.trim()) return new Response(JSON.stringify({ error: 'name required' }), { status: 400, headers })

    // Check for duplicate
    const { data: existing } = await client
      .from('ministry_sources')
      .select('id,name')
      .ilike('name', name.trim())
      .maybeSingle()
    if (existing) return new Response(JSON.stringify({ error: `Already exists: ${existing.name}` }), { status: 409, headers })

    const { data: row, error: insertErr } = await client
      .from('ministry_sources')
      .insert({ name: name.trim(), type: type || null, known_works, status: 'pending' })
      .select()
      .single()
    if (insertErr) return new Response(JSON.stringify({ error: insertErr.message }), { status: 500, headers })

    // Generate AI brief async (fire and update)
    generateBrief(name.trim(), type || '', known_works).then(async (ai) => {
      if (!ai) return
      await client.from('ministry_sources').update({
        brief: ai.brief,
        ministry_alignment: ai.ministry_alignment,
        cultural_tags: ai.cultural_tags,
        warnings: ai.warnings || null,
        ai_model_used: 'claude-haiku-4-5-20251001',
      }).eq('id', row.id)
    }).catch(() => {})

    return new Response(JSON.stringify({ source: row }), { status: 201, headers })
  }

  // ── PATCH: update source ─────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    let body: any
    try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers }) }

    const { id, ...updates } = body
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })

    const allowed: Record<string, boolean> = {
      status: true, brief: true, known_works: true, warnings: true,
      source_urls: true, public_domain: true, ministry_alignment: true,
      cultural_tags: true, review_notes: true, type: true,
    }
    const patch: Record<string, any> = {}
    for (const [k, v] of Object.entries(updates)) {
      if (allowed[k]) patch[k] = v
    }

    if (patch.status && ['safe','monitor','dangerous','rejected','pending'].includes(patch.status)) {
      patch.reviewed_at  = new Date().toISOString()
      patch.reviewed_by  = auth.userId
    }

    const { data, error } = await client
      .from('ministry_sources')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ source: data }), { status: 200, headers })
  }

  // ── DELETE: remove source ────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const url = new URL(req.url)
    const id  = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })

    const { error } = await client.from('ministry_sources').delete().eq('id', id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
}

export const config = { path: '/api/admin-sources' }
