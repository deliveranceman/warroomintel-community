import { useState } from 'react'

const gold = '#C9A84C'
const goldLight = '#E8C97A'
const deep = '#0D0B14'
const surface2 = '#1C1828'
const border = 'rgba(201,168,76,0.18)'
const borderBright = 'rgba(201,168,76,0.45)'
const textDim = '#A89FC0'
const cinzel = "'Cinzel', serif"

const NAV_ITEMS = [
  { label: 'Arsenal',        href: '/#features' },
  { label: 'Database',       href: '/#database' },
  { label: 'Assessment',     href: '/assessment' },
  { label: 'Response Board', href: '/assessment-board' },
  { label: 'Membership',     href: '/#pricing' },
  { label: 'FAQ',            href: '/#faq' },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 2rem', borderBottom: `1px solid ${border}`, background: 'rgba(13,11,20,0.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>

      {/* Logo */}
      <a href="/" style={{ fontFamily: cinzel, fontSize: '13px', fontWeight: 600, letterSpacing: '0.15em', color: gold, textDecoration: 'none' }}>
        ⚔ THE WAR ROOM
      </a>

      {/* Desktop nav */}
      <ul style={{ display: 'flex', gap: '2rem', listStyle: 'none', margin: 0, padding: 0 }} className="hidden md:flex">
        {NAV_ITEMS.map(item => (
          <li key={item.href}>
            <a href={item.href}
              style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.1em', color: textDim, textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = gold)}
              onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>

      {/* Desktop CTA */}
      <a href="/#pricing"
        style={{ fontFamily: cinzel, fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', color: deep, background: gold, border: 'none', padding: '9px 22px', borderRadius: '3px', cursor: 'pointer', textDecoration: 'none', transition: 'background 0.2s', display: 'inline-block' }}
        className="hidden md:inline-block"
        onMouseEnter={e => (e.currentTarget.style.background = goldLight)}
        onMouseLeave={e => (e.currentTarget.style.background = gold)}>
        Join Now
      </a>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMenuOpen(o => !o)}
        className="flex md:hidden"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center', justifyContent: 'center' }}
        aria-label="Toggle menu">
        {menuOpen ? (
          // X icon
          <div style={{ position: 'relative', width: '22px', height: '22px' }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, width: '22px', height: '2px', background: gold, transform: 'rotate(45deg)', transformOrigin: 'center' }} />
            <div style={{ position: 'absolute', top: '50%', left: 0, width: '22px', height: '2px', background: gold, transform: 'rotate(-45deg)', transformOrigin: 'center' }} />
          </div>
        ) : (
          // Hamburger lines
          <>
            <div style={{ width: '22px', height: '2px', background: gold, borderRadius: '1px' }} />
            <div style={{ width: '16px', height: '2px', background: gold, borderRadius: '1px' }} />
            <div style={{ width: '22px', height: '2px', background: gold, borderRadius: '1px' }} />
          </>
        )}
      </button>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'rgba(13,11,20,0.98)',
          backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${border}`,
          padding: '1rem 2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
          zIndex: 99,
        }}>
          {NAV_ITEMS.map((item, i) => (
            <a key={item.href} href={item.href}
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: cinzel,
                fontSize: '12px',
                letterSpacing: '0.12em',
                color: textDim,
                textDecoration: 'none',
                padding: '14px 0',
                borderBottom: i < NAV_ITEMS.length - 1 ? `1px solid ${border}` : 'none',
                transition: 'color 0.2s',
                display: 'block',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = gold)}
              onMouseLeave={e => (e.currentTarget.style.color = textDim)}>
              {item.label}
            </a>
          ))}
          <a href="/#pricing"
            onClick={() => setMenuOpen(false)}
            style={{
              fontFamily: cinzel,
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: deep,
              background: gold,
              textDecoration: 'none',
              padding: '12px',
              borderRadius: '3px',
              textAlign: 'center',
              marginTop: '16px',
              display: 'block',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = goldLight)}
            onMouseLeave={e => (e.currentTarget.style.background = gold)}>
            Join Now — 30 Days Free
          </a>
        </div>
      )}
    </nav>
  )
}
