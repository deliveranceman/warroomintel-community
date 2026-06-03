import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

async function isMinister(token: string): Promise<boolean> {
  try {
    if (!token || token.split('.').length !== 3) return false
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return false
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return false
    const data = await res.json()
    return data?.public_metadata?.role === 'minister'
  } catch { return false }
}

const SEED_ITEMS = [
  // ── PAGES ──────────────────────────────────────────────────────────────
  { category: 'page', name: 'Homepage',             route: '/',                                   description: 'Public landing page with hero, features, pricing, FAQ' },
  { category: 'page', name: 'Features Page',        route: '/features',                           description: 'Feature overview page' },
  { category: 'page', name: 'Assessment',           route: '/assessment',                         description: 'Public intake assessment form' },
  { category: 'page', name: 'Membership',           route: '/membership',                         description: 'Pricing and tier comparison page' },
  { category: 'page', name: 'FAQ',                  route: '/faq',                                description: 'Frequently asked questions' },
  { category: 'page', name: 'Terms',                route: '/terms',                              description: 'Terms of service - Tennessee jurisdiction' },
  { category: 'page', name: 'Privacy',              route: '/privacy',                            description: 'Privacy policy - Tennessee jurisdiction' },
  { category: 'page', name: 'Community Home',       route: '/community',                          description: 'Main community dashboard' },
  { category: 'page', name: 'Weekly Intel',         route: '/community/weekly-intel',             description: 'Briefings and field reports' },
  { category: 'page', name: 'Field Ministry',       route: '/community/field-ministry',           description: 'Knowledge base' },
  { category: 'page', name: 'Field Manual',         route: '/community/field-manual',             description: '10 module bootcamp training' },
  { category: 'page', name: 'Intel Archive',        route: '/community/intel-archive',            description: '285 spirit database with modal dossiers' },
  { category: 'page', name: 'Symptom Investigator', route: '/community/symptom-investigator',     description: 'AI symptom to spirit matcher' },
  { category: 'page', name: 'Gateway Investigator', route: '/community/gateway-investigator',     description: 'AI cultural gateway finder' },
  { category: 'page', name: 'Body Map',             route: '/community/body-map',                 description: 'Anatomical spirit location map' },
  { category: 'page', name: 'Spirit Network',       route: '/community/spirit-network',           description: 'Spirit relationship graph' },
  { category: 'page', name: 'Fringe Intelligence',  route: '/community/fringe-intel',             description: 'Fringe research articles' },
  { category: 'page', name: 'Arsenal',              route: '/community/arsenal',                  description: 'Tier-gated resource downloads' },
  { category: 'page', name: 'Assessment Tool',      route: '/community/assessment',               description: '9-step intake with AI diagnostic' },
  { category: 'page', name: 'Training',             route: '/community/training',                 description: 'Course and episode player' },
  { category: 'page', name: 'Spiritual Mapping',    route: '/community/spiritual-mapping',        description: 'Commander+ mapping tool' },
  { category: 'page', name: 'Events',               route: '/community/events',                   description: 'Upcoming calls and events' },
  { category: 'page', name: 'Prayer Wall',          route: '/community/prayer-wall',              description: 'Community prayer requests' },
  { category: 'page', name: 'Admin Panel',          route: '/admin',                              description: 'Full admin dashboard' },

  // ── FEATURES ────────────────────────────────────────────────────────────
  { category: 'feature', name: 'Clerk Authentication',       description: 'JWT decode auth, tier from publicMetadata' },
  { category: 'feature', name: 'Stripe Webhook',             description: 'Sets Clerk publicMetadata tier on payment' },
  { category: 'feature', name: 'Stream Chat',                description: 'REST-only chat, no npm package' },
  { category: 'feature', name: 'Spirit Modal - 4 tabs',      description: 'Overview/Intel/Warfare/Research with tier gating' },
  { category: 'feature', name: 'AI Spirit Enhance',          description: 'Sonnet enhance calls, saves to Airtable' },
  { category: 'feature', name: 'Spirit Tags',                description: 'Named spirit extraction from documents' },
  { category: 'feature', name: 'SpiritTagEditor Component',  description: 'Gold pill editor, reusable' },
  { category: 'feature', name: 'Taxonomy Review',            description: 'Bulk Kingdom/Sub-Kingdom/Biblical Rank classification with AI suggestions' },
  { category: 'feature', name: 'Gateway Investigator',       description: 'AI cultural gateway report for any spirit' },
  { category: 'feature', name: 'Session Intel',              description: 'Cultural Presence + Session Trigger Questions in spirit modal' },
  { category: 'feature', name: 'Library Intelligence',       description: 'AI gap analysis + content query against ministry library' },
  { category: 'feature', name: 'Ministry Library Upload',    description: 'Multi-file staged upload with AI autofill and spirit tags' },
  { category: 'feature', name: 'Arsenal Edit Button',        description: 'Inline edit for title, tier, topic, description on Arsenal cards' },
  { category: 'feature', name: 'Re-run AI Tags',             description: 'Bulk re-tag books with empty or generic spirit_tags' },
  { category: 'feature', name: 'Symptom Investigator',       description: 'AI-powered symptom → spirit mapping (Commander+)' },
  { category: 'feature', name: 'Body Map',                   description: 'Anatomical map linking physical symptoms to spirits' },
  { category: 'feature', name: 'Spirit Network Graph',       description: 'Force-directed graph of spirit relationships' },
  { category: 'feature', name: 'Spiritual Mapping Module',   description: 'Regional spirit mapping, prayer targets, intel layers' },
  { category: 'feature', name: 'Assessment Wizard',          description: '9-step intake assessment with AI diagnostic summary' },
  { category: 'feature', name: 'Training Module',            description: 'Course + episode player with progress tracking' },
  { category: 'feature', name: 'Fringe Intelligence Feed',   description: 'Admin-curated research articles with categories' },
  { category: 'feature', name: 'Testimony Wall',             description: 'Moderated user testimonies with approval flow' },
  { category: 'feature', name: 'Prayer Wall',                description: 'Community prayer requests with Stream Chat integration' },
  { category: 'feature', name: 'Events Calendar',            description: 'Zoom link gating by tier, RSVP system' },
  { category: 'feature', name: 'Dark/Light Theme Toggle',    description: 'Persistent theme preference' },
  { category: 'feature', name: 'Tier Gating System',         description: 'TierGate component, Free/Soldier/Commander/General levels' },
  { category: 'feature', name: 'AI Usage Tracking',          description: 'Logs input/output tokens per AI call to Supabase' },

  // ── API ENDPOINTS ────────────────────────────────────────────────────────
  { category: 'api', name: '/api/demons',                description: 'GET all spirits from Airtable (view filtered)' },
  { category: 'api', name: '/api/taxonomy-spirits',      description: 'GET spirits with Kingdom/Sub-Kingdom/Biblical Rank (no view filter)' },
  { category: 'api', name: '/api/admin-demon',           description: 'GET/PATCH/POST spirit records to Airtable' },
  { category: 'api', name: '/api/admin-taxonomy-ai',     description: 'POST: batch AI classify spirits (paginated 20/batch)' },
  { category: 'api', name: '/api/admin-taxonomy-patch',  description: 'PATCH single taxonomy field on a spirit' },
  { category: 'api', name: '/api/ai-spirit-enhance',     description: 'POST: Claude Sonnet enhances spirit fields' },
  { category: 'api', name: '/api/gateway-investigator',  description: 'POST: AI cultural gateway report for any spirit' },
  { category: 'api', name: '/api/investigate',           description: 'POST: Symptom Investigator (Commander+)' },
  { category: 'api', name: '/api/library-intelligence',  description: 'POST: gap-analysis and content-query tools' },
  { category: 'api', name: '/api/library-autofill',      description: 'POST: AI autofill title/author/spirit_tags from filename' },
  { category: 'api', name: '/api/library-index',         description: 'POST: extract + store text for a resource' },
  { category: 'api', name: '/api/admin-library',         description: 'GET/PATCH/DELETE ministry library books' },
  { category: 'api', name: '/api/admin-library-save',    description: 'POST: save new ministry library upload to Supabase' },
  { category: 'api', name: '/api/admin-resources',       description: 'GET/PATCH/DELETE Arsenal resources' },
  { category: 'api', name: '/api/arsenal-resources',     description: 'GET tier-gated Arsenal resources for members' },
  { category: 'api', name: '/api/admin-context',         description: 'GET/POST/PATCH/DELETE ministry context entries' },
  { category: 'api', name: '/api/admin-tracker',         description: 'GET/POST/PATCH/DELETE tracker items' },
  { category: 'api', name: '/api/admin-tracker-seed',    description: 'POST: seed tracker with known pages/features/APIs' },
  { category: 'api', name: '/api/submit-assessment',     description: 'POST: submit 9-step assessment' },
  { category: 'api', name: '/api/generate-summary',      description: 'POST: AI summary for assessment results' },
  { category: 'api', name: '/api/generate-document',     description: 'POST: generate session document' },
  { category: 'api', name: '/api/intel-posts',           description: 'GET/POST/DELETE Intel Archive posts' },
  { category: 'api', name: '/api/ai-usage',              description: 'POST: log AI token usage' },
  { category: 'api', name: '/api/stripe-webhook',        description: 'POST: handle Stripe payment events' },
  { category: 'api', name: '/api/stream-token',          description: 'POST: get Stream Chat token' },
]

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })

  const ok = await isMinister(token)
  if (!ok) return new Response(JSON.stringify({ error: 'Minister role required' }), { status: 403, headers: HEADERS })

  const client = sb()

  // Check if already seeded
  const { count } = await client.from('admin_tracker').select('*', { count: 'exact', head: true })
  if ((count || 0) > 0) {
    return new Response(JSON.stringify({ ok: true, skipped: true, message: `Already seeded (${count} items exist)` }), { status: 200, headers: HEADERS })
  }

  // Insert all seed items
  const { data, error } = await client.from('admin_tracker').insert(
    SEED_ITEMS.map(item => ({
      ...item,
      status: 'in_progress',
      priority: 'medium',
      metadata: {},
    }))
  ).select()

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })
  return new Response(JSON.stringify({ ok: true, inserted: data?.length || 0 }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/admin-tracker-seed' }
