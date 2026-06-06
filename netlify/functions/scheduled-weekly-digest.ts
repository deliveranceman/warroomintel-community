import { createClient } from '@supabase/supabase-js'
import { sendEmail, wriEmailTemplate } from './_shared/sendEmail'

const { url: supabaseUrl, serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')

function sb() {
  return createClient(supabaseUrl!, serviceRoleKey!)
}

export default async function handler() {
  const client = sb()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const todayStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  // Gather stats
  const [
    { count: newMembersCount },
    { count: totalMembersCount },
    { count: newBriefsCount },
    { count: newArsenalCount },
    { count: newIntelCount },
  ] = await Promise.all([
    client.from('members').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    client.from('members').select('*', { count: 'exact', head: true }),
    client.from('daily_devotions').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo).eq('published', true),
    client.from('arsenal_resources').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    client.from('intel_posts').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
  ])

  const statsBody = `
    <p><strong style="color:#C9A84C;">This Week at War Room Intel:</strong></p>
    <table style="width:100%;border-collapse:collapse;margin:12px 0;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(201,168,76,0.1);color:#9a8c74;">New warriors joined</td>
        <td style="padding:10px 0;border-bottom:1px solid rgba(201,168,76,0.1);color:#f0e8d8;text-align:right;font-weight:bold;">${newMembersCount ?? 0}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(201,168,76,0.1);color:#9a8c74;">Daily Briefs published</td>
        <td style="padding:10px 0;border-bottom:1px solid rgba(201,168,76,0.1);color:#f0e8d8;text-align:right;font-weight:bold;">${newBriefsCount ?? 0}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(201,168,76,0.1);color:#9a8c74;">New Arsenal resources</td>
        <td style="padding:10px 0;border-bottom:1px solid rgba(201,168,76,0.1);color:#f0e8d8;text-align:right;font-weight:bold;">${newArsenalCount ?? 0}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(201,168,76,0.1);color:#9a8c74;">New Weekly Intel posts</td>
        <td style="padding:10px 0;border-bottom:1px solid rgba(201,168,76,0.1);color:#f0e8d8;text-align:right;font-weight:bold;">${newIntelCount ?? 0}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#9a8c74;">Total community members</td>
        <td style="padding:10px 0;color:#C9A84C;text-align:right;font-weight:bold;">${totalMembersCount ?? 0}</td>
      </tr>
    </table>
    <p style="font-size:13px;color:#9a8c74;">Keep pressing in. The battle belongs to the Lord.</p>
  `

  // Fetch all members with email who haven't unsubscribed
  let query = client
    .from('members')
    .select('email, display_name')
    .not('email', 'is', null)
    .neq('email', '')

  // Only filter by unsubscribed if the column exists — don't hard-fail
  try {
    const { data: members, error } = await query
    if (error) {
      console.error('[scheduled-weekly-digest] members fetch error:', error.message)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    const eligible = (members ?? []).filter(
      (m: any) => m.email && !m.unsubscribed
    )

    console.log(`[scheduled-weekly-digest] Sending to ${eligible.length} members`)

    let sent = 0
    for (const member of eligible) {
      try {
        await sendEmail({
          to: member.email,
          subject: `⚔ Weekly War Room Intel — Week of ${todayStr}`,
          html: wriEmailTemplate({
            title: `Weekly War Room Intel`,
            body: statsBody,
            ctaText: 'Enter the War Room',
            ctaUrl: 'https://warroomintel.com/community',
          }),
        })
        sent++
      } catch (e: any) {
        console.error(`[scheduled-weekly-digest] Failed for ${member.email}:`, e.message)
      }
    }

    console.log(`[scheduled-weekly-digest] Done — sent ${sent}/${eligible.length}`)
    return new Response(JSON.stringify({ success: true, sent, total: eligible.length }), { status: 200 })
  } catch (err: any) {
    console.error('[scheduled-weekly-digest] Unexpected error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

export const config = { schedule: '0 13 * * 1' }
