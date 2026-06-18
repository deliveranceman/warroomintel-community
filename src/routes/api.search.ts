import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, CORS } from '../../netlify/functions/_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

type SourceType = 'spirit' | 'library' | 'resource'

interface SearchHit {
  id: string
  type: SourceType
  title: string
  snippet: string
  meta?: string
  rank: number
  cite: {
    author?: string
    source?: string
    year?: string
    tier?: string
  }
  locked?: true
  requiredTier?: number
}

interface SearchGroup {
  type: SourceType
  label: string
  count: number
  items: SearchHit[]
}

interface SearchResponse {
  query: string
  userTier: number
  total: number
  timingMs: number
  groups: SearchGroup[]
}

function normalizeRanks(rows: Array<{ rank: number }>): void {
  if (!rows.length) return
  const maxRank = Math.max(...rows.map(r => r.rank), 1e-6)
  for (const row of rows) row.rank = row.rank / maxRank
}

export const Route = createFileRoute('/api/search')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const t0 = Date.now()

        const url = new URL(request.url)
        const rawQ = (url.searchParams.get('q') || '').trim()
        if (rawQ.length < 2) {
          return new Response(JSON.stringify({ error: 'query_too_short' }), { status: 400, headers: CORS })
        }
        if (rawQ.length > 200) {
          return new Response(JSON.stringify({ error: 'query_too_long' }), { status: 400, headers: CORS })
        }

        const rawLimit = parseInt(url.searchParams.get('limit') || '8', 10)
        const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 8, 1), 20)

        const typesParam = url.searchParams.get('types') || 'spirit,library,resource'
        const parsedTypes = typesParam
          .split(',')
          .map(t => t.trim())
          .filter((t): t is SourceType => t === 'spirit' || t === 'library' || t === 'resource')
        const allowedTypes: Set<SourceType> = parsedTypes.length
          ? new Set(parsedTypes)
          : new Set(['spirit', 'library', 'resource'] as SourceType[])

        const authRes = await requireAuth(request)
        if (authRes instanceof Response) return authRes
        const userTier = authRes.level

        const sb = createClient(supabaseUrl, supabaseServiceKey)

        const spiritPromise = allowedTypes.has('spirit')
          ? sb.rpc('search_spirits', { q: rawQ, lim: limit })
          : null
        const libraryPromise = allowedTypes.has('library')
          ? sb.rpc('search_library_chunks', { q: rawQ, lim: limit })
          : null
        const resourcePromise = allowedTypes.has('resource')
          ? sb.rpc('search_resources', { q: rawQ, lim: limit })
          : null

        const [spiritResult, libraryResult, resourceResult] = await Promise.all([
          spiritPromise,
          libraryPromise,
          resourcePromise,
        ])

        const groups: SearchGroup[] = []

        if (spiritResult) {
          const { data, error } = spiritResult
          if (error) console.error('[api.search] spirits rpc error:', error.message)
          const rows: any[] = data || []
          normalizeRanks(rows)
          groups.push({
            type: 'spirit',
            label: 'Spirits',
            count: rows.length,
            items: rows.map(r => ({
              id: String(r.id),
              type: 'spirit' as const,
              title: r.title || '',
              snippet: r.snippet || '',
              rank: r.rank,
              cite: {
                source: r.aka || undefined,
              },
            })),
          })
        }

        if (libraryResult) {
          const { data, error } = libraryResult
          if (error) console.error('[api.search] library rpc error:', error.message)
          const rows: any[] = data || []
          normalizeRanks(rows)
          groups.push({
            type: 'library',
            label: 'Library',
            count: rows.length,
            items: rows.map(r => ({
              id: String(r.id),
              type: 'library' as const,
              title: r.title || '',
              snippet: r.snippet || '',
              meta: r.chunk_index != null ? `ch. ${r.chunk_index}` : undefined,
              rank: r.rank,
              cite: {
                source: r.title || undefined,
              },
            })),
          })
        }

        if (resourceResult) {
          const { data, error } = resourceResult
          if (error) console.error('[api.search] resources rpc error:', error.message)
          const rows: any[] = data || []
          normalizeRanks(rows)
          groups.push({
            type: 'resource',
            label: 'Arsenal',
            count: rows.length,
            items: rows.map(r => {
              const tierLvl: number = typeof r.tier_level === 'number' ? r.tier_level : 0
              const locked = tierLvl > userTier
              const hit: SearchHit = {
                id: String(r.id),
                type: 'resource',
                title: r.title || '',
                snippet: locked ? '' : (r.snippet || ''),
                rank: r.rank,
                cite: {
                  author: r.author || undefined,
                  source: r.category || undefined,
                  tier: r.tier_label || undefined,
                },
              }
              if (r.source_type) hit.meta = r.source_type
              if (locked) {
                hit.locked = true
                hit.requiredTier = tierLvl
              }
              return hit
            }),
          })
        }

        const total = groups.reduce((s, g) => s + g.count, 0)
        const timingMs = Date.now() - t0

        const response: SearchResponse = {
          query: rawQ,
          userTier,
          total,
          timingMs,
          groups,
        }

        return Response.json(response)
      },
    },
  },
})
