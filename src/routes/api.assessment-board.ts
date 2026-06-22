import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

export const Route = createFileRoute('/api/assessment-board')({
  server: {
    handlers: {
      GET: async () => {
        const sb = createClient(supabaseUrl!, supabaseServiceKey!)
        try {
          const { data, error } = await sb
            .from('deliverance_assessments')
            .select('id, published_title, war_strategy, ai_summary, submitted_at')
            .eq('status', 'published')
            .order('submitted_at', { ascending: false })
            .limit(50)

          if (error) return Response.json({ error: error.message }, { status: 500 })

          const posts = (data || [])
            .filter((r: any) => r.published_title && r.war_strategy)
            .map((r: any) => ({
              id: r.id,
              title: r.published_title,
              response: r.war_strategy,
              aiSummary: r.ai_summary || '',
              submittedAt: r.submitted_at,
            }))

          return Response.json({ posts })
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 })
        }
      },
    },
  },
})
