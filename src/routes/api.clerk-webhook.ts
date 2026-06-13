import { createFileRoute } from '@tanstack/react-router'
import { StreamClient } from '@stream-io/node-sdk'

const CLERK_SECRET_KEY    = process.env.CLERK_SECRET_KEY
const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

export const Route = createFileRoute('/api/clerk-webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // ── Verify Svix signature ─────────────────────────────────────────
        const svixId        = request.headers.get('svix-id')
        const svixTimestamp = request.headers.get('svix-timestamp')
        const svixSignature = request.headers.get('svix-signature')

        if (!svixId || !svixTimestamp || !svixSignature) {
          return Response.json({ error: 'Missing svix headers' }, { status: 400 })
        }

        const body = await request.text()

        if (!CLERK_WEBHOOK_SECRET) {
          return Response.json({ error: 'Webhook secret not configured' }, { status: 500 })
        }
        try {
          const { Webhook } = await import('svix')
          const wh = new Webhook(CLERK_WEBHOOK_SECRET)
          wh.verify(body, {
            'svix-id':        svixId,
            'svix-timestamp': svixTimestamp,
            'svix-signature': svixSignature,
          })
        } catch {
          return Response.json({ error: 'Invalid signature' }, { status: 401 })
        }

        // ── Handle event ──────────────────────────────────────────────────
        let payload: any
        try {
          payload = JSON.parse(body)
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }

        const { type, data } = payload
        console.log(`[clerk-webhook] ${type}`)

        if (type === 'user.created') {
          const userId = data?.id
          if (!userId || !CLERK_SECRET_KEY) {
            return Response.json({ received: true })
          }

          // 1. Set Clerk tier to Watchman
          try {
            const res = await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
                'Content-Type':  'application/json',
              },
              body: JSON.stringify({ public_metadata: { tier: 'Watchman' } }),
            })

            if (!res.ok) {
              const detail = await res.text()
              console.error(`[clerk-webhook] Failed to set tier for ${userId}:`, detail)
            } else {
              console.log(`[clerk-webhook] Set tier=Watchman for user ${userId}`)
            }
          } catch (err: any) {
            console.error(`[clerk-webhook] Error patching user:`, err.message)
          }

          // 2. Add user to war-room-general Stream channel
          const _stream = JSON.parse(process.env.STREAM || '{}')
          const streamApiKey    = _stream.apiKey
          const streamApiSecret = _stream.apiSecret
          if (streamApiKey && streamApiSecret) {
            try {
              const streamUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_')
              const client = new StreamClient(streamApiKey, streamApiSecret)

              // Upsert user in Stream
              const firstName = data?.first_name || ''
              const lastName  = data?.last_name || ''
              const name = `${firstName} ${lastName}`.trim() || 'Warrior'
              await client.upsertUsers([{ id: streamUserId, name, role: 'user' }])

              // Add to war-room-general
              const channel = client.chat.channel('messaging', 'war-room-general')
              await (channel as any).addMembers([{ user_id: streamUserId }])
              console.log(`[clerk-webhook] Added ${streamUserId} to war-room-general`)
            } catch (err: any) {
              console.error(`[clerk-webhook] Stream join failed for ${userId}:`, err.message)
            }
          }
        }

        return Response.json({ received: true, type })
      },
    },
  },
})
