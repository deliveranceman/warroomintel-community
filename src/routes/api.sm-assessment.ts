import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

export const Route = createFileRoute('/api/sm-assessment')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sb = createClient(supabaseUrl!, supabaseServiceKey!)
        const body = await request.json()
        if (!body.region_id) return Response.json({ error: 'region_id required' }, { status: 400 })
        const { data, error } = await sb.from('sm_assessments').insert({
          ...body, updated_at: new Date().toISOString(),
        }).select('id').single()
        if (error) return Response.json({ error: error.message }, { status: 500 })
        return Response.json({ id: data.id })
      },
      PUT: async ({ request }) => {
        const sb = createClient(supabaseUrl!, supabaseServiceKey!)
        const url = new URL(request.url)
        const id = url.searchParams.get('id')
        if (!id) return Response.json({ error: 'id required' }, { status: 400 })
        const body = await request.json()
        const { error } = await sb.from('sm_assessments').update({
          ...body, updated_at: new Date().toISOString(),
        }).eq('id', id)
        if (error) return Response.json({ error: error.message }, { status: 500 })
        return Response.json({ ok: true })
      },
      GET: async ({ request }) => {
        const sb = createClient(supabaseUrl!, supabaseServiceKey!)
        const url = new URL(request.url)
        const regionId = url.searchParams.get('regionId')
        if (!regionId) return Response.json({ error: 'regionId required' }, { status: 400 })
        const { data, error } = await sb.from('sm_assessments').select('*').eq('region_id', regionId).order('created_at', { ascending: false }).limit(1).single()
        if (error && error.code !== 'PGRST116') return Response.json({ error: error.message }, { status: 500 })
        return Response.json({ assessment: data || null })
      },
    },
  },
})
