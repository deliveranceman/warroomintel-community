import { createFileRoute } from '@tanstack/react-router'
import { useUser } from '@clerk/tanstack-start'
import { useState } from 'react'
import { Training } from '@/components/spiritual-mapping/Training'
import { IntelligenceMap } from '@/components/spiritual-mapping/IntelligenceMap'
import { Assessment } from '@/components/spiritual-mapping/Assessment'
import { SubmitRegion } from '@/components/spiritual-mapping/SubmitRegion'

export const Route = createFileRoute('/community/spiritual-mapping/')({
  ssr: false,
  component: SpiritualMappingPage,
})

const G = '#C9A84C'
const BG = '#0D0B14'
const SURF = '#12101e'
const BDR = 'rgba(201,168,76,0.22)'
const TXT = '#e8dcc8'
const DIM = '#a09080'
const MUT = '#6b5e45'
const cinzel = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

const TIER_LEVELS: Record<string, number> = {
  watchman: 0, free: 0, soldier: 1, commander: 2, general: 3,
}

type Tab = 'training' | 'map' | 'assessment' | 'submit'

interface TabDef {
  id: Tab
  label: string
  icon: string
  minTier: number
  tierLabel?: string
}

const TABS: TabDef[] = [
  { id: 'training', label: 'Training Academy', icon: '📖', minTier: 0 },
  { id: 'map', label: 'Intelligence Map', icon: '🌍', minTier: 1, tierLabel: 'SOLDIER+' },
  { id: 'assessment', label: 'Field Assessment', icon: '🗂', minTier: 2, tierLabel: 'COMMANDER+' },
  { id: 'submit', label: 'Submit Region', icon: '📤', minTier: 2, tierLabel: 'COMMANDER+' },
]

function SpiritualMappingPage() {
  const { user, isLoaded } = useUser()
  const [activeTab, setActiveTab] = useState<Tab>('training')

  const tier = (user?.publicMetadata?.tier as string) || 'Watchman'
  const userLevel = TIER_LEVELS[tier.toLowerCase()] ?? 0
  const userId = user?.id || ''
  const userName = user?.firstName || user?.username || 'Warrior'

  if (!isLoaded) {
    return (
      <div style={{ height: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.2em', color: MUT }}>LOADING...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ height: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: cinzel, fontSize: 14, color: G, marginBottom: 12 }}>📍 Spiritual Mapping</div>
          <div style={{ fontFamily: crimson, fontSize: 14, color: DIM, marginBottom: 20 }}>Sign in to access the Spiritual Mapping module</div>
          <a href="/sign-in" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', color: BG, background: G, padding: '10px 24px', borderRadius: 4, textDecoration: 'none' }}>SIGN IN</a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: BG, overflow: 'hidden' }}>
      {/* Hero banner */}
      <div style={{
        padding: '0 32px',
        background: `linear-gradient(180deg, rgba(201,168,76,0.08) 0%, transparent 100%)`,
        borderBottom: `1px solid ${BDR}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <a href="/community" style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: MUT, textDecoration: 'none' }}>← COMMUNITY</a>
              <span style={{ color: BDR }}>|</span>
              <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.14em', color: MUT }}>FIELD OPERATIONS</div>
            </div>
            <div style={{ fontFamily: cinzel, fontSize: 22, color: G, fontWeight: 700, marginTop: 8, letterSpacing: '0.06em' }}>
              📍 Spiritual Mapping
            </div>
            <div style={{ fontFamily: crimson, fontSize: 14, color: DIM, fontStyle: 'italic', marginBottom: 14, marginTop: 2 }}>
              Global intelligence network for regional intercessory warfare
            </div>
          </div>
          <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: MUT, textAlign: 'right' }}>
            <div>{tier.toUpperCase()}</div>
            <div style={{ color: G, marginTop: 2 }}>{userName}</div>
          </div>
        </div>

        {/* Tab nav */}
        <div style={{ display: 'flex', gap: 0, marginTop: 4 }}>
          {TABS.map(tab => {
            const locked = userLevel < tab.minTier
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '12px 20px', background: 'none', border: 'none',
                  borderBottom: `2px solid ${active ? G : 'transparent'}`,
                  cursor: 'pointer', marginBottom: -1,
                  opacity: locked ? 0.6 : 1,
                }}
              >
                <span style={{ fontSize: 14 }}>{tab.icon}</span>
                <span style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: active ? G : MUT }}>
                  {tab.label}
                </span>
                {locked && tab.tierLabel && (
                  <span style={{ fontFamily: cinzel, fontSize: 7, letterSpacing: '0.08em', color: '#5C7CBF', background: 'rgba(92,124,191,0.1)', padding: '1px 5px', borderRadius: 3 }}>
                    🔒 {tab.tierLabel}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'training' && <Training userTier={tier} />}
        {activeTab === 'map' && <IntelligenceMap userTier={tier} />}
        {activeTab === 'assessment' && <Assessment userTier={tier} userId={userId} userName={userName} />}
        {activeTab === 'submit' && <SubmitRegion userId={userId} userName={userName} />}
      </div>
    </div>
  )
}
