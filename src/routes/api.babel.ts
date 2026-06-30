import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../netlify/functions/_shared/access'
import { mapArtifactRow } from '../../netlify/functions/_shared/artifactWrite'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
function sb() { return createClient(sbUrl, sbKey) }

// Tier 0: public identity — name, type, classification, summary, caution fields, image
// Tier 1+: body text, media, full relationship graph, extraction sources
const TIER_FIELDS: Record<number, string[]> = {
  0: [
    'id', 'slug', 'name', 'artifactType', 'status', 'classification', 'intelligenceOnly',
    'cautionLevel', 'cautionNote', 'subjectImageUrl', 'summary', 'firstAppearance', 'origin',
    'compiledBy', 'createdAt', 'updatedAt',
  ],
  1: ['body', 'aliases', 'ogImageUrl', 'details'],
}

function buildAllowSet(level: number): Set<string> {
  const s = new Set<string>()
  for (let l = 0; l <= Math.min(level, 1); l++) for (const k of TIER_FIELDS[l]) s.add(k)
  return s
}

function strip(obj: Record<string, any>, allowed: Set<string>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const k of allowed) if (k in obj) out[k] = obj[k]
  return out
}

const LIST_COLS = 'id,slug,name,artifact_type,status,classification,intelligence_only,caution_level,caution_note,published,subject_image_url,summary,first_appearance,origin,compiled_by,created_at,updated_at'
const FULL_COLS = `${LIST_COLS},aliases,body,og_image_url,details,sources_count,share_count`

export const Route = createFileRoute('/api/babel')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireAuth(request)
        if (auth instanceof Response) return auth

        const level   = Math.min(1, Math.max(0, auth.level))
        const allowed = buildAllowSet(level)
        const url     = new URL(request.url)
        const slug    = url.searchParams.get('slug') || ''

        const client = sb()

        // ── Single artifact by slug ─────────────────────────────────────
        if (slug) {
          const { data, error } = await client
            .from('artifacts')
            .select(FULL_COLS)
            .eq('slug', slug)
            .eq('published', true)
            .maybeSingle()

          if (error) return Response.json({ error: error.message }, { status: 500 })
          if (!data)  return Response.json({ error: 'not_found' }, { status: 404 })

          const artifact = strip(mapArtifactRow(data), allowed)

          // Spirit links — always included (tier 0: ids only)
          const { data: spiritRows } = await client
            .from('artifact_spirits')
            .select('id,spirit_id,confidence,notes')
            .eq('artifact_id', data.id)
            .limit(30)

          // Media — tier 1+ only; intelligence_only items included but flagged for client gating
          let media: any[] = []
          if (level >= 1) {
            const { data: mediaRows } = await client
              .from('artifact_media')
              .select('id,media_type,url,embed_id,title,intelligence_only,sort_order')
              .eq('artifact_id', data.id)
              .order('sort_order', { ascending: true })
            media = mediaRows ?? []
          }

          // Relationships — tier 1+
          let relationships: any[] = []
          if (level >= 1) {
            const { data: relRows } = await client
              .from('artifact_relationships')
              .select('id,relationship_type,from_id,to_id,notes,strength')
              .or(`from_id.eq.${data.id},to_id.eq.${data.id}`)
              .limit(50)
            relationships = relRows ?? []
          }

          // Scriptures — tier 0 (reference text, not sensitive)
          const { data: scriptureRows } = await client
            .from('artifact_scriptures')
            .select('id,book,chapter,verse_start,verse_end,text,notes,sort_order')
            .eq('artifact_id', data.id)
            .order('sort_order', { ascending: true })
            .limit(20)

          return Response.json({
            artifact,
            spirits:       spiritRows ?? [],
            scriptures:    scriptureRows ?? [],
            media,
            relationships,
            lockedSections: level < 1 ? ['body', 'media', 'relationships', 'sources'] : [],
          })
        }

        // ── List (published only, optional type / search filter) ────────
        const type   = url.searchParams.get('type') || ''
        const search = (url.searchParams.get('search') || '').trim()
        const limit  = Math.min(100, parseInt(url.searchParams.get('limit') || '50', 10))
        const offset = parseInt(url.searchParams.get('offset') || '0', 10)

        let q = client.from('artifacts')
          .select(LIST_COLS, { count: 'exact' })
          .eq('published', true)
        if (type)   q = q.eq('artifact_type', type)
        if (search) q = q.ilike('name', `%${search}%`)

        const { data, error, count } = await q
          .order('name', { ascending: true })
          .range(offset, offset + limit - 1)

        if (error) return Response.json({ error: error.message }, { status: 500 })

        const artifacts = (data ?? []).map(row => strip(mapArtifactRow(row), allowed))
        return Response.json({ artifacts, total: count ?? 0 })
      },
    },
  },
})
