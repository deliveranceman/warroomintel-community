#!/usr/bin/env node
// Run: STRIPE_SECRET_KEY=sk_live_... node scripts/stripe-setup.mjs
// Creates/retrieves all War Room Intel Stripe products and prices.

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

const PRODUCTS = [
  {
    envKey: 'STRIPE_SOLDIER_PRICE_ID',
    name: 'War Room Intel — Soldier',
    amount: 1900, // $19/month
    interval: 'month',
    metadata: { tier: 'soldier' },
  },
  {
    envKey: 'STRIPE_COMMANDER_PRICE_ID',
    name: 'War Room Intel — Commander',
    amount: 3900, // $39/month
    interval: 'month',
    metadata: { tier: 'commander' },
  },
  {
    envKey: 'STRIPE_GENERAL_PRICE_ID',
    name: "War Room Intel — General's Table",
    amount: 9700, // $97/month
    interval: 'month',
    metadata: { tier: 'general' },
  },
  {
    envKey: 'STRIPE_CHARTER_SOLDIER_PRICE_ID',
    name: 'War Room Intel — Charter Soldier',
    amount: 900, // $9/month
    interval: 'month',
    metadata: { tier: 'soldier', charter: 'true' },
  },
  {
    envKey: 'STRIPE_CHARTER_COMMANDER_PRICE_ID',
    name: 'War Room Intel — Charter Commander',
    amount: 2000, // $20/month
    interval: 'month',
    metadata: { tier: 'commander', charter: 'true' },
  },
  {
    envKey: 'STRIPE_FOUNDING_GENERAL_PRICE_ID',
    name: 'War Room Intel — Founding General',
    amount: 100000, // $1,000 one-time
    interval: null, // one-time payment
    metadata: { tier: 'founding_general' },
  },
]

async function getOrCreateProduct(name) {
  const list = await stripe.products.search({ query: `name:'${name}'` })
  if (list.data.length) {
    console.log(`  Found existing product: ${list.data[0].id}`)
    return list.data[0]
  }
  const product = await stripe.products.create({ name })
  console.log(`  Created product: ${product.id}`)
  return product
}

async function getOrCreatePrice(productId, amount, interval, metadata) {
  const currency = 'usd'
  const existing = await stripe.prices.list({ product: productId, active: true })

  for (const price of existing.data) {
    const matches = price.unit_amount === amount && price.currency === currency
    const intervalMatch = interval
      ? price.recurring?.interval === interval
      : !price.recurring
    if (matches && intervalMatch) {
      console.log(`  Found existing price: ${price.id}`)
      return price
    }
  }

  const priceData = {
    product: productId,
    unit_amount: amount,
    currency,
    metadata,
    ...(interval
      ? { recurring: { interval } }
      : {}),
  }
  const price = await stripe.prices.create(priceData)
  console.log(`  Created price: ${price.id}`)
  return price
}

console.log('🔧 War Room Intel — Stripe Setup\n')
console.log('Add these to your Netlify environment variables:\n')

for (const product of PRODUCTS) {
  console.log(`\n📦 ${product.name}`)
  const p = await getOrCreateProduct(product.name)
  const price = await getOrCreatePrice(p.id, product.amount, product.interval, product.metadata)
  console.log(`  ${product.envKey}=${price.id}`)
}

console.log('\n✅ Setup complete.')
