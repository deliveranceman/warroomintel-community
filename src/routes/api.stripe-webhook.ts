import { createFileRoute } from '@tanstack/react-router'

async function getStripe() {
  const { default: Stripe } = await import('stripe')
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

function buildPriceMap(): Record<string, string> {
  const map: Record<string, string> = {
    'price_1TXieT5V5uqVT9SoIrPMKSAc': 'Soldier',
    'price_1TXifB5V5uqVT9SohnQfGZuC': 'Commander',
    'price_1TXifX5V5uqVT9SogXMp79zb': 'General',
  }
  if (process.env.STRIPE_SOLDIER_PRICE_ID)   map[process.env.STRIPE_SOLDIER_PRICE_ID]   = 'Soldier'
  if (process.env.STRIPE_COMMANDER_PRICE_ID) map[process.env.STRIPE_COMMANDER_PRICE_ID] = 'Commander'
  if (process.env.STRIPE_GENERAL_PRICE_ID)   map[process.env.STRIPE_GENERAL_PRICE_ID]   = 'General'
  return map
}

async function setUserTier(email: string, tier: string) {
  const key = process.env.CLERK_SECRET_KEY!
  const base = 'https://api.clerk.com/v1'

  const listRes = await fetch(`${base}/users?email_address=${encodeURIComponent(email)}`, {
    headers: { 'Authorization': `Bearer ${key}` },
  })
  if (!listRes.ok) throw new Error(`Clerk user list failed: ${listRes.status}`)
  const users: { id: string }[] = await listRes.json()
  if (!users.length) throw new Error(`No Clerk user found for email: ${email}`)

  const patchRes = await fetch(`${base}/users/${users[0].id}/metadata`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ public_metadata: { tier } }),
  })
  if (!patchRes.ok) throw new Error(`Clerk metadata update failed: ${patchRes.status}`)
}

export const Route = createFileRoute('/api/stripe-webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const stripeKey = process.env.STRIPE_SECRET_KEY
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

        if (!stripeKey || !webhookSecret) {
          return Response.json({ error: 'Stripe not configured' }, { status: 500 })
        }

        const body = await request.text()
        const signature = request.headers.get('stripe-signature')

        if (!signature) {
          return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 })
        }

        const stripe = await getStripe()

        let event: Stripe.Event
        try {
          event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
        } catch (err: any) {
          console.error('[stripe-webhook] signature verification failed:', err.message)
          return Response.json({ error: `Webhook verification failed: ${err.message}` }, { status: 400 })
        }

        try {
          if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session

            const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
              expand: ['line_items'],
            })

            const email = fullSession.customer_details?.email ?? fullSession.customer_email
            const priceId = fullSession.line_items?.data[0]?.price?.id

            if (!email) throw new Error('No customer email in checkout.session.completed')
            if (!priceId) throw new Error('No price ID in checkout session line_items')

            const tier = buildPriceMap()[priceId]
            if (!tier) {
              console.warn(`[stripe-webhook] Unrecognised price ID ${priceId} — no tier update`)
              return Response.json({ received: true }, { status: 200 })
            }

            await setUserTier(email, tier)
            console.log(`[stripe-webhook] checkout.session.completed → ${email} = ${tier}`)
          }

          if (event.type === 'customer.subscription.updated') {
            const subscription = event.data.object as Stripe.Subscription
            const customerId = typeof subscription.customer === 'string'
              ? subscription.customer
              : subscription.customer.id
            const customer = await stripe.customers.retrieve(customerId)
            if (customer.deleted) throw new Error('Stripe customer record was deleted')
            const email = (customer as Stripe.Customer).email
            if (!email) throw new Error('No email on Stripe customer record')
            const priceId = subscription.items.data[0]?.price?.id
            if (!priceId) throw new Error('No price ID in subscription items')
            const tier = buildPriceMap()[priceId]
            if (!tier) {
              console.warn(`[stripe-webhook] Unrecognised price ID ${priceId} — no tier update`)
              return Response.json({ received: true }, { status: 200 })
            }
            await setUserTier(email, tier)
            console.log(`[stripe-webhook] subscription.updated → ${email} = ${tier}`)
          }

          if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object as Stripe.Subscription

            const customerId = typeof subscription.customer === 'string'
              ? subscription.customer
              : subscription.customer.id

            const customer = await stripe.customers.retrieve(customerId)
            if (customer.deleted) throw new Error('Stripe customer record was deleted')

            const email = (customer as Stripe.Customer).email
            if (!email) throw new Error('No email on Stripe customer record')

            await setUserTier(email, 'Free')
            console.log(`[stripe-webhook] subscription.deleted → ${email} = Free`)
          }

          return Response.json({ received: true }, { status: 200 })
        } catch (err: any) {
          console.error('[stripe-webhook] handler error:', err.message)
          return Response.json({ error: err.message }, { status: 500 })
        }
      },
    },
  },
})
