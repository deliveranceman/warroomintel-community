import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '@clerk/tanstack-start'

export const Route = createFileRoute('/membership')({
  component: MembershipPage,
})

async function handleUpgrade(tier: string, getToken: () => Promise<string | null>): Promise<void> {
  try {
    const token = await getToken()
    if (!token) { window.location.href = '/sign-in'; return }
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tier }),
    })
    if (!res.ok) throw new Error('Checkout failed')
    const data = await res.json()
    if (data.url) window.location.href = data.url
  } catch (err) {
    console.error('Upgrade error:', err)
  }
}

const cinzel = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"
const gold = 'var(--gold)'
const deep = 'var(--deep)'
const surface = 'var(--surface)'
const surface2 = 'var(--surface2)'
const border = 'var(--border)'
const borderBright = 'var(--border-bright)'
const text = 'var(--text)'
const textDim = 'var(--text-dim)'
const muted = 'var(--muted)'

function MembershipPage() {
  const { getToken } = useAuth()
  const [generalClicked, setGeneralClicked] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--deep)', padding: '5rem 2rem 6rem' }}>

      {/* Charter / Founding Member Section */}
      <div style={{ maxWidth: '900px', margin: '0 auto 60px' }}>
        {/* Urgency banner */}
        <div style={{ textAlign: 'center', background: 'rgba(201,168,76,0.08)', border: `1px solid rgba(201,168,76,0.3)`, borderRadius: '6px', padding: '10px 20px', marginBottom: '28px', fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.12em', color: gold }}>
          ⚔ Founding Member slots are limited. First 100 only.
        </div>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <p style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.3em', color: gold, marginBottom: '10px' }}>✦ Charter Membership</p>
          <h2 style={{ fontFamily: cinzel, fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 700, color: text, marginBottom: '10px', lineHeight: 1.15 }}>
            First 100 Only: <em style={{ color: gold, fontStyle: 'normal' }}>Lock In Your Rate for Life</em>
          </h2>
          <p style={{ fontFamily: crimson, fontSize: '16px', color: textDim, fontStyle: 'italic', margin: 0 }}>
            Charter members receive a founding member badge and this price never increases, even as we add features.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {/* Charter Soldier */}
          <div style={{ padding: '2rem 1.75rem', background: 'rgba(201,168,76,0.04)', border: `1px solid rgba(201,168,76,0.35)`, borderRadius: '8px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(201,168,76,0.2)', border: `1px solid ${gold}`, borderTop: 'none', color: gold, fontFamily: cinzel, fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', padding: '3px 14px', borderRadius: '0 0 4px 4px' }}>
              CHARTER RATE
            </div>
            <div style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.15em', color: gold, marginBottom: '6px', marginTop: '8px' }}>CHARTER SOLDIER</div>
            <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontFamily: cinzel, fontSize: '38px', fontWeight: 700, color: text }}>$9</span>
              <span style={{ fontSize: '14px', color: muted }}>/month</span>
              <span style={{ fontFamily: crimson, fontSize: '13px', color: muted, textDecoration: 'line-through' }}>$19</span>
            </div>
            <p style={{ fontFamily: crimson, fontSize: '12px', color: gold, fontStyle: 'italic', marginBottom: '16px' }}>Locked in for life</p>
            <div style={{ height: '1px', background: border, margin: '0 0 16px' }} />
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                'All Soldier tier access',
                'Rate locked in for life',
                '⚜ Founding Member badge',
                'Limited to first 100',
              ].map(f => (
                <li key={f} style={{ fontSize: '13px', color: textDim, display: 'flex', gap: '8px', alignItems: 'flex-start', lineHeight: 1.7 }}>
                  <span style={{ color: gold, fontSize: '8px', flexShrink: 0, marginTop: '5px' }}>✦</span>
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={() => handleUpgrade('charter_soldier', getToken)} style={{
              display: 'block', width: '100%', padding: '14px', textAlign: 'center',
              fontFamily: cinzel, fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
              borderRadius: '4px', boxSizing: 'border-box',
              background: gold, color: deep, border: 'none', cursor: 'pointer', transition: 'opacity 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
              Claim Charter Soldier ⚔
            </button>
          </div>

          {/* Charter Commander */}
          <div style={{ padding: '2rem 1.75rem', background: 'rgba(201,168,76,0.04)', border: `1px solid rgba(201,168,76,0.5)`, borderRadius: '8px', position: 'relative', boxShadow: '0 0 32px rgba(201,168,76,0.08)' }}>
            <div style={{ position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)', background: gold, color: deep, fontFamily: cinzel, fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', padding: '3px 14px', borderRadius: '0 0 4px 4px' }}>
              BEST VALUE
            </div>
            <div style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.15em', color: gold, marginBottom: '6px', marginTop: '8px' }}>CHARTER COMMANDER</div>
            <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontFamily: cinzel, fontSize: '38px', fontWeight: 700, color: text }}>$20</span>
              <span style={{ fontSize: '14px', color: muted }}>/month</span>
              <span style={{ fontFamily: crimson, fontSize: '13px', color: muted, textDecoration: 'line-through' }}>$39</span>
            </div>
            <p style={{ fontFamily: crimson, fontSize: '12px', color: gold, fontStyle: 'italic', marginBottom: '16px' }}>Locked in for life</p>
            <div style={{ height: '1px', background: border, margin: '0 0 16px' }} />
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                'All Commander tier access',
                'Rate locked in for life',
                '⚜ Founding Member badge',
                'Limited to first 100',
              ].map(f => (
                <li key={f} style={{ fontSize: '13px', color: textDim, display: 'flex', gap: '8px', alignItems: 'flex-start', lineHeight: 1.7 }}>
                  <span style={{ color: gold, fontSize: '8px', flexShrink: 0, marginTop: '5px' }}>✦</span>
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={() => handleUpgrade('charter_commander', getToken)} style={{
              display: 'block', width: '100%', padding: '14px', textAlign: 'center',
              fontFamily: cinzel, fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
              borderRadius: '4px', boxSizing: 'border-box',
              background: gold, color: deep, border: 'none', cursor: 'pointer', transition: 'opacity 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
              Claim Charter Commander ⚔
            </button>
          </div>
        </div>
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 52px' }}>
        <p style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.3em', color: gold, marginBottom: '12px' }}>✦ Membership</p>
        <h1 style={{ fontFamily: cinzel, fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 700, color: text, marginBottom: '16px', lineHeight: 1.1 }}>
          Join the <em style={{ color: gold, fontStyle: 'normal' }}>War Room</em>
        </h1>
        <p style={{ fontFamily: crimson, fontSize: '18px', color: textDim, fontStyle: 'italic', lineHeight: 1.7, margin: 0 }}>
          Start free. Upgrade when you're ready to go deeper into the fight.
        </p>
      </div>

      {/* Tier grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        border: `1px solid ${border}`,
        borderRadius: '8px',
        overflow: 'hidden',
        maxWidth: '1100px',
        margin: '0 auto 48px',
      }}>

        {/* ── WATCHMAN (Free) ── */}
        <div style={{ padding: '2rem 1.75rem', background: deep, borderRight: `1px solid ${border}`, position: 'relative' }}>
          <div style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.15em', color: gold, marginBottom: '6px' }}>WATCHMAN</div>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontFamily: cinzel, fontSize: '38px', fontWeight: 700, color: text }}>$0</span>
            <span style={{ fontSize: '14px', color: muted, marginLeft: '4px' }}>forever</span>
          </div>
          <p style={{ fontFamily: crimson, fontSize: '12px', color: muted, fontStyle: 'italic', marginBottom: '16px' }}>No card required</p>
          <div style={{ height: '1px', background: border, margin: '0 0 16px' }} />
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              'Community discussion',
              'Prayer requests board',
              'Weekly devotional posts',
              'Demon database: name, type, kingdom',
              'Free protocol PDFs',
            ].map(f => (
              <li key={f} style={{ fontSize: '13px', color: textDim, display: 'flex', gap: '8px', alignItems: 'flex-start', lineHeight: 1.7 }}>
                <span style={{ color: gold, fontSize: '8px', flexShrink: 0, marginTop: '5px' }}>✦</span>
                {f}
              </li>
            ))}
          </ul>
          <a href="/sign-up" style={{
            display: 'block', width: '100%', padding: '14px', textAlign: 'center',
            fontFamily: cinzel, fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
            borderRadius: '4px', textDecoration: 'none', boxSizing: 'border-box',
            background: 'transparent', color: gold, border: `1px solid ${border}`,
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'; e.currentTarget.style.background = 'rgba(201,168,76,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.background = 'transparent' }}>
            Join Free ⚔
          </a>
        </div>

        {/* ── SOLDIER ── */}
        <div style={{ padding: '2rem 1.75rem', background: deep, borderRight: `1px solid ${border}`, position: 'relative' }}>
          <div style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.15em', color: gold, marginBottom: '6px' }}>SOLDIER</div>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontFamily: cinzel, fontSize: '38px', fontWeight: 700, color: text }}>$19</span>
            <span style={{ fontSize: '14px', color: muted, marginLeft: '4px' }}>/month</span>
          </div>
          <p style={{ fontFamily: crimson, fontSize: '12px', color: gold, fontStyle: 'italic', marginBottom: '16px' }}>30 days free to start</p>
          <div style={{ height: '1px', background: border, margin: '0 0 16px' }} />
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              'Everything in Watchman',
              'Full database access, all entries',
              'Scripture & entry point fields',
              'Manifestations, Strongman, Rank fields',
              'Soldier protocol PDFs',
              'Monthly group prayer call',
            ].map(f => (
              <li key={f} style={{ fontSize: '13px', color: textDim, display: 'flex', gap: '8px', alignItems: 'flex-start', lineHeight: 1.7 }}>
                <span style={{ color: gold, fontSize: '8px', flexShrink: 0, marginTop: '5px' }}>✦</span>
                {f}
              </li>
            ))}
          </ul>
          <button onClick={() => handleUpgrade('soldier', getToken)} style={{
            display: 'block', width: '100%', padding: '14px', textAlign: 'center',
            fontFamily: cinzel, fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
            borderRadius: '4px', boxSizing: 'border-box',
            background: 'transparent', color: gold, border: `1px solid ${borderBright}`,
            cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
            Start Free Trial ⚔
          </button>
        </div>

        {/* ── COMMANDER ── */}
        <div style={{ padding: '2rem 1.75rem', background: surface2, borderRight: `1px solid ${border}`, position: 'relative' }}>
          {/* Most Popular badge */}
          <div style={{ position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)', background: gold, color: deep, fontFamily: cinzel, fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', padding: '4px 14px', borderRadius: '0 0 4px 4px' }}>
            Most Popular
          </div>
          <div style={{ position: 'absolute', inset: 0, border: `2px solid ${gold}`, borderRadius: '0', pointerEvents: 'none' }} />
          <div style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.15em', color: gold, marginBottom: '6px', marginTop: '8px' }}>COMMANDER</div>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontFamily: cinzel, fontSize: '38px', fontWeight: 700, color: text }}>$39</span>
            <span style={{ fontSize: '14px', color: muted, marginLeft: '4px' }}>/month</span>
          </div>
          <p style={{ fontFamily: crimson, fontSize: '12px', color: gold, fontStyle: 'italic', marginBottom: '16px' }}>30 days free to start</p>
          <div style={{ height: '1px', background: border, margin: '0 0 16px' }} />
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              'Everything in Soldier',
              'All database fields unlocked',
              'Full protocol PDF library',
              'Entry Points, Legal Rights, Protocol fields',
              'Freemasonry protocol PDF',
              'Bi-weekly group call',
            ].map(f => (
              <li key={f} style={{ fontSize: '13px', color: textDim, display: 'flex', gap: '8px', alignItems: 'flex-start', lineHeight: 1.7 }}>
                <span style={{ color: gold, fontSize: '8px', flexShrink: 0, marginTop: '5px' }}>✦</span>
                {f}
              </li>
            ))}
          </ul>
          <button onClick={() => handleUpgrade('commander', getToken)} style={{
            display: 'block', width: '100%', padding: '14px', textAlign: 'center',
            fontFamily: cinzel, fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
            borderRadius: '4px', boxSizing: 'border-box',
            background: gold, color: deep, border: 'none',
            cursor: 'pointer', transition: 'opacity 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
            Start Free Trial ⚔
          </button>
        </div>

        {/* ── GENERAL'S TABLE ── */}
        <div style={{ padding: '2rem 1.75rem', background: deep, position: 'relative' }}>
          <div style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.15em', color: gold, marginBottom: '6px' }}>GENERAL'S TABLE</div>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontFamily: cinzel, fontSize: '38px', fontWeight: 700, color: text }}>$97</span>
            <span style={{ fontSize: '14px', color: muted, marginLeft: '4px' }}>/month</span>
          </div>
          <p style={{ fontFamily: crimson, fontSize: '12px', color: muted, fontStyle: 'italic', marginBottom: '16px' }}>Opening soon</p>
          <div style={{ height: '1px', background: border, margin: '0 0 16px' }} />
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              'Everything in Commander',
              'Leadership PDF library',
              'Weekly intimate group call',
              'Direct ministry access',
              'Symptoms, Companion Spirits, Exorcist Notes',
              'Ministry certification track',
              'Priority assessment response',
            ].map(f => (
              <li key={f} style={{ fontSize: '13px', color: textDim, display: 'flex', gap: '8px', alignItems: 'flex-start', lineHeight: 1.7 }}>
                <span style={{ color: gold, fontSize: '8px', flexShrink: 0, marginTop: '5px' }}>✦</span>
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => setGeneralClicked(true)}
            style={{
              width: '100%', padding: '14px', background: 'rgba(201,168,76,0.08)',
              color: muted, border: `1px solid rgba(201,168,76,0.15)`,
              borderRadius: '4px', fontFamily: cinzel, fontSize: '10px',
              letterSpacing: '0.15em', cursor: 'pointer', boxSizing: 'border-box',
            }}>
            COMING SOON
          </button>
          {generalClicked && (
            <p style={{ marginTop: '12px', fontFamily: crimson, fontSize: '14px', color: textDim, lineHeight: 1.6, textAlign: 'center' }}>
              General's Table opening soon.{' '}
              <a href="mailto:exorcist@warroomintel.com" style={{ color: gold, textDecoration: 'none' }}>
                Email exorcist@warroomintel.com to be notified.
              </a>
            </p>
          )}
        </div>

      </div>

      {/* Footer note */}
      <p style={{ textAlign: 'center', fontSize: '13px', color: muted, fontFamily: crimson, fontStyle: 'italic' }}>
        Questions? Email{' '}
        <a href="mailto:exorcist@warroomintel.com" style={{ color: gold, textDecoration: 'none' }}>exorcist@warroomintel.com</a>
      </p>

    </div>
  )
}
