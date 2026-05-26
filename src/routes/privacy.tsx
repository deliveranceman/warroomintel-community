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
      <h2 style={{ fontFamily: cinzel, fontSize: 14, color: G, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px', fontWeight: 700 }}>
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
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(201,168,76,0.15)', padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontFamily: cinzel, fontSize: 13, letterSpacing: '0.18em', color: G, textDecoration: 'none' }}>
          ⚔ WAR ROOM INTEL
        </a>
        <a href="/community" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: 'rgba(201,168,76,0.5)', textDecoration: 'none' }}>
          ← Back to Community
        </a>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 32px 80px' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: cinzel, fontSize: 28, color: G, letterSpacing: '0.08em', margin: '0 0 10px', fontWeight: 700 }}>
            Privacy Policy
          </h1>
          <div style={{ fontFamily: crimson, fontSize: 13, color: 'rgba(201,168,76,0.5)', letterSpacing: '0.04em' }}>
            Staffordtown Church · Last Updated: May 26, 2026
          </div>
        </div>

        <Section title="1. Who We Are">
          <P>War Room Intel is operated by Staffordtown Church (Church on Fire), Copperhill, Tennessee 37317. This Privacy Policy explains how we collect, use, and protect your personal information when you use our platform.</P>
        </Section>

        <Section title="2. Information We Collect">
          <P><strong style={{ color: '#e8d5b0' }}>Account information:</strong> Name and email address, provided at registration through Clerk Authentication.</P>
          <P><strong style={{ color: '#e8d5b0' }}>Payment information:</strong> Billing details for paid memberships are processed exclusively through Stripe. We never store, see, or have access to your full credit card number. Stripe's privacy policy governs payment data handling.</P>
          <P><strong style={{ color: '#e8d5b0' }}>Ministry assessment data:</strong> If you complete a ministry intake assessment, your responses are stored in Airtable for ministry use only. This information is treated with the same confidentiality as pastoral counseling records.</P>
          <P><strong style={{ color: '#e8d5b0' }}>User-submitted content:</strong> Testimonies, prayer requests, field reports, and other content you voluntarily submit are stored in Supabase and visible to other community members as intended by the feature.</P>
          <P><strong style={{ color: '#e8d5b0' }}>Usage data:</strong> Standard server logs may record IP addresses, browser type, and pages visited for security and performance monitoring. We do not use these for advertising or profiling.</P>
        </Section>

        <Section title="3. How We Store Your Data">
          <P><strong style={{ color: '#e8d5b0' }}>Clerk</strong> handles authentication and stores your name, email, and membership tier/role in secure public metadata. Clerk's infrastructure is SOC 2 compliant.</P>
          <P><strong style={{ color: '#e8d5b0' }}>Supabase</strong> stores community content: testimonies, field reports, resources, course progress, and ministry library data. No payment information is stored in Supabase.</P>
          <P><strong style={{ color: '#e8d5b0' }}>Airtable</strong> stores the demon database (which contains no personal user data) and ministry assessment responses. Assessment data is accessible only to ordained ministers and administrators.</P>
          <P><strong style={{ color: '#e8d5b0' }}>Stripe</strong> stores all payment and billing information. We receive only confirmation of successful payments and subscription status.</P>
        </Section>

        <Section title="4. How We Use Your Information">
          <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
            <li style={{ marginBottom: 8 }}>To provide and improve the War Room Intel platform and its features.</li>
            <li style={{ marginBottom: 8 }}>To manage your membership and process payments through Stripe.</li>
            <li style={{ marginBottom: 8 }}>To connect you with ministry resources and trained ministers.</li>
            <li style={{ marginBottom: 8 }}>To communicate platform updates, ministry content, and service notifications.</li>
            <li style={{ marginBottom: 8 }}>To maintain the security and integrity of the community.</li>
          </ul>
          <P>We do not sell your personal data to third parties. We do not display advertising. Your information is used solely for ministry and platform operation purposes.</P>
        </Section>

        <Section title="5. Cookies and Session Data">
          <P>War Room Intel uses session cookies managed by Clerk Authentication to maintain your logged-in session. These are functional cookies required for the platform to operate. We do not use advertising, tracking, or analytics cookies.</P>
          <P>You may disable cookies in your browser settings, but doing so will prevent you from logging into the platform.</P>
        </Section>

        <Section title="6. Data Sharing">
          <P>We do not sell, rent, or trade your personal information. We share data only with the following service providers, each under their own privacy policies:</P>
          <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#e8d5b0' }}>Clerk</strong> — authentication and user identity</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#e8d5b0' }}>Stripe</strong> — payment processing</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#e8d5b0' }}>Supabase</strong> — database and storage</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#e8d5b0' }}>Airtable</strong> — ministry database and assessment storage</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#e8d5b0' }}>Netlify</strong> — platform hosting and serverless functions</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#e8d5b0' }}>Anthropic</strong> — AI research assistant (no personal data is sent to Anthropic — only spirit research queries)</li>
          </ul>
        </Section>

        <Section title="7. Assessment Data Confidentiality">
          <P>Ministry intake assessment responses are treated with pastoral confidentiality. Assessment data is accessed only by ordained ministers and administrators at Staffordtown Church for the purpose of providing ministry. This data is not shared with third parties, used for advertising, or disclosed without your consent except as required by law (e.g., imminent safety concerns).</P>
        </Section>

        <Section title="8. Age Restriction">
          <P>War Room Intel is not intended for users under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has registered on the platform, please contact us immediately at <a href="mailto:exorcist@warroomintel.com" style={{ color: G }}>exorcist@warroomintel.com</a>.</P>
        </Section>

        <Section title="9. Data Deletion">
          <P>You may request deletion of your account and associated personal data at any time by emailing <a href="mailto:exorcist@warroomintel.com" style={{ color: G }}>exorcist@warroomintel.com</a>. We will process deletion requests within 30 days. Note that some data may be retained as required by law or for legitimate ministry record-keeping purposes (such as assessment records, which are treated as pastoral counseling records under Tennessee law).</P>
        </Section>

        <Section title="10. Security">
          <P>We employ industry-standard security measures to protect your data, including encrypted connections (HTTPS), secure credential storage through Clerk, and access controls limiting data access to authorized personnel. However, no system is completely secure, and we cannot guarantee absolute security of information transmitted over the internet.</P>
        </Section>

        <Section title="11. Changes to This Policy">
          <P>We may update this Privacy Policy from time to time. Material changes will be communicated by email to registered users. Continued use of the platform after changes are posted constitutes your acceptance of the revised policy.</P>
        </Section>

        <Section title="12. Jurisdiction">
          <P>This Privacy Policy is governed by the laws of the State of Tennessee. Any disputes shall be resolved in Polk County, Tennessee.</P>
        </Section>

        <Section title="13. Contact">
          <P>For privacy questions, data deletion requests, or concerns about your information:</P>
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
