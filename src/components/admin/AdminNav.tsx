import { Link } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'

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
  { key: 'scriptures', label: 'SCRIPTURES', icon: '📜', to: '/admin/intel/scriptures' },
  { key: 'sol-test',   label: 'SOL TEST',   icon: '🔬', to: '/admin/intel/sol-test' },
  // Add hierarchy/companions/regions here as they ship.
]

// Every tab in the legacy Command Center (src/routes/admin.tsx), in source order.
// As sections get extracted into dedicated browse pages, move them up into LINKS.
const LEGACY_TABS: Array<{ tab: string; label: string; icon: string }> = [
  { tab: 'dashboard',          label: 'Command Center',       icon: '📊' },
  { tab: 'arsenal',            label: 'Arsenal',              icon: '📚' },
  { tab: 'intel',              label: 'Intel Archive',        icon: '🕯️' },
  { tab: 'moderation',         label: 'Moderation',           icon: '🛡️' },
  { tab: 'training',           label: 'Training',             icon: '🎯' },
  { tab: 'daily-brief',        label: 'Daily Brief',          icon: '📰' },
  { tab: 'field-ministry',     label: 'Field Ministry',       icon: '⛪' },
  { tab: 'documents',          label: 'Documents',            icon: '📄' },
  { tab: 'library',            label: 'Library',              icon: '📖' },
  { tab: 'spirit-candidates',  label: 'Spirit Candidates',    icon: '🌱' },
  { tab: 'sources',            label: 'Sources',              icon: '🔗' },
  { tab: 'spiritual-mapping',  label: 'Spiritual Mapping',    icon: '🗺️' },
  { tab: 'lib-intel',          label: 'Library Intelligence', icon: '🔍' },
  { tab: 'ai-command',         label: 'AI Command',           icon: '🤖' },
  { tab: 'ai-context',         label: 'AI Context',           icon: '🧠' },
  { tab: 'taxonomy',           label: 'Taxonomy',             icon: '🏷️' },
  { tab: 'content-suggestions',label: 'Content Studio',       icon: '✍️' },
  { tab: 'notifications',      label: 'Notifications',         icon: '🔔' },
  { tab: 'modals',             label: 'Modals',               icon: '🪟' },
  { tab: 'help-docs',          label: 'Help Docs',            icon: '📑' },
  { tab: 'ai-usage-admin',     label: 'AI Usage',             icon: '📈' },
  { tab: 'tracker',            label: 'Tracker',              icon: '🧭' },
  { tab: 'internal-books',     label: 'Internal Books',       icon: '📕' },
  { tab: 'admin-chat',         label: 'Admin Chat',           icon: '💬' },
  { tab: 'enrichment',         label: 'Enrichment',           icon: '✨' },
  { tab: 'suggested-edits',    label: 'Suggested Edits',      icon: '✏️' },
  { tab: 'test-sol',           label: 'Test SOL',             icon: '🧪' },
  { tab: 'sol-research',       label: 'SOL Research',         icon: '🔬' },
  { tab: 'research-drop',      label: 'Research Drop',        icon: '📥' },
  { tab: 'members',            label: 'Members',              icon: '👥' },
  { tab: 'atmosphere',         label: 'Atmosphere',           icon: '🌫️' },
]

const NAV_BG     = '#FFFFFF'
const NAV_BORDER = '#E5E0D5'
const GOLD       = '#8B6914'
const GOLD_DEEP  = '#604408'
const TEXT       = '#1a1a1a'
const MUTED      = '#6b6b6b'

export function AdminNav({ current }: AdminNavProps) {
  const [legacyOpen, setLegacyOpen] = useState(false)
  const legacyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!legacyOpen) return
    function onClick(e: MouseEvent) {
      if (legacyRef.current && !legacyRef.current.contains(e.target as Node)) {
        setLegacyOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [legacyOpen])

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
      overflow: 'visible',
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
        overflowX: 'auto',
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
      <div ref={legacyRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setLegacyOpen((o) => !o)}
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 10,
            color: MUTED,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 4px',
          }}
        >
          LEGACY ADMIN <span style={{ fontSize: 8 }}>{legacyOpen ? '▲' : '▼'}</span>
        </button>
        {legacyOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 6,
            background: NAV_BG,
            border: `1px solid ${NAV_BORDER}`,
            borderRadius: 6,
            boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
            padding: 6,
            minWidth: 220,
            maxHeight: '70vh',
            overflowY: 'auto',
            zIndex: 200,
          }}>
            {LEGACY_TABS.map((t) => (
              <a
                key={t.tab}
                href={`/admin/?tab=${t.tab}`}
                onClick={() => setLegacyOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: 'Cinzel, serif',
                  fontSize: 11,
                  letterSpacing: '0.06em',
                  color: TEXT,
                  textDecoration: 'none',
                  padding: '7px 10px',
                  borderRadius: 4,
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
