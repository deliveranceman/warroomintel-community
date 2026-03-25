import { useState, useRef, useEffect } from 'react'

const gold = '#C9A84C'
const goldLight = '#E8C97A'
const goldDim = 'rgba(201,168,76,0.12)'
const deep = '#0D0B14'
const surface2 = '#1C1828'
const border = 'rgba(201,168,76,0.18)'
const borderBright = 'rgba(201,168,76,0.45)'
const textDim = '#A89FC0'
const muted = '#6B6480'
const cinzel = "'Cinzel', serif"

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [assessmentOpen, setAssessmentOpen] = useState(false)
  const [mobileAssessmentOpen, setMobileAssessmentOpen] = useState(false)
  const dropdownRef = useRef<HTMLLIElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAssessmentOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const closeAll = () => {
    setMenuOpen(false)
    setAssessmentOpen(false)
    setMobileAssessmentOpen(false)
  }

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '1.25rem 2rem',
      borderBottom: `1px solid ${border}`,
      background: 'rgba(13,11,20,0.97)',
      backdropFilter: 'blur(12px)',
      position: 'sticky', top: 0, zIndex: 200,
    }}>

      {/* Logo */}
      <a href="/" style={{ fontFamily: cinzel, fontSize: '13px', fontWeight: 600, letterSpacing: '0.15em', color: gold, textDecoration: 'none', flexShrink: 0 }}>
        ⚔ THE WAR ROOM
      </a>

      {/* ── Desktop Nav ── */}
      <ul style={{ display: 'flex', gap: '1.75rem', listStyle: 'none', margin: 0, padding: 0, alignItems: 'center' }} className="hidden md:flex">

        <li><a href="/#features" style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.1em', color: textDim, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = gold)} onMouseLeave={e => (e.currentTarget.style.color = textDim)}>Arsenal</a></li>

        <li><a href="/#database" style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.1em', color: textDim, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = gold)} onMouseLeave={e => (e.currentTarget.style.color = textDim)}>Database</a></li>

        {/* Assessment dropdown */}
        <li ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setAssessmentOpen(o => !o)}
            onMouseEnter={() => setAssessmentOpen(true)}
            style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.1em', color: assessmentOpen ? gold : textDim, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '5px', transition: 'color 0.2s' }}>
            Assessment
            <span style={{ fontSize: '8px', opacity: 0.7, transition: 'transform 0.2s', transform: assessmentOpen ? 'rotate(180deg)' : 'rotate(0)', display: 'inline-block' }}>▼</span>
          </button>

          {/* Dropdown panel */}
          {assessmentOpen && (
            <div
              onMouseLeave={() => setAssessmentOpen(false)}
              style={{
                position: 'absolute', top: 'calc(100% + 12px)', left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(13,11,20,0.98)',
                backdropFilter: 'blur(16px)',
                border: `1px solid ${borderBright}`,
                borderRadius: '6px',
                minWidth: '200px',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                zIndex: 300,
              }}>
              {/* Arrow pointer */}
              <div style={{ position: 'absolute', top: '-6px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '10px', height: '10px', background: 'rgba(13,11,20,0.98)', border: `1px solid ${borderBright}`, borderBottom: 'none', borderRight: 'none' }} />

              <a href="/assessment" onClick={closeAll} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.08em', color: textDim, textDecoration: 'none', borderBottom: `1px solid ${border}`, transition: 'background 0.15s, color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = goldDim; e.currentTarget.style.color = gold }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = textDim }}>
                <span style={{ fontSize: '14px' }}>📋</span>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '2px' }}>Take the Assessment</div>
                  <div style={{ fontSize: '10px', color: muted, fontFamily: "'Crimson Pro', serif", fontStyle: 'italic' }}>Ministry intake form</div>
                </div>
              </a>

              <a href="/assessment-board" onClick={closeAll} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.08em', color: textDim, textDecoration: 'none', transition: 'background 0.15s, color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = goldDim; e.currentTarget.style.color = gold }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = textDim }}>
                <span style={{ fontSize: '14px' }}>⚔</span>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '2px' }}>Response Board</div>
                  <div style={{ fontSize: '10px', color: muted, fontFamily: "'Crimson Pro', serif", fontStyle: 'italic' }}>Ministry responses</div>
                </div>
              </a>
            </div>
          )}
        </li>

        <li><a href="/#pricing" style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.1em', color: textDim, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = gold)} onMouseLeave={e => (e.currentTarget.style.color = textDim)}>Membership</a></li>

        <li><a href="/#faq" style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.1em', color: textDim, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = gold)} onMouseLeave={e => (e.currentTarget.style.color = textDim)}>FAQ</a></li>

      </ul>

      {/* Desktop CTA */}
      <a href="/#pricing" className="hidden md:inline-block"
        style={{ fontFamily: cinzel, fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', color: deep, background: gold, padding: '9px 22px', borderRadius: '3px', textDecoration: 'none', transition: 'background 0.2s', flexShrink: 0 }}
        onMouseEnter={e => (e.currentTarget.style.background = goldLight)}
        onMouseLeave={e => (e.currentTarget.style.background = gold)}>
        Join Now
      </a>

      {/* ── Mobile Hamburger ── */}
      <button onClick={() => setMenuOpen(o => !o)} className="flex md:hidden"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center', justifyContent: 'center' }}
        aria-label="Toggle menu">
        {menuOpen ? (
          <div style={{ position: 'relative', width: '22px', height: '22px' }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, width: '22px', height: '2px', background: gold, transform: 'rotate(45deg)', transformOrigin: 'center' }} />
            <div style={{ position: 'absolute', top: '50%', left: 0, width: '22px', height: '2px', background: gold, transform: 'rotate(-45deg)', transformOrigin: 'center' }} />
          </div>
        ) : (
          <>
            <div style={{ width: '22px', height: '2px', background: gold, borderRadius: '1px' }} />
            <div style={{ width: '16px', height: '2px', background: gold, borderRadius: '1px' }} />
            <div style={{ width: '22px', height: '2px', background: gold, borderRadius: '1px' }} />
          </>
        )}
      </button>

      {/* ── Mobile Dropdown ── */}
      {menuOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'rgba(13,11,20,0.99)',
          backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${border}`,
          zIndex: 199,
        }}>
          {/* Arsenal */}
          <a href="/#features" onClick={closeAll} style={{ display: 'block', fontFamily: cinzel, fontSize: '12px', letterSpacing: '0.1em', color: textDim, textDecoration: 'none', padding: '14px 2rem', borderBottom: `1px solid ${border}`, transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = gold)}
            onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
            Arsenal
          </a>

          {/* Database */}
          <a href="/#database" onClick={closeAll} style={{ display: 'block', fontFamily: cinzel, fontSize: '12px', letterSpacing: '0.1em', color: textDim, textDecoration: 'none', padding: '14px 2rem', borderBottom: `1px solid ${border}`, transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = gold)}
            onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
            Database
          </a>

          {/* Assessment accordion */}
          <div>
            <button onClick={() => setMobileAssessmentOpen(o => !o)}
              style={{ width: '100%', background: mobileAssessmentOpen ? goldDim : 'none', border: 'none', borderBottom: `1px solid ${border}`, cursor: 'pointer', padding: '14px 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: cinzel, fontSize: '12px', letterSpacing: '0.1em', color: mobileAssessmentOpen ? gold : textDim, textAlign: 'left' as const, transition: 'color 0.2s, background 0.2s' }}>
              Assessment
              <span style={{ fontSize: '10px', opacity: 0.7, transition: 'transform 0.2s', transform: mobileAssessmentOpen ? 'rotate(180deg)' : 'rotate(0)', display: 'inline-block' }}>▼</span>
            </button>

            {mobileAssessmentOpen && (
              <div style={{ background: 'rgba(201,168,76,0.04)', borderBottom: `1px solid ${border}` }}>
                <a href="/assessment" onClick={closeAll} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 2rem 12px 3rem', fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.08em', color: textDim, textDecoration: 'none', borderBottom: `1px solid ${border}`, transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = gold)}
                  onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
                  <span style={{ fontSize: '13px' }}>📋</span>
                  <div>
                    <div>Take the Assessment</div>
                    <div style={{ fontSize: '10px', color: muted, fontStyle: 'italic', fontFamily: "'Crimson Pro', serif", marginTop: '2px' }}>Ministry intake form</div>
                  </div>
                </a>
                <a href="/assessment-board" onClick={closeAll} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 2rem 12px 3rem', fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.08em', color: textDim, textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = gold)}
                  onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
                  <span style={{ fontSize: '13px' }}>⚔</span>
                  <div>
                    <div>Response Board</div>
                    <div style={{ fontSize: '10px', color: muted, fontStyle: 'italic', fontFamily: "'Crimson Pro', serif", marginTop: '2px' }}>Ministry responses</div>
                  </div>
                </a>
              </div>
            )}
          </div>

          {/* Membership */}
          <a href="/#pricing" onClick={closeAll} style={{ display: 'block', fontFamily: cinzel, fontSize: '12px', letterSpacing: '0.1em', color: textDim, textDecoration: 'none', padding: '14px 2rem', borderBottom: `1px solid ${border}`, transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = gold)}
            onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
            Membership
          </a>

          {/* FAQ */}
          <a href="/#faq" onClick={closeAll} style={{ display: 'block', fontFamily: cinzel, fontSize: '12px', letterSpacing: '0.1em', color: textDim, textDecoration: 'none', padding: '14px 2rem', borderBottom: `1px solid ${border}`, transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = gold)}
            onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
            FAQ
          </a>

          {/* CTA */}
          <div style={{ padding: '1rem 2rem 1.5rem' }}>
            <a href="/#pricing" onClick={closeAll}
              style={{ display: 'block', fontFamily: cinzel, fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: deep, background: gold, textDecoration: 'none', padding: '13px', borderRadius: '3px', textAlign: 'center' as const, transition: 'background 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.background = goldLight)}
              onMouseLeave={e => (e.currentTarget.style.background = gold)}>
              Join Now — 30 Days Free
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}
