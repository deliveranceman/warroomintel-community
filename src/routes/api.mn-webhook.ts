import { createFileRoute } from '@tanstack/react-router'

// ─── ENV ─────────────────────────────────────────────────────────────────────
const AIRTABLE_TOKEN        = process.env.AIRTABLE_TOKEN
const AIRTABLE_MEMBERS_BASE = process.env.AIRTABLE_MEMBERS_BASE   // set this up (new base for members)
const AIRTABLE_MEMBERS_TABLE= process.env.AIRTABLE_MEMBERS_TABLE  // e.g. tblXXXXXXXXXXXXXX
const MN_API_TOKEN          = process.env.MN_API_TOKEN             // Mighty Networks Admin API token
const MN_NETWORK_ID         = process.env.MN_NETWORK_ID            // Your MN network ID (number)
const WEBHOOK_SECRET        = process.env.MN_WEBHOOK_SECRET        // Bearer token you set in MN webhook config

const MN_API_BASE = 'https://api.mn.co/admin/v1'

// ─── PLAN → TIER MAPPING ─────────────────────────────────────────────────────
// Map your Mighty Networks plan names to WRI tiers.
// Update these to match the exact plan names in your MN dashboard.
const PLAN_TIER_MAP: Record<string, string> = {
  'Soldier':   'Soldier',
  'Commander': 'Commander',
  'General':   'General',
  'Free':      'Free',
}

// Tag IDs in Mighty Networks for each tier (get these from MN Admin API /tags endpoint)
// Leave blank for now — fill in after you run GET /networks/{id}/tags
const TIER_TAG_IDS: Record<string, string> = {
  'Soldier':   process.env.MN_TAG_SOLDIER   || '',
  'Commander': process.env.MN_TAG_COMMANDER || '',
  'General':   process.env.MN_TAG_GENERAL   || '',
}

// Badge IDs in Mighty Networks for each tier (optional — assign on join)
const TIER_BADGE_IDS: Record<string, string> = {
  'Soldier':   process.env.MN_BADGE_SOLDIER   || '',
  'Commander': process.env.MN_BADGE_COMMANDER || '',
  'General':   process.env.MN_BADGE_GENERAL   || '',
}

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface MNMember {
  id: number
  user_id: number
  email: string
  first_name: string
  last_name: string
  full_name?: string
  name?: string
}

interface MNPlan {
  id: number
  name: string
}

interface MNWebhookPayload {
  event_id: string
  event_timestamp: string
  event_type: string
  payload: {
    id?: number
    member?: MNMember
    user?: { id: number; email: string; first_name: string; last_name: string }
    plan?: MNPlan
    previous_plan?: MNPlan
    new_plan?: MNPlan
    email?: string
    first_name?: string
    last_name?: string
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function resolveTier(planName: string | undefined): string {
  if (!planName) return 'Free'
  for (const [key, tier] of Object.entries(PLAN_TIER_MAP)) {
    if (planName.toLowerCase().includes(key.toLowerCase())) return tier
  }
  return 'Free'
}

async function mnGet(path: string) {
  const res = await fetch(`${MN_API_BASE}${path}`, {
    headers: {
      'Authorization': `Bearer ${MN_API_TOKEN}`,
      'Content-Type':  'application/json',
    },
  })
  if (!res.ok) throw new Error(`MN API GET ${path} → ${res.status}: ${await res.text()}`)
  return res.json()
}

async function mnPost(path: string, body: Record<string, any>) {
  const res = await fetch(`${MN_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MN_API_TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    // 422/409 = already exists — treat as ok
    if (res.status === 422 || res.status === 409) return null
    throw new Error(`MN API POST ${path} → ${res.status}: ${text}`)
  }
  return res.json()
}

async function mnDelete(path: string) {
  const res = await fetch(`${MN_API_BASE}${path}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${MN_API_TOKEN}` },
  })
  // 404 = already gone — treat as ok
  if (!res.ok && res.status !== 404) {
    throw new Error(`MN API DELETE ${path} → ${res.status}`)
  }
}

// ─── ASSIGN TIER TAG IN MIGHTY NETWORKS ─────────────────────────────────────
async function assignTierTag(memberId: number, tier: string, previousTier?: string) {
  if (!MN_API_TOKEN || !MN_NETWORK_ID) return

  // Remove old tier tags first
  if (previousTier && TIER_TAG_IDS[previousTier]) {
    try {
      await mnDelete(`/networks/${MN_NETWORK_ID}/members/${memberId}/tags/${TIER_TAG_IDS[previousTier]}`)
    } catch (_) {
      // Best effort — don't fail the whole hook
    }
  }

  // Add new tier tag
  if (TIER_TAG_IDS[tier]) {
    try {
      await mnPost(`/networks/${MN_NETWORK_ID}/members/${memberId}/tags`, {
        tag_id: TIER_TAG_IDS[tier],
      })
    } catch (_) { /* best effort */ }
  }

  // Assign tier badge (one-time — on join/upgrade)
  if (TIER_BADGE_IDS[tier]) {
    try {
      await mnPost(`/networks/${MN_NETWORK_ID}/members/${memberId}/badges`, {
        badge_id: TIER_BADGE_IDS[tier],
      })
    } catch (_) { /* best effort */ }
  }
}

// ─── AIRTABLE MEMBER SYNC ────────────────────────────────────────────────────
async function upsertAirtableMember(data: {
  mn_member_id: number
  email: string
  first_name: string
  last_name: string
  tier: string
  status: 'active' | 'canceled' | 'removed'
  plan_name: string
  event_type: string
  event_timestamp: string
}) {
  if (!AIRTABLE_TOKEN || !AIRTABLE_MEMBERS_BASE || !AIRTABLE_MEMBERS_TABLE) {
    console.warn('[WRI Webhook] Airtable env vars not set — skipping member sync')
    return
  }

  // Search for existing record by MN member ID
  const searchRes = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_MEMBERS_BASE}/${AIRTABLE_MEMBERS_TABLE}` +
    `?filterByFormula=${encodeURIComponent(`{MN Member ID} = "${data.mn_member_id}"`)}` +
    `&maxRecords=1`,
    { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
  )

  const searchData = await searchRes.json()
  const existing = searchData.records?.[0]

  const fields: Record<string, any> = {
    'Email':            data.email,
    'First Name':       data.first_name,
    'Last Name':        data.last_name,
    'Tier':             data.tier,
    'Status':           data.status,
    'Plan Name':        data.plan_name,
    'MN Member ID':     String(data.mn_member_id),
    'Last Event':       data.event_type,
    'Last Updated':     data.event_timestamp,
  }

  if (existing) {
    // Update existing record
    await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_MEMBERS_BASE}/${AIRTABLE_MEMBERS_TABLE}/${existing.id}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      }
    )
  } else {
    // Create new record — add join date on first creation
    await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_MEMBERS_BASE}/${AIRTABLE_MEMBERS_TABLE}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { ...fields, 'Join Date': data.event_timestamp } }),
      }
    )
  }
}

// ─── WEBHOOK EVENT HANDLERS ──────────────────────────────────────────────────

async function handleMemberPurchased(payload: MNWebhookPayload) {
  const member = payload.payload.member
  const plan   = payload.payload.plan
  if (!member) return

  const tier = resolveTier(plan?.name)
  const memberId = member.id

  await Promise.allSettled([
    assignTierTag(memberId, tier),
    upsertAirtableMember({
      mn_member_id:    memberId,
      email:           member.email,
      first_name:      member.first_name,
      last_name:       member.last_name,
      tier,
      status:          'active',
      plan_name:       plan?.name || 'Unknown',
      event_type:      payload.event_type,
      event_timestamp: payload.event_timestamp,
    }),
  ])
}

async function handleMemberPlanChanged(payload: MNWebhookPayload) {
  const member      = payload.payload.member
  const newPlan     = payload.payload.new_plan
  const previousPlan= payload.payload.previous_plan
  if (!member) return

  const newTier  = resolveTier(newPlan?.name)
  const prevTier = resolveTier(previousPlan?.name)
  const memberId = member.id

  await Promise.allSettled([
    assignTierTag(memberId, newTier, prevTier),
    upsertAirtableMember({
      mn_member_id:    memberId,
      email:           member.email,
      first_name:      member.first_name,
      last_name:       member.last_name,
      tier:            newTier,
      status:          'active',
      plan_name:       newPlan?.name || 'Unknown',
      event_type:      payload.event_type,
      event_timestamp: payload.event_timestamp,
    }),
  ])
}

async function handleMemberJoined(payload: MNWebhookPayload) {
  const member = payload.payload.member
  if (!member) return

  await upsertAirtableMember({
    mn_member_id:    member.id,
    email:           member.email,
    first_name:      member.first_name,
    last_name:       member.last_name,
    tier:            'Free',
    status:          'active',
    plan_name:       'Free',
    event_type:      payload.event_type,
    event_timestamp: payload.event_timestamp,
  })
}

async function handleMemberSubscriptionCanceled(payload: MNWebhookPayload) {
  const member = payload.payload.member
  const plan   = payload.payload.plan
  if (!member) return

  const tier     = resolveTier(plan?.name)
  const memberId = member.id

  // Remove tier tag on cancel
  if (TIER_TAG_IDS[tier] && MN_API_TOKEN && MN_NETWORK_ID) {
    try {
      await mnDelete(`/networks/${MN_NETWORK_ID}/members/${memberId}/tags/${TIER_TAG_IDS[tier]}`)
    } catch (_) { /* best effort */ }
  }

  await upsertAirtableMember({
    mn_member_id:    memberId,
    email:           member.email,
    first_name:      member.first_name,
    last_name:       member.last_name,
    tier:            'Free',
    status:          'canceled',
    plan_name:       plan?.name || 'Unknown',
    event_type:      payload.event_type,
    event_timestamp: payload.event_timestamp,
  })
}

async function handleMemberLeft(payload: MNWebhookPayload) {
  const member = payload.payload.member
  if (!member) return

  await upsertAirtableMember({
    mn_member_id:    member.id,
    email:           member.email,
    first_name:      member.first_name,
    last_name:       member.last_name,
    tier:            'Free',
    status:          'removed',
    plan_name:       'None',
    event_type:      payload.event_type,
    event_timestamp: payload.event_timestamp,
  })
}

// ─── ROUTE ───────────────────────────────────────────────────────────────────
export const Route = createFileRoute('/api/mn-webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1. Verify the webhook secret (Bearer token MN sends in Authorization header)
        if (WEBHOOK_SECRET) {
          const auth = request.headers.get('Authorization') || ''
          const token = auth.replace('Bearer ', '').trim()
          if (token !== WEBHOOK_SECRET) {
            console.warn('[WRI Webhook] Unauthorized webhook attempt')
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
          }
        }

        let body: MNWebhookPayload
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }

        const { event_type } = body
        console.log(`[WRI Webhook] Received: ${event_type} @ ${body.event_timestamp}`)

        try {
          switch (event_type) {
            case 'MemberPurchased':
              await handleMemberPurchased(body)
              break
            case 'MemberPlanChanged':
              await handleMemberPlanChanged(body)
              break
            case 'MemberJoined':
              await handleMemberJoined(body)
              break
            case 'MemberSubscriptionCanceled':
              await handleMemberSubscriptionCanceled(body)
              break
            case 'MemberSubscriptionRenewed':
              // Renew = still active, update last-updated timestamp only
              await handleMemberPurchased(body)
              break
            case 'MemberLeft':
            case 'MemberRemovedFromPlan':
              await handleMemberLeft(body)
              break
            default:
              // Log unhandled event types but return 200 so MN doesn't retry
              console.log(`[WRI Webhook] Unhandled event type: ${event_type}`)
          }
        } catch (err: any) {
          // Log error but still return 200 — prevents MN from infinite retries
          // on persistent failures (e.g. Airtable down)
          console.error(`[WRI Webhook] Handler error for ${event_type}:`, err?.message)
        }

        // Always return 200 quickly — MN retries on non-2xx
        return Response.json({ received: true, event_type })
      },
    },
  },
})
