import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { StreamClient } from '@stream-io/node-sdk'
import { sendEmail, wriEmailTemplate } from './_shared/sendEmail'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

// Charter/founding plans are a BILLING fact, not an access tier.
// tier must always be a canonical ladder value (soldier/commander/general/...).
// founding + charter_price_id carry the billing metadata separately.
interface PriceResolution {
  tier: string
  founding: boolean
  foundingPlan?: string
}

function buildPriceResolution(): Record<string, PriceResolution> {
  const m: Record<string, PriceResolution> = {
    'price_1TXieT5V5uqVT9SoIrPMKSAc': { tier: 'soldier',   founding: false },
    'price_1TXifB5V5uqVT9SohnQfGZuC': { tier: 'commander', founding: false },
    'price_1TXifX5V5uqVT9SogXMp79zb': { tier: 'general',   founding: false },
    'price_1Tb1mO5V5uqVT9So3ZRRltDC': { tier: 'soldier',   founding: true, foundingPlan: 'charter_soldier' },
    'price_1Tb1ms5V5uqVT9Sodiu1xbrR': { tier: 'commander', founding: true, foundingPlan: 'charter_commander' },
    'price_1TcxLk5V5uqVT9So4MgL5kjd': { tier: 'general',   founding: true, foundingPlan: 'founding_general' },
  }
  // Env override allows a second founding-general price (e.g. Stripe test mode)
  const envPrice = process.env.STRIPE_FOUNDING_GENERAL_PRICE_ID
  if (envPrice && !m[envPrice]) {
    m[envPrice] = { tier: 'general', founding: true, foundingPlan: 'founding_general' }
  }
  return m
}

const PRICE_RESOLUTION = buildPriceResolution()

function getSupabase() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

// Convert a Unix timestamp (number) or ISO string to a Postgres-compatible ISO string.
function toIso(ts: number | string | null | undefined): string {
  if (!ts) return new Date().toISOString()
  return typeof ts === 'number' ? new Date(ts * 1000).toISOString() : ts
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
// founding flag is sticky -- once true it is never cleared by any subsequent event.
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

// Lookup a member by their Stripe customer ID -- primary join key for subscription/invoice events.
async function lookupMemberByCustomerId(
  supabase: ReturnType<typeof getSupabase>,
  customerId: string
): Promise<{ clerk_id: string; founding: boolean } | null> {
  const { data } = await supabase
    .from('members')
    .select('clerk_id, founding')
    .eq('stripe_customer_id', customerId)
    .single()
  return data || null
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

  // Idempotency guard: INSERT ON CONFLICT DO NOTHING -- skip duplicate Stripe retries
  const supabase = getSupabase()
  const { data: eventRows } = await supabase
    .from('stripe_events')
    .upsert(
      { id: event.id, type: event.type, payload: event.data },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    .select('id')

  if (!eventRows || eventRows.length === 0) {
    return new Response(JSON.stringify({ received: true }), { status: 200, headers })
  }

  console.log('Stripe webhook event:', event.type)

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const clerkUserId = session.client_reference_id
        const email = session.customer_details?.email || session.customer_email
        const stripeCustomerId = session.customer as string | null
        const stripeSubId = session.subscription as string | null

        // Always retrieve subscription -- need price_id, period_end, status
        let resolvedPriceId: string | undefined
        let periodEnd: string | undefined
        let subStatus = 'active'
        let cancelAtPeriodEnd = false

        if (stripeSubId) {
          const sub = await stripe.subscriptions.retrieve(stripeSubId)
          resolvedPriceId = sub.items.data[0]?.price?.id
          periodEnd = toIso((sub as any).current_period_end)
          subStatus = sub.status
          cancelAtPeriodEnd = (sub as any).cancel_at_period_end ?? false
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
          console.log(`[stripe-webhook] Upgraded ${clerkUserId} to ${resolution.tier}${foundingExtra ? ` (${resolution.foundingPlan})` : ''}`)
        } else if (email) {
          resolvedUserId = await setClerkTier(email, resolution.tier, foundingExtra)
          if (resolvedUserId) await addToStreamChannels(resolvedUserId, resolution.tier)
          console.log(`[stripe-webhook] Upgraded ${email} to ${resolution.tier} (email fallback)`)
        } else {
          console.error('[stripe-webhook] No user identifier in checkout session')
          break
        }

        // Write billing columns to members table
        if (resolvedUserId) {
          const memberUpdate: Record<string, any> = {
            tier: resolution.tier,
            subscription_status: subStatus,
            cancel_at_period_end: cancelAtPeriodEnd,
          }
          if (stripeCustomerId) memberUpdate.stripe_customer_id = stripeCustomerId
          if (stripeSubId)      memberUpdate.stripe_subscription_id = stripeSubId
          if (periodEnd)        memberUpdate.current_period_end = periodEnd
          if (resolution.founding) {
            memberUpdate.founding = true
            memberUpdate.charter_price_id = resolvedPriceId
          }
          await supabase.from('members').update(memberUpdate).eq('clerk_id', resolvedUserId)
        }

        if (resolvedUserId && resolution.foundingPlan === 'founding_general') {
          await supabase.from('founding_generals').upsert(
            { clerk_user_id: resolvedUserId, stripe_session_id: session.id },
            { onConflict: 'clerk_user_id' }
          )
        }

        if (email) {
          sendEmail({
            to: email,
            subject: `WRI ${tierName} Access Activated`,
            html: wriEmailTemplate({
              title: `${tierName} Access Activated`,
              body: `
                <p>Warrior,</p>
                <p>Your <strong style="color:#C9A84C;">${tierName}</strong> membership is now active.</p>
                <p>You now have access to everything your tier unlocks -- head to the platform to explore your expanded capabilities.</p>
                <p style="font-size:12px;color:#9a8c74;">If you have any questions about your membership, reply to this email.</p>
              `,
              ctaText: 'Access Your War Room',
              ctaUrl: 'https://warroomintel.com/community',
            }),
          }).catch(e => console.error('[stripe-webhook] Upgrade email error:', e))
        }
        break
      }

      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription
        const priceId = sub.items.data[0]?.price?.id
        const resolution = priceId ? PRICE_RESOLUTION[priceId] : null
        if (!resolution) break

        const customerId = sub.customer as string
        const member = await lookupMemberByCustomerId(supabase, customerId)
        // Fallback: subscription metadata may carry clerk_id if set at checkout creation
        const clerkId = member?.clerk_id || (sub.metadata?.clerk_id as string | undefined) || null
        if (!clerkId) { console.log('[stripe-webhook] subscription.created: no clerk_id for', customerId); break }

        const memberUpdate: Record<string, any> = {
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          tier: resolution.tier,
          subscription_status: sub.status,
          current_period_end: toIso((sub as any).current_period_end),
          cancel_at_period_end: (sub as any).cancel_at_period_end ?? false,
        }
        if (resolution.founding) {
          memberUpdate.founding = true
          memberUpdate.charter_price_id = priceId
        }
        await supabase.from('members').update(memberUpdate).eq('clerk_id', clerkId)
        await setClerkTierById(clerkId, resolution.tier, getFoundingExtra(resolution))
        console.log(`[stripe-webhook] subscription.created: ${clerkId} -> ${resolution.tier}`)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const priceId = sub.items.data[0]?.price?.id
        const resolution = priceId ? PRICE_RESOLUTION[priceId] : null
        if (!resolution) break

        const customerId = sub.customer as string
        const member = await lookupMemberByCustomerId(supabase, customerId)
        if (!member) {
          // Race: checkout.session.completed hasn't set stripe_customer_id yet -- fall back to email
          const customer = await stripe.customers.retrieve(customerId)
          const email = (customer as Stripe.Customer).email
          if (!email) break
          const userId = await setClerkTier(email, resolution.tier, getFoundingExtra(resolution))
          if (userId) await addToStreamChannels(userId, resolution.tier)
          console.log(`[stripe-webhook] subscription.updated (email fallback) ${email} -> ${resolution.tier}`)
          break
        }

        const memberUpdate: Record<string, any> = {
          tier: resolution.tier,
          subscription_status: sub.status,
          current_period_end: toIso((sub as any).current_period_end),
          cancel_at_period_end: (sub as any).cancel_at_period_end ?? false,
        }
        if (resolution.founding && !member.founding) {
          memberUpdate.founding = true
          memberUpdate.charter_price_id = priceId
        }
        await supabase.from('members').update(memberUpdate).eq('clerk_id', member.clerk_id)
        await setClerkTierById(member.clerk_id, resolution.tier, getFoundingExtra(resolution))
        await addToStreamChannels(member.clerk_id, resolution.tier)
        console.log(`[stripe-webhook] subscription.updated ${member.clerk_id} -> ${resolution.tier}`)
        break
      }

      // founding flag is preserved by the read-merge-write in setClerkTierById
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string
        const member = await lookupMemberByCustomerId(supabase, customerId)
        if (!member) {
          const customer = await stripe.customers.retrieve(customerId)
          const email = (customer as Stripe.Customer).email
          if (!email) break
          await setClerkTier(email, 'free', null)
          console.log(`[stripe-webhook] subscription.deleted (email fallback) ${email} -> free`)
          break
        }
        await supabase.from('members').update({
          tier: 'free',
          subscription_status: 'canceled',
          stripe_subscription_id: null,
          cancel_at_period_end: false,
        }).eq('clerk_id', member.clerk_id)
        await setClerkTierById(member.clerk_id, 'free', null)
        console.log(`[stripe-webhook] subscription.deleted ${member.clerk_id} -> free`)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = (invoice as any).customer as string | null
        const stripeSubId = (invoice as any).subscription as string | null

        if (!customerId) break

        const member = await lookupMemberByCustomerId(supabase, customerId)
        if (!member) {
          // Fallback: refresh Clerk tier by email when stripe_customer_id not yet stored
          const email = invoice.customer_email
          if (email && stripeSubId) {
            const sub = await stripe.subscriptions.retrieve(stripeSubId)
            const priceId = sub.items.data[0]?.price?.id
            const resolution = priceId ? PRICE_RESOLUTION[priceId] : null
            if (resolution) {
              const userId = await setClerkTier(email, resolution.tier, getFoundingExtra(resolution))
              if (userId) await addToStreamChannels(userId, resolution.tier)
            }
          }
          break
        }

        // Write billing_history -- ON CONFLICT (stripe_invoice_id) DO NOTHING via ignoreDuplicates
        const invoiceId = invoice.id
        const lines = (invoice as any).lines?.data as any[] | undefined
        const lineDesc = lines?.[0]?.description as string | null ?? null
        const linePeriodEnd = lines?.[0]?.period?.end as number | undefined

        if (invoiceId && invoice.amount_paid > 0) {
          await supabase.from('billing_history').upsert({
            clerk_id: member.clerk_id,
            stripe_invoice_id: invoiceId,
            amount_cents: invoice.amount_paid,
            currency: invoice.currency,
            status: 'paid',
            description: lineDesc,
            paid_at: new Date().toISOString(),
            hosted_invoice_url: invoice.hosted_invoice_url || null,
          }, { onConflict: 'stripe_invoice_id', ignoreDuplicates: true })
        }

        // Refresh period_end + status on renewal
        const memberUpdate: Record<string, any> = { subscription_status: 'active' }
        if (linePeriodEnd) memberUpdate.current_period_end = toIso(linePeriodEnd)
        await supabase.from('members').update(memberUpdate).eq('clerk_id', member.clerk_id)

        // Sync Clerk tier (renewal keeps same tier, re-confirms access)
        if (stripeSubId) {
          const sub = await stripe.subscriptions.retrieve(stripeSubId)
          const priceId = sub.items.data[0]?.price?.id
          const resolution = priceId ? PRICE_RESOLUTION[priceId] : null
          if (resolution) {
            await setClerkTierById(member.clerk_id, resolution.tier, getFoundingExtra(resolution))
            await addToStreamChannels(member.clerk_id, resolution.tier)
          }
        }
        console.log(`[stripe-webhook] invoice.payment_succeeded for ${member.clerk_id}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = (invoice as any).customer as string | null
        if (customerId) {
          const member = await lookupMemberByCustomerId(supabase, customerId)
          if (member) {
            await supabase.from('members').update({ subscription_status: 'past_due' }).eq('clerk_id', member.clerk_id)
          }
        }
        console.log(`[stripe-webhook] invoice.payment_failed for ${invoice.customer_email || customerId}`)
        break
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`)
    }

    await supabase.from('stripe_events').update({ processed_at: new Date().toISOString() }).eq('id', event.id)

  } catch (err: any) {
    console.error('[stripe-webhook] Handler error:', err.message)
    try { await supabase.from('stripe_events').update({ processing_error: err.message }).eq('id', event.id) } catch {}
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers })
}

export const config = { path: '/api/stripe-webhook' }
