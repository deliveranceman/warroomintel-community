import React, { useState, useCallback } from 'react'
import {
  Zap, Sun, Antenna, Radio, Eye, FolderArchive, MessageSquare,
  GraduationCap, Users, Calendar, Sword, FolderOpen, FileText,
  ClipboardList, BookOpen, Archive, Star, Search, Map, Network,
  DoorOpen, Moon, Shield, Settings, Heart, Cross, Inbox,
  HelpCircle, Library, MessageSquareWarning, ChevronRight,
} from 'lucide-react'
import { SolIcon } from '@/components/SolIcon'
import type { NavSection, NavNode, NavIcon, NavTarget } from '@/lib/nav'

// ── Lucide icon lookup (all icons used in NAV_TREE) ───────────────────────────
const LUCIDE: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  Zap, Sun, Antenna, Radio, Eye, FolderArchive, MessageSquare,
  GraduationCap, Users, Calendar, Sword, FolderOpen, FileText,
  ClipboardList, BookOpen, Archive, Star, Search, Map, Network,
  DoorOpen, Moon, Shield, Settings, Heart, Cross, Inbox,
  HelpCircle, Library, MessageSquareWarning, ChevronRight,
}

const COMPONENT: Record<string, React.ComponentType<{ size?: number }>> = {
  SolIcon,
}

function NavIconEl({ icon, size }: { icon: NavIcon; size: number }) {
  if (icon.kind === 'emoji') {
    return <span style={{ fontSize: size - 2, lineHeight: 1 }}>{icon.value}</span>
  }
  if (icon.kind === 'component') {
    const C = COMPONENT[icon.component]
    return C ? <C size={size} /> : null
  }
  const C = LUCIDE[icon.name]
  return C ? <C size={size} strokeWidth={1.6} /> : null
}

// ── Tier helpers ──────────────────────────────────────────────────────────────

function passesGate(
  node: NavNode | NavSection,
  tierLevel: number,
  role: string,
): boolean {
  if ('minTier' in node && node.minTier != null && tierLevel < node.minTier) return false
  if ('minRoleOverride' in node && node.minRoleOverride) {
    if (node.minRoleOverride === 'minister' && role !== 'minister' && role !== 'commandant') return false
    if (node.minRoleOverride === 'commandant' && role !== 'commandant') return false
  }
  return true
}

// ── Collapse state initialization ────────────────────────────────────────────

function gatherCollapseKeys(tree: NavSection[]): Record<string, boolean> {
  const result: Record<string, boolean> = {}
  function walk(nodes: NavNode[]) {
    for (const n of nodes) {
      if (n.persistKey && n.children) {
        const stored = typeof window !== 'undefined' ? localStorage.getItem(n.persistKey) : null
        result[n.persistKey] = stored !== null ? stored !== 'false' : !(n.collapsedByDefault ?? false)
      }
      if (n.children) walk(n.children)
    }
  }
  for (const s of tree) walk(s.entries)
  return result
}

// ── Active-state resolution ───────────────────────────────────────────────────

function nodeIsActive(
  node: NavNode,
  mode: NavTreeProps['mode'],
  activeSection?: string,
  activeItem?: string,
): boolean {
  if (mode === 'internal-state' || mode === 'drawer') {
    if (!activeSection) return false
    if (node.target?.kind === 'section' && node.target.sectionKey === activeSection) return true
    if (node.activeAliases?.includes(activeSection)) return true
  }
  if (mode === 'url') {
    if (!activeItem) return false
    if (activeItem === node.label) return true
    if (node.activeAliases?.includes(activeItem)) return true
  }
  return false
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const cinzel = "'Cinzel', serif"
const T = {
  gold:        'var(--gold, #C9A84C)',
  goldFaint:   'rgba(201,168,76,0.4)',
  goldSubtle:  'rgba(201,168,76,0.1)',
  goldHover:   'rgba(201,168,76,0.05)',
  text:        'var(--text, #ECE3CB)',
  muted:       'var(--muted, #b8a98a)',
  dimText:     'var(--nav-sub-text, rgba(236,227,203,0.78))',
  spine:       'var(--nav-spine, rgba(201,168,76,0.28))',
  borderBright:'var(--border-bright, rgba(201,168,76,0.5))',
  border:      'var(--border, rgba(201,168,76,0.15))',
}

// ── Visual tier styles ────────────────────────────────────────────────────────

const sectionHeaderStyle: React.CSSProperties = {
  padding: '12px 16px 4px',
  fontFamily: cinzel,
  fontSize: 10,
  fontVariant: 'small-caps',
  letterSpacing: '0.15em',
  color: T.gold,
  userSelect: 'none',
}

function tier2Style(active: boolean, isParent: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '8px 10px',
    boxSizing: 'border-box',
    background: active ? T.goldSubtle : 'transparent',
    border: 'none',
    borderLeft: `3px solid ${active ? T.gold : 'transparent'}`,
    fontFamily: cinzel,
    fontSize: 13,
    letterSpacing: '0.08em',
    fontWeight: active ? 600 : isParent ? 500 : 400,
    color: active ? T.gold : T.text,
    cursor: active ? 'default' : 'pointer',
    textAlign: 'left',
    textDecoration: 'none',
    transition: 'background 0.15s, color 0.15s',
  }
}

function tier3Style(active: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '6px 10px 6px 44px',
    boxSizing: 'border-box',
    background: active ? 'rgba(201,168,76,0.06)' : 'transparent',
    border: 'none',
    borderLeft: `2px solid ${active ? T.borderBright : 'transparent'}`,
    fontFamily: cinzel,
    fontSize: 13,
    letterSpacing: '0.06em',
    fontWeight: active ? 600 : 500,
    color: active ? T.gold : T.dimText,
    cursor: 'pointer',
    textAlign: 'left',
    textDecoration: 'none',
    opacity: 1,
    transition: 'background 0.15s, color 0.15s',
  }
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface NavTreeProps {
  tree: NavSection[]
  mode: 'internal-state' | 'url' | 'drawer'
  tierLevel: number
  role: string
  activeSection?: string
  activeItem?: string
  onSectionChange?: (section: string) => void
  onSpecial?: (special: string) => void
  beta_features?: string[]
  sidebarCollapsed?: boolean
  badges?: Record<string, number>
}

// ── Main component ────────────────────────────────────────────────────────────

export function NavTree(props: NavTreeProps) {
  const {
    tree, mode, tierLevel, role,
    activeSection, activeItem,
    onSectionChange, onSpecial,
    beta_features = [],
    sidebarCollapsed = false,
    badges = {},
  } = props

  // All hooks before any conditional return (Safari rule).
  const [open, setOpen] = useState<Record<string, boolean>>(() => gatherCollapseKeys(tree))

  const toggleKey = useCallback((key: string) => {
    setOpen(prev => {
      const next = !prev[key]
      try { localStorage.setItem(key, String(next)) } catch {}
      return { ...prev, [key]: next }
    })
  }, [])

  // ── Target resolution ─────────────────────────────────────────────────────

  function resolveHref(target: NavTarget): string | undefined {
    if (target.kind === 'url') return target.href
    if (target.kind === 'section' && mode === 'url') return `/community?section=${target.sectionKey}`
    return undefined
  }

  function handleClick(target: NavTarget) {
    if (target.kind === 'section' && (mode === 'internal-state' || mode === 'drawer')) {
      onSectionChange?.(target.sectionKey)
    } else if (target.kind === 'special') {
      onSpecial?.(target.special)
    }
  }

  // ── Hover handlers ─────────────────────────────────────────────────────────

  function onEnter(e: React.MouseEvent<HTMLElement>, active: boolean) {
    if (!active) {
      const el = e.currentTarget as HTMLElement
      el.style.background = T.goldHover
      el.style.color = T.gold
    }
  }
  function onLeave(e: React.MouseEvent<HTMLElement>, active: boolean, dim = false) {
    if (!active) {
      const el = e.currentTarget as HTMLElement
      el.style.background = 'transparent'
      el.style.color = dim ? T.dimText : T.text
    }
  }

  // ── Node renderers ─────────────────────────────────────────────────────────

  function renderLeaf(node: NavNode, depth: number) {
    if (node.hidden) return null
    if (node.betaFeature && !beta_features.includes(node.betaFeature)) return null

    const active = nodeIsActive(node, mode, activeSection, activeItem)
    const isT3 = depth > 0
    const style = isT3 ? tier3Style(active) : tier2Style(active, false)
    const iconSize = isT3 ? 14 : 16

    if (node.disabled) {
      return (
        <div key={node.id} style={{ ...style, cursor: 'default', opacity: 0.45, color: T.muted }}>
          {node.icon && (
            <span style={{ display: 'flex', alignItems: 'center', width: iconSize, flexShrink: 0 }}>
              <NavIconEl icon={node.icon} size={iconSize} />
            </span>
          )}
          {!sidebarCollapsed && <span style={{ flex: 1 }}>{node.label}</span>}
          {!sidebarCollapsed && node.disabledLabel && (
            <span style={{ fontSize: 8, fontFamily: cinzel, background: T.goldSubtle, color: T.muted, padding: '1px 6px', borderRadius: 3 }}>
              {node.disabledLabel}
            </span>
          )}
        </div>
      )
    }

    const badge = node.badgeSource ? (badges[node.badgeSource] ?? 0) : 0

    const href = node.target ? resolveHref(node.target) : undefined

    const content = (
      <>
        {node.icon && (
          <span style={{ display: 'flex', alignItems: 'center', width: iconSize, flexShrink: 0 }}>
            <NavIconEl icon={node.icon} size={iconSize} />
          </span>
        )}
        {!sidebarCollapsed && <span style={{ flex: 1 }}>{node.label}</span>}
        {!sidebarCollapsed && badge > 0 && (
          <span style={{
            minWidth: 16, height: 16, borderRadius: badge > 9 ? 8 : '50%',
            background: T.gold, color: '#1C1410',
            fontSize: 9, fontFamily: cinzel, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: badge > 9 ? '0 3px' : 0, boxSizing: 'border-box',
          }}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </>
    )

    if (href) {
      return (
        <a
          key={node.id}
          href={href}
          data-active={active ? 'true' : undefined}
          style={{ ...style, display: 'flex' }}
          target={node.externalLink ? '_blank' : undefined}
          rel={node.externalLink ? 'noopener noreferrer' : undefined}
          onMouseEnter={e => onEnter(e, active)}
          onMouseLeave={e => onLeave(e, active, isT3)}
        >
          {content}
        </a>
      )
    }

    return (
      <button
        key={node.id}
        data-active={active ? 'true' : undefined}
        style={style}
        onClick={() => node.target && handleClick(node.target)}
        onMouseEnter={e => onEnter(e, active)}
        onMouseLeave={e => onLeave(e, active, isT3)}
      >
        {content}
      </button>
    )
  }

  function renderParent(node: NavNode) {
    if (node.hidden) return null
    if (!node.children) return renderLeaf(node, 0)

    const children = node.children.filter(c => !c.hidden && passesGate(c, tierLevel, role) && (!c.betaFeature || beta_features.includes(c.betaFeature)))
    if (children.length === 0 && !node.target) return null

    const persistKey = node.persistKey ?? node.id
    const isOpen = open[persistKey] ?? !(node.collapsedByDefault ?? false)
    const isHybrid = !!node.target  // has both link and children

    const anyChildActive = children.some(c => nodeIsActive(c, mode, activeSection, activeItem))
    const selfActive = nodeIsActive(node, mode, activeSection, activeItem)

    if (mode === 'drawer') {
      // Drawer mode: parent renders as leaf, children render as tier3 with spine —
      // same visual hierarchy as sidebar but always expanded (no collapse toggle in drawer).
      return (
        <React.Fragment key={node.id}>
          {renderLeaf({ ...node, children: undefined }, 0)}
          <div style={{ position: 'relative', paddingLeft: 0 }}>
            <div style={{
              position: 'absolute',
              left: 28,
              top: 4,
              bottom: 4,
              width: 2,
              background: T.spine,
              pointerEvents: 'none' as const,
            }} />
            {children.map(c => renderLeaf(c, 1))}
          </div>
        </React.Fragment>
      )
    }

    // Determine parent row content
    const iconSize = 16
    const chevronStyle: React.CSSProperties = {
      fontSize: 14,
      color: T.goldFaint,
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      transform: isOpen ? 'rotate(90deg)' : 'none',
      transition: 'transform 0.2s ease',
    }

    let parentRow: React.ReactNode

    if (isHybrid) {
      // Hybrid: label area navigates, chevron toggles collapse
      const href = resolveHref(node.target!)
      const labelStyle = tier2Style(selfActive, true)
      const labelEl = (
        <>
          {node.icon && (
            <span style={{ display: 'flex', alignItems: 'center', width: iconSize, flexShrink: 0 }}>
              <NavIconEl icon={node.icon} size={iconSize} />
            </span>
          )}
          <span style={{ flex: 1 }}>{node.label}</span>
        </>
      )

      parentRow = (
        <div key={`${node.id}-row`} style={{ display: 'flex', alignItems: 'stretch' }}>
          {href ? (
            <a
              href={href}
              data-active={selfActive ? 'true' : undefined}
              style={{ ...labelStyle, flex: 1, display: 'flex', paddingRight: 4 }}
              onMouseEnter={e => onEnter(e, selfActive)}
              onMouseLeave={e => onLeave(e, selfActive)}
            >
              {labelEl}
            </a>
          ) : (
            <button
              data-active={selfActive ? 'true' : undefined}
              style={{ ...labelStyle, flex: 1, paddingRight: 4 }}
              onClick={() => node.target && handleClick(node.target)}
              onMouseEnter={e => onEnter(e, selfActive)}
              onMouseLeave={e => onLeave(e, selfActive)}
            >
              {labelEl}
            </button>
          )}
          <button
            onClick={() => toggleKey(persistKey)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 10px 8px 4px',
              color: T.goldFaint,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={chevronStyle}>
              <ChevronRight size={14} strokeWidth={1.6} />
            </span>
          </button>
        </div>
      )
    } else {
      // Pure collapsible: entire row is the toggle
      const btnStyle = tier2Style(anyChildActive, true)
      parentRow = (
        <button
          key={`${node.id}-row`}
          style={btnStyle}
          onClick={() => toggleKey(persistKey)}
          onMouseEnter={e => onEnter(e, anyChildActive)}
          onMouseLeave={e => onLeave(e, anyChildActive)}
        >
          {node.icon && (
            <span style={{ display: 'flex', alignItems: 'center', width: iconSize, flexShrink: 0 }}>
              <NavIconEl icon={node.icon} size={iconSize} />
            </span>
          )}
          <span style={{ flex: 1 }}>{node.label}</span>
          <span style={chevronStyle}>
            <ChevronRight size={14} strokeWidth={1.6} />
          </span>
        </button>
      )
    }

    const childGroup = (
      <div
        key={`${node.id}-children`}
        style={{
          overflow: 'hidden',
          maxHeight: isOpen ? 800 : 0,
          transition: 'max-height 0.2s ease',
        }}
      >
        {/* Group spine container — subtle vertical line signals child grouping */}
        <div style={{ position: 'relative', paddingLeft: 0 }}>
          <div style={{
            position: 'absolute',
            left: 28,
            top: 4,
            bottom: 4,
            width: 2,
            background: T.spine,
            pointerEvents: 'none',
          }} />
          {children.map(c => renderLeaf(c, 1))}
        </div>
      </div>
    )

    return (
      <React.Fragment key={node.id}>
        {parentRow}
        {childGroup}
      </React.Fragment>
    )
  }

  // ── Section renderer ──────────────────────────────────────────────────────

  function renderSection(section: NavSection) {
    if (!passesGate(section, tierLevel, role)) return null
    // Orphans section (label='') renders nothing visible
    if (section.id === 'orphans') return null

    const entries = section.entries.filter(n => !n.hidden && passesGate(n, tierLevel, role))
    if (entries.length === 0) return null

    return (
      <React.Fragment key={section.id}>
        {!sidebarCollapsed && section.label && (
          <div style={sectionHeaderStyle}>{section.label}</div>
        )}
        {entries.map(node => (
          node.children ? renderParent(node) : renderLeaf(node, 0)
        ))}
      </React.Fragment>
    )
  }

  // ── Root render ───────────────────────────────────────────────────────────

  return <>{tree.map(section => renderSection(section))}</>
}
