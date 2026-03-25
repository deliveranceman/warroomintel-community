import { useState, useRef, useEffect } from 'react'

const gold = '#C9A84C'
const goldLight = '#E8C97A'
const goldDim = 'rgba(201,168,76,0.12)'
const deep = '#0D0B14'
const border = 'rgba(201,168,76,0.18)'
const borderBright = 'rgba(201,168,76,0.45)'
const textDim = '#A89FC0'
const muted = '#6B6480'
const cinzel = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

// Hook to track window width
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [assessmentOpen, setAssessmentOpen] = useState(false)
  const [mobileAssessmentOpen, setMobileAssessmentOpen] = useState(false)
  const dropdownRef = useRef<HTMLLIElement>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAssessmentOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close menu when resizing to desktop
  useEffect(() => {
    if (!isMobile) {
      setMenuOpen(false)
      setMobileAssessmentOpen(false)
    }
  }, [isMobile])

  const closeAll = () => {
    setMenuOpen(false)
    setAssessmentOpen(false)
    setMobileAssessmentOpen(false)
  }

  const navLink = (href: string, label: string) => (
    <a href={href} onClick={closeAll} style={{
      fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.1em',
      color: textDim, textDecoration: 'none', transition: 'color 0.2s',
    }}
      onMouseEnter={e => (e.currentTarget.style.color = gold)}
      onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
      {label}
    </a>
  )

  return (
    <>
      {/* Inject responsive styles */}
      <style>{`
        .wr-nav-desktop { display: flex; }
        .wr-nav-cta { display: inline-block; }
        .wr-hamburger { display: none; }
        .wr-mobile-menu { display: none; }
        @media (max-width: 767px) {
          .wr-nav-desktop { display: none !important; }
          .wr-nav-cta { display: none !important; }
          .wr-hamburger { display: flex !important; }
        }
      `}</style>

      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 1.25rem',
        borderBottom: `1px solid ${border}`,
        background: 'rgba(13,11,20,0.97)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 200,
        boxSizing: 'border-box',
        width: '100%',
      }}>

        {/* Logo */}
        <a href="/" style={{
          fontFamily: cinzel, fontSize: '12px', fontWeight: 600,
          letterSpacing: '0.12em', color: gold, textDecoration: 'none',
          flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          ⚔ THE WAR ROOM
        </a>

        {/* ── Desktop Nav ── */}
        <ul className="wr-nav-desktop" style={{
          gap: '1.5rem', listStyle: 'none', margin: 0, padding: 0,
          alignItems: 'center',
        }}>
          <li>{navLink('/#features', 'Arsenal')}</li>
          <li>{navLink('/#database', 'Database')}</li>

          {/* Assessment dropdown */}
          <li ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setAssessmentOpen(o => !o)}
              onMouseEnter={() => setAssessmentOpen(true)}
              style={{
                fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.1em',
                color: assessmentOpen ? gold : textDim,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 0, display: 'flex', alignItems: 'center', gap: '4px',
                transition: 'color 0.2s',
              }}>
              Assessment
              <span style={{
                fontSize: '7px', opacity: 0.7,
                transition: 'transform 0.2s',
                transform: assessmentOpen ? 'rotate(180deg)' : 'rotate(0)',
                display: 'inline-block',
              }}>▼</span>
            </button>

            {assessmentOpen && (
              <div onMouseLeave={() => setAssessmentOpen(false)} style={{
                position: 'absolute', top: 'calc(100% + 12px)', left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(13,11,20,0.99)',
                backdropFilter: 'blur(16px)',
                border: `1px solid ${borderBright}`,
                borderRadius: '6px', minWidth: '210px', overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)', zIndex: 300,
              }}>
                <div style={{
                  position: 'absolute', top: '-6px', left: '50%',
                  transform: 'translateX(-50%) rotate(45deg)',
                  width: '10px', height: '10px',
                  background: 'rgba(13,11,20,0.99)',
                  border: `1px solid ${borderBright}`,
                  borderBottom: 'none', borderRight: 'none',
                }} />
                {[
                  { href: '/assessment', icon: '📋', label: 'Take the Assessment', sub: 'Ministry intake form' },
                  { href: '/assessment-board', icon: '⚔', label: 'Response Board', sub: 'Ministry responses' },
                ].map((item, i) => (
                  <a key={item.href} href={item.href} onClick={closeAll} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '13px 18px', fontFamily: cinzel, fontSize: '11px',
                    letterSpacing: '0.07em', color: textDim, textDecoration: 'none',
                    borderBottom: i === 0 ? `1px solid ${border}` : 'none',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = goldDim; e.currentTarget.style.color = gold }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = textDim }}>
                    <span style={{ fontSize: '14px' }}>{item.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '2px' }}>{item.label}</div>
                      <div style={{ fontSize: '10px', color: muted, fontFamily: crimson, fontStyle: 'italic' }}>{item.sub}</div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </li>

          <li>{navLink('/#pricing', 'Membership')}</li>
          <li>{navLink('/#faq', 'FAQ')}</li>
        </ul>

        {/* Desktop CTA */}
        <a href="/#pricing" className="wr-nav-cta"
          style={{
            fontFamily: cinzel, fontSize: '11px', fontWeight: 600,
            letterSpacing: '0.1em', color: deep, background: gold,
            padding: '9px 20px', borderRadius: '3px', textDecoration: 'none',
            transition: 'background 0.2s', flexShrink: 0, whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = goldLight)}
          onMouseLeave={e => (e.currentTarget.style.background = gold)}>
          Join Now
        </a>

        {/* ── Hamburger ── */}
        <button
          className="wr-hamburger"
          onClick={() => setMenuOpen(o => !o)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '6px', flexDirection: 'column', gap: '5px',
            alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
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
      </nav>

      {/* ── Mobile Dropdown Menu — outside nav so it overlays correctly ── */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: '57px', left: 0, right: 0,
          background: 'rgba(13,11,20,0.99)',
          backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${border}`,
          zIndex: 199,
          maxHeight: 'calc(100vh - 57px)',
          overflowY: 'auto',
        }}>
          {/* Arsenal */}
          <a href="/#features" onClick={closeAll} style={{
            display: 'block', fontFamily: cinzel, fontSize: '13px',
            letterSpacing: '0.1em', color: textDim, textDecoration: 'none',
            padding: '16px 1.5rem', borderBottom: `1px solid ${border}`,
          }}
            onMouseEnter={e => (e.currentTarget.style.color = gold)}
            onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
            Arsenal
          </a>

          {/* Database */}
          <a href="/#database" onClick={closeAll} style={{
            display: 'block', fontFamily: cinzel, fontSize: '13px',
            letterSpacing: '0.1em', color: textDim, textDecoration: 'none',
            padding: '16px 1.5rem', borderBottom: `1px solid ${border}`,
          }}
            onMouseEnter={e => (e.currentTarget.style.color = gold)}
            onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
            Database
          </a>

          {/* Assessment accordion */}
          <div>
            <button onClick={() => setMobileAssessmentOpen(o => !o)} style={{
              width: '100%', background: mobileAssessmentOpen ? goldDim : 'transparent',
              border: 'none', borderBottom: `1px solid ${border}`,
              cursor: 'pointer', padding: '16px 1.5rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontFamily: cinzel, fontSize: '13px', letterSpacing: '0.1em',
              color: mobileAssessmentOpen ? gold : textDim, textAlign: 'left',
              transition: 'color 0.2s, background 0.2s',
            }}>
              Assessment
              <span style={{
                fontSize: '9px', opacity: 0.7,
                transition: 'transform 0.2s',
                transform: mobileAssessmentOpen ? 'rotate(180deg)' : 'rotate(0)',
                display: 'inline-block',
              }}>▼</span>
            </button>

            {mobileAssessmentOpen && (
              <div style={{ background: 'rgba(201,168,76,0.04)', borderBottom: `1px solid ${border}` }}>
                <a href="/assessment" onClick={closeAll} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 1.5rem 14px 2.5rem',
                  fontFamily: cinzel, fontSize: '12px', letterSpacing: '0.07em',
                  color: textDim, textDecoration: 'none',
                  borderBottom: `1px solid ${border}`, transition: 'color 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = gold)}
                  onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
                  <span style={{ fontSize: '14px' }}>📋</span>
                  <div>
                    <div>Take the Assessment</div>
                    <div style={{ fontSize: '10px', color: muted, fontStyle: 'italic', fontFamily: crimson, marginTop: '2px' }}>Ministry intake form</div>
                  </div>
                </a>
                <a href="/assessment-board" onClick={closeAll} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 1.5rem 14px 2.5rem',
                  fontFamily: cinzel, fontSize: '12px', letterSpacing: '0.07em',
                  color: textDim, textDecoration: 'none', transition: 'color 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = gold)}
                  onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
                  <span style={{ fontSize: '14px' }}>⚔</span>
                  <div>
                    <div>Response Board</div>
                    <div style={{ fontSize: '10px', color: muted, fontStyle: 'italic', fontFamily: crimson, marginTop: '2px' }}>Ministry responses</div>
                  </div>
                </a>
              </div>
            )}
          </div>

          {/* Membership */}
          <a href="/#pricing" onClick={closeAll} style={{
            display: 'block', fontFamily: cinzel, fontSize: '13px',
            letterSpacing: '0.1em', color: textDim, textDecoration: 'none',
            padding: '16px 1.5rem', borderBottom: `1px solid ${border}`,
          }}
            onMouseEnter={e => (e.currentTarget.style.color = gold)}
            onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
            Membership
          </a>

          {/* FAQ */}
          <a href="/#faq" onClick={closeAll} style={{
            display: 'block', fontFamily: cinzel, fontSize: '13px',
            letterSpacing: '0.1em', color: textDim, textDecoration: 'none',
            padding: '16px 1.5rem', borderBottom: `1px solid ${border}`,
          }}
            onMouseEnter={e => (e.currentTarget.style.color = gold)}
            onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
            FAQ
          </a>

          {/* CTA */}
          <div style={{ padding: '1rem 1.5rem 1.5rem' }}>
            <a href="/#pricing" onClick={closeAll} style={{
              display: 'block', fontFamily: cinzel, fontSize: '12px',
              fontWeight: 700, letterSpacing: '0.12em',
              color: deep, background: gold,
              textDecoration: 'none', padding: '14px',
              borderRadius: '3px', textAlign: 'center',
              transition: 'background 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = goldLight)}
              onMouseLeave={e => (e.currentTarget.style.background = gold)}>
              Join Now — 30 Days Free
            </a>
          </div>
        </div>
      )}
    </>
  )
}
