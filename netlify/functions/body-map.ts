import { createClient } from '@supabase/supabase-js'
import { requireTier, requireAdmin2 } from './_shared/access'
import { checkAndIncrementUsage, getUpgradeMessage } from '../lib/ai-rate-limit'
import { cleanAIOutput } from '../lib/clean-ai-output'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS })
}

// ── Ask SOL — pastoral analysis of a region (claude-sonnet-4-5, 600 tok, 20s) ──
async function askSol(ctx: { name: string; tag: string; overview: string; spirits: string[]; scriptures: string[] }): Promise<string> {
  const system = `You are SOL, a deliverance-ministry intelligence analyst for the War Room.
You help Commander-tier ministers prepare for sessions by analyzing how spiritual forces
manifest at specific regions of the body. You speak from Scripture and deliverance-ministry
practice — name spirits, legal grounds, and Scripture references specifically, never vaguely.
You are pastoral and sober, never sensational. This is for prayer preparation and pastoral
discernment only — never medical diagnosis.`

  const user = `Region: ${ctx.name}${ctx.tag ? ` — ${ctx.tag}` : ''}
${ctx.overview ? `\nDocumented manifestations:\n${ctx.overview}` : ''}
${ctx.spirits.length ? `\nCorrelated spirits: ${ctx.spirits.join(', ')}` : ''}
${ctx.scriptures.length ? `\nScripture references on file: ${ctx.scriptures.join('; ')}` : ''}

Give a concise field analysis for a minister about to do a session, covering:
1. What this region commonly indicates spiritually when symptoms or oppression present here.
2. The most likely spirits or legal grounds to test for.
3. One or two Scripture anchors with Book Chapter:Verse.
4. A short prayer or renunciation direction.

Keep it tight and practical. Plain prose with short labeled points — no JSON, no markdown fences.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 600,
      system,
      messages: [{ role: 'user', content: user }],
    }),
    signal: AbortSignal.timeout(20000),
  })

  if (!res.ok) throw new Error(`Claude error ${res.status}`)
  const data = await res.json()
  return cleanAIOutput((data.content?.[0]?.text || '').trim())
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const url = new URL(req.url)
  const action = url.searchParams.get('action') || 'atlas'

  // ── WRITES (admin marker calibration) — minister/admin only ─────────────────
  if (req.method === 'PATCH') {
    const auth = await requireAdmin2(req)
    if (auth instanceof Response) return auth
    if (action !== 'marker') return json({ error: 'Unknown action' }, 400)

    let body: any
    try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
    const { region_key, x_percent, y_percent, female } = body || {}
    if (!region_key || typeof x_percent !== 'number' || typeof y_percent !== 'number') {
      return json({ error: 'region_key, x_percent, y_percent required' }, 400)
    }
    const patch = female
      ? { fx_percent: x_percent, fy_percent: y_percent }
      : { x_percent, y_percent }
    const { data, error } = await sb().from('anatomy_regions').update(patch).eq('region_key', region_key).select().single()
    if (error) return json({ error: error.message }, 500)
    return json({ region: data })
  }

  // ── POST ?action=ask-sol — Commander+ ───────────────────────────────────────
  if (req.method === 'POST') {
    const auth = await requireTier(req, 2)
    if (auth instanceof Response) return auth
    if (action !== 'ask-sol') return json({ error: 'Unknown action' }, 400)

    const usage = await checkAndIncrementUsage(auth.userId, auth.tier || 'commander', 'spirit_mapping', auth.level)
    if (!usage.allowed) {
      return json({ error: getUpgradeMessage(auth.tier || 'commander', 'spirit_mapping'), rateLimited: true, limit: usage.limit, remaining: 0 }, 429)
    }

    let body: any
    try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
    const regionKey = body?.regionKey
    if (!regionKey) return json({ error: 'regionKey required' }, 400)

    const client = sb()
    const { data: region } = await client.from('anatomy_regions').select('*').eq('region_key', regionKey).single()
    if (!region) return json({ error: 'Region not found' }, 404)

    const { data: corrs } = await client
      .from('spirit_regions')
      .select('spirit:spirits!spirit_id(name), scripture_reference, correlation_strength')
      .eq('region_key', regionKey)
      .order('correlation_strength', { ascending: false })
      .limit(8)

    const spirits    = (corrs || []).map((c: any) => (c.spirit as any)?.name).filter(Boolean)
    const scriptures = (corrs || []).map((c: any) => c.scripture_reference).filter(Boolean)

    try {
      const analysis = await askSol({
        name: region.display_name,
        tag: region.spiritual_tag || '',
        overview: region.overview || '',
        spirits,
        scriptures,
      })

      if (auth.userId && supabaseUrl && supabaseServiceKey) {
        fetch(`${supabaseUrl}/rest/v1/ai_search_history`, {
          method: 'POST',
          headers: { apikey: supabaseServiceKey, Authorization: `Bearer ${supabaseServiceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: auth.userId,
            tool: 'body_map',
            query: region.display_name,
            response: analysis.slice(0, 1000),
            context: { region_key: regionKey },
          }),
        }).catch(() => {})
      }

      return json({ analysis })
    } catch (e: any) {
      console.error('[body-map] ask-sol error:', e.message)
      return json({ error: e.message || 'Analysis failed' }, 500)
    }
  }

  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  // ── GET — Commander+ required ───────────────────────────────────────────────
  const auth = await requireTier(req, 2)
  if (auth instanceof Response) return auth
  const client = sb()

  // GET ?action=region&key=left_eye — full dossier
  if (action === 'region') {
    const key = url.searchParams.get('key')
    if (!key) return json({ error: 'key required' }, 400)

    const { data: region, error: rErr } = await client
      .from('anatomy_regions')
      .select('*, region_systems(system_key)')
      .eq('region_key', key)
      .single()
    if (rErr || !region) return json({ error: 'Region not found' }, 404)

    const [{ data: rawCorrs }, { data: condRows }] = await Promise.all([
      client
        .from('spirit_regions')
        .select('*, spirit:spirits!spirit_id(id, name)')
        .eq('region_key', key)
        .order('correlation_strength', { ascending: false }),
      client
        .from('condition_regions')
        .select('relevance_strength, conditions(condition_key, display_name, system, symptoms, author_conclusion, spiritual_tags, source_strength)')
        .eq('region_key', key),
    ])

    const correlations = (rawCorrs || []).map((c: any) => ({ ...c, spirit_name: c.spirit?.name ?? null }))
    const scriptures = correlations
      .filter((c: any) => c.scripture_reference)
      .map((c: any) => ({ spirit_name: c.spirit_name, reference: c.scripture_reference }))

    const conditions = (condRows || [])
      .map((cr: any) => {
        const c = cr.conditions
        if (!c) return null
        return {
          condition_key: c.condition_key,
          display_name: c.display_name,
          system: c.system,
          symptoms: c.symptoms,
          author_conclusion: c.author_conclusion,
          spiritual_tags: c.spiritual_tags || [],
          source_strength: c.source_strength,
          relevance_strength: cr.relevance_strength,
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) =>
        (b.relevance_strength || 0) - (a.relevance_strength || 0) ||
        (b.source_strength || 0) - (a.source_strength || 0))

    return json({
      region: {
        ...region,
        systems: (region.region_systems || []).map((rs: any) => rs.system_key),
      },
      correlations,
      scriptures,
      conditions,
    })
  }

  // GET ?action=atlas — systems + regions (joined with systems + correlation counts)
  const [{ data: systems }, { data: regions }, { data: corrCounts }, { data: condCounts }] = await Promise.all([
    client.from('body_systems').select('*'),
    client.from('anatomy_regions').select('*, region_systems(system_key)').eq('active', true).order('sort_order', { ascending: true }),
    client.from('spirit_regions').select('region_key'),
    client.from('condition_regions').select('region_key'),
  ])

  const countByRegion: Record<string, number> = {}
  for (const c of corrCounts || []) countByRegion[(c as any).region_key] = (countByRegion[(c as any).region_key] || 0) + 1

  const condByRegion: Record<string, number> = {}
  for (const c of condCounts || []) condByRegion[(c as any).region_key] = (condByRegion[(c as any).region_key] || 0) + 1

  const shapedRegions = (regions || []).map((r: any) => ({
    ...r,
    systems: (r.region_systems || []).map((rs: any) => rs.system_key),
    correlation_count: countByRegion[r.region_key] || 0,
    condition_count: condByRegion[r.region_key] || 0,
    region_systems: undefined,
  }))

  return json({ systems: systems || [], regions: shapedRegions })
}

export const config = { path: '/api/body-map' }
