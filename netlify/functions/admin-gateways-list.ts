import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
function sb() { return createClient(sbUrl, sbKey) }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const supabase = sb()

  try {
    // Single query with provenance LEFT JOIN.
    // source_suggestion_id is nullable, so the embed is disambiguated by FK name.
    const { data, error } = await supabase
      .from('spirit_gateways')
      .select(`
        id,
        gateway,
        gateway_key,
        notes,
        created_at,
        source_suggestion_id,
        spirits ( id, name, slug ),
        library_enrichment_suggestions!source_suggestion_id (
          id,
          spirit_name,
          resources ( id, title, author, is_adversarial )
        )
      `)
      .order('gateway', { ascending: true })

    if (error) throw error

    const rows = (data ?? []).map((row: any) => ({
      id: row.id,
      gateway: row.gateway,
      gateway_key: row.gateway_key,
      notes: row.notes,
      createdAt: row.created_at,
      spirit: row.spirits ? {
        id: row.spirits.id,
        name: row.spirits.name,
        slug: row.spirits.slug,
      } : null,
      provenance: row.library_enrichment_suggestions ? {
        lesId: row.library_enrichment_suggestions.id,
        resource: row.library_enrichment_suggestions.resources ? {
          id: row.library_enrichment_suggestions.resources.id,
          title: row.library_enrichment_suggestions.resources.title,
          author: row.library_enrichment_suggestions.resources.author,
          isAdversarial: row.library_enrichment_suggestions.resources.is_adversarial,
        } : null,
      } : null,
    }))

    return new Response(
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        total: rows.length,
        rows,
      }),
      { status: 200, headers: CORS }
    )
  } catch (err: any) {
    console.error('[admin-gateways-list] failed', err)
    return new Response(
      JSON.stringify({
        error: 'gateways_query_failed',
        detail: String(err?.message ?? err),
      }),
      { status: 500, headers: CORS }
    )
  }
}

export const config = { path: '/api/admin-gateways-list' }
