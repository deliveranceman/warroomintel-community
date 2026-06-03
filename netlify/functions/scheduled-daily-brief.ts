import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { cleanAIOutput } from '../lib/clean-ai-output'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

async function getRelevantSermonContext(supabase: any, topic?: string): Promise<string> {
  try {
    const searchTerms = topic ||
      ['deliverance', 'spiritual warfare', 'freedom',
       'authority', 'healing', 'generational', 'prayer'][
        Math.floor(Math.random() * 7)
      ]

    const { data } = await supabase
      .from('library_chunks')
      .select('content, book_title, chunk_index')
      .ilike('content', `%${searchTerms}%`)
      .limit(5)
      .order('created_at', { ascending: false })

    if (!data || data.length === 0) return ''

    const context = data
      .map((c: any) => `[From: ${c.book_title}]\n${c.content}`)
      .join('\n\n---\n\n')

    return `\n\nSOURCE MATERIAL FROM PASTOR JUSTIN'S SERMONS:\n${context}\n\nUse the above sermon content as the primary source and inspiration for the devotional. Draw from the language, illustrations, and theological points found in these excerpts. The devotional should feel like it came from these teachings.`
  } catch {
    return ''
  }
}

async function buildDailyBrief(date: string): Promise<{
  title: string
  morning_prayer: string
  scripture: string
  scripture_reference: string
  devotional_text: string
  evening_prayer: string
} | null> {
  const client = sb()

  const { data: ctxRow } = await client
    .from('ministry_context')
    .select('context_text')
    .eq('is_active', true)
    .single()
  const ministryContext = ctxRow?.context_text || 'War Room Intel — a deliverance ministry resource for serious ministers of spiritual warfare.'

  const dayOfWeek = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
  const fullDate  = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const sermonContext = await getRelevantSermonContext(client)

  const prompt = `Generate a complete War Room Intel Daily Brief for ${dayOfWeek}, ${fullDate}.

This is for serious ministers and students of spiritual warfare. Ground every section in scripture.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "title": "A compelling title for today's devotion (10 words max)",
  "morning_prayer": "A focused morning intercession prayer for spiritual warriors (2-3 paragraphs, first person plural)",
  "scripture": "The full scripture text for today (1-3 verses)",
  "scripture_reference": "Book Chapter:Verse format (e.g. Ephesians 6:10-12)",
  "devotional_text": "A substantive devotional message (400-600 words, grounded in deliverance ministry principles, practical application)",
  "evening_prayer": "An evening prayer of declaration and thanksgiving (1-2 paragraphs)"
}` + sermonContext

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: ministryContext,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(55000),
  })

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`)

  const data = await res.json()
  const text = (data.content?.[0]?.text || '').trim()

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in response')
  const parsed = JSON.parse(jsonMatch[0])

  return {
    title: parsed.title,
    morning_prayer: cleanAIOutput(parsed.morning_prayer || ''),
    scripture: parsed.scripture,
    scripture_reference: parsed.scripture_reference,
    devotional_text: cleanAIOutput(parsed.devotional_text || ''),
    evening_prayer: cleanAIOutput(parsed.evening_prayer || ''),
  }
}

export { buildDailyBrief }

export default async function handler() {
  const client = sb()
  const today = new Date().toISOString().slice(0, 10)

  const { data: existing } = await client
    .from('daily_devotions')
    .select('id')
    .eq('date', today)
    .limit(1)

  if (existing && existing.length > 0) {
    console.log(`[scheduled-daily-brief] Entry already exists for ${today}, skipping`)
    return new Response(JSON.stringify({ skipped: true, date: today }), { status: 200 })
  }

  const brief = await buildDailyBrief(today)
  if (!brief) {
    return new Response(JSON.stringify({ error: 'Generation failed' }), { status: 500 })
  }

  const { error } = await client.from('daily_devotions').insert({
    date: today,
    title: brief.title,
    morning_prayer: brief.morning_prayer,
    scripture: brief.scripture,
    scripture_reference: brief.scripture_reference,
    devotional_text: brief.devotional_text,
    evening_prayer: brief.evening_prayer,
    min_tier: 'watchman',
    published: false,
    created_by: 'ai-agent',
  })

  if (error) {
    console.error('[scheduled-daily-brief] Insert error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'exorcist@warroomintel.com',
      to: 'exorcist@warroomintel.com',
      subject: `⚔ Daily Brief Draft Ready — ${today}`,
      html: `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:32px;background:#08060e;color:#E8D5B0;border:1px solid rgba(201,168,76,0.2)">
<h2 style="color:#C9A84C;font-size:18px;letter-spacing:2px">DAILY BRIEF DRAFT — ${today}</h2>
<p style="color:#b9b2a4">Your AI agent has generated today's Daily Brief draft and it's ready for review.</p>
<h3 style="color:#E8D5B0;font-size:16px">${brief.title}</h3>
<p style="color:#b9b2a4;font-size:13px">Scripture: ${brief.scripture_reference}</p>
<p><a href="https://warroomintel.com/admin?tab=daily-brief" style="color:#C9A84C">Review &amp; Publish at Admin &rarr; Daily Brief &rarr;</a></p>
</div>`,
    })
  } catch (emailErr: any) {
    console.error('[scheduled-daily-brief] Email error:', emailErr.message)
  }

  console.log(`[scheduled-daily-brief] Created draft for ${today}: "${brief.title}"`)
  return new Response(JSON.stringify({ success: true, date: today, title: brief.title }), { status: 200 })
}

export const config = { schedule: '0 11 * * *' }
