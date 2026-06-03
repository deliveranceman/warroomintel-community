import { createClient } from '@supabase/supabase-js'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
  }

  let body: {
    name?: string
    email?: string
    phone?: string
    location?: string
    description?: string
    prior_ministry?: string
    urgency?: string
    referral?: string
    website?: string
  }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: HEADERS })
  }

  // Honeypot — bot filled the hidden field; silently succeed
  if (body.website) {
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: HEADERS })
  }

  const { name, email, description, phone, location, prior_ministry, urgency, referral } = body

  if (!name || !email || !description) {
    return new Response(
      JSON.stringify({ error: 'name, email, and description are required' }),
      { status: 400, headers: HEADERS },
    )
  }

  const supabase = sb()

  const { error: insertError } = await supabase.from('ministry_intake').insert({
    id: crypto.randomUUID(),
    name,
    email,
    phone: phone ?? null,
    location: location ?? null,
    description,
    prior_ministry: prior_ministry ?? null,
    urgency: urgency ?? null,
    referral: referral ?? null,
    created_at: new Date().toISOString(),
  })

  if (insertError) {
    console.error('ministry_intake insert error:', insertError)
    return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: HEADERS })
  }

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const notifyHtml = `
<h2>New Ministry Intake Submission</h2>
<table cellpadding="6" cellspacing="0">
  <tr><td><strong>Name</strong></td><td>${name}</td></tr>
  <tr><td><strong>Email</strong></td><td>${email}</td></tr>
  <tr><td><strong>Phone</strong></td><td>${phone ?? '—'}</td></tr>
  <tr><td><strong>Location</strong></td><td>${location ?? '—'}</td></tr>
  <tr><td><strong>Urgency</strong></td><td>${urgency ?? '—'}</td></tr>
  <tr><td><strong>Referral</strong></td><td>${referral ?? '—'}</td></tr>
  <tr><td><strong>Prior Ministry</strong></td><td>${prior_ministry ?? '—'}</td></tr>
</table>
<h3>Description</h3>
<p>${description.replace(/\n/g, '<br>')}</p>
`

  const confirmHtml = `
<p>Dear ${name},</p>
<p>Thank you for reaching out to War Room Intel.</p>
<p>Pastor Justin Payne personally reviews every submission. You will hear from us within 48–72 hours.</p>
<p>In the meantime, know that you are not alone and there is freedom through Jesus Christ.</p>
<p>In His service,<br>War Room Intel Ministry Team</p>
`

  await resend.emails.send({
    from: 'War Room Intel <noreply@warroomintel.com>',
    to: 'exorcist@warroomintel.com',
    subject: `⚔ New Ministry Intake — ${name} (${urgency ?? 'Unknown'})`,
    html: notifyHtml,
  })

  await resend.emails.send({
    from: 'War Room Intel <noreply@warroomintel.com>',
    to: email,
    subject: 'Your ministry request has been received',
    html: confirmHtml,
  })

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/ministry-intake' }
