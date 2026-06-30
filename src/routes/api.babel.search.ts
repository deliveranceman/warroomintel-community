// Route: /api/babel/search
// Query params:
//   q      — search query (required, 2–200 chars)
//   type   — artifact_type filter (optional)
//   limit  — max hits returned (default 20, max 50)
//
// Strategy: parallel FTS (search_tsv) + semantic (pgvector via RPC).
// Results are deduped by id, scores normalized 0–1, combined:
//   combined_score = 0.4 × fts_score + 0.6 × semantic_score
// Auth: requireAuth — Watchman tier 0+ (any authenticated user).
// Returns empty hits array gracefully when artifacts table is empty.

import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, CORS } from '../../netlify/functions/_shared/access'
import { embedTexts } from '../../netlify/functions/_shared/embedSpirit'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
function sb() { return createClient(sbUrl, sbKey) }

const FTS_WEIGHT      = 0.4
const SEMANTIC_WEIGHT = 0.6
const INTERNAL_LIMIT  = 40 // fetch more than client limit to allow dedup headroom

interface BabelHit {
  id:               string
  slug:             string
  name:             string
  artifactType:     string
  classification:   string
  cautionLevel:     number | null
  subjectImageUrl:  string | null
  summary:          string | null
  fts_score:        number
  semantic_score:   number
  combined_score:   number
}

function normalise(vals: number[]): number[] {
  const max = Math.max(...vals, 1e-9)
  return vals.map(v => v / max)
}

export const Route = createFileRoute('/api/babel/search')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireAuth(request)
        if (auth instanceof Response) return auth

        const url   = new URL(request.url)
        const rawQ  = (url.searchParams.get('q') || '').trim()
        const type  = (url.searchParams.get('type') || '').trim()
        const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))

        if (rawQ.length < 2)  return new Response(JSON.stringify({ error: 'query_too_short' }),  { status: 400, headers: CORS })
        if (rawQ.length > 200) return new Response(JSON.stringify({ error: 'query_too_long' }),  { status: 400, headers: CORS })

        const t0 = Date.now()
        const client = sb()

        // ── FTS ──────────────────────────────────────────────────────────────
        const ftsPromise = (async () => {
          let q = client
            .from('artifacts')
            .select('id,slug,name,artifact_type,classification,caution_level,subject_image_url,summary')
            .eq('published', true)
            .textSearch('search_tsv', rawQ, { type: 'websearch', config: 'english' })
            .limit(INTERNAL_LIMIT)
          if (type) q = q.eq('artifact_type', type)
          const { data, error } = await q
          if (error) console.error('[api.babel.search] FTS error:', error.message)
          return (data ?? []) as any[]
        })()

        // ── Semantic ─────────────────────────────────────────────────────────
        const semanticPromise = (async () => {
          const apiKey = process.env.OPENAI_API_KEY || ''
          if (!apiKey) return []
          let queryVec: number[][]
          try {
            queryVec = await embedTexts(apiKey, rawQ)
          } catch (e: any) {
            console.error('[api.babel.search] embed error:', e.message)
            return []
          }
          const { data, error } = await client.rpc('match_artifacts_semantic', {
            query_embedding: queryVec[0],
            match_count:     INTERNAL_LIMIT,
            filter_type:     type,
          })
          if (error) console.error('[api.babel.search] semantic rpc error:', error.message)
          return (data ?? []) as any[]
        })()

        const [ftsRows, semanticRows] = await Promise.all([ftsPromise, semanticPromise])

        // ── Merge + score ────────────────────────────────────────────────────
        const byId = new Map<string, BabelHit>()

        const ftsNorm = normalise(ftsRows.map((_: any, i: number) =>
          ftsRows.length - i  // positional rank: first hit is highest
        ))

        ftsRows.forEach((r: any, i: number) => {
          byId.set(r.id, {
            id:              r.id,
            slug:            r.slug,
            name:            r.name,
            artifactType:    r.artifact_type,
            classification:  r.classification,
            cautionLevel:    r.caution_level ?? null,
            subjectImageUrl: r.subject_image_url ?? null,
            summary:         r.summary ?? null,
            fts_score:       ftsNorm[i],
            semantic_score:  0,
            combined_score:  0,
          })
        })

        // similarity is already 0–1 (cosine), normalise across set
        const semNorm = normalise(semanticRows.map((r: any) => Math.max(0, r.similarity ?? 0)))

        semanticRows.forEach((r: any, i: number) => {
          const existing = byId.get(r.id)
          if (existing) {
            existing.semantic_score = semNorm[i]
          } else {
            byId.set(r.id, {
              id:              r.id,
              slug:            r.slug,
              name:            r.name,
              artifactType:    r.artifact_type,
              classification:  r.classification,
              cautionLevel:    r.caution_level ?? null,
              subjectImageUrl: r.subject_image_url ?? null,
              summary:         r.summary ?? null,
              fts_score:       0,
              semantic_score:  semNorm[i],
              combined_score:  0,
            })
          }
        })

        // Combined score + sort
        const hits: BabelHit[] = Array.from(byId.values()).map(h => ({
          ...h,
          combined_score: FTS_WEIGHT * h.fts_score + SEMANTIC_WEIGHT * h.semantic_score,
        }))
        hits.sort((a, b) => b.combined_score - a.combined_score)

        return Response.json({
          query:    rawQ,
          hits:     hits.slice(0, limit),
          total:    hits.length,
          timingMs: Date.now() - t0,
        }, { headers: CORS })
      },
    },
  },
})
