import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
})

const G       = '#C9A84C'
const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontFamily: cinzel, fontSize: 14, color: G, letterSpacing: '0.1em', textTransform: 'uppercase' as const, margin: '0 0 12px', fontWeight: 700 }}>
        {title}
      </h2>
      <div style={{ fontFamily: crimson, fontSize: 16, lineHeight: 1.85, color: '#c8bfa8' }}>
        {children}
      </div>
    </div>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '0 0 12px' }}>{children}</p>
}

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0D0B14', color: '#e8d5b0' }}>
      <div style={{ borderBottom: '1px solid rgba(201,168,76,0.15)', padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontFamily: cinzel, fontSize: 13, letterSpacing: '0.18em', color: G, textDecoration: 'none' }}>
          ⚔ WAR ROOM INTEL
        </a>
        <a href="/community" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: 'rgba(201,168,76,0.5)', textDecoration: 'none' }}>
          ← Back to Community
        </a>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 32px 80px' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: cinzel, fontSize: 28, color: G, letterSpacing: '0.08em', margin: '0 0 10px', fontWeight: 700 }}>
            Privacy Policy
          </h1>
          <div style={{ fontFamily: crimson, fontSize: 13, color: 'rgba(201,168,76,0.5)', letterSpacing: '0.04em' }}>
            Staffordtown Church · Last Updated: May 2026
          </div>
        </div>

        <Section title="1. Information We Collect">
          <P><strong style={{ color: '#e8d5b0' }}>Account information:</strong> When you register, we collect your name and email address through Clerk Authentication.</P>
          <P><strong style={{ color: '#e8d5b0' }}>Payment information:</strong> Billing and payment details for paid memberships are processed exclusively through Stripe. We never store or have access to your full credit card number.</P>
          <P><strong style={{ color: '#e8d5b0' }}>Platform usage data:</strong> Your activity on the platform — including course progress, AI search history, case file entries, and session notes — is stored in Supabase. This data is used solely to provide platform functionality.</P>
          <P><strong style={{ color: '#e8d5b0' }}>Ministry case files and session notes:</strong> If you use the Case Files or Session Notes features, that data is stored in Supabase and treated with pastoral confidentiality. It is accessible only to you and authorized ministers.</P>
          <P><strong style={{ color: '#e8d5b0' }}>User-submitted content:</strong> Testimonies, prayer requests, field reports, forum posts, and other content you voluntarily submit are stored in Supabase and visible to other community members as intended by the feature.</P>
        </Section>

        <Section title="2. How We Use Information">
          <P>We use your information exclusively for the following purposes:</P>
          <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
            <li style={{ marginBottom: 8 }}>To operate and improve the War Room Intel platform and its features.</li>
            <li style={{ marginBottom: 8 }}>To manage your membership and process payments through Stripe.</li>
            <li style={{ marginBottom: 8 }}>To connect you with ministry resources, training, and pastoral support.</li>
            <li style={{ marginBottom: 8 }}>To communicate platform updates, ministry content, and service notifications.</li>
            <li style={{ marginBottom: 8 }}>To maintain the security and integrity of the community.</li>
          </ul>
          <P><strong style={{ color: '#e8d5b0' }}>We do not sell your personal data to any third party, ever.</strong> Your information is never used for advertising, marketing profiling, or any purpose other than ministry platform operation.</P>
        </Section>

        <Section title="3. Third Party Services">
          <P>War Room Intel uses the following third-party services to operate the platform. Each service is governed by its own privacy policy:</P>
          <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#e8d5b0' }}>Clerk</strong> — authentication, user identity, and session management</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#e8d5b0' }}>Stripe</strong> — payment processing and subscription billing</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#e8d5b0' }}>Supabase</strong> — database storage for all platform content and user data</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#e8d5b0' }}>Resend</strong> — transactional email delivery (notifications, receipts)</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#e8d5b0' }}>Stream Chat</strong> — real-time community messaging and direct messaging</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#e8d5b0' }}>YouTube</strong> — embedded training videos (YouTube may set cookies when videos are played)</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#e8d5b0' }}>Anthropic AI</strong> — AI-powered research tools (Ask Dake, Spirit Network, Symptom/Gateway Investigators). Only ministry research queries are sent to Anthropic — no personally identifiable information is included in AI requests.</li>
          </ul>
        </Section>

        <Section title="4. Data Security">
          <P>We employ industry-standard security measures to protect your data, including encrypted connections (HTTPS/TLS), secure credential storage through Clerk's SOC 2 compliant infrastructure, Supabase Row Level Security policies ensuring each user can only access their own data, and strict access controls limiting administrative data access to authorized personnel.</P>
          <P>No internet transmission or electronic storage system is completely secure. While we use commercially reasonable measures to protect your information, we cannot guarantee absolute security.</P>
        </Section>

        <Section title="5. Data Retention">
          <P>Your data is retained for as long as your account is active. If you cancel your membership, your account data remains accessible to you until you request deletion.</P>
          <P>To request deletion of your account and all associated personal data, email <a href="mailto:exorcist@warroomintel.com" style={{ color: G }}>exorcist@warroomintel.com</a>. We will process deletion requests within 30 days. Some records may be retained as required by law or for legitimate ministry record-keeping (such as pastoral counseling records under applicable Tennessee law).</P>
        </Section>

        <Section title="6. Your Rights">
          <P>You have the right to:</P>
          <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#e8d5b0' }}>Access</strong> — request a copy of the personal data we hold about you</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#e8d5b0' }}>Correction</strong> — request correction of inaccurate or incomplete information</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#e8d5b0' }}>Deletion</strong> — request deletion of your account and personal data</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#e8d5b0' }}>Portability</strong> — request an export of your data in a machine-readable format</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#e8d5b0' }}>Objection</strong> — object to specific processing of your personal data</li>
          </ul>
          <P>To exercise any of these rights, contact us at <a href="mailto:exorcist@warroomintel.com" style={{ color: G }}>exorcist@warroomintel.com</a>.</P>
        </Section>

        <Section title="7. Ministry Context">
          <P>War Room Intel operates within a pastoral ministry context. Information shared in the context of case files, session notes, prayer requests, and ministry assessments is treated with the same principles of pastoral confidentiality that govern counseling records at Staffordtown Church.</P>
          <P>Ministry data of a sensitive pastoral nature is accessible only to the submitting user and ordained ministers/administrators at Staffordtown Church. This data is never sold, shared with third parties, or used for purposes outside of providing direct ministry support to the individual concerned.</P>
          <P>Exceptions to confidentiality apply only where required by law, including situations involving imminent risk of harm to self or others.</P>
        </Section>

        <Section title="8. Children">
          <P>War Room Intel is not intended for users under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has registered on the platform, please contact us immediately at <a href="mailto:exorcist@warroomintel.com" style={{ color: G }}>exorcist@warroomintel.com</a> and we will promptly delete the account.</P>
        </Section>

        <Section title="9. Changes to Policy">
          <P>Staffordtown Church reserves the right to update this Privacy Policy at any time. Material changes will be communicated by email to all registered users at least 14 days before taking effect. Minor updates may be made without email notice but will always be posted here with a revised date.</P>
          <P>Continued use of the platform after changes take effect constitutes acceptance of the revised Privacy Policy.</P>
        </Section>

        <Section title="10. Contact">
          <P>For privacy questions, data access requests, or concerns about your information:</P>
          <P>
            <strong style={{ color: '#e8d5b0' }}>Staffordtown Church (Church on Fire)</strong><br />
            Copperhill, Tennessee 37317<br />
            <a href="mailto:exorcist@warroomintel.com" style={{ color: G }}>exorcist@warroomintel.com</a>
          </P>
        </Section>

        <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)', paddingTop: 24, marginTop: 8, display: 'flex', gap: 24 }}>
          <a href="/terms" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: 'rgba(201,168,76,0.5)', textDecoration: 'none' }}>Terms of Service</a>
          <a href="/" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: 'rgba(201,168,76,0.5)', textDecoration: 'none' }}>Home</a>
          <a href="/community" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: 'rgba(201,168,76,0.5)', textDecoration: 'none' }}>Community</a>
        </div>
      </div>
    </div>
  )
}
