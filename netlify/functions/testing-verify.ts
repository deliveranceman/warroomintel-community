import { createClient } from '@supabase/supabase-js'
import { requireTier } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

const SEED_FEATURES = [
  { feature_area: 'Homepage & Marketing', feature_name: 'Homepage loads with logo, hero text, stats strip' },
  { feature_area: 'Homepage & Marketing', feature_name: '"Search the Database" hero button works' },
  { feature_area: 'Homepage & Marketing', feature_name: '"Take the Assessment" button works' },
  { feature_area: 'Homepage & Marketing', feature_name: 'Membership pricing section shows all tiers' },
  { feature_area: 'Homepage & Marketing', feature_name: 'General tier "Join General\'s Table" button links to checkout' },
  { feature_area: 'Homepage & Marketing', feature_name: 'Charter pricing page shows $9/$20 rates' },
  { feature_area: 'Homepage & Marketing', feature_name: 'FAQ section expands/collapses correctly' },
  { feature_area: 'Homepage & Marketing', feature_name: 'Footer YouTube + Facebook links visible' },
  { feature_area: 'Homepage & Marketing', feature_name: 'Terms and Privacy pages load' },
  { feature_area: 'Authentication', feature_name: 'Sign up creates account (email verification)' },
  { feature_area: 'Authentication', feature_name: 'Sign in works on desktop' },
  { feature_area: 'Authentication', feature_name: 'Sign in works on mobile' },
  { feature_area: 'Authentication', feature_name: 'Forgot password flow works' },
  { feature_area: 'Authentication', feature_name: 'Tier badge shows correctly after login (Watchman/Soldier/Commander/General)' },
  { feature_area: 'Community - Navigation', feature_name: 'Community sidebar loads all sections' },
  { feature_area: 'Community - Navigation', feature_name: 'Mobile hamburger menu opens and all items reachable' },
  { feature_area: 'Community - Navigation', feature_name: 'Theme toggle (dark/light) works and persists' },
  { feature_area: 'Community - Navigation', feature_name: 'All sidebar links navigate correctly' },
  { feature_area: 'Community - Weekly Intel', feature_name: 'Intel briefings display correctly' },
  { feature_area: 'Community - Weekly Intel', feature_name: 'Field reports section shows correctly' },
  { feature_area: 'Community - Weekly Intel', feature_name: 'Latest Arsenal Drops widget shows (not ministry library books)' },
  { feature_area: 'Community - Weekly Intel', feature_name: 'New to Intel Archive widget shows recent spirits' },
  { feature_area: 'Intel Archive', feature_name: 'Search by name works' },
  { feature_area: 'Intel Archive', feature_name: 'Search by symptom/manifestation works' },
  { feature_area: 'Intel Archive', feature_name: 'Category filter buttons work' },
  { feature_area: 'Intel Archive', feature_name: 'Type filter (Principality, Power, etc.) works' },
  { feature_area: 'Intel Archive', feature_name: 'Spirit card expands to show full dossier' },
  { feature_area: 'Intel Archive', feature_name: 'AI Enhance button works (Soldier+)' },
  { feature_area: 'Intel Archive', feature_name: 'Tier gating - free users see partial data only' },
  { feature_area: 'Spiritual Mapping (Commander+)', feature_name: 'Page loads at /community/spiritual-mapping' },
  { feature_area: 'Spiritual Mapping (Commander+)', feature_name: 'Training Academy - all lessons load' },
  { feature_area: 'Spiritual Mapping (Commander+)', feature_name: 'Intelligence Map - Leaflet map loads, Copper Basin pin shows' },
  { feature_area: 'Spiritual Mapping (Commander+)', feature_name: 'Field Assessment - Copper Basin region listed' },
  { feature_area: 'Spiritual Mapping (Commander+)', feature_name: 'Submit Region tab loads' },
  { feature_area: 'Field Manual', feature_name: 'Page loads at /community/field-manual' },
  { feature_area: 'Field Manual', feature_name: 'All 4 tabs load (Doctrine, The Enemy, Authority & Weapons, Field Notes)' },
  { feature_area: 'Field Manual', feature_name: 'Free modules accessible without login gate' },
  { feature_area: 'Field Manual', feature_name: 'Soldier+ modules show tier gate for Watchman users' },
  { feature_area: 'Field Manual', feature_name: 'Mark Complete button works and persists' },
  { feature_area: 'Arsenal', feature_name: 'Arsenal page loads with document list' },
  { feature_area: 'Arsenal', feature_name: 'Documents download correctly' },
  { feature_area: 'Arsenal', feature_name: 'Tier gating works (Soldier docs locked for Watchman)' },
  { feature_area: 'Assessment', feature_name: '9-step assessment wizard loads' },
  { feature_area: 'Assessment', feature_name: 'All steps navigate forward/back' },
  { feature_area: 'Assessment', feature_name: 'Submission completes without error' },
  { feature_area: 'Assessment', feature_name: 'Confirmation shown after submit' },
  { feature_area: 'Fringe Intelligence', feature_name: 'Page loads' },
  { feature_area: 'Fringe Intelligence', feature_name: 'Article list shows' },
  { feature_area: 'Fringe Intelligence', feature_name: 'Individual articles open' },
  { feature_area: 'Admin Panel (minister/admin only)', feature_name: 'Dashboard stats load (spirits, members, cost)' },
  { feature_area: 'Admin Panel (minister/admin only)', feature_name: 'Arsenal Manager - upload document works' },
  { feature_area: 'Admin Panel (minister/admin only)', feature_name: 'Intel Archive - AI enhance from admin works' },
  { feature_area: 'Admin Panel (minister/admin only)', feature_name: 'Ministry Library - multi-file drop works' },
  { feature_area: 'Admin Panel (minister/admin only)', feature_name: 'Ministry Library - Auto-fill with AI populates fields' },
  { feature_area: 'Admin Panel (minister/admin only)', feature_name: 'Ministry Library - Upload All completes successfully' },
  { feature_area: 'Admin Panel (minister/admin only)', feature_name: 'Ministry Library - books do NOT appear in Arsenal Drops' },
  { feature_area: 'Mobile Specific', feature_name: 'Homepage renders correctly on mobile' },
  { feature_area: 'Mobile Specific', feature_name: 'Community nav hamburger works on mobile' },
  { feature_area: 'Mobile Specific', feature_name: 'Intel Archive usable on mobile' },
  { feature_area: 'Mobile Specific', feature_name: 'Assessment wizard usable on mobile' },
]

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })

  const auth = await requireTier(req, 1)
  if (auth instanceof Response) return auth

  const supabase = sb()

  if (req.method === 'GET') {
    const { data: existing, error } = await supabase
      .from('feature_verifications')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })

    // Seed if empty
    if (!existing || existing.length === 0) {
      const inserts = SEED_FEATURES.map(f => ({
        feature_name: f.feature_name,
        feature_description: f.feature_name,
        feature_area: f.feature_area,
        status: 'untested',
      }))
      const { data: seeded, error: seedErr } = await supabase
        .from('feature_verifications')
        .insert(inserts)
        .select()
      if (seedErr) return new Response(JSON.stringify({ error: seedErr.message }), { status: 500, headers: HEADERS })
      return new Response(JSON.stringify({ features: seeded }), { headers: HEADERS })
    }

    return new Response(JSON.stringify({ features: existing }), { headers: HEADERS })
  }

  if (req.method === 'POST') {
    let body: any = {}
    try { body = await req.json() } catch {}
    const { id, status, notes } = body
    if (!id || !status) {
      return new Response(JSON.stringify({ error: 'id and status required' }), { status: 400, headers: HEADERS })
    }

    const { error } = await supabase
      .from('feature_verifications')
      .update({
        status,
        notes: notes || null,
        verified_by: auth.userId,
        verified_by_name: auth.displayName,
        verified_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: HEADERS })

    // If needs_change, auto-create a bug report
    if (status === 'needs_change' && notes) {
      const { data: fv } = await supabase.from('feature_verifications').select('feature_name').eq('id', id).single()
      if (fv) {
        await supabase.from('bug_reports').insert({
          title: `Feature: ${fv.feature_name}`,
          description: notes,
          category: 'functionality',
          severity: 'medium',
          submitted_by: auth.userId,
          submitted_by_name: auth.displayName,
          submitted_by_tier: auth.tier,
        })
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: HEADERS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
}

export const config = { path: '/api/testing-verify' }
