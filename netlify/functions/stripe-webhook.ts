import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { StreamClient } from '@stream-io/node-sdk'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const PRICE_TO_TIER: Record<string, string> = {
  'price_1TXieT5V5uqVT9SoIrPMKSAc': 'soldier',
  'price_1TXifB5V5uqVT9SohnQfGZuC': 'commander',
  'price_1TXifX5V5uqVT9SogXMp79zb': 'general',
  // Charter (founding member) prices — stored as charter_* so badge system can distinguish
  'price_1Tb1mO5V5uqVT9So3ZRRltDC': 'charter_soldier',
  'price_1Tb1ms5V5uqVT9Sodiu1xbrR': 'charter_commander',
}

const FOUNDING_GENERAL_PRICE_ID = process.env.STRIPE_FOUNDING_GENERAL_PRICE_ID

const CHARTER_PRICE_IDS = new Set([
  'price_1Tb1mO5V5uqVT9So3ZRRltDC',
  'price_1Tb1ms5V5uqVT9Sodiu1xbrR',
])

function getSupabase() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

const STREAM_TIER_CHANNELS: Record<string, string[]> = {
  soldier:          ['war-room-general', 'field-reports-live'],
  charter_soldier:  ['war-room-general', 'field-reports-live'],
  commander:        ['war-room-general', 'field-reports-live', 'commanders-room'],
  charter_commander:['war-room-general', 'field-reports-live', 'commanders-room'],
  general:          ['war-room-general', 'field-reports-live', 'commanders-room', 'generals-table'],
  founding_general: ['war-room-general', 'field-reports-live', 'commanders-room', 'generals-table'],
}

async function addToStreamChannels(clerkUserId: string, tier: string) {
  const _stream = JSON.parse(process.env.STREAM || '{}')
  const streamApiKey    = _stream.apiKey
  const streamApiSecret = _stream.apiSecret
  if (!streamApiKey || !streamApiSecret) return

  const channelIds = STREAM_TIER_CHANNELS[tier.toLowerCase()] || ['war-room-general']
  const streamUserId = clerkUserId.replace(/[^a-zA-Z0-9_-]/g, '_')

  try {
    const client = new StreamClient(streamApiKey, streamApiSecret)
    await client.upsertUsers([{ id: streamUserId, role: 'user' }])
    for (const channelId of channelIds) {
      await client.chat.channel('messaging', channelId).update({
        add_members: [{ user_id: streamUserId }],
      })
      console.log(`[stripe-webhook] Added ${streamUserId} to ${channelId}`)
    }
  } catch (e: any) {
    console.error('[stripe-webhook] Stream add failed:', e.message)
  }
}

async function resolveClerkUserId(email: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}&limit=1`,
      { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } }
    )
    if (!res.ok) return null
    const users = await res.json()
    return users[0]?.id ?? null
  } catch { return null }
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

async function setClerkTierById(userId: string, tier: string, extra?: Record<string, any>) {
  const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
  })
  if (!userRes.ok) throw new Error(`Clerk user fetch failed for ${userId}`)
  const userData = await userRes.json()
  const currentMeta = userData.public_metadata || {}

  const meta: Record<string, any> = {
    ...currentMeta,
    tier,
    stripeUpdatedAt: new Date().toISOString(),
    ...extra,
  }

  const updateRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ public_metadata: meta }),
  })
  if (!updateRes.ok) throw new Error('Clerk update failed')
  return userId
}

async function setClerkTier(email: string, tier: string, foundingMember?: boolean) {
  const searchRes = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}&limit=1`,
    { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } }
  )
  if (!searchRes.ok) throw new Error('Clerk search failed')
  const users = await searchRes.json()
  if (!users.length) throw new Error(`No Clerk user found for ${email}`)

  const extra = foundingMember !== undefined ? { foundingMember } : undefined
  return setClerkTierById(users[0].id, tier, extra)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return new Response(JSON.stringify({ error: 'Missing signature or secret' }), { status: 400, headers })
  }

  let event: Stripe.Event
  try {
    const body = await req.text()
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), { status: 400, headers })
  }

  console.log('Stripe webhook event:', event.type)

  try {
    switch (event.type) {

      // Payment succeeded — upgrade tier
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.CheckoutSession
        const clerkUserId = session.client_reference_id
        const email = session.customer_details?.email || session.customer_email

        // Get price ID from subscription or payment intent
        let resolvedPriceId = session.line_items?.data?.[0]?.price?.id
        if (!resolvedPriceId && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string)
          resolvedPriceId = sub.items.data[0]?.price?.id
        }

        // Check for founding general
        const isFoundingGeneral = resolvedPriceId && FOUNDING_GENERAL_PRICE_ID && resolvedPriceId === FOUNDING_GENERAL_PRICE_ID
        if (isFoundingGeneral) {
          const userId = clerkUserId || (email ? await resolveClerkUserId(email) : null)
          if (!userId) { console.error('No user ID for founding_general purchase'); break }
          await setClerkTierById(userId, 'general', { foundingGeneral: true, foundingGeneralAt: new Date().toISOString() })
          const supabase = getSupabase()
          await supabase.from('founding_generals').upsert({ clerk_user_id: userId, stripe_session_id: session.id }, { onConflict: 'clerk_user_id' })
          console.log(`✅ Founding General: ${userId}`)
          break
        }

        const tier = resolvedPriceId ? PRICE_TO_TIER[resolvedPriceId] : null
        if (!tier) { console.error('Unknown price ID:', resolvedPriceId); break }

        const isCharter = resolvedPriceId ? CHARTER_PRICE_IDS.has(resolvedPriceId) : false

        const charterExtra = isCharter ? { foundingMember: true, is_founder: true, charter_date: new Date().toISOString() } : undefined
        if (clerkUserId) {
          await setClerkTierById(clerkUserId, tier, charterExtra)
          await addToStreamChannels(clerkUserId, tier)
          console.log(`✅ Upgraded ${clerkUserId} to ${tier}${isCharter ? ' (charter)' : ''}`)
        } else if (email) {
          const userId = await setClerkTier(email, tier, isCharter)
          if (userId) await addToStreamChannels(userId, tier)
          console.log(`✅ Upgraded ${email} to ${tier}${isCharter ? ' (charter)' : ''} (email fallback)`)
        } else {
          console.error('No user identifier in checkout session')
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const priceId = sub.items.data[0]?.price?.id
        const tier = priceId ? PRICE_TO_TIER[priceId] : null
        if (!tier) break
        const customer = await stripe.customers.retrieve(sub.customer as string)
        const email = (customer as Stripe.Customer).email
        if (!email) break
        const userId = await setClerkTier(email, tier)
        if (userId) await addToStreamChannels(userId, tier)
        console.log(`✅ Subscription updated ${email} → ${tier}`)
        break
      }

      // Subscription renewed — keep tier active
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const email = invoice.customer_email
        if (!email) break

        const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
        const priceId = sub.items.data[0]?.price?.id
        const tier = priceId ? PRICE_TO_TIER[priceId] : null
        if (!tier) break

        const userId = await setClerkTier(email, tier)
        if (userId) await addToStreamChannels(userId, tier)
        console.log(`✅ Renewed ${email} at ${tier}`)
        break
      }

      // Subscription cancelled — downgrade to free
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customer = await stripe.customers.retrieve(sub.customer as string)
        const email = (customer as Stripe.Customer).email
        if (!email) break

        await setClerkTier(email, 'free')
        console.log(`⬇ Downgraded ${email} to free (subscription cancelled)`)
        break
      }

      // Payment failed — notify but keep tier for grace period
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`⚠ Payment failed for ${invoice.customer_email}`)
        // Stripe will retry — don't downgrade yet
        // After 3 failures Stripe fires customer.subscription.deleted
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (err: any) {
    console.error('Webhook handler error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers })
}

export const config = { path: '/api/stripe-webhook' }
