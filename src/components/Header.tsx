import { useState, useRef, useEffect } from 'react'

const MN_URL = 'https://community.warroomintel.com'
const gold = 'var(--gold)'
const goldLight = 'var(--gold-light)'
const goldDim = 'var(--gold-dim)'
const deep = 'var(--deep)'
const border = 'var(--border)'
const borderBright = 'var(--border-bright)'
const textDim = 'var(--text-dim)'
const muted = 'var(--muted)'
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
  const [arsenalOpen, setArsenalOpen] = useState(false)
  const [mobileArsenalOpen, setMobileArsenalOpen] = useState(false)
  const dropdownRef = useRef<HTMLLIElement>(null)
  const arsenalRef = useRef<HTMLLIElement>(null)
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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (arsenalRef.current && !arsenalRef.current.contains(e.target as Node)) {
        setArsenalOpen(false)
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
      setMobileArsenalOpen(false)
    }
  }, [isMobile])

  const closeAll = () => {
    setMenuOpen(false)
    setAssessmentOpen(false)
    setMobileAssessmentOpen(false)
    setArsenalOpen(false)
    setMobileArsenalOpen(false)
  }

  // ── Theme toggle ──────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('wri-theme')
    if (stored === 'dark' || stored === 'light') {
      setTheme(stored)
    } else {
      setTheme(window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    }
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    localStorage.setItem('wri-theme', next)
    setTheme(next)
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
        @media (max-width: 767px) {
          .wr-nav-desktop { display: none !important; }
          .wr-nav-cta { display: none !important; }
          .wr-hamburger { display: flex !important; }
        }
        @media (min-width: 768px) and (max-width: 1024px) {
          .wr-nav-link { font-size: 10px !important; letter-spacing: 0.07em !important; }
          .wr-nav-gap { gap: 1rem !important; }
        }
      `}</style>

      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 1.25rem',
        borderBottom: `1px solid ${border}`,
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 200,
        boxSizing: 'border-box',
        width: '100%',
      }}>

        {/* Logo */}
        <a href="/" style={{ textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="War Room Intel" style={{ height: '44px', width: '44px', objectFit: 'contain', background: 'transparent' }} />
          <div style={{ fontFamily: cinzel, fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', color: gold, lineHeight: 1.3 }}>
            <div>WAR ROOM</div>
            <div style={{ fontSize: '8px', letterSpacing: '0.22em', color: 'rgba(201,168,76,0.65)', fontWeight: 400 }}>INTEL</div>
          </div>
        </a>

        {/* ── Desktop Nav ── */}
        <ul className="wr-nav-desktop wr-nav-gap" style={{
          gap: '1.5rem', listStyle: 'none', margin: 0, padding: 0,
          alignItems: 'center', height: '100%',
        }}>
          <li style={{ display: 'flex', alignItems: 'center' }}>{navLink('/#features', 'Features')}</li>

          {/* Arsenal dropdown */}
          <li ref={arsenalRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => setArsenalOpen(o => !o)}
              onMouseEnter={() => setArsenalOpen(true)}
              style={{
                fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.1em',
                color: arsenalOpen ? gold : textDim,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 0, display: 'flex', alignItems: 'center', gap: '4px',
                transition: 'color 0.2s', lineHeight: 1,
                verticalAlign: 'middle',
              }}>
              Arsenal
              <span style={{
                fontSize: '7px', opacity: 0.7,
                transition: 'transform 0.2s',
                transform: arsenalOpen ? 'rotate(180deg)' : 'rotate(0)',
                display: 'inline-block',
              }}>▼</span>
            </button>

            {arsenalOpen && (
              <div onMouseLeave={() => setArsenalOpen(false)} style={{
                position: 'absolute', top: 'calc(100% + 12px)', left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--dropdown-bg)',
                backdropFilter: 'blur(16px)',
                border: `1px solid ${borderBright}`,
                borderRadius: '6px', minWidth: '210px', overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)', zIndex: 300,
              }}>
                <div style={{
                  position: 'absolute', top: '-6px', left: '50%',
                  transform: 'translateX(-50%) rotate(45deg)',
                  width: '10px', height: '10px',
                  background: 'var(--dropdown-bg)',
                  border: `1px solid ${borderBright}`,
                  borderBottom: 'none', borderRight: 'none',
                }} />
                {[
                  { href: 'https://community.warroomintel.com', icon: '⚔', label: 'Community', sub: 'Join the War Room', external: true },
                  { href: '/resources', icon: '📚', label: 'Resources', sub: 'Ministry resource library', external: false },
                ].map((item, i) => (
                  <a key={item.href} href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    onClick={closeAll}
                    style={{
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

          <li style={{ display: 'flex', alignItems: 'center' }}>{navLink('/#database', 'Database')}</li>

          <li style={{ display: 'flex', alignItems: 'center' }}>
            <a href={MN_URL} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: gold, textDecoration: 'none', padding: '6px 14px', border: `1px solid rgba(201,168,76,0.35)`, borderRadius: '3px', transition: 'all 0.2s', whiteSpace: 'nowrap' as const }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              ⚔ Community
            </a>
          </li>

          {/* Assessment dropdown */}
          <li ref={dropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => setAssessmentOpen(o => !o)}
              onMouseEnter={() => setAssessmentOpen(true)}
              style={{
                fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.1em',
                color: assessmentOpen ? gold : textDim,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 0, display: 'flex', alignItems: 'center', gap: '4px',
                transition: 'color 0.2s', lineHeight: 1,
                verticalAlign: 'middle',
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
                background: 'var(--dropdown-bg)',
                backdropFilter: 'blur(16px)',
                border: `1px solid ${borderBright}`,
                borderRadius: '6px', minWidth: '210px', overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)', zIndex: 300,
              }}>
                <div style={{
                  position: 'absolute', top: '-6px', left: '50%',
                  transform: 'translateX(-50%) rotate(45deg)',
                  width: '10px', height: '10px',
                  background: 'var(--dropdown-bg)',
                  border: `1px solid ${borderBright}`,
                  borderBottom: 'none', borderRight: 'none',
                }} />
                {[
                  { href: '/assessment', icon: '📋', label: 'Take the Assessment', sub: 'Ministry intake form' },
                  { href: '/assessment-board', icon: '⚔', label: 'Response Board', sub: 'Ministry responses' },
                  { href: '/submit-demon', icon: '🗡', label: 'Submit a Demon', sub: 'Add to the database' },
                ].map((item, i) => (
                  <a key={item.href} href={item.href} target={item.external ? '_blank' : undefined} rel={item.external ? 'noopener noreferrer' : undefined} onClick={closeAll} style={{
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

          <li style={{ display: 'flex', alignItems: 'center' }}>{navLink('/#pricing', 'Membership')}</li>
          <li style={{ display: 'flex', alignItems: 'center' }}>{navLink('/#faq', 'FAQ')}</li>
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

        {/* ── Login button ── */}
        <a href={MN_URL} target="_blank" rel="noopener noreferrer"
          className="wr-nav-desktop"
          style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: gold, textDecoration: 'none', padding: '8px 16px', border: `1px solid ${borderBright}`, borderRadius: '3px', whiteSpace: 'nowrap' as const, transition: 'all 0.2s', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          Login
        </a>

        {/* ── Theme toggle ── */}
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            background: 'none', border: `1px solid ${border}`,
            borderRadius: '4px', color: textDim,
            cursor: 'pointer', padding: '6px 8px',
            fontSize: '14px', lineHeight: 1, flexShrink: 0,
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = gold; e.currentTarget.style.color = gold }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = textDim }}
        >
          {theme === 'dark' ? '☀' : '🌙'}
        </button>

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
          background: 'var(--dropdown-bg)',
          backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${border}`,
          zIndex: 199,
          maxHeight: 'calc(100vh - 57px)',
          overflowY: 'auto',
        }}>
          {/* Features */}
          <a href="/#features" onClick={closeAll} style={{
            display: 'block', fontFamily: cinzel, fontSize: '13px',
            letterSpacing: '0.1em', color: textDim, textDecoration: 'none',
            padding: '16px 1.5rem', borderBottom: `1px solid ${border}`,
          }}
            onMouseEnter={e => (e.currentTarget.style.color = gold)}
            onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
            Features
          </a>

          {/* Arsenal accordion */}
          <div>
            <button onClick={() => setMobileArsenalOpen(o => !o)} style={{
              width: '100%', background: mobileArsenalOpen ? goldDim : 'transparent',
              border: 'none', borderBottom: `1px solid ${border}`,
              cursor: 'pointer', padding: '16px 1.5rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontFamily: cinzel, fontSize: '13px', letterSpacing: '0.1em',
              color: mobileArsenalOpen ? gold : textDim, textAlign: 'left',
              transition: 'color 0.2s, background 0.2s',
            }}>
              Arsenal
              <span style={{
                fontSize: '9px', opacity: 0.7,
                transition: 'transform 0.2s',
                transform: mobileArsenalOpen ? 'rotate(180deg)' : 'rotate(0)',
                display: 'inline-block',
              }}>▼</span>
            </button>

            {mobileArsenalOpen && (
              <div style={{ background: 'rgba(201,168,76,0.04)', borderBottom: `1px solid ${border}` }}>
                <a href="https://community.warroomintel.com" target="_blank" rel="noopener noreferrer" onClick={closeAll} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 1.5rem 14px 2.5rem',
                  fontFamily: cinzel, fontSize: '12px', letterSpacing: '0.07em',
                  color: textDim, textDecoration: 'none',
                  borderBottom: `1px solid ${border}`, transition: 'color 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = gold)}
                  onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
                  <span style={{ fontSize: '14px' }}>⚔</span>
                  <div>
                    <div>Community</div>
                    <div style={{ fontSize: '10px', color: muted, fontStyle: 'italic', fontFamily: crimson, marginTop: '2px' }}>Join the War Room</div>
                  </div>
                </a>
                <a href="/resources" onClick={closeAll} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 1.5rem 14px 2.5rem',
                  fontFamily: cinzel, fontSize: '12px', letterSpacing: '0.07em',
                  color: textDim, textDecoration: 'none', transition: 'color 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = gold)}
                  onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
                  <span style={{ fontSize: '14px' }}>📚</span>
                  <div>
                    <div>Resources</div>
                    <div style={{ fontSize: '10px', color: muted, fontStyle: 'italic', fontFamily: crimson, marginTop: '2px' }}>Ministry resource library</div>
                  </div>
                </a>
              </div>
            )}
          </div>

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
                  color: textDim, textDecoration: 'none',
                  borderBottom: `1px solid ${border}`, transition: 'color 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = gold)}
                  onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
                  <span style={{ fontSize: '14px' }}>⚔</span>
                  <div>
                    <div>Response Board</div>
                    <div style={{ fontSize: '10px', color: muted, fontStyle: 'italic', fontFamily: crimson, marginTop: '2px' }}>Ministry responses</div>
                  </div>
                </a>
                <a href="/submit-demon" onClick={closeAll} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 1.5rem 14px 2.5rem',
                  fontFamily: cinzel, fontSize: '12px', letterSpacing: '0.07em',
                  color: textDim, textDecoration: 'none', transition: 'color 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = gold)}
                  onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
                  <span style={{ fontSize: '14px' }}>🗡</span>
                  <div>
                    <div>Submit a Demon</div>
                    <div style={{ fontSize: '10px', color: muted, fontStyle: 'italic', fontFamily: crimson, marginTop: '2px' }}>Add to the database</div>
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
