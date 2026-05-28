import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

// ─── Bracket ────────────────────────────────────────────────────────────────
interface BracketProps {
  size?: number
  color?: string
  thickness?: number
  inset?: number
  opacity?: number
}
export function Bracket({
  size = 14,
  color = 'var(--gold)',
  thickness = 1.5,
  inset = 0,
  opacity = 1,
}: BracketProps) {
  const s: CSSProperties = { position: 'absolute', width: size, height: size, opacity }
  const L = `${thickness}px solid ${color}`
  return (
    <>
      <div style={{ ...s, top: inset, left: inset, borderTop: L, borderLeft: L }} />
      <div style={{ ...s, top: inset, right: inset, borderTop: L, borderRight: L }} />
      <div style={{ ...s, bottom: inset, left: inset, borderBottom: L, borderLeft: L }} />
      <div style={{ ...s, bottom: inset, right: inset, borderBottom: L, borderRight: L }} />
    </>
  )
}

// ─── ClassBadge ─────────────────────────────────────────────────────────────
type ClassLevel = 'I' | 'II' | 'III' | 'IV'
interface ClassBadgeProps {
  level?: ClassLevel
  label?: string
}
export function ClassBadge({ level = 'II', label = 'INTEL' }: ClassBadgeProps) {
  const colors: Record<ClassLevel, { bg: string; border: string; text: string }> = {
    'I':  { bg: 'var(--crit-bg)',  border: 'rgba(200,74,74,0.5)',   text: '#e07070' },
    'II': { bg: 'var(--warn-bg)', border: 'rgba(226,167,60,0.55)', text: '#e8b658' },
    'III':{ bg: 'var(--info-bg)', border: 'rgba(91,139,181,0.5)',  text: '#7fa8c7' },
    'IV': { bg: 'var(--ok-bg)',   border: 'rgba(95,174,111,0.4)',  text: '#6dbe7e' },
  }
  const c = colors[level]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: 1.2,
      padding: '3px 7px 3px 6px', border: `1px solid ${c.border}`,
      color: c.text, background: c.bg, borderRadius: 2,
    }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: c.text }} />
      CLASS-{level} · {label}
    </span>
  )
}

// ─── StatusDot ──────────────────────────────────────────────────────────────
type StatusKind = 'ok' | 'warn' | 'crit' | 'info' | 'idle'
interface StatusDotProps {
  kind?: StatusKind
  label?: string
  size?: number
}
export function StatusDot({ kind = 'ok', label, size = 6 }: StatusDotProps) {
  const map: Record<StatusKind, string> = {
    ok: 'var(--ok)', warn: 'var(--warn)', crit: 'var(--crit)',
    info: 'var(--info)', idle: 'var(--t-3)',
  }
  const color = map[kind]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      color: 'var(--t-2)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 0.4,
    }}>
      <span style={{
        width: size, height: size, borderRadius: '50%', background: color,
        boxShadow: `0 0 ${size}px ${color}88`, flexShrink: 0,
      }} />
      {label}
    </span>
  )
}

// ─── ThreatBar ──────────────────────────────────────────────────────────────
interface ThreatBarProps { level?: number; max?: number }
export function ThreatBar({ level = 3, max = 5 }: ThreatBarProps) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{
          width: 14, height: 4,
          background: i < level ? 'var(--gold)' : 'rgba(201,168,76,0.15)',
          boxShadow: i < level ? '0 0 4px var(--gold-glow)' : 'none',
        }} />
      ))}
    </div>
  )
}

// ─── GoldButton ─────────────────────────────────────────────────────────────
interface GoldButtonProps {
  children: ReactNode
  onClick?: () => void
  full?: boolean
  sm?: boolean
  ghost?: boolean
  style?: CSSProperties
  icon?: ReactNode
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}
export function GoldButton({
  children, onClick, full, sm, ghost, style = {}, icon, disabled, type = 'button',
}: GoldButtonProps) {
  const base: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: sm ? 32 : 40, padding: sm ? '0 14px' : '0 18px',
    fontFamily: 'var(--font-body)', fontSize: sm ? 12 : 13, fontWeight: 600,
    letterSpacing: 0.6, textTransform: 'uppercase',
    border: ghost ? '1px solid var(--gold-line-hi)' : '1px solid transparent',
    background: ghost ? 'transparent' : 'linear-gradient(180deg, var(--gold) 0%, #b89538 100%)',
    color: ghost ? 'var(--gold)' : '#1a1305',
    width: full ? '100%' : 'auto',
    boxShadow: ghost ? 'none' : '0 1px 0 rgba(255,255,255,0.18) inset, 0 -1px 0 rgba(0,0,0,0.25) inset',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    borderRadius: 2,
  }
  return (
    <button type={type} style={{ ...base, ...style }} onClick={onClick} disabled={disabled}>
      {icon}{children}
    </button>
  )
}

// ─── HUDChip ────────────────────────────────────────────────────────────────
interface HUDChipProps { children: ReactNode; active?: boolean; style?: CSSProperties }
export function HUDChip({ children, active, style = {} }: HUDChipProps) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 9px',
      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: 0.8,
      color: active ? 'var(--gold)' : 'var(--t-2)',
      background: active ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.025)',
      border: `1px solid ${active ? 'var(--gold-line-hi)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 2, ...style,
    }}>{children}</span>
  )
}

// ─── SectionLabel ───────────────────────────────────────────────────────────
interface SectionLabelProps {
  children: ReactNode
  action?: string
  onAction?: () => void
  style?: CSSProperties
}
export function SectionLabel({ children, action, onAction, style = {} }: SectionLabelProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 2, height: 11, background: 'var(--gold)', flexShrink: 0 }} />
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t-2)',
          letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: 600,
        }}>{children}</span>
      </div>
      {action && (
        <button onClick={onAction} style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gold)', letterSpacing: 0.8,
        }}>{action}</button>
      )}
    </div>
  )
}

// ─── MonoTime ───────────────────────────────────────────────────────────────
interface MonoTimeProps { children: ReactNode; color?: string; size?: number }
export function MonoTime({ children, color = 'var(--gold)', size = 13 }: MonoTimeProps) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: size, color,
      letterSpacing: 1, fontVariantNumeric: 'tabular-nums',
    }}>{children}</span>
  )
}

// ─── Divider ────────────────────────────────────────────────────────────────
interface DividerProps { gold?: boolean; style?: CSSProperties }
export function Divider({ gold, style = {} }: DividerProps) {
  return (
    <div style={{
      height: 1,
      background: gold ? 'var(--gold-line)' : 'rgba(255,255,255,0.06)',
      ...style,
    }} />
  )
}

// ─── TacticalCard ───────────────────────────────────────────────────────────
interface TacticalCardProps {
  children: ReactNode
  brackets?: boolean
  glow?: boolean
  padding?: number | string
  style?: CSSProperties
  onClick?: () => void
}
export function TacticalCard({
  children, brackets, glow, padding = 16, style = {}, onClick,
}: TacticalCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        background: 'var(--bg-2)',
        border: '1px solid var(--gold-line)',
        padding,
        boxShadow: glow
          ? '0 0 0 1px var(--gold-line-hi), 0 8px 24px rgba(0,0,0,0.4), 0 0 40px var(--gold-glow)'
          : '0 1px 0 rgba(255,255,255,0.02) inset',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {brackets && <Bracket size={10} thickness={1} inset={-1} />}
      {children}
    </div>
  )
}

// ─── SecureRibbon ───────────────────────────────────────────────────────────
interface SecureRibbonProps { tier?: number; activeOps?: number }
export function SecureRibbon({ tier = 1, activeOps = 0 }: SecureRibbonProps) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startRef.current), 1000)
    return () => clearInterval(id)
  }, [])

  const h = String(Math.floor(elapsed / 3600000)).padStart(2, '0')
  const m = String(Math.floor((elapsed % 3600000) / 60000)).padStart(2, '0')
  const s = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0')
  const date = new Date().toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
  }).toUpperCase()

  return (
    <div style={{
      height: 22, background: 'var(--bg-0)',
      borderBottom: '1px solid var(--gold-line)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      paddingInline: 16, fontFamily: 'var(--font-mono)', fontSize: 10,
      letterSpacing: 1.6, color: 'var(--t-3)', userSelect: 'none', flexShrink: 0,
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: 'var(--ok)', boxShadow: '0 0 5px var(--ok)',
        }} />
        SECURE · OPERATOR LV.{tier}
      </span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
        SESSION {h}:{m}:{s}
        {activeOps > 0 && ` · ${activeOps} OPS ACTIVE`}
      </span>
      <span>{date}</span>
    </div>
  )
}

// ─── BottomNav ──────────────────────────────────────────────────────────────
interface BottomNavTab {
  id: string
  label: string
  icon: ReactNode
}
interface BottomNavProps {
  tabs: BottomNavTab[]
  activeId?: string
  onTab?: (id: string) => void
  onFAB?: () => void
  onLongPress?: () => void
  fabIcon?: ReactNode
}
export function BottomNav({
  tabs, activeId, onTab, onFAB, onLongPress, fabIcon,
}: BottomNavProps) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handlePressStart = () => {
    pressTimer.current = setTimeout(() => {
      onLongPress?.()
    }, 500)
  }
  const handlePressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  const left = tabs.slice(0, 2)
  const right = tabs.slice(2)

  return (
    <nav style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom)',
      background: 'var(--bg-1)',
      borderTop: '1px solid var(--gold-line)',
      display: 'flex', alignItems: 'flex-end',
    }}>
      {left.map(tab => (
        <button key={tab.id} onClick={() => onTab?.(tab.id)} style={{
          flex: 1, height: 56, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 3,
          background: 'none', border: 'none', cursor: 'pointer',
          color: tab.id === activeId ? 'var(--gold)' : 'var(--t-3)',
          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1.2,
          textTransform: 'uppercase', fontWeight: 600,
          paddingBottom: 4, position: 'relative',
        }}>
          {tab.icon}
          {tab.label}
          {tab.id === activeId && (
            <div style={{ position: 'absolute', bottom: 4, width: 14, height: 2, background: 'var(--gold)' }} />
          )}
        </button>
      ))}

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 10 }}>
        <button
          onPointerDown={handlePressStart}
          onPointerUp={handlePressEnd}
          onPointerLeave={handlePressEnd}
          onClick={onFAB}
          style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, var(--gold-hi), var(--gold) 60%, var(--gold-lo) 100%)',
            border: 'none', cursor: 'pointer', marginBottom: 4,
            boxShadow: '0 8px 24px var(--gold-glow), 0 0 0 3px var(--bg-1), 0 0 0 4px var(--gold-line-hi)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          {fabIcon ?? <span style={{ fontSize: 24, color: '#1a1305', lineHeight: 1, fontWeight: 700 }}>+</span>}
        </button>
      </div>

      {right.map(tab => (
        <button key={tab.id} onClick={() => onTab?.(tab.id)} style={{
          flex: 1, height: 56, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 3,
          background: 'none', border: 'none', cursor: 'pointer',
          color: tab.id === activeId ? 'var(--gold)' : 'var(--t-3)',
          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1.2,
          textTransform: 'uppercase', fontWeight: 600,
          paddingBottom: 4, position: 'relative',
        }}>
          {tab.icon}
          {tab.label}
          {tab.id === activeId && (
            <div style={{ position: 'absolute', bottom: 4, width: 14, height: 2, background: 'var(--gold)' }} />
          )}
        </button>
      ))}
    </nav>
  )
}

// ─── CommandPalette ──────────────────────────────────────────────────────────
interface CommandResult {
  id: string
  group: string
  label: string
  sublabel?: string
  icon?: ReactNode
  onSelect?: () => void
}
interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  results?: CommandResult[]
  onQuery?: (q: string) => void
}
export function CommandPalette({ open, onClose, results = [], onQuery }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null

  const groups = results.reduce<Record<string, CommandResult[]>>((acc, r) => {
    if (!acc[r.group]) acc[r.group] = []
    acc[r.group].push(r)
    return acc
  }, {})

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(8,6,14,0.85)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 'max(80px, 10vh)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 640, margin: '0 16px',
          background: 'var(--bg-2)', border: '1px solid var(--gold-line-hi)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px var(--gold-glow)',
          position: 'relative',
        }}
      >
        <Bracket size={10} thickness={1} inset={-1} />

        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', borderBottom: '1px solid var(--gold-line)',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--t-3)' }}>⌘K</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); onQuery?.(e.target.value) }}
            placeholder="Search operations, intel, arsenal…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--t-0)',
            }}
          />
          <HUDChip>ESC</HUDChip>
        </div>

        <div style={{
          display: 'flex', gap: 6, padding: '8px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          {['All', 'Intel', 'Ops', 'Arsenal', 'Community'].map((s, i) => (
            <HUDChip key={s} active={i === 0}>{s}</HUDChip>
          ))}
        </div>

        <div style={{ maxHeight: 360, overflowY: 'auto', padding: '8px 0' }}>
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <div style={{
                padding: '6px 16px 4px',
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 2,
                color: 'var(--t-4)', textTransform: 'uppercase',
              }}>{group}</div>
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => { item.onSelect?.(); onClose() }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {item.icon && (
                    <span style={{ color: 'var(--gold)', flexShrink: 0 }}>{item.icon}</span>
                  )}
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--t-0)' }}>
                      {item.label}
                    </span>
                    {item.sublabel && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t-3)', letterSpacing: 0.8 }}>
                        {item.sublabel}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          ))}
          {results.length === 0 && (
            <div style={{
              padding: '32px 16px', textAlign: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t-4)', letterSpacing: 1.2,
            }}>
              NO RESULTS FOUND
            </div>
          )}
        </div>

        <div style={{
          display: 'flex', gap: 16, padding: '8px 16px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t-4)',
        }}>
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>ESC close</span>
        </div>
      </div>
    </div>
  )
}
