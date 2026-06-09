import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })

const _pricesJson: Record<string, string> = (() => {
  try { return JSON.parse(process.env.STRIPE_PRICES || '{}') } catch { return {} }
})()
const PRICE_IDS: Record<string, string | undefined> = {
  soldier:           _pricesJson.soldier           ?? 'price_1TXieT5V5uqVT9SoIrPMKSAc',
  commander:         _pricesJson.commander         ?? 'price_1TXifB5V5uqVT9SohnQfGZuC',
  general:           _pricesJson.general           ?? 'price_1TXifX5V5uqVT9SogXMp79zb',
  charter_soldier:   _pricesJson.charter_soldier   ?? 'price_1Tb1mO5V5uqVT9So3ZRRltDC',
  charter_commander: _pricesJson.charter_commander ?? 'price_1Tb1ms5V5uqVT9Sodiu1xbrR',
  founding_general:  _pricesJson.founding_general  ?? undefined,
}

// Charter/founding prices share access level with their base tier.
const TIER_LEVEL: Record<string, number> = {
  watchman: 0, free: 0,
  soldier: 1, charter_soldier: 1,
  commander: 2, charter_commander: 2,
  general: 3, founding_general: 3,
  minister: 4, commandant: 5,
}

function tierLevel(tier: string): number {
  return TIER_LEVEL[tier.toLowerCase()] ?? 0
}

const ONE_TIME_TIERS = new Set(['founding_general'])
const FOUNDING_GENERAL_CAP = 100
const SITE_URL = process.env.SITE_URL || 'https://warroomintel.com'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function getSupabase() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

// Phase 3 item: replace raw base64 JWT decode with verifyToken from @clerk/backend.
async function resolveUser(token: string): Promise<{
  userId: string
  email: string | null
  currentTier: string
  stripeCustomerId: string | null
} | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return null
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    const email = data.email_addresses?.find(
      (e: any) => e.id === data.primary_email_address_id
    )?.email_address ?? null
    const currentTier = ((data.public_metadata?.tier as string) || 'free').toLowerCase()
    const stripeCustomerId = (data.public_metadata?.stripe_customer_id as string) || null
    return { userId, email, currentTier, stripeCustomerId }
  } catch { return null }
}

// Writes stripe_customer_id to Clerk public_metadata — read-merge-write, never replaces other keys.
// Non-fatal: a failure here means the lookup runs again next call; it doesn't block the response.
async function storeStripeCustomerId(userId: string, customerId: string): Promise<void> {
  try {
    const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!userRes.ok) return
    const userData = await userRes.json()
    const currentMeta = userData.public_metadata || {}
    await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ public_metadata: { ...currentMeta, stripe_customer_id: customerId } }),
    })
  } catch (e) {
    console.error('[checkout] Failed to cache stripe_customer_id:', e)
  }
}

// Resolves one durable Stripe customer for this user — never creates a duplicate.
// Priority: stored id → lookup by email → create + store.
async function resolveStripeCustomer(
  userId: string,
  email: string | null,
  storedId: string | null,
): Promise<string> {
  if (storedId) return storedId

  if (email) {
    const existing = await stripe.customers.list({ email, limit: 1 })
    if (existing.data.length > 0) {
      const id = existing.data[0].id
      await storeStripeCustomerId(userId, id)
      return id
    }
  }

  const customer = await stripe.customers.create({
    ...(email ? { email } : {}),
    metadata: { userId },
  })
  await storeStripeCustomerId(userId, customer.id)
  return customer.id
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

  const user = await resolveUser(token)
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

  const body = await req.json().catch(() => ({})) as { tier?: string }
  const tierKey = (body.tier || '').toLowerCase().replace(/\s+/g, '_')
  if (!tierKey) return new Response(JSON.stringify({ error: 'Missing tier' }), { status: 400, headers })

  if (!(tierKey in PRICE_IDS)) return new Response(JSON.stringify({ error: `Unknown tier: ${tierKey}` }), { status: 400, headers })
  const priceId = PRICE_IDS[tierKey]
  if (!priceId) return new Response(JSON.stringify({ error: 'coming_soon' }), { status: 400, headers })

  // One-time payment (founding_general): skip subscription modify logic, always go to Checkout.
  if (ONE_TIME_TIERS.has(tierKey)) {
    const supabase = getSupabase()
    const { count } = await supabase.from('founding_generals').select('*', { count: 'exact', head: true })
    if ((count ?? 0) >= FOUNDING_GENERAL_CAP) {
      return new Response(JSON.stringify({ error: 'sold_out' }), { status: 423, headers })
    }
    try {
      const customerId = await resolveStripeCustomer(user.userId, user.email, user.stripeCustomerId)
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        customer: customerId,
        client_reference_id: user.userId,
        allow_promotion_codes: true,
        metadata: { userId: user.userId, tier: tierKey },
        success_url: `${SITE_URL}/community?upgraded=1`,
        cancel_url: `${SITE_URL}/membership`,
      })
      return new Response(JSON.stringify({ url: session.url }), { status: 200, headers })
    } catch (err: any) {
      console.error('[checkout] One-time session error:', err.message)
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
    }
  }

  // Subscription tier path: modify existing sub or create new Checkout Session.
  try {
    const customerId = await resolveStripeCustomer(user.userId, user.email, user.stripeCustomerId)

    // Check for an active or trialing subscription on this stable customer.
    const [activeRes, trialingRes] = await Promise.all([
      stripe.subscriptions.list({ customer: customerId, status: 'active',   limit: 1 }),
      stripe.subscriptions.list({ customer: customerId, status: 'trialing', limit: 1 }),
    ])
    const existingSub = activeRes.data[0] ?? trialingRes.data[0] ?? null

    if (existingSub) {
      const itemId        = existingSub.items.data[0].id
      const currentPriceId = existingSub.items.data[0].price.id   // always expanded (Price object)
      const currentLevel  = tierLevel(user.currentTier)
      const targetLevel   = tierLevel(tierKey)

      // Same tier — nothing to do.
      if (targetLevel === currentLevel) {
        return new Response(
          JSON.stringify({ modified: true, direction: 'noop', effective: 'now' }),
          { status: 200, headers }
        )
      }

      if (targetLevel > currentLevel) {
        // UPGRADE: swap price immediately and bill the proration difference now.
        await stripe.subscriptions.update(existingSub.id, {
          items: [{ id: itemId, price: priceId }],
          proration_behavior: 'always_invoice',
        })
        console.log(`✅ [checkout] Upgraded ${user.userId}: ${user.currentTier} → ${tierKey} (immediate)`)
        return new Response(
          JSON.stringify({ modified: true, direction: 'upgrade', effective: 'now' }),
          { status: 200, headers }
        )
      }

      // DOWNGRADE: schedule the price change to take effect at the end of the current period.
      // Uses a two-phase subscription schedule:
      //   Phase 1: current price, runs until current_period_end (no proration)
      //   Phase 2: new lower price, starts at current_period_end (no proration)
      // Stripe fires customer.subscription.updated only at the phase transition — the webhook
      // then downgrades Clerk tier. The customer keeps their current access until period end.
      const existingScheduleRef = existingSub.schedule
      const existingScheduleId: string | null = existingScheduleRef
        ? (typeof existingScheduleRef === 'string' ? existingScheduleRef : existingScheduleRef.id)
        : null

      // Reuse an already-attached schedule (e.g. user changing downgrade target) or create one.
      const schedule = existingScheduleId
        ? await stripe.subscriptionSchedules.retrieve(existingScheduleId)
        : await stripe.subscriptionSchedules.create({ from_subscription: existingSub.id })

      await stripe.subscriptionSchedules.update(schedule.id, {
        end_behavior: 'release',
        phases: [
          {
            items: [{ price: currentPriceId, quantity: 1 }],
            start_date: schedule.phases[0].start_date,
            end_date:   existingSub.items.data[0].current_period_end,
            proration_behavior: 'none',
          },
          {
            items: [{ price: priceId, quantity: 1 }],
            proration_behavior: 'none',
          },
        ],
      })
      console.log(`✅ [checkout] Downgrade scheduled ${user.userId}: ${user.currentTier} → ${tierKey} at period end`)
      return new Response(
        JSON.stringify({ modified: true, direction: 'downgrade', effective: 'period_end' }),
        { status: 200, headers }
      )
    }

    // No active subscription — new customer. Create a Checkout Session tied to the stable customer
    // so a second Stripe Customer object is never spawned.
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customerId,
      client_reference_id: user.userId,
      allow_promotion_codes: true,
      metadata: { userId: user.userId, tier: tierKey },
      success_url: `${SITE_URL}/community?upgraded=1`,
      cancel_url: `${SITE_URL}/membership`,
    })
    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers })

  } catch (err: any) {
    console.error('[checkout] Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }
}

export const config = { path: '/api/create-checkout-session' }
