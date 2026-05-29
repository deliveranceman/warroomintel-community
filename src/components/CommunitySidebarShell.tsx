import React from 'react'

interface Props {
  activeItem: string
  userName?: string
  userTierLabel?: string
  /** true = height:100vh + overflow:hidden, for pages with internal scroll panes */
  fillViewport?: boolean
  children: React.ReactNode
}

const G      = '#C9A84C'
const cinzel = "'Cinzel', serif"
const mono   = "'JetBrains Mono', monospace"

const NAV_ITEMS = [
  { label: 'Weekly Intel',      href: '/community' },
  { label: 'Ops Board',         href: '/community?section=forum' },
  { label: 'Intel Archive',     href: '/community?section=database' },
  { label: 'Arsenal',           href: '/arsenal' },
  { label: 'Field Manual',      href: '/community/field-manual' },
  { label: 'Scripture',         href: '/community/scripture' },
  { label: 'Dream Interpreter', href: '/community/dream-interpreter' },
  { label: 'Field Ops',         href: '/community/field-ops' },
  { label: 'Spiritual Mapping', href: '/community/spiritual-mapping' },
  { label: 'Assessment',        href: '/assessment' },
]

export function CommunitySidebarShell({ activeItem, userName, userTierLabel, fillViewport, children }: Props) {
  return (
    <div style={{
      display: 'flex',
      background: '#0D0B14',
      color: '#e8dcc8',
      ...(fillViewport ? { height: '100vh', overflow: 'hidden' } : { minHeight: '100vh' }),
    }}>
      <style>{`
        @media (max-width: 767px) {
          .wri-shell-sidebar  { display: none !important; }
          .wri-shell-main     { margin-left: 0 !important; }
          .wri-shell-topbar   { display: none !important; }
          .wri-shell-mobile-bc { display: flex !important; }
        }
      `}</style>

      {/* ── Sidebar ── */}
      <div className="wri-shell-sidebar" style={{
        width: 220, flexShrink: 0,
        background: '#0f0c07',
        borderRight: '1px solid rgba(201,168,76,0.15)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, bottom: 0, left: 0,
        overflowY: 'auto', zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(201,168,76,0.12)', flexShrink: 0 }}>
          <a href="/community" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt=""
              style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'contain' }}
              onError={e => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
            />
            <div>
              <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.12em' }}>WAR ROOM</div>
              <div style={{ fontFamily: cinzel, fontSize: 9, color: '#6b5e45', letterSpacing: '0.1em' }}>INTEL</div>
            </div>
          </a>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, paddingTop: 4 }}>
          {NAV_ITEMS.map(item => {
            const active = item.label === activeItem
            return (
              <a key={item.label} href={item.href}
                style={{
                  display: 'block', padding: '10px 20px',
                  fontFamily: cinzel, fontSize: 11,
                  letterSpacing: '0.08em', textDecoration: 'none',
                  color: active ? G : '#6b5e45',
                  background: active ? 'rgba(201,168,76,0.08)' : 'transparent',
                  borderLeft: active ? `2px solid ${G}` : '2px solid transparent',
                  transition: 'color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { if (!active) { const el = e.currentTarget as HTMLElement; el.style.color = G; el.style.background = 'rgba(201,168,76,0.04)' }}}
                onMouseLeave={e => { if (!active) { const el = e.currentTarget as HTMLElement; el.style.color = '#6b5e45'; el.style.background = 'transparent' }}}
              >
                {item.label}
              </a>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(201,168,76,0.1)', flexShrink: 0 }}>
          <a href="/community" style={{ fontFamily: cinzel, fontSize: 9, color: '#6b5e45', letterSpacing: '0.1em', textDecoration: 'none' }}>
            ← COMMUNITY
          </a>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="wri-shell-main" style={{
        marginLeft: 220, flex: 1, minWidth: 0,
        display: 'flex', flexDirection: 'column',
        ...(fillViewport ? { overflow: 'hidden' } : {}),
      }}>
        {/* Top bar */}
        <div className="wri-shell-topbar" style={{
          background: '#080610',
          borderBottom: '1px solid rgba(201,168,76,0.12)',
          padding: '8px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 5, flexShrink: 0,
        }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: '#4a3f2a', letterSpacing: '0.1em' }}>
            ● SECURE · {activeItem.toUpperCase()} · WAR ROOM INTEL
          </div>
          {(userName || userTierLabel) && (
            <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.1em' }}>
              {[userName, userTierLabel].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        {/* Mobile breadcrumb — shown at ≤767px via style block */}
        <div className="wri-shell-mobile-bc" style={{
          display: 'none', alignItems: 'center',
          padding: '10px 16px',
          borderBottom: '1px solid rgba(201,168,76,0.15)',
          background: '#0f0c07', flexShrink: 0,
        }}>
          <a href="/community" style={{ fontFamily: cinzel, fontSize: 9, color: '#6b5e45', textDecoration: 'none', letterSpacing: '0.1em' }}>← COMMUNITY</a>
          <span style={{ color: '#6b5e45', margin: '0 8px', opacity: 0.4 }}>›</span>
          <span style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.1em' }}>{activeItem.toUpperCase()}</span>
        </div>

        {/* Content */}
        {fillViewport
          ? <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>{children}</div>
          : children
        }
      </div>
    </div>
  )
}
