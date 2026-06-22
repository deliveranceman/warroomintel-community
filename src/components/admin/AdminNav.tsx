import { Link } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'

type NavItem = {
  key: string
  label: string
  href: string
  isSlugRoute: boolean
}

type NavGroup = {
  key: string
  label: string
  items: NavItem[]
}

const NAV_TREE: NavGroup[] = [
  {
    key: 'dashboard',
    label: 'DASHBOARD',
    items: [
      { key: 'dashboard', label: 'Overview',
        href: '/admin/dashboard', isSlugRoute: true },
    ],
  },
  {
    key: 'intel',
    label: 'INTEL',
    items: [
      { key: 'intel', label: 'Intel Archive',
        href: '/admin?tab=intel', isSlugRoute: false },
      { key: 'spirit-candidates', label: 'Spirit Candidates',
        href: '/admin?tab=spirit-candidates', isSlugRoute: false },
      { key: 'enrichment', label: 'Enrichment',
        href: '/admin?tab=enrichment', isSlugRoute: false },
      { key: 'suggested-edits', label: 'Suggested Edits',
        href: '/admin?tab=suggested-edits', isSlugRoute: false },
      { key: 'gateways', label: 'Gateways',
        href: '/admin/intel/gateways', isSlugRoute: true },
      { key: 'scriptures', label: 'Scriptures',
        href: '/admin/intel/scriptures', isSlugRoute: true },
      { key: 'taxonomy', label: 'Taxonomy',
        href: '/admin?tab=taxonomy', isSlugRoute: false },
      { key: 'spiritual-mapping', label: 'Spiritual Mapping',
        href: '/admin?tab=spiritual-mapping', isSlugRoute: false },
      { key: 'sources', label: 'Sources',
        href: '/admin?tab=sources', isSlugRoute: false },
    ],
  },
  {
    key: 'sol',
    label: 'SOL',
    items: [
      { key: 'sol-test', label: 'SOL Test',
        href: '/admin/intel/sol-test', isSlugRoute: true },
      { key: 'content-suggestions', label: 'Content Suggestions',
        href: '/admin?tab=content-suggestions', isSlugRoute: false },
      { key: 'ai-command', label: 'AI Command',
        href: '/admin?tab=ai-command', isSlugRoute: false },
      { key: 'ai-context', label: 'AI Context',
        href: '/admin?tab=ai-context', isSlugRoute: false },
      { key: 'lib-intel', label: 'Library Intelligence',
        href: '/admin?tab=lib-intel', isSlugRoute: false },
      { key: 'ai-usage-admin', label: 'AI Usage',
        href: '/admin?tab=ai-usage-admin', isSlugRoute: false },
      { key: 'sol-research', label: 'SOL Research',
        href: '/admin?tab=sol-research', isSlugRoute: false },
    ],
  },
  {
    key: 'content',
    label: 'CONTENT',
    items: [
      { key: 'library', label: 'Library',
        href: '/admin?tab=library', isSlugRoute: false },
      { key: 'arsenal', label: 'Arsenal',
        href: '/admin?tab=arsenal', isSlugRoute: false },
      { key: 'documents', label: 'Documents',
        href: '/admin?tab=documents', isSlugRoute: false },
      { key: 'training', label: 'Training',
        href: '/admin?tab=training', isSlugRoute: false },
      { key: 'daily-brief', label: 'Daily Brief',
        href: '/admin?tab=daily-brief', isSlugRoute: false },
      { key: 'field-ministry', label: 'Field Ministry',
        href: '/admin?tab=field-ministry', isSlugRoute: false },
      { key: 'research-drop', label: 'Research Drop',
        href: '/admin?tab=research-drop', isSlugRoute: false },
    ],
  },
  {
    key: 'mod',
    label: 'MOD',
    items: [
      { key: 'moderation', label: 'Moderation',
        href: '/admin?tab=moderation', isSlugRoute: false },
    ],
  },
  {
    key: 'ops',
    label: 'OPS',
    items: [
      { key: 'notifications', label: 'Notifications',
        href: '/admin?tab=notifications', isSlugRoute: false },
      { key: 'modals', label: 'Modals',
        href: '/admin?tab=modals', isSlugRoute: false },
      { key: 'help-docs', label: 'Help Docs',
        href: '/admin?tab=help-docs', isSlugRoute: false },
      { key: 'admin-chat', label: 'Admin Chat',
        href: '/admin?tab=admin-chat', isSlugRoute: false },
      { key: 'tracker', label: 'Tracker',
        href: '/admin?tab=tracker', isSlugRoute: false },
      { key: 'atmosphere', label: 'Atmosphere',
        href: '/admin?tab=atmosphere', isSlugRoute: false },
    ],
  },
]

// NOTE: 'members' (dead stub) and 'internal-books' (deprecation path) are
// intentionally excluded from NAV_TREE.

type AdminNavProps = {
  current?: string
}

const NAV_BG      = '#0D0B14'
const NAV_BORDER  = '#2A2438'
const GOLD        = '#C9A84C'
const GOLD_DIM    = '#8B6914'
const TEXT        = '#D4C9B0'
const MUTED       = '#6B6169'
const DROP_BG     = '#15121F'

export function AdminNav({ current }: AdminNavProps) {
  const [openGroup, setOpenGroup]       = useState<string | null>(null)
  const [mobileOpen, setMobileOpen]     = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [isMobile, setIsMobile]         = useState(false)
  const navRef = useRef<HTMLElement>(null)

  const activeGroup = NAV_TREE.find(g => g.items.some(i => i.key === current))?.key ?? null

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close desktop dropdown on outside click
  useEffect(() => {
    if (!openGroup) return
    function onDown(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [openGroup])

  // Esc closes both
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpenGroup(null); setMobileOpen(false) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function toggleMobileGroup(key: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) { next.delete(key) } else { next.add(key) }
      return next
    })
  }

  function NavItemLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
    const isActive = item.key === current
    const baseStyle: React.CSSProperties = {
      display: 'flex', alignItems: 'center', gap: 6,
      fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.07em',
      color: isActive ? GOLD : TEXT,
      textDecoration: 'none',
      padding: '7px 12px', borderRadius: 3,
      background: isActive ? 'rgba(201,168,76,0.12)' : 'transparent',
      whiteSpace: 'nowrap',
      cursor: 'pointer',
    }
    const labelNode = (
      <>
        {item.label}
        {!item.isSlugRoute && (
          <span style={{ fontSize: 7, color: MUTED, lineHeight: 1 }}>·</span>
        )}
      </>
    )
    if (item.isSlugRoute) {
      return (
        <Link to={item.href as any} style={baseStyle} onClick={onNavigate}>
          {labelNode}
        </Link>
      )
    }
    return (
      <a href={item.href} style={baseStyle} onClick={onNavigate}>
        {labelNode}
      </a>
    )
  }

  // ── Desktop ──────────────────────────────────────────────────────────────────

  if (!isMobile) {
    return (
      <nav ref={navRef} style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: NAV_BG, borderBottom: `1px solid ${NAV_BORDER}`,
        padding: '0 20px', height: 42,
        display: 'flex', alignItems: 'stretch', gap: 0,
        overflow: 'visible',
      }}>
        {/* Wordmark */}
        <div style={{
          fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 600,
          color: GOLD, letterSpacing: '0.15em', flexShrink: 0,
          display: 'flex', alignItems: 'center',
          paddingRight: 18, marginRight: 4,
          borderRight: `1px solid ${NAV_BORDER}`,
        }}>
          ⚔ WRI
        </div>

        {NAV_TREE.map(group => {
          const isDash      = group.key === 'dashboard'
          const isActive    = group.key === activeGroup
          const isOpen      = openGroup === group.key
          const labelStyle: React.CSSProperties = {
            fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.12em',
            color: isActive ? GOLD : (isOpen ? GOLD : TEXT),
            padding: '0 14px', height: '100%',
            display: 'flex', alignItems: 'center', gap: 4,
            borderBottom: isActive
              ? `2px solid ${GOLD}`
              : isOpen ? `2px solid ${GOLD_DIM}` : '2px solid transparent',
            whiteSpace: 'nowrap',
          }

          if (isDash) {
            return (
              <Link
                key={group.key}
                to="/admin/dashboard"
                onClick={() => setOpenGroup(null)}
                style={{ ...labelStyle, textDecoration: 'none', cursor: 'pointer' }}
              >
                {group.label}
              </Link>
            )
          }

          return (
            <div key={group.key} style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
              <button
                onClick={() => setOpenGroup(prev => prev === group.key ? null : group.key)}
                style={{
                  ...labelStyle,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                }}
              >
                {group.label}
                <span style={{ fontSize: 7, opacity: 0.6 }}>{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 1,
                  background: DROP_BG, border: `1px solid ${NAV_BORDER}`,
                  borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                  padding: 4, minWidth: 200, maxHeight: '70vh', overflowY: 'auto',
                  zIndex: 200,
                }}>
                  {group.items.map(item => (
                    <NavItemLink
                      key={item.key}
                      item={item}
                      onNavigate={() => setOpenGroup(null)}
                    />
                  ))}
                  {group.items.some(i => !i.isSlugRoute) && (
                    <div style={{
                      padding: '5px 12px', marginTop: 4,
                      borderTop: `1px solid ${NAV_BORDER}`,
                      fontFamily: 'Cinzel, serif', fontSize: 8,
                      letterSpacing: '0.05em', color: MUTED,
                    }}>
                      · admin panel tab
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    )
  }

  // ── Mobile ───────────────────────────────────────────────────────────────────

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: NAV_BG, borderBottom: `1px solid ${NAV_BORDER}`,
        padding: '0 16px', height: 42,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{
          fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 600,
          color: GOLD, letterSpacing: '0.15em',
        }}>
          ⚔ WRI ADMIN
        </div>
        <button
          onClick={() => setMobileOpen(o => !o)}
          style={{
            background: 'transparent', border: `1px solid ${NAV_BORDER}`,
            borderRadius: 4, color: GOLD, cursor: 'pointer',
            width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </nav>

      {mobileOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99,
            background: 'rgba(0,0,0,0.65)',
          }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              background: NAV_BG, borderBottom: `1px solid ${NAV_BORDER}`,
              maxHeight: '85vh', overflowY: 'auto', padding: '8px 0',
            }}
            onClick={e => e.stopPropagation()}
          >
            {NAV_TREE.map(group => {
              const isDash      = group.key === 'dashboard'
              const isExpanded  = expandedGroups.has(group.key)
              const isActive    = group.key === activeGroup
              const groupStyle: React.CSSProperties = {
                width: '100%', background: 'transparent', border: 'none',
                borderBottom: `1px solid ${NAV_BORDER}`,
                padding: '13px 20px', cursor: 'pointer',
                fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: '0.12em',
                color: isActive ? GOLD : TEXT,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                textAlign: 'left',
              }

              if (isDash) {
                return (
                  <Link
                    key={group.key}
                    to="/admin/dashboard"
                    onClick={() => setMobileOpen(false)}
                    style={{
                      display: 'block', padding: '13px 20px',
                      fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: '0.12em',
                      color: isActive ? GOLD : TEXT,
                      textDecoration: 'none',
                      borderBottom: `1px solid ${NAV_BORDER}`,
                    }}
                  >
                    {group.label}
                  </Link>
                )
              }

              return (
                <div key={group.key}>
                  <button onClick={() => toggleMobileGroup(group.key)} style={groupStyle}>
                    {group.label}
                    <span style={{ fontSize: 9 }}>{isExpanded ? '▲' : '▼'}</span>
                  </button>
                  {isExpanded && (
                    <div style={{ background: DROP_BG, borderBottom: `1px solid ${NAV_BORDER}` }}>
                      {group.items.map(item => (
                        <div key={item.key} style={{ paddingLeft: 12 }}>
                          <NavItemLink
                            item={item}
                            onNavigate={() => setMobileOpen(false)}
                          />
                        </div>
                      ))}
                      {group.items.some(i => !i.isSlugRoute) && (
                        <div style={{
                          padding: '5px 20px 8px',
                          fontFamily: 'Cinzel, serif', fontSize: 8,
                          letterSpacing: '0.05em', color: MUTED,
                        }}>
                          · admin panel tab
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
