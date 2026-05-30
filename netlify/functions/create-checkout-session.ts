import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

const PRICE_IDS: Record<string, string | undefined> = {
  soldier:           process.env.STRIPE_SOLDIER_PRICE_ID           || 'price_1TXieT5V5uqVT9SoIrPMKSAc',
  commander:         process.env.STRIPE_COMMANDER_PRICE_ID         || 'price_1TXifB5V5uqVT9SohnQfGZuC',
  general:           process.env.STRIPE_GENERAL_PRICE_ID           || 'price_1TXifX5V5uqVT9SogXMp79zb',
  charter_soldier:   process.env.STRIPE_CHARTER_SOLDIER_PRICE_ID   || 'price_1Tb1mO5V5uqVT9So3ZRRltDC',
  charter_commander: process.env.STRIPE_CHARTER_COMMANDER_PRICE_ID || 'price_1Tb1ms5V5uqVT9Sodiu1xbrR',
  founding_general:  process.env.STRIPE_FOUNDING_GENERAL_PRICE_ID,
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
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

async function resolveUser(token: string): Promise<{ userId: string; email: string | null } | null> {
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
    const email = data.email_addresses?.find((e: any) => e.id === data.primary_email_address_id)?.email_address ?? null
    return { userId, email }
  } catch { return null }
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

  const priceId = PRICE_IDS[tierKey]
  if (!priceId) return new Response(JSON.stringify({ error: `Unknown or unconfigured tier: ${tierKey}` }), { status: 400, headers })

  if (tierKey === 'founding_general') {
    const supabase = getSupabase()
    const { count } = await supabase.from('founding_generals').select('*', { count: 'exact', head: true })
    if ((count ?? 0) >= FOUNDING_GENERAL_CAP) {
      return new Response(JSON.stringify({ error: 'sold_out' }), { status: 423, headers })
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: ONE_TIME_TIERS.has(tierKey) ? 'payment' : 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    ...(user.email ? { customer_email: user.email } : {}),
    client_reference_id: user.userId,
    metadata: { userId: user.userId, tier: tierKey },
    success_url: `${SITE_URL}/community?upgraded=1`,
    cancel_url: `${SITE_URL}/membership`,
  })

  return new Response(JSON.stringify({ url: session.url }), { status: 200, headers })
}

export const config = { path: '/api/create-checkout-session' }
