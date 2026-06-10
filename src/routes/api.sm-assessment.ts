import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { requireTier } from '../../netlify/functions/_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

// Columns this endpoint is permitted to write. Server-managed columns
// (id, user_id, region_id, created_at, updated_at, generated_at,
// generation_count, last_generated_by) are NOT here — they are set by the
// server or fixed at creation, never from the request body.
const WRITABLE_FIELDS = [
  's1_description', 's1_population', 's1_church_unity',
  's2_ancient_peoples', 's2_bloodshed_events', 's2_masonic_history', 's2_founding_covenants',
  's2_environmental_devastation', 's2_broken_treaties', 's2_false_religion_history',
  's2_land_dedications', 's2_historical_timeline',
  's3_addiction_patterns', 's3_poverty_indicators', 's3_crime_patterns', 's3_occult_activity',
  's3_dominant_idols', 's3_church_division_notes',
  's4_prophetic_words', 's4_field_discernment', 's4_dreams_visions',
  's4_physical_manifestations', 's4_spiritual_atmosphere',
  's5_sites',
  's6_bloodshed_confirmed', 's6_bloodshed_details', 's6_idolatry_confirmed', 's6_idolatry_details',
  's6_broken_covenants_confirmed', 's6_broken_covenants_details',
  's6_sexual_perversion_confirmed', 's6_sexual_perversion_details', 's6_additional_legal_ground',
  's7_principalities',
  's8_redemptive_gift', 's8_gift_perversion', 's8_signs_of_hope',
  's8_gods_original_design', 's8_scripture_promise',
  's9_team_size', 's9_apostolic_covering', 's9_team_composition', 's9_operation_date',
  's9_prayer_cover_confirmed', 's9_personal_deliverance_confirmed',
  'sections_completed', 'completion_percent',
] as const

function pickWritable(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of WRITABLE_FIELDS) {
    if (key in body) out[key] = body[key]
  }
  return out
}

export const Route = createFileRoute('/api/sm-assessment')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireTier(request, 2, { allowBeta: 'spirit_mapper' })
        if (auth instanceof Response) return auth

        const sb = createClient(supabaseUrl!, supabaseServiceKey!)
        const body = await request.json()
        if (!body.region_id) return Response.json({ error: 'region_id required' }, { status: 400 })

        const { data, error } = await sb.from('sm_assessments').insert({
          ...pickWritable(body),
          region_id: body.region_id,
          user_id: auth.userId,
          updated_at: new Date().toISOString(),
        }).select('id').single()
        if (error) return Response.json({ error: error.message }, { status: 500 })
        return Response.json({ id: data.id })
      },
      PUT: async ({ request }) => {
        const auth = await requireTier(request, 2, { allowBeta: 'spirit_mapper' })
        if (auth instanceof Response) return auth

        const sb = createClient(supabaseUrl!, supabaseServiceKey!)
        const url = new URL(request.url)
        const id = url.searchParams.get('id')
        if (!id) return Response.json({ error: 'id required' }, { status: 400 })
        const body = await request.json()

        const { data, error } = await sb.from('sm_assessments').update({
          ...pickWritable(body),
          updated_at: new Date().toISOString(),
        }).eq('id', id).eq('user_id', auth.userId).select('id')
        if (error) return Response.json({ error: error.message }, { status: 500 })
        if (!data || data.length === 0) return Response.json({ error: 'not_found' }, { status: 404 })
        return Response.json({ ok: true })
      },
      GET: async ({ request }) => {
        const auth = await requireTier(request, 2, { allowBeta: 'spirit_mapper' })
        if (auth instanceof Response) return auth

        const sb = createClient(supabaseUrl!, supabaseServiceKey!)
        const url = new URL(request.url)
        const regionId = url.searchParams.get('regionId')
        if (!regionId) return Response.json({ error: 'regionId required' }, { status: 400 })
        const { data, error } = await sb.from('sm_assessments').select('*')
          .eq('region_id', regionId).eq('user_id', auth.userId)
          .order('created_at', { ascending: false }).limit(1).single()
        if (error && error.code !== 'PGRST116') return Response.json({ error: error.message }, { status: 500 })
        return Response.json({ assessment: data || null })
      },
    },
  },
})
