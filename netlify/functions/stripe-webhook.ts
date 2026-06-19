import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { StreamClient } from '@stream-io/node-sdk'
import { sendEmail, wriEmailTemplate } from './_shared/sendEmail'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

// Charter/founding plans are a BILLING fact, not an access tier.
// tier must always be a canonical ladder value (soldier/commander/general/…).
// founding + founding_plan carry the billing metadata separately.
interface PriceResolution {
  tier: string
  founding: boolean
  foundingPlan?: string
}

const FOUNDING_GENERAL_PRICE_ID = process.env.STRIPE_FOUNDING_GENERAL_PRICE_ID

function buildPriceResolution(): Record<string, PriceResolution> {
  const m: Record<string, PriceResolution> = {
    'price_1TXieT5V5uqVT9SoIrPMKSAc': { tier: 'soldier',   founding: false },
    'price_1TXifB5V5uqVT9SohnQfGZuC': { tier: 'commander', founding: false },
    'price_1TXifX5V5uqVT9SogXMp79zb': { tier: 'general',   founding: false },
    'price_1Tb1mO5V5uqVT9So3ZRRltDC': { tier: 'soldier',   founding: true, foundingPlan: 'charter_soldier' },
    'price_1Tb1ms5V5uqVT9Sodiu1xbrR': { tier: 'commander', founding: true, foundingPlan: 'charter_commander' },
  }
  if (FOUNDING_GENERAL_PRICE_ID) {
    m[FOUNDING_GENERAL_PRICE_ID] = { tier: 'general', founding: true, foundingPlan: 'founding_general' }
  }
  return m
}

const PRICE_RESOLUTION = buildPriceResolution()

function getSupabase() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

const STREAM_TIER_CHANNELS: Record<string, string[]> = {
  soldier:   ['war-room-general', 'field-reports-live'],
  commander: ['war-room-general', 'field-reports-live', 'commanders-room'],
  general:   ['war-room-general', 'field-reports-live', 'commanders-room', 'generals-table'],
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

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

interface FoundingExtra {
  founding: true
  founding_plan: string
}

function getFoundingExtra(resolution: PriceResolution): FoundingExtra | null {
  if (resolution.founding && resolution.foundingPlan) {
    return { founding: true, founding_plan: resolution.foundingPlan }
  }
  return null
}

// Read-merge-write: spreads existing public_metadata so no keys are clobbered.
// founding flag is sticky — once true it is never cleared by any subsequent event.
async function setClerkTierById(userId: string, tier: string, foundingExtra?: FoundingExtra | null) {
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
  }

  if (foundingExtra) {
    meta.founding      = true
    meta.founding_plan = foundingExtra.founding_plan
  }

  // Sticky: a lapsed founder who resubscribes keeps founding:true
  if (currentMeta.founding === true) {
    meta.founding = true
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

async function setClerkTier(email: string, tier: string, foundingExtra?: FoundingExtra | null) {
  const searchRes = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}&limit=1`,
    { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } }
  )
  if (!searchRes.ok) throw new Error('Clerk search failed')
  const users = await searchRes.json()
  if (!users.length) throw new Error(`No Clerk user found for ${email}`)
  return setClerkTierById(users[0].id, tier, foundingExtra)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    return new Response(JSON.stringify({ error: 'Server misconfigured: missing webhook secret' }), { status: 500, headers })
  }
  if (!sig) {
    return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), { status: 400, headers })
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

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const clerkUserId = session.client_reference_id
        const email = session.customer_details?.email || session.customer_email

        let resolvedPriceId = session.line_items?.data?.[0]?.price?.id
        if (!resolvedPriceId && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string)
          resolvedPriceId = sub.items.data[0]?.price?.id
        }

        const resolution = resolvedPriceId ? PRICE_RESOLUTION[resolvedPriceId] : null
        if (!resolution) { console.error('Unknown price ID:', resolvedPriceId); break }

        const foundingExtra = getFoundingExtra(resolution)
        const displayPlan: Record<string, string> = {
          charter_soldier: 'Charter Soldier', charter_commander: 'Charter Commander', founding_general: 'Founding General',
        }
        const tierDisplayNames: Record<string, string> = { soldier: 'Soldier', commander: 'Commander', general: 'General' }
        const tierName = (resolution.foundingPlan && displayPlan[resolution.foundingPlan]) || tierDisplayNames[resolution.tier] || resolution.tier

        let resolvedUserId: string | null = null

        if (clerkUserId) {
          await setClerkTierById(clerkUserId, resolution.tier, foundingExtra)
          await addToStreamChannels(clerkUserId, resolution.tier)
          resolvedUserId = clerkUserId
          console.log(`✅ Upgraded ${clerkUserId} to ${resolution.tier}${foundingExtra ? ` (${resolution.foundingPlan})` : ''}`)
        } else if (email) {
          resolvedUserId = await setClerkTier(email, resolution.tier, foundingExtra)
          if (resolvedUserId) await addToStreamChannels(resolvedUserId, resolution.tier)
          console.log(`✅ Upgraded ${email} to ${resolution.tier}${foundingExtra ? ` (${resolution.foundingPlan})` : ''} (email fallback)`)
        } else {
          console.error('No user identifier in checkout session')
          break
        }

        if (resolvedUserId && resolution.foundingPlan === 'founding_general') {
          const supabase = getSupabase()
          await supabase.from('founding_generals').upsert(
            { clerk_user_id: resolvedUserId, stripe_session_id: session.id },
            { onConflict: 'clerk_user_id' }
          )
        }

        if (email) {
          sendEmail({
            to: email,
            subject: `⚔ WRI ${tierName} Access Activated`,
            html: wriEmailTemplate({
              title: `${tierName} Access Activated`,
              body: `
                <p>Warrior,</p>
                <p>Your <strong style="color:#C9A84C;">${tierName}</strong> membership is now active.</p>
                <p>You now have access to everything your tier unlocks — head to the platform to explore your expanded capabilities.</p>
                <p style="font-size:12px;color:#9a8c74;">If you have any questions about your membership, reply to this email.</p>
              `,
              ctaText: 'Access Your War Room',
              ctaUrl: 'https://warroomintel.com/community',
            }),
          }).catch(e => console.error('[stripe-webhook] Upgrade email error:', e))
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const priceId = sub.items.data[0]?.price?.id
        const resolution = priceId ? PRICE_RESOLUTION[priceId] : null
        if (!resolution) break
        const customer = await stripe.customers.retrieve(sub.customer as string)
        const email = (customer as Stripe.Customer).email
        if (!email) break
        const userId = await setClerkTier(email, resolution.tier, getFoundingExtra(resolution))
        if (userId) await addToStreamChannels(userId, resolution.tier)
        console.log(`✅ Subscription updated ${email} → ${resolution.tier}`)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const email = invoice.customer_email
        if (!email) break
        const sub = await stripe.subscriptions.retrieve((invoice as any).subscription as string)
        const priceId = sub.items.data[0]?.price?.id
        const resolution = priceId ? PRICE_RESOLUTION[priceId] : null
        if (!resolution) break
        const userId = await setClerkTier(email, resolution.tier, getFoundingExtra(resolution))
        if (userId) await addToStreamChannels(userId, resolution.tier)
        console.log(`✅ Renewed ${email} at ${resolution.tier}`)
        break
      }

      // Downgrade to free — founding flag is preserved by the read-merge-write in setClerkTierById
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customer = await stripe.customers.retrieve(sub.customer as string)
        const email = (customer as Stripe.Customer).email
        if (!email) break
        await setClerkTier(email, 'free', null)
        console.log(`⬇ Downgraded ${email} to free (subscription cancelled)`)
        break
      }

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
