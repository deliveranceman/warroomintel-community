import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../netlify/functions/_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey, bucket: supabaseBucket } = JSON.parse(process.env.SUPABASE || '{}')

const TIER_ORDER: Record<string, number> = {
  Free: 0, Watchman: 0, Soldier: 1, Commander: 2, General: 3, Minister: 4, Commandant: 5,
  free: 0, watchman: 0, soldier: 1, commander: 2, general: 3, minister: 4, commandant: 5,
}

export const Route = createFileRoute('/api/resource')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authRes = await requireAuth(request)
        if (authRes instanceof Response) return authRes

        const reqUrl = new URL(request.url)
        const slugParam = reqUrl.searchParams.get('slug')
        const idParam   = reqUrl.searchParams.get('id')

        if (!slugParam && !idParam) {
          return Response.json({ error: 'slug or id required' }, { status: 400 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        let q = supabase
          .from('resources')
          .select('id, title, description, tier, category, topic, tags, file_path, file_type, file_size, source_type, created_at, slug, extracted_text')
          .eq('source_type', 'arsenal')

        if (slugParam) q = (q as any).eq('slug', slugParam)
        else           q = (q as any).eq('id', idParam!)

        const { data, error } = await (q as any).maybeSingle()

        if (error) return Response.json({ error: error.message }, { status: 500 })
        if (!data)  return Response.json({ error: 'not_found' },  { status: 404 })

        const userLevel     = authRes.level
        const resourceLevel = TIER_ORDER[(data.tier ?? '').toLowerCase()] ?? 0

        if (resourceLevel > userLevel) {
          const raw          = (data.description as string | null | undefined) || ''
          const lockedPreview = (raw.split('\n')[0] || raw).slice(0, 120).trimEnd()
          return Response.json({
            resource: {
              id:           data.id,
              title:        data.title,
              tier:         data.tier,
              category:     data.category,
              slug:         data.slug,
              lockedPreview,
              locked:       true,
            },
          })
        }

        let file_url: string | null = null
        if (data.file_path) {
          const bucketName = supabaseBucket || 'resources'
          const bucket     = (data.file_path as string).startsWith('user_') ? 'ministry-library' : bucketName
          const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(data.file_path, 3600)
          file_url = signed?.signedUrl ?? null
        }

        return Response.json({
          resource: { ...data, file_url, locked: false },
        })
      },
    },
  },
})
