import type { Context } from '@netlify/functions'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
const clerkSecretKey = process.env.CLERK_SECRET_KEY!

const PRICE_TO_TIER: Record<string, string> = {
  'price_1TXieT5V5uqVT9SoIrPMKSAc': 'Soldier',
  'price_1TXifB5V5uqVT9SohnQfGZuC': 'Commander',
  'price_1TXifX5V5uqVT9SogXMp79zb': 'General',
}

async function setClerkTier(clerkUserId: string, tier: string) {
  const res = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}/metadata`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${clerkSecretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ public_metadata: { tier } }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Clerk metadata update failed: ${err}`)
  }
}

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const sig = req.headers.get('stripe-signature')
  if (!sig) return new Response('No signature', { status: 400 })

  let event: Stripe.Event
  try {
    const body = await req.text()
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const clerkUserId = session.metadata?.clerk_user_id || session.client_reference_id
      const priceId = session.line_items?.data?.[0]?.price?.id
      if (clerkUserId && priceId && PRICE_TO_TIER[priceId]) {
        await setClerkTier(clerkUserId, PRICE_TO_TIER[priceId])
        console.log(`Set tier ${PRICE_TO_TIER[priceId]} for user ${clerkUserId}`)
      }
    }

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription
      const clerkUserId = sub.metadata?.clerk_user_id
      const priceId = sub.items.data[0]?.price?.id
      if (clerkUserId && priceId && PRICE_TO_TIER[priceId]) {
        await setClerkTier(clerkUserId, PRICE_TO_TIER[priceId])
        console.log(`Set tier ${PRICE_TO_TIER[priceId]} for user ${clerkUserId}`)
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      const clerkUserId = sub.metadata?.clerk_user_id
      if (clerkUserId) {
        await setClerkTier(clerkUserId, 'Watchman')
        console.log(`Downgraded user ${clerkUserId} to Watchman`)
      }
    }

  } catch (err: any) {
    console.error('Webhook handler error:', err.message)
    return new Response('Handler error', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = { path: '/api/stripe-webhook' }
