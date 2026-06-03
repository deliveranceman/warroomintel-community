import { createClient } from '@supabase/supabase-js'
import { getMinistryContext } from '../lib/getMinistryContext'
import { checkAndIncrementUsage, getUpgradeMessage } from '../lib/ai-rate-limit'
import { cleanAIOutput } from '../lib/clean-ai-output'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const WAR_STRATEGY_PROMPT = `You are a seasoned deliverance ministry strategist trained in the War Room Intel methodology.
You have received a completed ministry assessment intake form for a person seeking deliverance.

Your job is to produce a PERSONALIZED WAR STRATEGY following this exact order:

1. DISCERNMENT SUMMARY
Brief summary of what you discern from the assessment — the primary spiritual condition, key patterns, and overall picture.

2. PRIMARY SPIRITS IDENTIFIED
List the specific demonic spirits most likely present based on the assessment answers. Include:
- Spirit name
- Why it's present (what answers indicate it)
- Probable rank (principality / power / ruler of darkness / wicked spirit)

3. PROBABLE ENTRY POINTS
List the specific doors that were opened — trauma, sin, occult involvement, generational iniquity, inner vows, etc. Reference specific answers from the assessment.

4. BLOODLINE / GENERATIONAL FACTORS
Based on heritage, family patterns, and generational history — list specific bloodline spirits and covenants that likely need to be addressed.

5. INNER HEALING PRIORITIES
Based on trauma indicators, emotional age, dissociation, identity issues, and unforgiveness — list the specific inner healing appointments Jesus needs to make. Which memories need His presence? Which identity lies need truth?

6. RECOMMENDED SESSION SEQUENCE
The order of ministry:
a. Pre-session preparation (what needs to happen before the session)
b. Renunciations needed (specific categories)
c. Spirit expulsion sequence (order to address spirits — always start with gatekeepers: Leviathan, Mind Control, Python)
d. Inner healing moments to invite Jesus into
e. Post-session declarations and aftercare

7. SCRIPTURES FOR WARFARE
5-7 specific scriptures matched to this person's specific strongholds.

8. MINISTER'S NOTES
Any pastoral observations, cautions, or special considerations for the ministry team.

Format with clear section headers. Be specific and tactical, not generic. Reference the actual assessment content in your analysis.`

async function resolveUser(token: string): Promise<{ userId: string; tier: string } | null> {
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
    const tier = (data?.public_metadata?.tier as string) || 'watchman'
    return { userId, tier }
  } catch { return null }
}

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const authUser = await resolveUser(token)
  if (!authUser) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers })

  const usage = await checkAndIncrementUsage(authUser.userId, authUser.tier, 'assessment')
  if (!usage.allowed) {
    return new Response(JSON.stringify({ error: getUpgradeMessage(authUser.tier, 'assessment'), rateLimited: true, limit: usage.limit, remaining: 0 }), { status: 429, headers })
  }

  const body = await req.json()
  const { assessmentText, anonymizeAndLog } = body

  if (!assessmentText) return new Response(JSON.stringify({ error: 'No assessment text' }), { status: 400, headers })

  try {
    const ministryContext = await getMinistryContext()
    const effectiveSystem = ministryContext ? `${ministryContext}\n\n---\n\n${WAR_STRATEGY_PROMPT}` : WAR_STRATEGY_PROMPT

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: effectiveSystem,
        messages: [{
          role: 'user',
          content: `Here is the completed ministry assessment:\n\n${assessmentText}\n\nGenerate the personalized war strategy now.`,
        }],
      }),
    })

    const claudeData = await claudeRes.json()
    const strategy = cleanAIOutput(claudeData.content?.[0]?.text || '')

    if (!strategy) return new Response(JSON.stringify({ error: 'Strategy generation failed' }), { status: 500, headers })

    if (anonymizeAndLog) {
      try {
        const sb = createClient(supabaseUrl!, supabaseServiceKey!)
        const anonymized = assessmentText
          .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[NAME]')
          .replace(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, '[EMAIL]')
          .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')

        await sb.from('assessment_logs').insert({
          anonymized_assessment: anonymized,
          war_strategy: strategy,
          consented: true,
          created_at: new Date().toISOString(),
        })
      } catch { /* log failure is silent — don't block the user */ }
    }

    return new Response(JSON.stringify({ strategy }), { status: 200, headers })
  } catch {
    return new Response(JSON.stringify({ error: 'Strategy generation failed' }), { status: 500, headers })
  }
}

export const config = { path: '/api/assessment-strategy' }
