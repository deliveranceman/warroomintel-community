// Minister-only smoke route for NavTree verification.
// URL: /dev/nav-tree-smoke
// NOT linked from any nav. Visit directly after deploy.
import { createFileRoute } from '@tanstack/react-router'
import { useUser } from '@clerk/tanstack-start'
import { useState } from 'react'
import { NavTree } from '@/components/NavTree'
import { NAV_TREE, NAV_TREE_NODE_COUNT } from '@/lib/nav'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute('/dev_/nav-tree-smoke' as any)({
  ssr: false,
  component: NavTreeSmokePage,
})

function NavTreeSmokePage() {
  const { user } = useUser()
  const role = (user?.publicMetadata?.role as string) || ''
  if (role !== 'minister') {
    return <div style={{ padding: 40, fontFamily: "'Cinzel', serif", color: '#C9A84C' }}>403 — minister only</div>
  }
  return <SmokeInner />
}

function SmokeInner() {
  const [section, setSection] = useState('ops-dashboard')
  const [mode, setMode] = useState<'internal-state' | 'url' | 'drawer'>('internal-state')
  const [tier, setTier]   = useState(4)
  const [role, setRole]   = useState('minister')
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{ display: 'flex', height: '100dvh', background: '#0e0b07', color: '#ECE3CB', fontFamily: "'Cinzel', serif" }}>
      {/* Controls */}
      <div style={{ width: 260, padding: 20, borderRight: '1px solid rgba(201,168,76,0.2)', flexShrink: 0, overflowY: 'auto' }}>
        <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '0.15em', marginBottom: 16 }}>NAV TREE SMOKE</div>
        <div style={{ fontSize: 9, color: '#8B7355', marginBottom: 16 }}>Node count: {NAV_TREE_NODE_COUNT}</div>

        <label style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>Mode</label>
        <select value={mode} onChange={e => setMode(e.target.value as typeof mode)}
          style={{ width: '100%', marginBottom: 12, background: '#1a1305', color: '#ECE3CB', border: '1px solid rgba(201,168,76,0.3)', padding: 4, fontFamily: "'Cinzel', serif" }}>
          <option value="internal-state">internal-state</option>
          <option value="url">url</option>
          <option value="drawer">drawer</option>
        </select>

        <label style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>Tier level (0–4)</label>
        <input type="range" min={0} max={4} value={tier} onChange={e => setTier(Number(e.target.value))}
          style={{ width: '100%', marginBottom: 4 }} />
        <div style={{ fontSize: 9, color: '#8B7355', marginBottom: 12 }}>{tier} ({['Watchman','Soldier','Commander','General','Minister'][tier]})</div>

        <label style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>Role</label>
        <select value={role} onChange={e => setRole(e.target.value)}
          style={{ width: '100%', marginBottom: 12, background: '#1a1305', color: '#ECE3CB', border: '1px solid rgba(201,168,76,0.3)', padding: 4, fontFamily: "'Cinzel', serif" }}>
          <option value="">member</option>
          <option value="minister">minister</option>
        </select>

        <label style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>
          <input type="checkbox" checked={collapsed} onChange={e => setCollapsed(e.target.checked)} style={{ marginRight: 6 }} />
          Sidebar collapsed
        </label>

        <div style={{ marginTop: 24, fontSize: 9, color: '#8B7355', lineHeight: 1.6 }}>
          Active section: <span style={{ color: '#C9A84C' }}>{section}</span>
        </div>
      </div>

      {/* NavTree render */}
      <div style={{
        width: 240, borderRight: '1px solid rgba(201,168,76,0.2)',
        background: 'var(--surface2, #1a1305)',
        overflowY: 'auto', padding: '4px 0',
      }}>
        <NavTree
          tree={NAV_TREE}
          mode={mode}
          tierLevel={tier}
          role={role}
          activeSection={mode === 'internal-state' || mode === 'drawer' ? section : undefined}
          activeItem={mode === 'url' ? 'Babel Files' : undefined}
          onSectionChange={setSection}
          onSpecial={s => alert(`special: ${s}`)}
          sidebarCollapsed={collapsed}
        />
      </div>

      {/* Checklist */}
      <div style={{ flex: 1, padding: 24, overflowY: 'auto', fontSize: 11, lineHeight: 2 }}>
        <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '0.15em', marginBottom: 12 }}>SMOKE CHECKLIST</div>
        {[
          'Section headers render (COMMUNITY, INTELLIGENCE, COMMUNITY LIFE...)',
          'Collapsible parents show chevron (Briefs, SOL, Fringe Intelligence...)',
          'Hybrid parent Intel Archive: label navigates, chevron collapses',
          'Intel Archive children have gutter line at left: 12px',
          'Tier 2 nodes: 13px ivory text, 3px left border on active',
          'Tier 3 nodes: 11px dimmer text, 24px left indent',
          'Babel Files: parent link + sub-brand children below',
          'SOON items render at 45% opacity with SOON badge',
          'Tier slider: at tier 0 no Operations section; at tier 2+ it appears',
          'Role=minister: Assessment + Admin Panel visible',
          'Role=member: Assessment + Admin Panel hidden',
          'Drawer mode: all entries flat, no chevrons, no gutter lines',
          'URL mode: activeItem="Babel Files" highlights Babel Files parent',
          'Sidebar collapsed: labels hidden, section headers hidden',
          'Hidden orphan nodes (Bloodline, Field Manual...) do NOT render',
        ].map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: 'rgba(201,168,76,0.5)', flexShrink: 0 }}>□</span>
            <span style={{ color: '#b8a98a' }}>{c}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
