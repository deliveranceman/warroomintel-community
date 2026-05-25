import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const PRICE_TO_TIER: Record<string, string> = {
  'price_1TXieT5V5uqVT9SoIrPMKSAc': 'soldier',
  'price_1TXifB5V5uqVT9SohnQfGZuC': 'commander',
  'price_1TXifX5V5uqVT9SogXMp79zb': 'general',
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

async function setClerkTier(email: string, tier: string) {
  // Find user by email
  const searchRes = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}&limit=1`,
    { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } }
  )
  if (!searchRes.ok) throw new Error('Clerk search failed')
  const users = await searchRes.json()
  if (!users.length) throw new Error(`No Clerk user found for ${email}`)

  const userId = users[0].id
  const currentMeta = users[0].public_metadata || {}

  // Update tier in publicMetadata, preserving existing fields
  const updateRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      public_metadata: {
        ...currentMeta,
        tier,
        stripeUpdatedAt: new Date().toISOString(),
      },
    }),
  })
  if (!updateRes.ok) throw new Error('Clerk update failed')
  return userId
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
        const email = session.customer_details?.email || session.customer_email
        const priceId = session.line_items?.data?.[0]?.price?.id

        if (!email) { console.error('No email in checkout session'); break }

        // Get price ID from subscription if not in session directly
        let resolvedPriceId = priceId
        if (!resolvedPriceId && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string)
          resolvedPriceId = sub.items.data[0]?.price?.id
        }

        const tier = resolvedPriceId ? PRICE_TO_TIER[resolvedPriceId] : null
        if (!tier) { console.error('Unknown price ID:', resolvedPriceId); break }

        await setClerkTier(email, tier)
        console.log(`✅ Upgraded ${email} to ${tier}`)
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

        await setClerkTier(email, tier)
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
