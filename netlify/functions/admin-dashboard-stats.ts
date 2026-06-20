import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
function sb() { return createClient(sbUrl, sbKey) }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const supabase = sb()

  const now         = Date.now()
  const oneHourAgo  = new Date(now - 60 * 60 * 1000).toISOString()
  const oneDayAgo   = new Date(now - 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()

  try {
    const [
      spiritsCount,
      lesPendingCount,
      lesTriageRaw,
      candidatesPendingCount,
      candidatesHighCount,
      candidatesMediumCount,
      candidatesLowCount,
      todayApplied,
      todayRetrofitted,
      regionsRaw,
      gatewaysCount,
      gatewaysSpiritsRaw,
      scripturesCount,
      scripturesSpiritsRaw,
      hierarchyCount,
      companionsCount,
      libraryChunksCount,
      resourcesCount,
      recentResource,
      recent1hSuccesses,
      recent24hFailures,
      aiSpendToday,
      aiSpend7d,
      membersActive,
    ] = await Promise.all([
      // Spirits archive
      supabase
        .from('spirits')
        .select('*', { count: 'exact', head: true }),

      // LES queue
      supabase
        .from('library_enrichment_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),

      // LES triage breakdown — fetch _meta only
      supabase
        .from('library_enrichment_suggestions')
        .select('layer2_raw')
        .eq('status', 'pending'),

      // Candidates queue
      supabase
        .from('spirit_candidates')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),

      // Candidates confidence breakdown — server-side counts (avoids 1k row limit)
      supabase
        .from('spirit_candidates')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('confidence', 'high'),
      supabase
        .from('spirit_candidates')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('confidence', 'medium'),
      supabase
        .from('spirit_candidates')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('confidence', 'low'),

      // Today's approvals (LES applied in last 24h)
      supabase
        .from('library_enrichment_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'applied')
        .gte('applied_at', oneDayAgo),

      // Today's retrofits (LES with last_extraction_at in 24h, success only)
      supabase
        .from('library_enrichment_suggestions')
        .select('*', { count: 'exact', head: true })
        .gte('last_extraction_at', oneDayAgo)
        .is('last_extraction_error', null),

      // Body map coverage — distinct region_keys
      supabase
        .from('spirit_regions')
        .select('region_key'),

      // Gateways
      supabase
        .from('spirit_gateways')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('spirit_gateways')
        .select('spirit_id'),

      // Scriptures
      supabase
        .from('spirit_scriptures')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('spirit_scriptures')
        .select('spirit_id'),

      // Network
      supabase
        .from('spirit_hierarchy')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('spirit_companions')
        .select('*', { count: 'exact', head: true }),

      // Sources
      supabase
        .from('library_chunks')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('resources')
        .select('*', { count: 'exact', head: true }),

      // Most recent resource added
      supabase
        .from('resources')
        .select('created_at, title')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),

      // Recent successes (last hour)
      supabase
        .from('library_enrichment_suggestions')
        .select('*', { count: 'exact', head: true })
        .gte('last_extraction_at', oneHourAgo)
        .is('last_extraction_error', null),

      // Recent failures (last 24h, real failures only — exclude skips)
      supabase
        .from('library_enrichment_suggestions')
        .select('*', { count: 'exact', head: true })
        .gte('last_extraction_at', oneDayAgo)
        .not('last_extraction_error', 'is', null)
        .not('last_extraction_error', 'ilike', 'skipped:%'),

      // AI spend today (from ai_jobs.cost_estimate)
      supabase
        .from('ai_jobs')
        .select('cost_estimate')
        .gte('completed_at', oneDayAgo)
        .not('cost_estimate', 'is', null),

      // AI spend trailing 7 days
      supabase
        .from('ai_jobs')
        .select('cost_estimate')
        .gte('completed_at', sevenDaysAgo)
        .not('cost_estimate', 'is', null),

      // Active members (last_seen within 7 days, not unsubscribed)
      supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen', sevenDaysAgo)
        .eq('unsubscribed', false),
    ])

    // === COMPUTE DERIVED VALUES ===

    // LES triage breakdown
    const triage = { ready: 0, needsRead: 0, reject: 0, legacy: 0 }
    for (const row of (lesTriageRaw.data ?? [])) {
      const meta = (row as any)?.layer2_raw?._meta
      if (!meta) {
        triage.legacy++
        continue
      }
      const att = meta.target_spirit_attested
      if (att === false || att === 'false') {
        triage.reject++
      } else if (att === true || att === 'true') {
        if (meta.extraction_completeness === 'substantial') {
          triage.ready++
        } else {
          triage.needsRead++
        }
      }
    }

    // Body map: distinct region_keys mapped
    const distinctRegions = new Set(
      (regionsRaw.data ?? []).map((r: any) => r.region_key).filter(Boolean)
    )

    // Distinct spirits with gateways / scriptures
    const gatewaySpirits = new Set(
      (gatewaysSpiritsRaw.data ?? []).map((r: any) => r.spirit_id)
    ).size
    const scriptureSpirits = new Set(
      (scripturesSpiritsRaw.data ?? []).map((r: any) => r.spirit_id)
    ).size

    // AI spend sums
    const spendToday = (aiSpendToday.data ?? [])
      .reduce((s: number, r: any) => s + Number(r.cost_estimate ?? 0), 0)
    const spend7d = (aiSpend7d.data ?? [])
      .reduce((s: number, r: any) => s + Number(r.cost_estimate ?? 0), 0)

    // Most recent resource title + days ago
    const recentRes = (recentResource as any)?.data ?? null
    const recentResTitle = recentRes?.title ?? null
    let recentResDaysAgo: number | null = null
    if (recentRes?.created_at) {
      const ms = now - new Date(recentRes.created_at).getTime()
      recentResDaysAgo = Math.floor(ms / (24 * 60 * 60 * 1000))
    }

    // === ASSEMBLE RESPONSE ===

    const result = {
      generatedAt: new Date(now).toISOString(),
      row1: {
        spirits: { count: spiritsCount.count ?? 0 },
        enrichment: {
          count: lesPendingCount.count ?? 0,
          triage,
        },
        candidates: {
          count: candidatesPendingCount.count ?? 0,
          byConfidence: {
            high:   candidatesHighCount.count ?? 0,
            medium: candidatesMediumCount.count ?? 0,
            low:    candidatesLowCount.count ?? 0,
          },
        },
        today: {
          spiritsApproved: todayApplied.count ?? 0,
          retrofitted: todayRetrofitted.count ?? 0,
        },
      },
      row2: {
        bodyMap: { mapped: distinctRegions.size, total: 80 },
        gateways: { count: gatewaysCount.count ?? 0, spirits: gatewaySpirits },
        scriptures: { count: scripturesCount.count ?? 0, spirits: scriptureSpirits },
        network: {
          hierarchy: hierarchyCount.count ?? 0,
          companions: companionsCount.count ?? 0,
        },
      },
      row3: {
        libraryChunks: { count: libraryChunksCount.count ?? 0 },
        resources: {
          count: resourcesCount.count ?? 0,
          recentTitle: recentResTitle,
          recentDaysAgo: recentResDaysAgo,
        },
        recentExtractions: {
          successesLastHour: recent1hSuccesses.count ?? 0,
          failuresLast24h: recent24hFailures.count ?? 0,
        },
      },
      row4: {
        failures24h: recent24hFailures.count ?? 0,
        aiSpendToday: Number(spendToday.toFixed(2)),
        aiSpend7d: Number(spend7d.toFixed(2)),
        membersActive7d: membersActive.count ?? 0,
      },
    }

    return new Response(JSON.stringify(result), { status: 200, headers: CORS })

  } catch (err: any) {
    console.error('[admin-dashboard-stats] unhandled error:', err)
    return new Response(
      JSON.stringify({ error: 'stats_query_failed', detail: String(err?.message ?? err) }),
      { status: 500, headers: CORS }
    )
  }
}

export const config = { path: '/api/admin-dashboard-stats' }
