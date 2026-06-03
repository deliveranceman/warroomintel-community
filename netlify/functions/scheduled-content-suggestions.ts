import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { cleanAIOutput } from '../lib/clean-ai-output'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

function getMondayDate(): string {
  const now = new Date()
  const day = now.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() + diff)
  return monday.toISOString().slice(0, 10)
}

async function generateSuggestions(topic?: string): Promise<any[]> {
  const client = sb()

  const { data: ctxRow } = await client
    .from('ministry_context')
    .select('context_text')
    .eq('is_active', true)
    .single()
  const ministryContext = ctxRow?.context_text || 'War Room Intel — a deliverance ministry resource for serious ministers of spiritual warfare.'

  const { data: historyRows } = await client
    .from('ai_search_history')
    .select('query')
    .in('tool', ['spirit-network', 'symptom-investigator'])
    .order('created_at', { ascending: false })
    .limit(30)

  const recentTopics = historyRows && historyRows.length > 0
    ? [...new Set((historyRows as any[]).map((r: any) => r.query))].slice(0, 10).join(', ')
    : 'general deliverance ministry topics'

  const topicInstruction = topic
    ? `\n\nFocus especially on this topic the admin requested: "${topic}".`
    : ''

  const prompt = `Generate exactly 5 content suggestions for War Room Intel this week. Members have been researching these topics recently: ${recentTopics}.${topicInstruction}

Return ONLY a JSON array of exactly 5 objects:
[
  {
    "content_type": "weekly_intel" | "arsenal_pdf" | "daily_brief" | "field_manual" | "youtube_outline",
    "title": "Compelling title (10 words max)",
    "summary": "2-3 sentence description of what this content covers and why it matters to ministers",
    "suggested_tier": "watchman" | "soldier" | "commander" | "general"
  }
]

Make suggestions varied — not all the same type.
Ground all content in scripture and deliverance ministry.
Target serious ministers and students of spiritual warfare.
At least one suggestion should be free tier (watchman).
At least one should be general tier deep intel.

Return ONLY valid JSON. No markdown, no explanation.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: ministryContext,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(25000),
  })

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`)

  const data = await res.json()
  const text = (data.content?.[0]?.text || '').trim()

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('No JSON array in response')
  return JSON.parse(jsonMatch[0])
}

export default async function handler() {
  const client = sb()
  const weekOf = getMondayDate()

  const { data: existing } = await client
    .from('content_suggestions')
    .select('id')
    .eq('week_of', weekOf)
    .limit(1)

  if (existing && existing.length > 0) {
    console.log(`[scheduled-content-suggestions] Already have suggestions for week ${weekOf}, skipping`)
    return new Response(JSON.stringify({ skipped: true, weekOf }), { status: 200 })
  }

  const suggestions = await generateSuggestions()

  const rows = suggestions.map((s: any) => ({
    week_of: weekOf,
    content_type: s.content_type,
    title: s.title,
    summary: cleanAIOutput(s.summary || ''),
    full_draft: s.full_draft ? cleanAIOutput(s.full_draft) : null,
    suggested_tier: s.suggested_tier || 'watchman',
    status: 'pending',
    created_by: 'ai-agent',
  }))

  const { error } = await client.from('content_suggestions').insert(rows)
  if (error) {
    console.error('[scheduled-content-suggestions] Insert error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const list = suggestions.map((s: any, i: number) => `${i + 1}. [${s.content_type}] ${s.title}`).join('\n')
    await resend.emails.send({
      from: 'exorcist@warroomintel.com',
      to: 'exorcist@warroomintel.com',
      subject: '⚔ 5 Content Suggestions Ready for Review',
      html: `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:32px;background:#08060e;color:#E8D5B0;border:1px solid rgba(201,168,76,0.2)">
<h2 style="color:#C9A84C;font-size:18px;letter-spacing:2px">CONTENT SUGGESTIONS — WEEK OF ${weekOf}</h2>
<p style="color:#b9b2a4">Your AI agent has generated 5 content suggestions for this week:</p>
<ol style="line-height:2;color:#E8D5B0">${suggestions.map((s: any) => `<li><strong style="color:#C9A84C">[${s.content_type.replace('_', ' ').toUpperCase()}]</strong> ${s.title}</li>`).join('')}</ol>
<p><a href="https://warroomintel.com/admin?tab=content-suggestions" style="color:#C9A84C">Review &amp; approve at Admin → Content Suggestions →</a></p>
</div>`,
    })
  } catch (emailErr: any) {
    console.error('[scheduled-content-suggestions] Email error:', emailErr.message)
  }

  console.log(`[scheduled-content-suggestions] Generated ${suggestions.length} suggestions for week ${weekOf}`)
  return new Response(JSON.stringify({ success: true, weekOf, count: suggestions.length }), { status: 200 })
}

export { generateSuggestions }
export const config = { schedule: '0 12 * * 1' }
