import { createFileRoute } from '@tanstack/react-router'
import { useUser } from '@clerk/tanstack-start'
import { Radio } from 'lucide-react'
import { CommunitySidebarShell } from '@/components/CommunitySidebarShell'
import { useIsDark } from '@/lib/use-is-dark'

export const Route = createFileRoute('/community_/qrf')({
  ssr: false,
  component: QRFPage,
})

const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

function QRFPage() {
  const { user } = useUser()
  const isDark = useIsDark()

  const tier = ((user?.publicMetadata?.tier as string) || '').toLowerCase()
  const userName      = user?.firstName || user?.username || ''
  const userTierLabel = tier === 'watchman' || tier === 'free' || !tier ? 'WATCHMAN' : tier.toUpperCase()

  const surf = isDark ? '#12101e' : '#FFFFFF'
  const bdr  = isDark ? 'rgba(201,168,76,0.22)' : '#D8D1BE'
  const txt  = isDark ? '#e8dcc8' : '#1F1B12'
  const dim  = isDark ? '#a09080' : '#574B33'
  const gold = isDark ? '#C9A84C' : '#8B6914'

  return (
    <CommunitySidebarShell activeItem="QRF" userName={userName} userTierLabel={userTierLabel}>
      <div style={{ color: txt, minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ maxWidth: 560, width: '100%', background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: '48px 36px', textAlign: 'center', boxShadow: isDark ? 'none' : '0 2px 12px rgba(45,41,36,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, color: gold }}>
            <Radio size={40} strokeWidth={1.4} />
          </div>
          <h1 style={{ fontFamily: cinzel, fontSize: 22, letterSpacing: '0.08em', color: gold, margin: '0 0 10px' }}>
            QRF — Quick Reaction Force
          </h1>
          <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: dim, marginBottom: 28 }}>
            Short-form intel clips. Coming soon.
          </div>
          <p style={{ fontFamily: crimson, fontSize: 16, lineHeight: 1.7, color: dim, margin: 0 }}>
            Quick Reaction Force — military doctrine's small standby team that mobilizes on first intel. Here, it's short-form teaching: 3–5 minute clips on specific spirits, gateways, scriptures, or breakthroughs you need fast. When the moment hits, grab the clip and move.
          </p>
        </div>
      </div>
    </CommunitySidebarShell>
  )
}
