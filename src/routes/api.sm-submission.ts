import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin2 } from '../../netlify/functions/_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

export const Route = createFileRoute('/api/sm-submission')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sb = createClient(supabaseUrl!, supabaseServiceKey!)
        const { regionId, assessmentId, submitted_by, submitted_by_name } = await request.json()
        if (!regionId) return Response.json({ error: 'regionId required' }, { status: 400 })
        const { data, error } = await sb.from('sm_submissions').insert({
          region_id: regionId, assessment_id: assessmentId,
          submitted_by, submitted_by_name, admin_status: 'pending',
        }).select('id').single()
        if (error) return Response.json({ error: error.message }, { status: 500 })
        await sb.from('sm_regions').update({ status: 'submitted' }).eq('id', regionId)
        return Response.json({ submission: data })
      },
      GET: async ({ request }) => {
        const sb = createClient(supabaseUrl!, supabaseServiceKey!)
        const url = new URL(request.url)
        const userId = url.searchParams.get('userId')
        const pending = url.searchParams.get('pending') === 'true'
        let query = sb.from('sm_submissions').select('id, submitted_at, admin_status, admin_notes, region:sm_regions(name)')
        if (userId) query = query.eq('submitted_by', userId)
        if (pending) query = query.eq('admin_status', 'pending')
        query = query.order('submitted_at', { ascending: false })
        const { data, error } = await query
        if (error) return Response.json({ error: error.message }, { status: 500 })
        return Response.json({ submissions: data || [] })
      },
      PATCH: async ({ request }) => {
        const auth = await requireAdmin2(request)
        if (auth instanceof Response) return auth
        const sb = createClient(supabaseUrl!, supabaseServiceKey!)
        const { id, admin_status, admin_notes, regionId } = await request.json()
        if (!id) return Response.json({ error: 'id required' }, { status: 400 })
        await sb.from('sm_submissions').update({ admin_status, admin_notes, reviewed_at: new Date().toISOString() }).eq('id', id)
        if (admin_status === 'approved' && regionId) {
          await sb.from('sm_regions').update({ admin_approved: true, status: 'approved' }).eq('id', regionId)
        }
        return Response.json({ ok: true })
      },
    },
  },
})
