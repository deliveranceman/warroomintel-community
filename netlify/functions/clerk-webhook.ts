import crypto from 'crypto'
import { Webhook } from 'svix'
import { StreamChat } from 'stream-chat'
import { sendEmail, wriEmailTemplate } from './_shared/sendEmail'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

const TIER_LEVEL: Record<string, number> = {
  watchman: 0, free: 0, soldier: 1, charter_soldier: 1,
  commander: 2, charter_commander: 2, general: 3, founding_general: 3, minister: 4,
}

function tierNum(tier: string): number {
  return TIER_LEVEL[(tier || '').toLowerCase()] ?? 0
}

const STREAM_CHANNELS = [
  { id: 'war-room-general',   name: 'War Room Community', minTier: 0 },
  { id: 'field-reports-live', name: 'Field Reports Live',  minTier: 1 },
  { id: 'commanders-room',    name: 'Commanders Room',     minTier: 2 },
  { id: 'generals-table',     name: "General's Table",     minTier: 3 },
]

async function addUserToStreamChannels(client: StreamChat, streamUserId: string, tier: string) {
  const level = tierNum(tier)
  const eligible = STREAM_CHANNELS.filter(ch => level >= ch.minTier)
  for (const ch of eligible) {
    try {
      const channel = client.channel('messaging', ch.id)
      await channel.addMembers([streamUserId])
      console.log(`[clerk-webhook] Added ${streamUserId} to ${ch.id}`)
    } catch (e: any) {
      console.error(`[clerk-webhook] Failed to add ${streamUserId} to ${ch.id}:`, e.message)
    }
  }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[clerk-webhook] CLERK_WEBHOOK_SECRET not set')
    return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), { status: 500, headers: HEADERS })
  }

  // Verify Svix signature
  const svixId        = req.headers.get('svix-id') ?? ''
  const svixTimestamp = req.headers.get('svix-timestamp') ?? ''
  const svixSignature = req.headers.get('svix-signature') ?? ''

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response(JSON.stringify({ error: 'Missing Svix headers' }), { status: 400, headers: HEADERS })
  }

  const body = await req.text()
  let event: any
  try {
    const wh = new Webhook(webhookSecret)
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    })
  } catch (err: any) {
    console.error('[clerk-webhook] Signature verification failed:', err.message)
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400, headers: HEADERS })
  }

  const { type, data } = event
  console.log('[clerk-webhook] Event:', type)

  const _stream = JSON.parse(process.env.STREAM || '{}')
  const streamApiKey    = _stream.apiKey
  const streamApiSecret = _stream.apiSecret

  try {
    if (type === 'user.created') {
      const { id, first_name, last_name, email_addresses } = data
      const email = email_addresses?.[0]?.email_address || ''
      const name  = `${first_name || ''} ${last_name || ''}`.trim() || email || 'Warrior'
      const tier  = 'general' // BETA: all new users start at general

      // 1. Set default Clerk publicMetadata
      await fetch(`https://api.clerk.com/v1/users/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ public_metadata: { tier } }),
      })
      console.log(`[clerk-webhook] Set tier=general (beta default) for ${id}`)

      if (streamApiKey && streamApiSecret) {
        const client = new StreamChat(streamApiKey, streamApiSecret)
        const streamUserId = id.replace(/[^a-zA-Z0-9_-]/g, '_')

        // 2. Upsert user in Stream Chat — required before addMembers
        await client.upsertUser({ id: streamUserId, name, role: 'user' })

        // 3. Add to war-room-general (all tiers)
        await addUserToStreamChannels(client, streamUserId, tier)
        console.log(`[clerk-webhook] Stream setup complete for ${streamUserId}`)

        // 4. Upsert into Stream Feeds (fire-and-forget — separate API from Chat)
        const feedsJWT = (() => {
          const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
          const p = Buffer.from(JSON.stringify({ resource: '*', action: '*', feed_id: '*' })).toString('base64url')
          const s = crypto.createHmac('sha256', streamApiSecret).update(`${h}.${p}`).digest('base64url')
          return `${h}.${p}.${s}`
        })()
        fetch(`https://us-east-api.stream-io-api.com/api/v1.0/users/?api_key=${streamApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': feedsJWT, 'Stream-Auth-Type': 'jwt' },
          body: JSON.stringify({ users: [{ id: streamUserId, name }] }),
        }).catch(e => console.error('[clerk-webhook] Feeds upsert error:', e))
      }

      // 5. Welcome email
      if (email) {
        sendEmail({
          to: email,
          subject: '⚔ Welcome to War Room Intel — Your Access Is Confirmed',
          html: wriEmailTemplate({
            title: 'Welcome to the War Room',
            body: `
              <p>Warrior,</p>
              <p>Your account has been created and you now have access to War Room Intel — the ministry intelligence platform built for deliverance ministers.</p>
              <p><strong style="color:#C9A84C;">What's available to you now:</strong></p>
              <ul style="padding-left:20px;margin:12px 0;">
                <li>Daily Brief — morning prayer, scripture, and devotional</li>
                <li>Intel Archive — 300+ spirit dossiers</li>
                <li>Ask SOL — AI ministry intelligence assistant</li>
                <li>War Room Community — connect with other warriors</li>
              </ul>
              <p>Upgrade to Soldier or higher to unlock deliverance sessions, case files, and full AI access.</p>
            `,
            ctaText: 'Enter the War Room',
            ctaUrl: 'https://warroomintel.com/community',
          }),
        }).catch(e => console.error('[clerk-webhook] Welcome email error:', e))
      }
    }

    if (type === 'user.updated') {
      // Re-sync channel membership if tier changed
      const { id, public_metadata } = data
      const tier = (public_metadata?.tier as string) || 'watchman'

      if (streamApiKey && streamApiSecret) {
        const client = new StreamChat(streamApiKey, streamApiSecret)
        const streamUserId = id.replace(/[^a-zA-Z0-9_-]/g, '_')
        const firstName = data.first_name || ''
        const lastName  = data.last_name  || ''
        const name = `${firstName} ${lastName}`.trim() || 'Warrior'

        await client.upsertUser({ id: streamUserId, name, role: 'user' })
        await addUserToStreamChannels(client, streamUserId, tier)
        console.log(`[clerk-webhook] Updated Stream membership for ${streamUserId} at tier=${tier}`)
      }
    }
  } catch (err: any) {
    console.error('[clerk-webhook] Handler error:', err.message)
    // Return 200 so Clerk doesn't retry — log the error instead
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/clerk-webhook' }
