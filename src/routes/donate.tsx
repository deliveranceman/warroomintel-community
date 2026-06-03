import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/donate')({
  component: DonatePage,
})

const GOLD = '#C9A84C'
const cinzel = 'Cinzel, serif'
const reading = 'Georgia, serif'

function DonatePage() {
  const donationLink = import.meta.env.VITE_STRIPE_DONATION_LINK
  const donationMonthly = import.meta.env.VITE_STRIPE_DONATION_MONTHLY

  return (
    <div style={{ minHeight: '100vh', background: '#0D0B14', color: '#f0e8d8', padding: '60px 24px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontFamily: cinzel, fontSize: 'clamp(24px,4vw,36px)', color: GOLD, letterSpacing: '0.06em', marginBottom: 12 }}>Support War Room Intel</div>
        <div style={{ fontFamily: reading, fontSize: 16, color: 'rgba(240,232,216,0.7)', lineHeight: 1.7, marginBottom: 40 }}>This ministry is funded by people like you. Your gift helps us build tools that equip deliverance ministers worldwide.</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 40 }}>
          <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 8, padding: 28 }}>
            <div style={{ fontFamily: cinzel, fontSize: 14, color: GOLD, letterSpacing: '0.08em', marginBottom: 8 }}>One-Time Gift</div>
            <div style={{ fontFamily: reading, fontSize: 13, color: 'rgba(240,232,216,0.6)', marginBottom: 20 }}>Give any amount once to support the ministry</div>
            {donationLink ? (
              <a href={donationLink} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '12px 24px', background: GOLD, color: '#1a1305', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', textDecoration: 'none', borderRadius: 2, fontWeight: 700 }}>Give Now →</a>
            ) : (
              <div style={{ fontFamily: reading, fontSize: 13, color: 'rgba(201,168,76,0.5)', fontStyle: 'italic' }}>Donation link coming soon —<br />email exorcist@warroomintel.com</div>
            )}
          </div>
          <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 8, padding: 28 }}>
            <div style={{ fontFamily: cinzel, fontSize: 14, color: GOLD, letterSpacing: '0.08em', marginBottom: 8 }}>Monthly Support</div>
            <div style={{ fontFamily: reading, fontSize: 13, color: 'rgba(240,232,216,0.6)', marginBottom: 20 }}>Partner with us monthly to sustain the mission</div>
            {donationMonthly ? (
              <a href={donationMonthly} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '12px 24px', background: GOLD, color: '#1a1305', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', textDecoration: 'none', borderRadius: 2, fontWeight: 700 }}>Become a Partner →</a>
            ) : (
              <div style={{ fontFamily: reading, fontSize: 13, color: 'rgba(201,168,76,0.5)', fontStyle: 'italic' }}>Monthly giving coming soon —<br />email exorcist@warroomintel.com</div>
            )}
          </div>
        </div>

        <div style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 6, padding: '24px 32px', marginBottom: 32 }}>
          <div style={{ fontFamily: reading, fontSize: 16, fontStyle: 'italic', color: 'rgba(240,232,216,0.8)', lineHeight: 1.8, marginBottom: 8 }}>"Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver."</div>
          <div style={{ fontFamily: cinzel, fontSize: 10, color: GOLD, letterSpacing: '0.1em' }}>— 2 Corinthians 9:7</div>
        </div>

        <div style={{ fontFamily: reading, fontSize: 14, color: 'rgba(240,232,216,0.5)' }}>Questions? Email <a href="mailto:exorcist@warroomintel.com" style={{ color: GOLD }}>exorcist@warroomintel.com</a></div>
      </div>
    </div>
  )
}
