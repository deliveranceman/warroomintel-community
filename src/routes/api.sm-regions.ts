import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

export const Route = createFileRoute('/api/sm-regions')({
  server: {
    handlers: {
      GET: async () => {
        const sb = createClient(supabaseUrl!, supabaseServiceKey!)
        const { data, error } = await sb
          .from('sm_regions')
          .select('id, name, anchor_lat, anchor_lng, radius_miles, tier, status, admin_approved, redemptive_gift, population')
          .eq('admin_approved', true)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
        if (error) return Response.json({ error: error.message }, { status: 500 })
        return Response.json({ regions: data || [] })
      },
      POST: async ({ request }) => {
        const sb = createClient(supabaseUrl!, supabaseServiceKey!)
        const body = await request.json()
        const { name, anchor_lat, anchor_lng, radius_miles, tier, submitted_by, submitted_by_name } = body
        if (!name) return Response.json({ error: 'name required' }, { status: 400 })
        const { data, error } = await sb.from('sm_regions').insert({
          name, anchor_lat, anchor_lng, radius_miles: radius_miles || 40, tier: tier || 'local',
          status: 'draft', admin_approved: false, submitted_by, submitted_by_name,
        }).select('id, name, tier, status').single()
        if (error) return Response.json({ error: error.message }, { status: 500 })
        return Response.json({ region: data })
      },
    },
  },
})
