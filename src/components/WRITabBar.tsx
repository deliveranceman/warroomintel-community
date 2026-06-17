// Mobile + iPad 5-tab bar: tap = primary section, hold ≥450ms = sibling sheet.
// One-time coachmark stored in localStorage('wri-bar-coachmark-shown').
import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Newspaper, MessageCircle, FolderArchive, Sparkles, Menu,
  Sword, Activity, Map, DoorOpen, Moon,
  Radio, MessageSquare, Heart, Star, Users, FolderOpen,
} from 'lucide-react'

const GOLD     = '#C9A84C'
const GOLD_LO  = '#A07830'
const IND      = 'rgba(160,120,48,0.70)'
const HOLD_MS  = 450
const CM_KEY   = 'wri-bar-coachmark-shown'
const TAB_H    = 56

interface HoldItem {
  label: string
  icon: React.ReactNode
  section?: string
  page?: string
}
interface TabDef {
  id: string
  label: string
  tapSection?: string
  isDrawer?: boolean
  holdItems?: HoldItem[]
  isCenter?: boolean
  indicator?: boolean
  unred?: boolean // "unread" signal driven by dmHasUnread prop
}

const TABS: TabDef[] = [
  {
    id: 'brief', label: 'Brief', tapSection: 'daily-brief', indicator: true,
    holdItems: [
      { label: 'Sitrep',    icon: <Radio size={16} strokeWidth={1.5} />,       section: 'sitrep' },
      { label: 'Intel',     icon: <Newspaper size={16} strokeWidth={1.5} />,    section: 'intel' },
      { label: 'Ops Board', icon: <MessageSquare size={16} strokeWidth={1.5} />, section: 'forum' },
    ],
  },
  {
    id: 'messages', label: 'Messages', tapSection: 'dms', indicator: true, unred: true,
    holdItems: [
      { label: 'War Room Chat', icon: <MessageCircle size={16} strokeWidth={1.5} />, section: 'war-room-chat' },
      { label: 'Prayer',        icon: <Heart size={16} strokeWidth={1.5} />,         section: 'prayer-wall' },
      { label: 'Testimony',     icon: <Star size={16} strokeWidth={1.5} />,          section: 'testimony-wall' },
      { label: 'Field Teams',   icon: <Users size={16} strokeWidth={1.5} />,         section: 'field-teams' },
    ],
  },
  {
    id: 'archive', label: 'Archive', tapSection: 'database', indicator: true, isCenter: true,
    holdItems: [
      { label: 'Arsenal',  icon: <Sword size={16} strokeWidth={1.5} />,    section: 'arsenal' },
      { label: 'Symptom',  icon: <Activity size={16} strokeWidth={1.5} />, section: 'investigate' },
      { label: 'Body Map', icon: <Map size={16} strokeWidth={1.5} />,      section: 'body-map' },
      { label: 'Gateway',  icon: <DoorOpen size={16} strokeWidth={1.5} />, section: 'gateway' },
      { label: 'Dream',    icon: <Moon size={16} strokeWidth={1.5} />,     page: '/community/dream-interpreter' },
    ],
  },
  {
    id: 'sol', label: 'SOL', tapSection: 'sol', indicator: true,
    holdItems: [
      { label: 'My Intel', icon: <FolderOpen size={16} strokeWidth={1.5} />, section: 'my-intel' },
    ],
  },
  {
    id: 'more', label: 'More', isDrawer: true, indicator: false,
  },
]

export interface WRITabBarProps {
  activeSection: string
  setActiveSection: (s: string) => void
  onOpenDrawer: () => void
  dmHasUnread?: boolean
  isDark?: boolean
  hidden?: boolean
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Dots({ light }: { light?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 2, marginBottom: 1 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 3, height: 3, borderRadius: '50%',
          background: light ? 'rgba(255,255,255,0.55)' : IND,
        }} />
      ))}
    </div>
  )
}

interface SheetItemProps {
  item: HoldItem
  onPage: (p: string) => void
  onSection: (s: string) => void
  dark: boolean
  grid?: boolean
}
function SheetItem({ item, onPage, onSection, dark, grid }: SheetItemProps) {
  const go = () => item.page ? onPage(item.page) : onSection(item.section!)

  if (grid) {
    return (
      <button
        onClick={go}
        style={{
          display: 'flex', flexDirection: 'column' as const,
          alignItems: 'center', justifyContent: 'center',
          gap: 5, padding: '10px 4px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: dark ? '#c8b896' : '#2D2924',
          borderRadius: 8, width: '100%',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span style={{ color: GOLD }}>{item.icon}</span>
        <span style={{
          fontFamily: "'Cinzel', serif", fontSize: 9,
          letterSpacing: '0.08em', textAlign: 'center' as const, lineHeight: 1.2,
        }}>
          {item.label}
        </span>
      </button>
    )
  }

  return (
    <button
      onClick={go}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '9px 14px',
        background: 'none', border: 'none', cursor: 'pointer',
        color: dark ? '#c8b896' : '#2D2924',
        borderRadius: 6, textAlign: 'left' as const,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{ color: GOLD, flexShrink: 0 }}>{item.icon}</span>
      <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.08em' }}>
        {item.label}
      </span>
    </button>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function WRITabBar({
  activeSection, setActiveSection, onOpenDrawer, dmHasUnread, isDark, hidden,
}: WRITabBarProps) {
  const navigate     = useNavigate()
  const [sheet, setSheet]           = useState<string | null>(null)
  const [coachmark, setCoachmark]   = useState(false)
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didHoldRef  = useRef(false)
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ).current
  const dark = isDark !== false

  // One-time coachmark
  useEffect(() => {
    try {
      if (!localStorage.getItem(CM_KEY)) {
        setCoachmark(true)
        const t = setTimeout(() => {
          setCoachmark(false)
          try { localStorage.setItem(CM_KEY, '1') } catch {}
        }, 3500)
        return () => clearTimeout(t)
      }
    } catch {}
  }, [])

  const dismissCM = () => {
    if (!coachmark) return
    setCoachmark(false)
    try { localStorage.setItem(CM_KEY, '1') } catch {}
  }

  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }

  const pressStart = (tabId: string) => {
    clearTimer()
    didHoldRef.current = false
    const tab = TABS.find(t => t.id === tabId)
    if (!tab?.holdItems?.length) return
    timerRef.current = setTimeout(() => {
      didHoldRef.current = true
      dismissCM()
      setSheet(tabId)
    }, HOLD_MS)
  }

  const pressEnd = (tabId: string) => {
    clearTimer()
    if (didHoldRef.current) return
    const tab = TABS.find(t => t.id === tabId)
    if (!tab) return
    setSheet(null)
    if (tab.isDrawer) { onOpenDrawer(); return }
    if (tab.tapSection) setActiveSection(tab.tapSection)
  }

  const pressCancel = () => clearTimer()

  const goPage = (path: string) => {
    setSheet(null)
    navigate({ to: path as any })
  }

  const goSection = (s: string) => {
    setSheet(null)
    setActiveSection(s)
  }

  const isActive = (tab: TabDef) =>
    !tab.isDrawer && !!tab.tapSection && activeSection === tab.tapSection

  // ── Sheet renderer ───────────────────────────────────────────────────────

  const renderSheet = (tab: TabDef, idx: number) => {
    if (sheet !== tab.id || !tab.holdItems?.length) return null
    const items   = tab.holdItems
    const center  = !!tab.isCenter
    const sheetW  = center ? 224 : 188
    const vw      = typeof window !== 'undefined' ? window.innerWidth : 400
    const tabW    = vw / 5
    const tabCx   = tabW * idx + tabW / 2
    const left    = Math.max(8, Math.min(vw - sheetW - 8, tabCx - sheetW / 2))
    const ptrX    = Math.max(14, Math.min(sheetW - 14, tabCx - left))
    const bg      = dark ? '#1a1408' : '#fff'

    return (
      <div
        key={tab.id}
        style={{
          position: 'fixed', bottom: TAB_H + 10, left,
          width: sheetW,
          background: bg,
          border: '1px solid rgba(201,168,76,0.30)',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
          zIndex: 151,
          overflow: 'visible',
          animation: reducedMotion ? undefined : 'wri-sheet-up 0.14s ease-out',
        }}
      >
        {center ? (
          // Archive: row-1 = 3 tools, row-2 = 2 tools centred in same column-width
          <div style={{ padding: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, marginBottom: 2 }}>
              {items.slice(0, 3).map(it => (
                <SheetItem key={it.label} item={it} onPage={goPage} onSection={goSection} dark={dark} grid />
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, margin: '0 16.67%' }}>
              {items.slice(3).map(it => (
                <SheetItem key={it.label} item={it} onPage={goPage} onSection={goSection} dark={dark} grid />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ padding: 4 }}>
            {items.map(it => (
              <SheetItem key={it.label} item={it} onPage={goPage} onSection={goSection} dark={dark} />
            ))}
          </div>
        )}

        {/* Down-pointing triangle aligned to tab centre */}
        <div style={{
          position: 'absolute', bottom: -6, left: ptrX - 6,
          width: 12, height: 12,
          background: bg,
          border: '1px solid rgba(201,168,76,0.30)',
          borderTop: 'none', borderLeft: 'none',
          transform: 'rotate(45deg)',
        }} />
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const inactive = dark ? '#5a4e3a' : '#8a7a6a'

  return (
    <>
      {/* Backdrop — closes any open sheet */}
      {sheet && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 149 }}
          onPointerDown={() => setSheet(null)}
        />
      )}

      {/* Sheets */}
      {TABS.map((tab, i) => renderSheet(tab, i))}

      {/* First-run coachmark */}
      {coachmark && (
        <div style={{
          position: 'fixed', bottom: TAB_H + 14,
          left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(26,20,8,0.95)',
          border: '1px solid rgba(201,168,76,0.40)',
          borderRadius: 8, padding: '7px 16px',
          zIndex: 152, pointerEvents: 'none',
          whiteSpace: 'nowrap' as const,
        }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: GOLD, letterSpacing: '0.10em' }}>
            Hold any tab for more
          </span>
        </div>
      )}

      {/* The bar */}
      <nav style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 150,
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: dark ? '#0D0B14' : '#FAF8F5',
        borderTop: '1px solid rgba(201,168,76,0.15)',
        display: 'flex', alignItems: 'stretch',
        transform: hidden ? 'translateY(110%)' : 'translateY(0)',
        transition: reducedMotion ? undefined : 'transform 0.28s ease',
        pointerEvents: hidden ? 'none' : undefined,
        userSelect: 'none', WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none', WebkitTapHighlightColor: 'transparent',
      }}>
        {TABS.map((tab) => {
          if (tab.isCenter) {
            const active = isActive(tab)
            return (
              <div
                key={tab.id}
                style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 8 }}
              >
                <button
                  onPointerDown={() => pressStart(tab.id)}
                  onPointerUp={() => pressEnd(tab.id)}
                  onPointerCancel={pressCancel}
                  onPointerLeave={pressCancel}
                  style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: `radial-gradient(circle at 30% 30%, ${GOLD}, ${GOLD_LO} 60%, #6B4F1A 100%)`,
                    border: 'none', cursor: 'pointer', marginBottom: 4,
                    boxShadow: `0 6px 20px rgba(160,120,48,0.40), 0 0 0 3px ${dark ? '#0D0B14' : '#FAF8F5'}, 0 0 0 5px rgba(201,168,76,0.28)`,
                    display: 'flex', flexDirection: 'column' as const,
                    alignItems: 'center', justifyContent: 'center', gap: 0,
                    position: 'relative' as const,
                    touchAction: 'none', WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {tab.indicator && (
                    <div style={{ position: 'absolute', top: 7 }}><Dots light /></div>
                  )}
                  <FolderArchive size={20} color="#1a1305" strokeWidth={1.8} />
                  {active && (
                    <div style={{
                      position: 'absolute', bottom: -10,
                      width: 14, height: 2, background: GOLD, borderRadius: 1,
                    }} />
                  )}
                </button>
              </div>
            )
          }

          const active = isActive(tab)
          const col    = active ? GOLD : inactive

          return (
            <button
              key={tab.id}
              onPointerDown={() => pressStart(tab.id)}
              onPointerUp={() => pressEnd(tab.id)}
              onPointerCancel={pressCancel}
              onPointerLeave={pressCancel}
              style={{
                flex: 1, height: TAB_H,
                display: 'flex', flexDirection: 'column' as const,
                alignItems: 'center', justifyContent: 'center', gap: 2,
                background: 'none', border: 'none', cursor: 'pointer',
                color: col, position: 'relative' as const,
                touchAction: 'none', WebkitTapHighlightColor: 'transparent',
              }}
            >
              {tab.indicator && <Dots />}

              <div style={{ position: 'relative' as const }}>
                {tab.id === 'brief'    && <Newspaper size={18} strokeWidth={1.6} />}
                {tab.id === 'messages' && <MessageCircle size={18} strokeWidth={1.6} />}
                {tab.id === 'sol'      && <Sparkles size={18} strokeWidth={1.6} />}
                {tab.id === 'more'     && <Menu size={18} strokeWidth={1.6} />}
                {tab.unred && dmHasUnread && (
                  <div style={{
                    position: 'absolute' as const, top: -2, right: -4,
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#ef4444',
                    border: `1.5px solid ${dark ? '#0D0B14' : '#FAF8F5'}`,
                  }} />
                )}
              </div>

              <span style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 9, letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
              }}>
                {tab.label}
              </span>

              {active && (
                <div style={{
                  position: 'absolute' as const, bottom: 4,
                  width: 14, height: 2, background: GOLD, borderRadius: 1,
                }} />
              )}
            </button>
          )
        })}
      </nav>

      <style>{`
        @keyframes wri-sheet-up {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
