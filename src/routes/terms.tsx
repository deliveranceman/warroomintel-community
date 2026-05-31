import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/terms')({
  component: TermsPage,
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

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <div style={{ fontFamily: crimson, fontSize: 13, color: 'rgba(201,168,76,0.5)', letterSpacing: '0.04em' }}>
            Staffordtown Church · Last Updated: May 2026
          </div>
        </div>

        <Section title="1. Acceptance of Terms">
          <P>By accessing or using War Room Intel, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use this platform. Your continued use following any modification to these terms constitutes acceptance of those changes.</P>
        </Section>

        <Section title="2. Description of Service">
          <P>War Room Intel is a ministry intelligence platform operated by Staffordtown Church (Church on Fire), located in Copperhill, Tennessee. The platform provides ministry education resources, deliverance training materials, spiritual mapping tools, and pastoral support resources to the body of Christ.</P>
          <P>War Room Intel is not a licensed counseling service, medical service, mental health practice, or clinical facility. Nothing on this platform constitutes professional medical, psychological, psychiatric, legal, or financial advice.</P>
        </Section>

        <Section title="3. Ministry Disclaimer">
          <P>All content on War Room Intel — including training materials, assessments, demon taxonomy, field reports, and AI-assisted research tools — is provided for pastoral discernment and prayer preparation purposes only.</P>
          <P>This content is not a substitute for professional medical care, mental health treatment, legal counsel, or financial advice. Staffordtown Church makes no guarantee of specific spiritual outcomes. Spiritual freedom is a work of the Holy Spirit requiring the cooperation of the individual. Users experiencing medical or mental health emergencies should seek appropriate professional care immediately.</P>
        </Section>

        <Section title="4. User Accounts">
          <P>Account creation and authentication are handled through Clerk, a third-party identity provider. You are responsible for maintaining the confidentiality of your account credentials. Do not share your login credentials with others.</P>
          <P>You are responsible for all activity that occurs under your account. You agree to notify us immediately at <a href="mailto:exorcist@warroomintel.com" style={{ color: G }}>exorcist@warroomintel.com</a> if you suspect unauthorized account access.</P>
          <P>You must provide accurate, current, and complete information during registration. Accounts with false or misleading information may be suspended or terminated.</P>
        </Section>

        <Section title="5. Subscription & Payments">
          <P>War Room Intel offers tiered membership access (Watchman, Soldier, Commander, General). Paid memberships are processed securely through Stripe. By enrolling in a paid tier, you authorize Stripe to charge your payment method on the applicable billing cycle.</P>
          <P>You may cancel your membership at any time from your account settings. Cancellation takes effect at the end of the current billing period. <strong style={{ color: '#e8d5b0' }}>No refunds are issued</strong> on ministry contributions or membership payments for partial billing periods, as these are treated as voluntary ministry contributions to Staffordtown Church's ministry operations.</P>
          <P>Founding General lifetime memberships are non-refundable and provide perpetual access at the General tier for as long as the platform remains in operation. Staffordtown Church reserves the right to modify membership pricing with 30 days advance notice to existing subscribers.</P>
        </Section>

        <Section title="6. Acceptable Use">
          <P>By using War Room Intel, you agree to use the platform for ministry purposes only and to:</P>
          <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
            <li style={{ marginBottom: 8 }}>Not harass, threaten, defame, or demean other platform members.</li>
            <li style={{ marginBottom: 8 }}>Not share, transfer, or sell your login credentials to others.</li>
            <li style={{ marginBottom: 8 }}>Not republish or redistribute proprietary ministry content outside the platform without written permission.</li>
            <li style={{ marginBottom: 8 }}>Not promote false doctrine, occult practice, or content contrary to biblical Christianity.</li>
            <li style={{ marginBottom: 8 }}>Not use this platform for commercial solicitation, spam, or unauthorized advertising.</li>
            <li style={{ marginBottom: 8 }}>Not attempt to circumvent tier-based access controls or exploit platform security.</li>
          </ul>
          <P>Violations may result in immediate account suspension or permanent termination at Staffordtown Church's sole discretion.</P>
        </Section>

        <Section title="7. Intellectual Property">
          <P>All content on War Room Intel — including the demon database, field ministry articles, training courses, spiritual mapping frameworks, assessment tools, and ministry resources — is the exclusive intellectual property of War Room Intel / Staffordtown Church. All rights reserved.</P>
          <P>User-submitted content (testimonies, field reports, prayer requests, forum posts) remains the property of the submitting user. By submitting content, you grant Staffordtown Church a non-exclusive, royalty-free license to display, share, and use such content within the platform for ministry purposes.</P>
        </Section>

        <Section title="8. Privacy">
          <P>Your use of War Room Intel is also governed by our <a href="/privacy" style={{ color: G }}>Privacy Policy</a>, incorporated here by reference. Please review it to understand how we collect, use, and protect your personal information.</P>
        </Section>

        <Section title="9. Termination">
          <P>Staffordtown Church reserves the right to suspend or terminate any account at any time, with or without notice, for conduct that violates these Terms, disrupts the ministry community, or is otherwise deemed inappropriate by platform administrators. Upon termination, your access to platform content will cease immediately.</P>
        </Section>

        <Section title="10. Governing Law">
          <P>These Terms of Service are governed by and construed in accordance with the laws of the State of Tennessee, without regard to conflict of law principles. Any disputes arising under these Terms shall be resolved in the courts of Polk County, Tennessee.</P>
        </Section>

        <Section title="11. Contact">
          <P>For questions regarding these Terms of Service, contact us at:</P>
          <P>
            <strong style={{ color: '#e8d5b0' }}>Staffordtown Church (Church on Fire)</strong><br />
            Copperhill, Tennessee 37317<br />
            <a href="mailto:exorcist@warroomintel.com" style={{ color: G }}>exorcist@warroomintel.com</a>
          </P>
        </Section>

        <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)', paddingTop: 24, marginTop: 8, display: 'flex', gap: 24 }}>
          <a href="/privacy" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: 'rgba(201,168,76,0.5)', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="/" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: 'rgba(201,168,76,0.5)', textDecoration: 'none' }}>Home</a>
          <a href="/community" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: 'rgba(201,168,76,0.5)', textDecoration: 'none' }}>Community</a>
        </div>
      </div>
    </div>
  )
}
