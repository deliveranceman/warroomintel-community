import { createClient } from '@supabase/supabase-js'
import { sendEmail, wriEmailTemplate } from './_shared/sendEmail'

const { url: supabaseUrl, serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')

function sb() {
  return createClient(supabaseUrl!, serviceRoleKey!)
}

export default async function handler() {
  const client = sb()
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const todayStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const todayDate = now.toISOString().slice(0, 10)

  const [
    { count: newSignups },
    { count: activeToday },
    { count: betaReports },
    { count: aiCallsToday },
    { count: pendingDMs },
    { data: briefData },
  ] = await Promise.all([
    client.from('members').select('*', { count: 'exact', head: true }).gte('created_at', twentyFourHoursAgo),
    client.from('members').select('*', { count: 'exact', head: true }).gte('last_seen', todayStart),
    client.from('beta_reports').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
    client.from('ai_search_history').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
    client.from('dm_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    client.from('daily_devotions').select('published').eq('date', todayDate).limit(1),
  ])

  const briefPublished = briefData && briefData.length > 0 && briefData[0]?.published === true

  const summaryBody = `
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(201,168,76,0.1);color:#9a8c74;">New signups (24h)</td>
        <td style="padding:10px 0;border-bottom:1px solid rgba(201,168,76,0.1);color:#f0e8d8;text-align:right;font-weight:bold;">${newSignups ?? 0}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(201,168,76,0.1);color:#9a8c74;">Active today</td>
        <td style="padding:10px 0;border-bottom:1px solid rgba(201,168,76,0.1);color:#f0e8d8;text-align:right;font-weight:bold;">${activeToday ?? 0}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(201,168,76,0.1);color:#9a8c74;">Beta reports submitted</td>
        <td style="padding:10px 0;border-bottom:1px solid rgba(201,168,76,0.1);color:#f0e8d8;text-align:right;font-weight:bold;">${betaReports ?? 0}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(201,168,76,0.1);color:#9a8c74;">AI calls today</td>
        <td style="padding:10px 0;border-bottom:1px solid rgba(201,168,76,0.1);color:#f0e8d8;text-align:right;font-weight:bold;">${aiCallsToday ?? 0}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(201,168,76,0.1);color:#9a8c74;">Pending DM requests</td>
        <td style="padding:10px 0;border-bottom:1px solid rgba(201,168,76,0.1);color:${(pendingDMs ?? 0) > 0 ? '#f59e0b' : '#f0e8d8'};text-align:right;font-weight:bold;">${pendingDMs ?? 0}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#9a8c74;">Today's Brief published</td>
        <td style="padding:10px 0;color:${briefPublished ? '#4ade80' : '#f87171'};text-align:right;font-weight:bold;">${briefPublished ? '✓ Yes' : '✗ Not yet'}</td>
      </tr>
    </table>
  `

  await sendEmail({
    to: 'exorcist@warroomintel.com',
    subject: `⚔ WRI Daily Summary — ${todayStr}`,
    html: wriEmailTemplate({
      title: 'Daily Operations Summary',
      body: summaryBody,
      ctaText: 'Open Admin Panel',
      ctaUrl: 'https://warroomintel.com/admin',
    }),
  })

  console.log(`[scheduled-admin-summary] Sent daily summary for ${todayDate}`)
  return new Response(JSON.stringify({ success: true, date: todayDate }), { status: 200 })
}

export const config = { schedule: '0 12 * * *' }
