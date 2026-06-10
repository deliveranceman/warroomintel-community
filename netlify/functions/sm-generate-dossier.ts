import { createClient } from '@supabase/supabase-js'
import { requireTier } from './_shared/access'
import { checkAndIncrementUsage, getUpgradeMessage } from '../lib/ai-rate-limit'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function supabase() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers })

  // General+ required; beta testers need beta_access:true AND "spirit_mapper" in beta_features.
  const auth = await requireTier(req, 3, { allowBeta: 'spirit_mapper' })
  if (auth instanceof Response) return auth

  const usage = await checkAndIncrementUsage(auth.userId, auth.tier, 'spirit_mapping', auth.level)
  if (!usage.allowed) {
    return new Response(JSON.stringify({ error: getUpgradeMessage(auth.tier, 'spirit_mapping'), rateLimited: true, limit: usage.limit, remaining: 0 }), { status: 429, headers })
  }

  try {
    const { regionId, assessmentId } = await req.json()
    if (!regionId || !assessmentId) {
      return new Response(JSON.stringify({ error: 'regionId and assessmentId required' }), { status: 400, headers })
    }

    const sb = supabase()

    // Fetch region
    const { data: region } = await sb.from('sm_regions')
      .select('*')
      .eq('id', regionId)
      .single()

    // Fetch assessment
    const { data: assessment } = await sb.from('sm_assessments')
      .select('*')
      .eq('id', assessmentId)
      .single()

    // Fetch spirits
    const { data: spirits } = await sb.from('sm_region_spirits')
      .select('*')
      .eq('region_id', regionId)
      .order('tier_level', { ascending: false })

    // Fetch research cache
    const { data: research } = await sb.from('sm_research_cache')
      .select('category, summary')
      .eq('region_id', regionId)

    if (!region || !assessment) {
      return new Response(JSON.stringify({ error: 'Region or assessment not found' }), { status: 404, headers })
    }

    // Build context
    const researchContext = research?.map(r => `[${r.category?.toUpperCase()}]\n${r.summary}`).join('\n\n') || ''
    const spiritsList = spirits?.map(s =>
      `- ${s.spirit_name} (Tier ${s.tier_level}) — ${s.confidence} — ${s.legal_rights || 'No legal rights documented'}`
    ).join('\n') || ''

    const assessmentContext = `
REGION: ${region.name}
Population: ${assessment.s1_population || region.population || 'Unknown'}
Tier: ${region.tier}

SECTION 1 — REGIONAL IDENTITY:
${assessment.s1_description || ''}
Church Unity: ${assessment.s1_church_unity || 'Unknown'}

SECTION 2 — HISTORICAL:
Ancient Peoples: ${assessment.s2_ancient_peoples || ''}
Bloodshed Events: ${assessment.s2_bloodshed_events || ''}
Masonic History: ${assessment.s2_masonic_history || ''}
Founding Covenants: ${assessment.s2_founding_covenants || ''}
Environmental Devastation: ${assessment.s2_environmental_devastation || ''}
Broken Treaties: ${assessment.s2_broken_treaties || ''}
False Religion History: ${assessment.s2_false_religion_history || ''}
Land Dedications: ${assessment.s2_land_dedications || ''}

SECTION 3 — CURRENT CONDITIONS:
Addiction Patterns: ${assessment.s3_addiction_patterns || ''}
Poverty Indicators: ${assessment.s3_poverty_indicators || ''}
Crime Patterns: ${assessment.s3_crime_patterns || ''}
Occult Activity: ${assessment.s3_occult_activity || ''}
Dominant Idols: ${assessment.s3_dominant_idols || ''}
Church Division: ${assessment.s3_church_division_notes || ''}

SECTION 4 — DISCERNMENT:
Prophetic Words: ${assessment.s4_prophetic_words || ''}
Field Discernment: ${assessment.s4_field_discernment || ''}
Dreams/Visions: ${assessment.s4_dreams_visions || ''}
Physical Manifestations: ${assessment.s4_physical_manifestations || ''}
Spiritual Atmosphere: ${assessment.s4_spiritual_atmosphere || ''}

SECTION 6 — LEGAL GROUND:
Bloodshed: ${assessment.s6_bloodshed_confirmed ? `CONFIRMED — ${assessment.s6_bloodshed_details}` : 'Not confirmed'}
Idolatry: ${assessment.s6_idolatry_confirmed ? `CONFIRMED — ${assessment.s6_idolatry_details}` : 'Not confirmed'}
Broken Covenants: ${assessment.s6_broken_covenants_confirmed ? `CONFIRMED — ${assessment.s6_broken_covenants_details}` : 'Not confirmed'}
Sexual Perversion: ${assessment.s6_sexual_perversion_confirmed ? `CONFIRMED — ${assessment.s6_sexual_perversion_details}` : 'Not confirmed'}
Additional: ${assessment.s6_additional_legal_ground || ''}

SECTION 7 — IDENTIFIED PRINCIPALITIES:
${spiritsList || 'None documented'}

SECTION 8 — REDEMPTIVE GIFT:
Redemptive Gift: ${assessment.s8_redemptive_gift || region.redemptive_gift || 'Unknown'}
Gift Perversion: ${assessment.s8_gift_perversion || ''}
Signs of Hope: ${assessment.s8_signs_of_hope || ''}
God's Original Design: ${assessment.s8_gods_original_design || ''}
Scripture Promise: ${assessment.s8_scripture_promise || ''}

SECTION 9 — OPERATION DETAILS:
Apostolic Covering: ${assessment.s9_apostolic_covering || ''}
Team Size: ${assessment.s9_team_size || ''}
Team Composition: ${assessment.s9_team_composition || ''}
Operation Date: ${assessment.s9_operation_date || ''}
Personal Deliverance Confirmed: ${assessment.s9_personal_deliverance_confirmed ? 'YES' : 'NO'}
Prayer Cover Confirmed: ${assessment.s9_prayer_cover_confirmed ? 'YES' : 'NO'}

RESEARCH INTELLIGENCE:
${researchContext}
`

    const systemPrompt = `You are a War Room Intel analyst generating a classified Field Intelligence Dossier for a spiritual mapping operation. You combine assessment data, field discernment, and research intelligence into a comprehensive, classified document.

Output ONLY valid JSON with this exact structure:
{
  "title": "string — formal title of the dossier",
  "classification": "string — e.g. CLASSIFIED — COMMANDER+ CLEARANCE REQUIRED",
  "operation_name": "string — code name for this operation (e.g. Operation: Copper Veil)",
  "executive_summary": "string — 2-3 paragraph overview of the spiritual condition of the region",
  "sections": [
    {
      "heading": "string — section title",
      "content": "string — detailed analysis content"
    }
  ],
  "declarations": "string — prophetic declarations and intercession targets based on the data",
  "prepared_by": "War Room Intel — Spiritual Mapping Division",
  "date": "string — current date"
}

The sections array must include: Territorial Assessment, Historical Legal Ground, Current Conditions, Identified Principalities, Redemptive Design, Operational Recommendations.

Write in classified intelligence report style. Be specific, tactical, and spiritually informed.`

    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: assessmentContext }],
      }),
    })

    if (!apiRes.ok) {
      const errText = await apiRes.text()
      console.error('Claude API error:', errText)
      return new Response(JSON.stringify({ error: 'Dossier generation failed — AI error' }), { status: 500, headers })
    }

    const data = await apiRes.json()
    const rawText = data.content?.[0]?.text || ''

    // Extract JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'Failed to parse dossier JSON from AI response' }), { status: 500, headers })
    }

    const dossier = JSON.parse(jsonMatch[0])

    // Update assessment generation count + record who generated it
    await sb.from('sm_assessments').update({
      generated_at:      new Date().toISOString(),
      generation_count:  (assessment.generation_count || 0) + 1,
      last_generated_by: auth.userId,
      updated_at:        new Date().toISOString(),
    }).eq('id', assessmentId)

    return new Response(JSON.stringify({ dossier }), { status: 200, headers })
  } catch (err: any) {
    console.error('sm-generate-dossier error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }
}

export const config = { path: '/api/sm-generate-dossier' }
