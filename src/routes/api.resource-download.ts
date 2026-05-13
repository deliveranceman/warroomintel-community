import { createFileRoute } from '@tanstack/react-router'

const SUPABASE_URL         = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const SUPABASE_BUCKET      = process.env.SUPABASE_BUCKET || 'resources'
const SIGNED_URL_EXPIRY    = parseInt(process.env.SUPABASE_SIGNED_URL_EXPIRY || '14400')

const TIER_ORDER: Record<string, number> = { Free: 0, Soldier: 1, Commander: 2, General: 3 }

export const Route = createFileRoute('/api/resource-download')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
          return Response.json({ error: 'Supabase not configured — check env vars' }, { status: 500 })
        }

        let body: { filePath: string; memberTier?: string; fileTier: string }
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }

        const { filePath, memberTier = 'Free', fileTier } = body

        if (!filePath) {
          return Response.json({ error: 'filePath required' }, { status: 400 })
        }

        // Tier access check
        const memberLevel = TIER_ORDER[memberTier] ?? 0
        const fileLevel   = TIER_ORDER[fileTier]   ?? 0
        if (memberLevel < fileLevel) {
          return Response.json({ error: 'Insufficient tier access' }, { status: 403 })
        }

        // Strip any leading slashes from path
        const cleanPath = filePath.replace(/^\/+/, '')

        try {
          const endpoint = `${SUPABASE_URL}/storage/v1/object/sign/${SUPABASE_BUCKET}/${cleanPath}`

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_KEY,
            },
            body: JSON.stringify({ expiresIn: SIGNED_URL_EXPIRY }),
          })

          const responseText = await res.text()

          if (!res.ok) {
            return Response.json({
              error: `Supabase ${res.status}`,
              detail: responseText,
              debug: { endpoint, cleanPath, bucket: SUPABASE_BUCKET },
            }, { status: 502 })
          }

          let data: any
          try { data = JSON.parse(responseText) }
          catch { return Response.json({ error: 'Supabase non-JSON response', detail: responseText }, { status: 502 }) }

          // Handle both signedURL (older SDK) and signedUrl (newer SDK)
          const signedPath = data.signedURL || data.signedUrl || null

          if (!signedPath) {
            return Response.json({ error: 'No signed URL in response', detail: data }, { status: 500 })
          }

          // Build full URL — signedPath may already be absolute or just a path
          const fullUrl = signedPath.startsWith('http')
            ? signedPath
            : `${SUPABASE_URL}/storage/v1${signedPath}`

          return Response.json({ signedUrl: fullUrl, expiresIn: SIGNED_URL_EXPIRY })

        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 })
        }
      },
    },
  },
})
