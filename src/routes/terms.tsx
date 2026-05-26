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

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <div style={{ fontFamily: crimson, fontSize: 13, color: 'rgba(201,168,76,0.5)', letterSpacing: '0.04em' }}>
            Staffordtown Church · Last Updated: May 26, 2026
          </div>
        </div>

        <Section title="1. About This Platform">
          <P>War Room Intel is a ministry education and resource platform operated by Staffordtown Church (Church on Fire), located in Copperhill, Tennessee (Polk County). By accessing or using this platform, you agree to be bound by these Terms of Service.</P>
          <P>War Room Intel is provided as an educational and ministry support resource for the body of Christ. It is not a substitute for professional medical, psychological, psychiatric, legal, or financial advice. Nothing on this platform constitutes clinical diagnosis or treatment.</P>
        </Section>

        <Section title="2. Jurisdiction">
          <P>These Terms are governed by and construed in accordance with the laws of the State of Tennessee, without regard to conflict of law principles. Any disputes arising under these Terms shall be resolved in the courts of Polk County, Tennessee.</P>
        </Section>

        <Section title="3. Membership and Billing">
          <P>War Room Intel offers tiered membership access (Watchman, Soldier, Commander, General). Paid memberships are processed securely through Stripe. By enrolling in a paid tier, you authorize Stripe to charge your payment method on the applicable billing cycle.</P>
          <P>You may cancel your membership at any time from your account settings. Cancellation takes effect at the end of the current billing period. No prorated refunds are issued for partial billing periods unless required by applicable law.</P>
          <P>Staffordtown Church reserves the right to modify membership pricing with 30 days advance notice to existing subscribers.</P>
        </Section>

        <Section title="4. Ministry Outcomes">
          <P>Staffordtown Church and War Room Intel make no guarantee of specific spiritual outcomes as a result of using this platform, attending ministry sessions, or following any guidance provided herein. Spiritual freedom is a work of the Holy Spirit and requires the cooperation of the individual seeking ministry.</P>
          <P>Deliverance ministry as presented on this platform reflects the theological convictions and clinical ministry practices of Staffordtown Church. These practices are rooted in Scripture and the traditions of the Church, and are offered in good faith as educational resources.</P>
        </Section>

        <Section title="5. User Conduct">
          <P>By using War Room Intel, you agree to:</P>
          <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
            <li style={{ marginBottom: 8 }}>Not harass, threaten, or demean other members of the community.</li>
            <li style={{ marginBottom: 8 }}>Not promote false doctrine, occult practices, or content contrary to biblical Christianity.</li>
            <li style={{ marginBottom: 8 }}>Not share, republish, or redistribute proprietary ministry content outside the platform without written permission.</li>
            <li style={{ marginBottom: 8 }}>Not use this platform to engage in commercial solicitation, spam, or unauthorized advertising.</li>
            <li style={{ marginBottom: 8 }}>Not attempt to circumvent tier-based access controls or impersonate other users.</li>
          </ul>
          <P>Violation of these conduct standards may result in account suspension or termination at the sole discretion of Staffordtown Church.</P>
        </Section>

        <Section title="6. Content Ownership">
          <P>All content on War Room Intel — including the demon database, field ministry articles, training materials, assessments, and ministry frameworks — is the exclusive property of Staffordtown Church. All rights reserved.</P>
          <P>User-submitted content (testimonies, field reports, prayer requests) remains the property of the submitting user, but you grant Staffordtown Church a non-exclusive license to display and use such content within the platform for ministry purposes.</P>
        </Section>

        <Section title="7. Disclaimer of Warranties">
          <P>War Room Intel is provided "as is" without warranty of any kind, express or implied. Staffordtown Church does not warrant that the platform will be uninterrupted, error-free, or free of security vulnerabilities. Use of this platform is at your own risk.</P>
        </Section>

        <Section title="8. Limitation of Liability">
          <P>To the maximum extent permitted by Tennessee law, Staffordtown Church shall not be liable for any indirect, incidental, consequential, or punitive damages arising from your use of this platform or any ministry activities conducted through it.</P>
        </Section>

        <Section title="9. Changes to These Terms">
          <P>Staffordtown Church reserves the right to update these Terms at any time. Continued use of the platform after changes are posted constitutes your acceptance of the revised Terms. Material changes will be communicated by email to registered users.</P>
        </Section>

        <Section title="10. Contact">
          <P>For questions regarding these Terms, contact us at:</P>
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
