import { useState, useEffect, useRef } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { SignInButton, SignUpButton, UserButton, SignedIn, SignedOut } from '@clerk/tanstack-start'
import { SecureRibbon } from '@/components/primitives'

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

const TIER_ORDER: Record<string, number> = {
  Watchman: 1, Free: 1, Soldier: 2, Commander: 3, General: 4, Minister: 4,
}

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

function openCmd() {
  document.dispatchEvent(new KeyboardEvent('keydown', { metaKey: true, key: 'k', bubbles: true }))
}

export function Header() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [menuOpen, setMenuOpen] = useState(false)
  const [assessmentOpen, setAssessmentOpen] = useState(false)
  const [mobileAssessmentOpen, setMobileAssessmentOpen] = useState(false)
  const dropdownRef = useRef<HTMLLIElement>(null)
  const isMobile = useIsMobile()

  // community.tsx lines 5805-5806 + 5973 + MembersView TIER_ORDER (line 806)
  const { isLoaded } = useAuth()
  const { user } = useUser()
  const tier    = (user?.publicMetadata?.tier as string) || 'Watchman'
  const tierNum = (user?.publicMetadata?.role as string) === 'minister'
    ? 4
    : (TIER_ORDER[tier] ?? 1)

  // Active path
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

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

  // Theme toggle
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

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  function navLinkStyle(href: string) {
    const active = isActive(href)
    return {
      fontFamily: cinzel,
      fontSize: '11px' as const,
      letterSpacing: '0.1em',
      color: active ? gold : textDim,
      textDecoration: 'none',
      transition: 'color 0.2s',
      borderBottom: active ? `1px solid ${gold}` : '1px solid transparent',
      paddingBottom: '2px',
    }
  }

  return (
    <>
      <style>{`
        .wr-nav-desktop { display: flex; }
        .wr-nav-cta { display: inline-block; }
        .wr-hamburger { display: none; }
        .wr-ribbon { display: flex; }
        @media (max-width: 767px) {
          .wr-nav-desktop { display: none !important; }
          .wr-nav-cta { display: none !important; }
          .wr-hamburger { display: flex !important; }
          .wr-ribbon { display: none !important; }
        }
        @media (min-width: 768px) and (max-width: 1024px) {
          .wr-nav-link { font-size: 10px !important; letter-spacing: 0.07em !important; }
          .wr-nav-gap { gap: 1rem !important; }
        }
      `}</style>

      {/* ── Sticky wrapper: Layer 1 + Layer 2 stacked ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 200,
        width: '100%',
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${border}`,
      }}>

        {/* ── Layer 1: Main App Bar (60px) ── */}
        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
          gap: 8,
          padding: '0 16px',
          minHeight: '60px',
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
            gap: '1.5rem', listStyle: 'none', margin: '0 0 0 1.5rem', padding: 0,
            alignItems: 'center', height: '100%',
          }}>
            <li style={{ display: 'flex', alignItems: 'center' }}>
              <a href="/#features" onClick={closeAll} style={navLinkStyle('/#features')}
                onMouseEnter={e => (e.currentTarget.style.color = gold)}
                onMouseLeave={e => (e.currentTarget.style.color = isActive('/#features') ? gold : textDim)}>
                Features
              </a>
            </li>

            <SignedIn>
              <li style={{ display: 'flex', alignItems: 'center' }}>
                <a href="/community/" onClick={closeAll} style={{
                  fontFamily: cinzel, fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
                  color: gold, textDecoration: 'none', padding: '6px 14px',
                  border: `1px solid ${isActive('/community') ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.35)'}`,
                  borderRadius: '3px', transition: 'all 0.2s', whiteSpace: 'nowrap' as const,
                  background: isActive('/community') ? 'rgba(201,168,76,0.12)' : 'transparent',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = isActive('/community') ? 'rgba(201,168,76,0.12)' : 'transparent' }}>
                  ⚔ Community
                </a>
              </li>
            </SignedIn>

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
                  transition: 'color 0.2s', lineHeight: 1, verticalAlign: 'middle',
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
                    { href: '/help', icon: '🙏', label: 'Request Help', sub: 'Ministry request form' },
                    { href: '/assessment-board', icon: '⚔', label: 'Response Board', sub: 'Ministry responses' },
                    { href: '/submit-demon', icon: '🗡', label: 'Submit a Demon', sub: 'Add to the database' },
                  ].map((item, i) => (
                    <a key={item.href} href={item.href} onClick={closeAll} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '13px 18px', fontFamily: cinzel, fontSize: '11px',
                      letterSpacing: '0.07em', color: textDim, textDecoration: 'none',
                      borderBottom: i < 3 ? `1px solid ${border}` : 'none',
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

            <li style={{ display: 'flex', alignItems: 'center' }}>
              <a href="/membership" onClick={closeAll} style={navLinkStyle('/membership')}
                onMouseEnter={e => (e.currentTarget.style.color = gold)}
                onMouseLeave={e => (e.currentTarget.style.color = isActive('/membership') ? gold : textDim)}>
                Membership
              </a>
            </li>
            <li style={{ display: 'flex', alignItems: 'center' }}>
              <a href="/#faq" onClick={closeAll} style={navLinkStyle('/#faq')}
                onMouseEnter={e => (e.currentTarget.style.color = gold)}
                onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
                FAQ
              </a>
            </li>
          </ul>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* ⌘K button (desktop only) */}
          <SignedIn>
            <button
              className="wr-nav-desktop"
              onClick={openCmd}
              title="Command palette (⌘K)"
              aria-label="Open command palette"
              style={{
                background: 'none',
                border: `1px solid ${borderBright}`,
                borderRadius: '4px',
                color: textDim,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                fontFamily: cinzel,
                fontSize: '10px',
                letterSpacing: '0.08em',
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = gold; e.currentTarget.style.color = gold }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = borderBright; e.currentTarget.style.color = textDim }}
            >
              <span style={{ fontSize: '11px' }}>⌘K</span>
            </button>
          </SignedIn>

          {/* Bell (desktop only) */}
          <SignedIn>
            <button
              className="wr-nav-desktop"
              aria-label="Notifications"
              title="Notifications"
              style={{
                width: '32px', height: '32px',
                background: 'none',
                border: `1px solid ${borderBright}`,
                borderRadius: '50%',
                color: textDim,
                cursor: 'pointer',
                fontSize: '14px',
                lineHeight: 1,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = goldDim; e.currentTarget.style.color = gold }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = textDim }}
            >
              🔔
            </button>
          </SignedIn>

          {/* Desktop CTA — signed-out only */}
          {mounted && (
            <SignedOut>
              <a href="/membership" className="wr-nav-cta"
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
            </SignedOut>
          )}

          {/* Auth buttons */}
          {mounted ? (
            <>
              <SignedOut>
                <SignInButton mode="modal">
                  <button
                    className="wr-nav-desktop"
                    style={{
                      fontFamily: cinzel, fontSize: '10px', fontWeight: 600,
                      letterSpacing: '0.08em', color: gold,
                      background: 'none', padding: '8px 16px',
                      border: `1px solid ${borderBright}`,
                      borderRadius: '3px', whiteSpace: 'nowrap' as const,
                      transition: 'all 0.2s', flexShrink: 0, cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    Login
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <div style={{ flexShrink: 0 }}>
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: { width: '36px', height: '36px' },
                      },
                    }}
                  />
                </div>
              </SignedIn>
            </>
          ) : (
            <button
              className="wr-nav-desktop"
              style={{
                fontFamily: cinzel, fontSize: '10px', fontWeight: 600,
                letterSpacing: '0.08em', color: gold,
                background: 'transparent', padding: '8px 16px',
                border: `1px solid ${borderBright}`,
                borderRadius: '3px', whiteSpace: 'nowrap' as const,
                flexShrink: 0, cursor: 'pointer', opacity: 0.5,
              }}
            >
              Login
            </button>
          )}

          {/* Mobile Join CTA (signed-out only) */}
          <SignedOut>
            <a href="/membership"
              className="wr-hamburger"
              style={{
                background: 'var(--gold)',
                color: 'var(--deep)',
                fontFamily: cinzel,
                fontSize: '11px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                padding: '7px 14px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 700,
                whiteSpace: 'nowrap' as const,
                flexShrink: 0,
              }}>
              Join
            </a>
          </SignedOut>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Switch theme"
            title="Switch theme"
            style={{
              width: '32px', height: '32px',
              background: 'none',
              border: `1px solid ${borderBright}`,
              borderRadius: '50%',
              color: gold,
              cursor: 'pointer',
              fontSize: '14px',
              lineHeight: 1,
              flexShrink: 0,
              marginLeft: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = goldDim)}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {theme === 'dark' ? '☀' : '🌙'}
          </button>

          {/* Hamburger */}
          <button
            className="wr-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 6px', flexDirection: 'column', gap: 2,
              alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: gold,
            }}
            aria-label="Toggle menu">
            {menuOpen ? (
              <>
                <div style={{ position: 'relative', width: '22px', height: '22px' }}>
                  <div style={{ position: 'absolute', top: '50%', left: 0, width: '22px', height: '2px', background: gold, transform: 'rotate(45deg)', transformOrigin: 'center' }} />
                  <div style={{ position: 'absolute', top: '50%', left: 0, width: '22px', height: '2px', background: gold, transform: 'rotate(-45deg)', transformOrigin: 'center' }} />
                </div>
                <span style={{ fontFamily: cinzel, fontSize: '7px', letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>Close</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: '20px', lineHeight: 1 }}>☰</span>
                <span style={{ fontFamily: cinzel, fontSize: '7px', letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>Menu</span>
              </>
            )}
          </button>
        </nav>

        {/* ── Layer 2: SecureRibbon (22px, SignedIn, desktop only) ── */}
        {mounted && isLoaded && (
          <SignedIn>
            <div className="wr-ribbon">
              <SecureRibbon tier={tierNum} activeOps={0} />
            </div>
          </SignedIn>
        )}
      </div>

      {/* ── Mobile Dropdown Menu ── */}
      {menuOpen && (
        <>
          <div
            onClick={() => setMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99 }}
          />
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 100, background: 'rgba(6,4,15,0.97)', pointerEvents: 'none' as const,
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              background: 'var(--dropdown-bg)', zIndex: 101,
              maxHeight: '100vh', overflowY: 'auto',
              pointerEvents: 'all' as const,
            }}>
              {/* Panel header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 1.5rem', borderBottom: `1px solid ${border}` }}>
                <span style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.22em', color: gold }}>⚔ MENU</span>
                <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', color: gold, fontSize: '20px', cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>✕</button>
              </div>

              <a href="/#features" onClick={closeAll} style={{
                display: 'block', fontFamily: cinzel, fontSize: '13px',
                letterSpacing: '0.1em', color: textDim, textDecoration: 'none',
                padding: '16px 1.5rem', borderBottom: `1px solid ${border}`,
              }}
                onMouseEnter={e => (e.currentTarget.style.color = gold)}
                onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
                Features
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
                    {[
                      { href: '/assessment', icon: '📋', label: 'Take the Assessment', sub: 'Ministry intake form' },
                      { href: '/help', icon: '🙏', label: 'Request Help', sub: 'Ministry request form' },
                      { href: '/assessment-board', icon: '⚔', label: 'Response Board', sub: 'Ministry responses' },
                      { href: '/submit-demon', icon: '🗡', label: 'Submit a Demon', sub: 'Add to the database' },
                    ].map((item, i, arr) => (
                      <a key={item.href} href={item.href} onClick={closeAll} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '14px 1.5rem 14px 2.5rem',
                        fontFamily: cinzel, fontSize: '12px', letterSpacing: '0.07em',
                        color: textDim, textDecoration: 'none',
                        borderBottom: i < arr.length - 1 ? `1px solid ${border}` : 'none',
                        transition: 'color 0.2s',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.color = gold)}
                        onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
                        <span style={{ fontSize: '14px' }}>{item.icon}</span>
                        <div>
                          <div>{item.label}</div>
                          <div style={{ fontSize: '10px', color: muted, fontStyle: 'italic', fontFamily: crimson, marginTop: '2px' }}>{item.sub}</div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <a href="/membership" onClick={closeAll} style={{
                display: 'block', fontFamily: cinzel, fontSize: '13px',
                letterSpacing: '0.1em', color: textDim, textDecoration: 'none',
                padding: '16px 1.5rem', borderBottom: `1px solid ${border}`,
              }}
                onMouseEnter={e => (e.currentTarget.style.color = gold)}
                onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
                Membership
              </a>

              <a href="/#faq" onClick={closeAll} style={{
                display: 'block', fontFamily: cinzel, fontSize: '13px',
                letterSpacing: '0.1em', color: textDim, textDecoration: 'none',
                padding: '16px 1.5rem', borderBottom: `1px solid ${border}`,
              }}
                onMouseEnter={e => (e.currentTarget.style.color = gold)}
                onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
                FAQ
              </a>

              <div style={{ padding: '1rem 1.5rem 1.5rem' }}>
                <a href="/membership" onClick={closeAll} style={{
                  display: 'block', fontFamily: cinzel, fontSize: '12px',
                  fontWeight: 700, letterSpacing: '0.12em',
                  color: deep, background: gold,
                  textDecoration: 'none', padding: '14px',
                  borderRadius: '3px', textAlign: 'center',
                  transition: 'background 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = goldLight)}
                  onMouseLeave={e => (e.currentTarget.style.background = gold)}>
                  Join Free for 30 Days
                </a>

                {mounted && (
                  <>
                    <SignedOut>
                      <div style={{
                        borderTop: '1px solid var(--border)',
                        paddingTop: '16px', marginTop: '8px',
                        display: 'flex', flexDirection: 'column', gap: '8px',
                      }}>
                        <SignInButton mode="modal">
                          <button style={{
                            width: '100%', padding: '12px',
                            background: 'transparent', color: 'var(--gold)',
                            border: '1px solid var(--border)', borderRadius: '4px',
                            fontFamily: 'Cinzel, serif', fontSize: '11px',
                            letterSpacing: '0.12em', cursor: 'pointer',
                            textTransform: 'uppercase',
                          }}>Login</button>
                        </SignInButton>
                        <SignUpButton mode="modal">
                          <button style={{
                            width: '100%', padding: '12px',
                            background: 'var(--gold)', color: 'var(--deep)',
                            border: 'none', borderRadius: '4px',
                            fontFamily: 'Cinzel, serif', fontSize: '11px',
                            letterSpacing: '0.12em', cursor: 'pointer',
                            textTransform: 'uppercase', fontWeight: '600',
                          }}>Join Now ⚔</button>
                        </SignUpButton>
                      </div>
                    </SignedOut>
                    <SignedIn>
                      <div style={{
                        borderTop: '1px solid var(--border)',
                        paddingTop: '16px', marginTop: '8px',
                        display: 'flex', alignItems: 'center', gap: '12px',
                      }}>
                        <UserButton />
                        <a href="/arsenal" style={{
                          fontFamily: 'Cinzel, serif', fontSize: '11px',
                          color: 'var(--gold)', textDecoration: 'none',
                          letterSpacing: '0.1em',
                        }}>My Arsenal →</a>
                      </div>
                    </SignedIn>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
