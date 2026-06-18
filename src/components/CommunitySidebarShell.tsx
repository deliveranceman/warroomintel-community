import React, { useState, useRef, useEffect } from 'react'
import { useUser, useAuth } from '@clerk/tanstack-start'
import {
  MessageSquare, Inbox, Heart, Users, HelpCircle,
  Archive, Sword, Library, Search, Map, Network, Eye,
  Calendar, Antenna, FolderOpen, Settings, ClipboardList,
  MapPin, DoorOpen, Moon, Radio, FolderArchive, GraduationCap,
  Star, Clapperboard, Shield, BookOpen, Home, Zap,
} from 'lucide-react'

interface Props {
  activeItem: string
  userName?: string
  userTierLabel?: string
  fillViewport?: boolean
  children: React.ReactNode
}

const G      = 'var(--gold)'
const cinzel = "'Cinzel', serif"
const NAV_DEFAULT = 'var(--muted)'
const navGold     = G

function getTierLevel(tier: string): number {
  return ({ watchman: 0, free: 0, soldier: 1, commander: 2, general: 3, minister: 4 } as Record<string, number>)[tier] ?? 0
}

export function CommunitySidebarShell({ activeItem, fillViewport, children }: Props) {
  const { user } = useUser()
  const { signOut } = useAuth()

  const [intelligenceOpen, setIntelligenceOpen] = useState(() => {
    try { return localStorage.getItem('sidebar_intelligence_open') !== 'false' } catch { return true }
  })
  const [fieldOpsOpen, setFieldOpsOpen] = useState(() => {
    try { return localStorage.getItem('sidebar_field_ops_open') !== 'false' } catch { return true }
  })
  const [fringeExpanded, setFringeExpanded]   = useState(false)
  const [trainingExpanded, setTrainingExpanded] = useState(false)
  const [sidebarSearchVal, setSidebarSearchVal] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const sidebarSearchRef = useRef<HTMLInputElement>(null)
  const mobileSearchInputRef = useRef<HTMLInputElement>(null)

  const tier      = ((user?.publicMetadata?.tier as string) || '').toLowerCase()
  const tierLevel = getTierLevel(tier)
  const isMinister  = (user?.publicMetadata?.role as string) === 'minister'
  const isCommander = tierLevel >= 2 || isMinister

  const isActive = (...labels: string[]) => labels.includes(activeItem)

  const sidebarScrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sidebarScrollRef.current
    if (!el) return
    const saved = sessionStorage.getItem('sidebar-scroll')
    if (saved) requestAnimationFrame(() => { el.scrollTop = Number(saved) })
    const active = el.querySelector('[data-active="true"]') as HTMLElement | null
    if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/') return
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return
      e.preventDefault()
      if (window.innerWidth < 768) {
        setSidebarSearchVal('')
        setMobileSearchOpen(true)
      } else {
        sidebarSearchRef.current?.focus()
        sidebarSearchRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function handleSearchNav(val?: string) {
    const q = (val !== undefined ? val : sidebarSearchVal).trim()
    if (!q) return
    window.location.href = `/community/search?q=${encodeURIComponent(q)}`
  }

  const navLink = (label: string, href: string, icon?: React.ReactNode, activeAliases?: string[]) => {
    const active = activeAliases ? isActive(label, ...activeAliases) : isActive(label)
    return (
      <a
        key={label}
        href={href}
        data-active={active ? 'true' : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '8px 16px', boxSizing: 'border-box',
          background: active ? 'rgba(201,168,76,0.1)' : 'transparent',
          textDecoration: 'none',
          borderLeft: `2px solid ${active ? 'var(--border-bright)' : 'transparent'}`,
          fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em',
          color: active ? navGold : NAV_DEFAULT,
          fontWeight: active ? 600 : 400,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!active) { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(201,168,76,0.05)'; el.style.color = navGold } }}
        onMouseLeave={e => { if (!active) { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = NAV_DEFAULT } }}
      >
        {icon && <span style={{ display: 'flex', alignItems: 'center', width: 20, flexShrink: 0 }}>{icon}</span>}
        {label}
      </a>
    )
  }

  const subNavLink = (label: string, href: string, icon?: React.ReactNode, activeAliases?: string[]) => {
    const active = activeAliases ? isActive(label, ...activeAliases) : isActive(label)
    return (
      <a
        key={label}
        href={href}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          width: '100%', padding: '5px 16px', boxSizing: 'border-box',
          background: active ? 'rgba(201,168,76,0.06)' : 'transparent',
          textDecoration: 'none',
          borderLeft: active ? '2px solid var(--border-bright)' : '2px solid rgba(201,168,76,0.1)',
          fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em',
          color: active ? navGold : 'var(--muted)',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = navGold; el.style.borderLeftColor = 'var(--border-bright)' }}
        onMouseLeave={e => { if (!active) { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--muted)'; el.style.borderLeftColor = 'rgba(201,168,76,0.1)' } }}
      >
        {icon && <span style={{ display: 'flex', alignItems: 'center', width: 20, flexShrink: 0 }}>{icon}</span>}
        {label}
      </a>
    )
  }

  const sectionLabel = (label: string) => (
    <div style={{ padding: '12px 16px 4px 16px', fontFamily: 'var(--font-label)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--muted)' }}>
      {label}
    </div>
  )

  const collapsibleHeader = (label: string, open: boolean, toggle: () => void) => (
    <button
      onClick={toggle}
      style={{
        display: 'flex', alignItems: 'center', width: '100%',
        padding: '12px 16px 4px 16px',
        background: 'transparent', border: 'none', cursor: 'pointer',
        textAlign: 'left', boxSizing: 'border-box',
      }}
    >
      <span style={{ flex: 1, fontFamily: 'var(--font-label)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--muted)', textTransform: 'uppercase' as const }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--muted)', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
    </button>
  )

  const initials = user?.firstName?.[0] || user?.username?.[0] || 'W'

  return (
    <div style={{
      display: 'flex',
      background: 'var(--deep)',
      color: 'var(--text)',
      ...(fillViewport ? { height: '100dvh', overflow: 'hidden' } : { minHeight: '100dvh' }),
    }}>
      <style>{`
        @media (max-width: 767px) {
          .wri-shell-sidebar  { display: none !important; }
          .wri-shell-rail     { display: none !important; }
          .wri-shell-main     { margin-left: 0 !important; margin-right: 0 !important; overflow-x: hidden !important; max-width: 100% !important; padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)) !important; }
          .wri-shell-mobile-bc { display: flex !important; }
        }
        .wri-sub-bottom-nav { display: none; }
        @media (max-width: 767px) { .wri-sub-bottom-nav { display: block; } }
      `}</style>

      {/* ── LEFT SIDEBAR ── */}
      <div className="wri-shell-sidebar" style={{
        width: 220, flexShrink: 0,
        background: 'var(--surface2)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, bottom: 0, left: 0,
        overflowY: 'auto', zIndex: 10,
        paddingTop: 'env(safe-area-inset-top)',
      }}>

        {/* Profile block */}
        <div style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0, overflow: 'hidden',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            flexShrink: 0, overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: cinzel, fontSize: 11, color: G,
          }}>
            {user?.imageUrl
              ? <img src={user.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: cinzel, fontSize: 11, color: 'var(--text)', letterSpacing: '0.06em', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.firstName || 'Warrior'}
            </div>
            <div style={{ fontSize: 9, color: G, fontFamily: cinzel, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
              {tier || 'watchman'}
            </div>
          </div>
          <button
            onClick={() => signOut()}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 5,
              color: 'var(--muted)',
              fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em',
              padding: '3px 8px', cursor: 'pointer',
              flexShrink: 0, textTransform: 'uppercase' as const,
            }}
          >Out</button>
        </div>

        {/* Search bar — desktop sidebar */}
        <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
          <form onSubmit={e => { e.preventDefault(); handleSearchNav() }} style={{ position: 'relative' }}>
            <Search size={12} strokeWidth={1.6} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
            <input
              ref={sidebarSearchRef}
              type="text"
              value={sidebarSearchVal}
              onChange={e => setSidebarSearchVal(e.target.value)}
              placeholder="Search… [/]"
              style={{ width: '100%', boxSizing: 'border-box' as const, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5, padding: '7px 8px 7px 28px', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em', color: 'var(--text)', outline: 'none' }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--gold)' }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--border)' }}
            />
          </form>
        </div>

        {/* Quick access icon strip */}
        <div style={{
          display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap' as const,
          padding: '10px 6px',
          borderBottom: '1px solid var(--border)',
          marginBottom: 4,
        }}>
          {([
            { icon: <MessageSquare size={16} strokeWidth={1.6} />, label: 'War Room Chat',   href: '/community' },
            { icon: <Inbox         size={16} strokeWidth={1.6} />, label: 'Direct Messages', href: '/community' },
            { icon: <Heart         size={16} strokeWidth={1.6} />, label: 'Prayer Wall',     href: '/community' },
            { icon: <Users         size={16} strokeWidth={1.6} />, label: 'Members',         href: '/community' },
            { icon: <HelpCircle    size={16} strokeWidth={1.6} />, label: 'Feedback',        href: '/community' },
          ]).map(({ icon, label, href }) => (
            <a
              key={label}
              href={href}
              title={label}
              style={{
                background: 'transparent', border: '1px solid transparent',
                borderRadius: 8, width: 36, height: 36,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--muted)', textDecoration: 'none',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(201,168,76,0.1)'; el.style.color = G; el.style.borderColor = 'rgba(201,168,76,0.25)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = 'var(--muted)'; el.style.borderColor = 'transparent' }}
            >
              {icon}
            </a>
          ))}
        </div>

        {/* Nav scroll area */}
        <div ref={sidebarScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}
          onScroll={e => { try { sessionStorage.setItem('sidebar-scroll', String((e.target as HTMLElement).scrollTop)) } catch {} }}
        >

          {/* ── COMMUNITY ── */}
          {sectionLabel('Community')}
          {navLink('Weekly Intel',   '/community',             <Antenna      size={16} strokeWidth={1.6} />)}
          {navLink('Ops Board',      '/community',             <MessageSquare size={16} strokeWidth={1.6} />)}
          {navLink('Field Ministry', '/community',             <BookOpen     size={16} strokeWidth={1.6} />)}

          {/* ── FIELD OPS (commander+) ── */}
          {isCommander && (
            <>
              {collapsibleHeader('Field Ops', fieldOpsOpen, () => {
                const next = !fieldOpsOpen
                setFieldOpsOpen(next)
                try { localStorage.setItem('sidebar_field_ops_open', String(next)) } catch {}
              })}
              <div style={{ overflow: 'hidden', maxHeight: fieldOpsOpen ? 200 : 0, transition: 'max-height 0.2s ease' }}>
                {navLink('Case Files', '/community/field-ops', <FolderOpen size={14} strokeWidth={1.6} />, ['Field Ops'])}
                {navLink('Session Notes', '/community/field-ops', <Sword size={14} strokeWidth={1.6} />, ['Field Ops'])}
              </div>
            </>
          )}

          {/* ── FOUNDATION ── */}
          {sectionLabel('Foundation')}
          {navLink('Arsenal',      '/arsenal',                 <Archive  size={16} strokeWidth={1.6} />)}
          {navLink('Scripture',    '/community/scripture',     <BookOpen size={14} strokeWidth={1.6} />)}

          {/* ── INTELLIGENCE (collapsible) ── */}
          {collapsibleHeader('Intelligence', intelligenceOpen, () => {
            const next = !intelligenceOpen
            setIntelligenceOpen(next)
            try { localStorage.setItem('sidebar_intelligence_open', String(next)) } catch {}
          })}
          <div style={{ overflow: 'hidden', maxHeight: intelligenceOpen ? 600 : 0, transition: 'max-height 0.2s ease' }}>
            {navLink('Ask SOL', '/community/ask-sol', <Eye size={14} strokeWidth={1.6} />, ['Ask SOL'])}
            {navLink('Intel Archive', '/community', <Library size={14} strokeWidth={1.6} />)}
            <div style={{ paddingLeft: 16 }}>
              {subNavLink('Symptom Investigator', '/community',                        <Search   size={11} strokeWidth={1.6} />)}
              {subNavLink('Body Map',             '/community',                        <Map      size={11} strokeWidth={1.6} />)}
              {subNavLink('Spirit Network',       '/community',                        <Network  size={11} strokeWidth={1.6} />)}
              {subNavLink('Gateway Investigator', '/community',                        <DoorOpen size={11} strokeWidth={1.6} />)}
              {subNavLink('Dream Interpreter',    '/community/dream-interpreter',      <Moon     size={11} strokeWidth={1.6} />)}
            </div>

            {/* Fringe Intelligence expandable */}
            <button
              onClick={() => setFringeExpanded(e => !e)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '8px 16px', boxSizing: 'border-box',
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em',
                color: NAV_DEFAULT, textAlign: 'left' as const,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', width: 20, flexShrink: 0 }}><Eye size={14} strokeWidth={1.6} /></span>
              <span style={{ flex: 1 }}>Fringe Intelligence</span>
              <span style={{ fontSize: 10, color: 'var(--muted)', display: 'inline-block', transform: fringeExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
            </button>
            {fringeExpanded && (
              <div style={{ paddingLeft: 16, borderLeft: '1px solid rgba(201,168,76,0.1)', marginLeft: 16 }}>
                {navLink('The Feed', '/community', <Radio size={16} strokeWidth={1.6} />)}
                {([
                  { label: 'The Archive', icon: <FolderArchive size={13} strokeWidth={1.6} /> },
                  { label: 'Fringe Chat', icon: <MessageSquare size={13} strokeWidth={1.6} /> },
                  { label: 'Courses',     icon: <GraduationCap size={13} strokeWidth={1.6} /> },
                ] as { label: string; icon: React.ReactNode }[]).map(({ label, icon }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', opacity: 0.45 }}>
                    <span style={{ display: 'flex', alignItems: 'center', width: 20 }}>{icon}</span>
                    <span style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', color: 'var(--muted)', flex: 1 }}>{label}</span>
                    <span style={{ fontSize: 8, fontFamily: cinzel, background: 'rgba(201,168,76,0.1)', color: 'var(--muted)', padding: '1px 6px', borderRadius: 3 }}>SOON</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── FIELD OPERATIONS ── */}
          {sectionLabel('Field Operations')}
          {navLink('Spiritual Mapping', '/community/spiritual-mapping', <MapPin      size={14} strokeWidth={1.6} />)}
          {navLink('Assessment',        '/community',                  <ClipboardList size={16} strokeWidth={1.6} />)}

          {/* ── TRAINING (collapsible) ── */}
          <button
            onClick={() => setTrainingExpanded(e => !e)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '10px 16px 6px', boxSizing: 'border-box',
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-label)', fontSize: 9, letterSpacing: '0.18em',
              color: 'var(--muted)', textTransform: 'uppercase' as const,
              textAlign: 'left' as const,
            }}
          >
            <span style={{ flex: 1 }}>Training</span>
            <span style={{ fontSize: 10, display: 'inline-block', transform: trainingExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
          </button>
          {trainingExpanded && (
            <>
              {navLink('Courses', '/community', <Clapperboard size={16} strokeWidth={1.6} />)}
              {([
                { label: "General's Table", icon: <Star  size={13} strokeWidth={1.6} /> },
                { label: 'Protocols',       icon: <Sword size={13} strokeWidth={1.6} /> },
              ] as { label: string; icon: React.ReactNode }[]).map(({ label, icon }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', opacity: 0.45 }}>
                  <span style={{ display: 'flex', alignItems: 'center', width: 20 }}>{icon}</span>
                  <span style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', color: 'var(--muted)', flex: 1 }}>{label}</span>
                  <span style={{ fontSize: 8, fontFamily: cinzel, background: 'rgba(201,168,76,0.1)', color: 'var(--muted)', padding: '1px 6px', borderRadius: 3 }}>SOON</span>
                </div>
              ))}
            </>
          )}

          {/* ── EVENTS ── */}
          {navLink('Events', '/community', <Calendar size={16} strokeWidth={1.6} />)}

          {/* ── ADMIN (minister only) ── */}
          {isMinister && (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '12px 16px 8px' }} />
              <a
                href="/admin"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '10px 16px', boxSizing: 'border-box',
                  background: 'rgba(201,168,76,0.06)',
                  borderLeft: '2px solid rgba(201,168,76,0.4)',
                  textDecoration: 'none',
                  fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em',
                  color: G, transition: 'background 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(201,168,76,0.12)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(201,168,76,0.06)' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', width: 20, flexShrink: 0 }}><Shield size={14} strokeWidth={1.6} /></span>
                Admin Panel
              </a>
            </>
          )}
        </div>

        {/* Sidebar footer */}
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: '4px 0' }}>
          <a
            href="/community"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '8px 16px', boxSizing: 'border-box',
              background: 'transparent', textDecoration: 'none',
              borderLeft: '2px solid transparent',
              fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em',
              color: NAV_DEFAULT, transition: 'color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = G }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = NAV_DEFAULT }}
          >
            <span style={{ display: 'flex', alignItems: 'center', width: 20, flexShrink: 0 }}><Settings size={14} strokeWidth={1.6} /></span>
            Settings
          </a>
          <div style={{ padding: '6px 16px 8px', display: 'flex', gap: 12 }}>
            <a href="/terms"    style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: 'var(--muted)', textDecoration: 'none' }}>TERMS</a>
            <a href="/privacy"  style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: 'var(--muted)', textDecoration: 'none' }}>PRIVACY</a>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="wri-shell-main" style={{
        marginLeft: 220, marginRight: 48, flex: 1, minWidth: 0,
        display: 'flex', flexDirection: 'column',
        ...(fillViewport ? { overflow: 'hidden' } : {}),
      }}>
        {/* Mobile breadcrumb — shown at ≤767px */}
        <div className="wri-shell-mobile-bc" style={{
          display: 'none', alignItems: 'center',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface2)', flexShrink: 0,
        }}>
          <a href="/community" style={{ fontFamily: cinzel, fontSize: 9, color: 'var(--muted)', textDecoration: 'none', letterSpacing: '0.1em' }}>← COMMUNITY</a>
          <span style={{ color: 'var(--muted)', margin: '0 8px', opacity: 0.4 }}>›</span>
          <span style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.1em', flex: 1 }}>{activeItem.toUpperCase()}</span>
          <button
            onClick={() => { setSidebarSearchVal(''); setMobileSearchOpen(true) }}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}
          >
            <Search size={16} strokeWidth={1.6} />
          </button>
        </div>

        {/* Page content */}
        {fillViewport
          ? <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>{children}</div>
          : children
        }
      </div>

      {/* ── RIGHT RAIL — 48px fixed icon strip ── */}
      <div className="wri-shell-rail" style={{
        width: 48, flexShrink: 0,
        borderLeft: '1px solid var(--border)',
        background: 'var(--surface2)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', paddingTop: 8, gap: 2,
        position: 'fixed', top: 0, right: 0, bottom: 0,
        zIndex: 10,
      }}>
        {([
          { icon: <Heart         size={18} strokeWidth={1.6} />, label: 'Prayer Wall',          href: '/community' },
          { icon: <MessageSquare size={18} strokeWidth={1.6} />, label: 'Recent Messages',       href: '/community' },
          { icon: <Calendar      size={18} strokeWidth={1.6} />, label: 'Upcoming Calls',        href: '/community' },
          { icon: <Users         size={18} strokeWidth={1.6} />, label: 'Warriors Online',       href: '/community' },
          { icon: <Archive       size={18} strokeWidth={1.6} />, label: 'Latest Arsenal Drops',  href: '/arsenal'   },
          { icon: <BookOpen      size={18} strokeWidth={1.6} />, label: 'Intel Archive',         href: '/community' },
        ]).map(({ icon, label, href }) => (
          <a
            key={label}
            href={href}
            title={label}
            style={{
              width: 36, height: 36, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--muted)', textDecoration: 'none',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = G; el.style.background = 'rgba(201,168,76,0.1)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--muted)'; el.style.background = 'transparent' }}
          >
            {icon}
          </a>
        ))}
      </div>

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--deep)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', flexShrink: 0 }}>
            <button
              onClick={() => setMobileSearchOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4, fontFamily: cinzel, fontSize: 14 }}
            >
              ←
            </button>
            <form
              onSubmit={e => { e.preventDefault(); setMobileSearchOpen(false); handleSearchNav() }}
              style={{ flex: 1, position: 'relative' }}
            >
              <Search size={14} strokeWidth={1.6} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
              <input
                ref={mobileSearchInputRef}
                autoFocus
                type="text"
                value={sidebarSearchVal}
                onChange={e => setSidebarSearchVal(e.target.value)}
                placeholder="Search the archive…"
                style={{ width: '100%', boxSizing: 'border-box' as const, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px 10px 36px', fontFamily: cinzel, fontSize: 12, letterSpacing: '0.06em', color: 'var(--text)', outline: 'none' }}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--gold)' }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--border)' }}
              />
            </form>
          </div>
        </div>
      )}

      {/* Mobile bottom nav — only renders on mobile via CSS */}
      <div className="wri-sub-bottom-nav">
        <SubPageBottomNav activeItem={activeItem} />
      </div>
    </div>
  )
}

function SubPageBottomNav({ activeItem: _activeItem }: { activeItem: string }) {
  const getActiveTab = () => {
    if (typeof window === 'undefined') return 'intel'
    const path = window.location.pathname
    const search = window.location.search
    if (path === '/arsenal') return 'arsenal'
    if (search.includes('section=database')) return 'database'
    if (search.includes('section=forum')) return 'ops'
    return 'intel'
  }

  const active = getActiveTab()

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 3,
    textDecoration: 'none', padding: '8px 0',
    color: isActive ? G : 'var(--muted)',
    fontFamily: 'var(--font-label)', fontSize: 9, letterSpacing: '0.06em',
  })

  return (
    <>
      <nav style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom, 0px))',
        background: 'var(--surface2)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        <a href="/community" style={tabStyle(active === 'intel')}>
          <Home size={20} strokeWidth={1.6} />
          <span>HOME</span>
          {active === 'intel' && <div style={{ width: 16, height: 2, background: G, borderRadius: 1 }} />}
        </a>

        <a href="/community?section=database" style={tabStyle(active === 'database')}>
          <Library size={20} strokeWidth={1.6} />
          <span>DATABASE</span>
          {active === 'database' && <div style={{ width: 16, height: 2, background: G, borderRadius: 1 }} />}
        </a>

        {/* Center FAB */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <a href="/community" style={{
            width: 50, height: 50,
            background: G,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(201,168,76,0.4)',
            textDecoration: 'none',
          }}>
            <span style={{ fontSize: 20, color: '#1a1305' }}>⚔</span>
          </a>
        </div>

        <a href="/community?section=forum" style={tabStyle(active === 'ops')}>
          <MessageSquare size={20} strokeWidth={1.6} />
          <span>OPS</span>
          {active === 'ops' && <div style={{ width: 16, height: 2, background: G, borderRadius: 1 }} />}
        </a>

        <a href="/community" style={tabStyle(false)}>
          <Zap size={20} strokeWidth={1.6} />
          <span>AI</span>
        </a>
      </nav>
    </>
  )
}
