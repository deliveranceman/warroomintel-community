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
          return Response.json({ error: 'Supabase not configured' }, { status: 500 })
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

        // Verify member tier has access to this file's tier
        const memberLevel = TIER_ORDER[memberTier] ?? 0
        const fileLevel   = TIER_ORDER[fileTier]   ?? 0

        if (memberLevel < fileLevel) {
          return Response.json({ error: 'Insufficient tier access' }, { status: 403 })
        }

        try {
          const res = await fetch(
            `${SUPABASE_URL}/storage/v1/object/sign/${SUPABASE_BUCKET}/${filePath}`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                apikey: SUPABASE_SERVICE_KEY,
              },
              body: JSON.stringify({ expiresIn: SIGNED_URL_EXPIRY }),
            }
          )

          if (!res.ok) {
            const detail = await res.text()
            return Response.json({ error: `Supabase ${res.status}`, detail }, { status: 502 })
          }

          const data = await res.json()
          const signedUrl = data.signedURL
            ? `${SUPABASE_URL}/storage/v1${data.signedURL}`
            : null

          if (!signedUrl) {
            return Response.json({ error: 'Failed to generate signed URL' }, { status: 500 })
          }

          return Response.json({ signedUrl, expiresIn: SIGNED_URL_EXPIRY })
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 })
        }
      },
    },
  },
})
