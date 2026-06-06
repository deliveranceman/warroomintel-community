import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({
  to,
  subject,
  html,
  from = 'War Room Intel <noreply@warroomintel.com>',
}: {
  to: string
  subject: string
  html: string
  from?: string
}) {
  try {
    await resend.emails.send({ from, to, subject, html })
  } catch (err) {
    console.error('[sendEmail] failed:', err)
  }
}

export function wriEmailTemplate({
  title,
  body,
  ctaText,
  ctaUrl,
}: {
  title: string
  body: string
  ctaText?: string
  ctaUrl?: string
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0D0B14;font-family:'Georgia',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:11px;letter-spacing:0.2em;color:#C9A84C;text-transform:uppercase;margin-bottom:8px;">
        &#9876; War Room Intel
      </div>
      <h1 style="font-size:22px;color:#f0e8d8;margin:0;font-weight:400;letter-spacing:0.05em;">
        ${title}
      </h1>
    </div>
    <div style="background:#1a1610;border:1px solid rgba(201,168,76,0.2);border-radius:8px;padding:28px;margin-bottom:24px;">
      <div style="font-size:15px;color:#d4c9b0;line-height:1.7;">
        ${body}
      </div>
      ${ctaText && ctaUrl ? `<div style="text-align:center;margin-top:24px;">
        <a href="${ctaUrl}" style="display:inline-block;background:#C9A84C;color:#0D0B14;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;">
          ${ctaText}
        </a>
      </div>` : ''}
    </div>
    <div style="text-align:center;font-size:11px;color:#4a3e2a;line-height:1.8;">
      War Room Intel &middot; Ministry of Staffordtown Church<br>
      Copperhill, TN &middot; <a href="https://warroomintel.com" style="color:#C9A84C;">warroomintel.com</a><br>
      <a href="https://warroomintel.com/unsubscribe" style="color:#4a3e2a;">Unsubscribe</a>
    </div>
  </div>
</body>
</html>`
}
