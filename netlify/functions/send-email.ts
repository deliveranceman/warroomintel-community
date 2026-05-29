import { Resend } from 'resend'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

const FROM = 'exorcist@warroomintel.com'
const ADMIN = 'exorcist@warroomintel.com'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
  }

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS })
  }

  const { type, to, name, submissionId, details } = body || {}

  if (!type || !to) {
    return new Response(JSON.stringify({ error: 'type and to are required' }), { status: 400, headers: HEADERS })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  let emailPayload: Parameters<typeof resend.emails.send>[0]

  if (type === 'intake-confirmation') {
    emailPayload = {
      from: FROM,
      to,
      subject: 'Your Ministry Assessment Has Been Received — War Room Intel',
      html: `
        <div style="background:#08060e;color:#F4F0FC;font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:40px 32px;border:1px solid rgba(201,168,76,0.2)">
          <div style="border-bottom:1px solid rgba(201,168,76,0.3);padding-bottom:20px;margin-bottom:28px">
            <p style="font-family:serif;font-size:11px;color:#C9A84C;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px">WAR ROOM INTEL</p>
            <h1 style="font-size:22px;color:#C9A84C;margin:0;letter-spacing:1px">Assessment Received</h1>
          </div>
          <p style="font-size:16px;line-height:1.7;color:#e8e3d9">Dear ${name || 'Warrior'},</p>
          <p style="font-size:15px;line-height:1.8;color:#b9b2a4">Your ministry assessment has been received and is now in review. Our team will personally respond to your submission. Please allow 24–72 hours for a response.</p>
          <p style="font-size:15px;line-height:1.8;color:#b9b2a4">In the meantime, you can access the War Room Intel community at <a href="https://warroomintel.com/community" style="color:#C9A84C">warroomintel.com</a>.</p>
          ${submissionId ? `<p style="font-family:monospace;font-size:11px;color:#605a4f;margin-top:28px">Reference: ${submissionId}</p>` : ''}
          <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(201,168,76,0.2)">
            <p style="font-size:13px;color:#605a4f;margin:0">In His service,<br/>Pastor Justin Payne<br/>War Room Intel</p>
          </div>
        </div>
      `,
    }
  } else if (type === 'intake-admin') {
    emailPayload = {
      from: FROM,
      to: ADMIN,
      subject: `New Ministry Assessment — ${name || 'Unknown'} (${to})`,
      html: `
        <div style="background:#08060e;color:#F4F0FC;font-family:monospace;max-width:600px;margin:0 auto;padding:32px;border:1px solid rgba(201,168,76,0.3)">
          <p style="font-size:11px;color:#C9A84C;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px">NEW INTAKE SUBMISSION</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="color:#8d8576;padding:6px 0;width:140px;vertical-align:top">Name</td><td style="color:#f4ecdb">${name || '—'}</td></tr>
            <tr><td style="color:#8d8576;padding:6px 0;vertical-align:top">Email</td><td style="color:#f4ecdb">${to}</td></tr>
            ${details?.phone ? `<tr><td style="color:#8d8576;padding:6px 0;vertical-align:top">Phone</td><td style="color:#f4ecdb">${details.phone}</td></tr>` : ''}
            ${details?.issues?.length ? `<tr><td style="color:#8d8576;padding:6px 0;vertical-align:top">Issues</td><td style="color:#f4ecdb">${(details.issues as string[]).join(', ')}</td></tr>` : ''}
            ${details?.duration ? `<tr><td style="color:#8d8576;padding:6px 0;vertical-align:top">Duration</td><td style="color:#f4ecdb">${details.duration}</td></tr>` : ''}
            ${details?.received_before !== undefined ? `<tr><td style="color:#8d8576;padding:6px 0;vertical-align:top">Prior Ministry</td><td style="color:#f4ecdb">${details.received_before ? 'Yes' : 'No'}</td></tr>` : ''}
            ${details?.contact_method ? `<tr><td style="color:#8d8576;padding:6px 0;vertical-align:top">Contact Via</td><td style="color:#f4ecdb">${details.contact_method}</td></tr>` : ''}
            ${submissionId ? `<tr><td style="color:#8d8576;padding:6px 0;vertical-align:top">ID</td><td style="color:#605a4f;font-size:12px">${submissionId}</td></tr>` : ''}
          </table>
          ${details?.description ? `
          <div style="margin-top:20px;padding:16px;background:#0d0b14;border:1px solid rgba(201,168,76,0.15)">
            <p style="font-size:11px;color:#8d8576;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px">Description</p>
            <p style="font-size:14px;color:#e8e3d9;line-height:1.7;margin:0;white-space:pre-wrap">${String(details.description).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>` : ''}
          <p style="font-size:12px;color:#605a4f;margin-top:24px"><a href="https://warroomintel.com/community" style="color:#C9A84C">Open War Room Intel</a></p>
        </div>
      `,
    }
  } else if (type === 'welcome') {
    emailPayload = {
      from: FROM,
      to,
      subject: 'Welcome to War Room Intel — Intelligence for the Fight',
      html: `
        <div style="background:#08060e;color:#F4F0FC;font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:40px 32px;border:1px solid rgba(201,168,76,0.2)">
          <div style="border-bottom:1px solid rgba(201,168,76,0.3);padding-bottom:20px;margin-bottom:28px">
            <p style="font-family:serif;font-size:11px;color:#C9A84C;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px">WAR ROOM INTEL</p>
            <h1 style="font-size:22px;color:#C9A84C;margin:0;letter-spacing:1px">Welcome, Warrior</h1>
          </div>
          <p style="font-size:16px;line-height:1.7;color:#e8e3d9">Dear ${name || 'Warrior'},</p>
          <p style="font-size:15px;line-height:1.8;color:#b9b2a4">You are now part of the War Room Intel community — the most comprehensive spiritual warfare intelligence platform available to the Body of Christ.</p>
          <p style="font-size:15px;line-height:1.8;color:#b9b2a4">Access your dashboard, explore the Intel Archive, and connect with fellow warriors at:</p>
          <p style="text-align:center;margin:28px 0">
            <a href="https://warroomintel.com/community" style="display:inline-block;padding:12px 28px;background:#C9A84C;color:#1a1305;font-family:Georgia,serif;font-size:13px;font-weight:600;text-decoration:none;letter-spacing:1px">ENTER THE WAR ROOM</a>
          </p>
          <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(201,168,76,0.2)">
            <p style="font-size:13px;color:#605a4f;margin:0">In His service,<br/>Pastor Justin Payne<br/>War Room Intel</p>
          </div>
        </div>
      `,
    }
  } else {
    return new Response(JSON.stringify({ error: 'Unknown email type' }), { status: 400, headers: HEADERS })
  }

  const { data, error } = await resend.emails.send(emailPayload)

  if (error) {
    console.error('[send-email] error:', error)
    return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 500, headers: HEADERS })
  }

  return new Response(JSON.stringify({ success: true, id: data?.id }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/send-email' }
