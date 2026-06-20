import { Link } from '@tanstack/react-router'

type AdminNavProps = {
  current?: string  // matches the 'key' field of an entry below
}

const LINKS: Array<{
  key: string
  label: string
  icon: string
  to: string
}> = [
  { key: 'dashboard',  label: 'DASHBOARD',  icon: '🏠', to: '/admin/dashboard' },
  { key: 'gateways',   label: 'GATEWAYS',   icon: '🚪', to: '/admin/intel/gateways' },
  // Add scriptures/hierarchy/companions/regions here as they ship.
]

const NAV_BG     = '#FFFFFF'
const NAV_BORDER = '#E5E0D5'
const GOLD       = '#8B6914'
const GOLD_DEEP  = '#604408'
const TEXT       = '#1a1a1a'
const MUTED      = '#6b6b6b'

export function AdminNav({ current }: AdminNavProps) {
  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: NAV_BG,
      borderBottom: `1px solid ${NAV_BORDER}`,
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      overflowX: 'auto',
    }}>
      <div style={{
        fontFamily: 'Cinzel, serif',
        fontSize: 11,
        fontWeight: 600,
        color: GOLD_DEEP,
        letterSpacing: '0.15em',
        flexShrink: 0,
      }}>
        ⚔ WRI ADMIN
      </div>
      <div style={{
        width: 1,
        height: 18,
        background: NAV_BORDER,
        flexShrink: 0,
      }} />
      <div style={{
        display: 'flex',
        gap: 4,
        flexGrow: 1,
        flexWrap: 'nowrap',
      }}>
        {LINKS.map((link) => {
          const active = current === link.key
          return (
            <Link
              key={link.key}
              to={link.to}
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: 11,
                letterSpacing: '0.1em',
                color: active ? GOLD_DEEP : TEXT,
                textDecoration: 'none',
                padding: '6px 10px',
                borderRadius: 3,
                borderBottom: active ? `2px solid ${GOLD}` : '2px solid transparent',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          )
        })}
      </div>
      <a
        href="/admin/?tab=dashboard"
        style={{
          fontFamily: 'Cinzel, serif',
          fontSize: 10,
          color: MUTED,
          textDecoration: 'none',
          letterSpacing: '0.08em',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        LEGACY ADMIN &rarr;
      </a>
    </nav>
  )
}
