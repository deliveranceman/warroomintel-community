import { Link } from '@tanstack/react-router'

export function Header() {
  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.25rem 2.5rem',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(13,11,20,0.92)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <a
        href="#"
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '13px',
          fontWeight: 600,
          letterSpacing: '0.15em',
          color: 'var(--gold)',
          textDecoration: 'none',
        }}
      >
        ⚔ THE WAR ROOM
      </a>

      <ul
        style={{
          display: 'flex',
          gap: '2rem',
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}
        className="hidden md:flex"
      >
        {[
          { label: 'Arsenal', href: '#features' },
          { label: 'Database', href: '#database' },
          { label: 'Assessment', href: '/assessment' },
          { label: 'Membership', href: '#pricing' },
          { label: 'FAQ', href: '#faq' },
        ].map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '11px',
                letterSpacing: '0.1em',
                color: 'var(--text-dim)',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) =>
                ((e.target as HTMLAnchorElement).style.color = 'var(--gold)')
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLAnchorElement).style.color =
                  'var(--text-dim)')
              }
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>

      <a
        href="#pricing"
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.1em',
          color: 'var(--deep)',
          background: 'var(--gold)',
          border: 'none',
          padding: '9px 22px',
          borderRadius: '3px',
          cursor: 'pointer',
          textDecoration: 'none',
          transition: 'background 0.2s',
          display: 'inline-block',
        }}
        onMouseEnter={(e) =>
          ((e.target as HTMLAnchorElement).style.background =
            'var(--gold-light)')
        }
        onMouseLeave={(e) =>
          ((e.target as HTMLAnchorElement).style.background = 'var(--gold)')
        }
      >
        Join Now
      </a>
    </nav>
  )
}
