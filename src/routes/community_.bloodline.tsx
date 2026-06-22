import { createFileRoute } from '@tanstack/react-router'
import { useUser } from '@clerk/tanstack-start'
import { CommunitySidebarShell } from '@/components/CommunitySidebarShell'
import { UpgradeGate } from '@/components/UpgradeGate'
import { getAccessLevel } from '@/lib/access'

export const Route = createFileRoute('/community_/bloodline')({
  component: BloodlinePage,
})

const BG     = 'var(--deep)'
const SURF   = 'var(--surface)'
const SURF2  = 'var(--surface2)'
const BDR    = 'var(--border)'
const GOLD   = 'var(--gold)'
const TXT    = 'var(--t-0)'
const DIM    = 'var(--t-3)'
const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

function BloodlinePage() {
  const { user, isLoaded } = useUser()

  const tier = ((user?.publicMetadata?.tier as string) || 'watchman').toLowerCase()
  const role = (user?.publicMetadata?.role as string | null) ?? null
  const hasAccess = getAccessLevel({ tier, role }) >= 3

  const userName      = user?.firstName || user?.username || 'Warrior'
  const userTierLabel = tier === 'watchman' || tier === 'free' ? 'WATCHMAN' : tier.toUpperCase()

  if (!isLoaded) {
    return (
      <CommunitySidebarShell activeItem="Bloodline" userName="..." userTierLabel="..." fillViewport>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: crimson, fontSize: 14, color: DIM,
        }}>
          Verifying access...
        </div>
      </CommunitySidebarShell>
    )
  }

  return (
    <CommunitySidebarShell activeItem="Bloodline" userName={userName} userTierLabel={userTierLabel} fillViewport>
      {!hasAccess ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UpgradeGate
            variant="screen"
            requiredTier="general"
            featureName="Bloodline Intelligence Center"
            description="The Bloodline Intelligence Center is available to General tier and above. Upgrade to investigate generational iniquity patterns, family bloodlines, and covenant histories."
            isDark
          />
        </div>
      ) : (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          background: BG, padding: '32px 24px', gap: 24,
          maxWidth: 860, margin: '0 auto', width: '100%',
        }}>

          {/* Header */}
          <div>
            <div style={{
              fontFamily: cinzel, fontSize: 11, letterSpacing: '0.18em',
              color: GOLD, textTransform: 'uppercase', marginBottom: 8,
            }}>
              Bloodline Intelligence Center
            </div>
            <h1 style={{
              fontFamily: cinzel, fontSize: 26, fontWeight: 700,
              color: TXT, margin: 0, lineHeight: 1.2,
            }}>
              Investigation begins here.
            </h1>
            <p style={{
              fontFamily: crimson, fontSize: 16, color: DIM,
              margin: '10px 0 0', lineHeight: 1.6,
            }}>
              Map generational iniquity patterns, ancestral oaths, cultural bloodlines,
              and the spirits that travel through family lines.
            </p>
          </div>

          {/* Foundation shipped notice */}
          <div style={{
            background: SURF, border: `1px solid ${BDR}`,
            borderLeft: `3px solid ${GOLD}`,
            borderRadius: 6, padding: '16px 20px',
          }}>
            <div style={{
              fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em',
              color: GOLD, marginBottom: 6,
            }}>
              OPERATOR NOTE
            </div>
            <p style={{ fontFamily: crimson, fontSize: 15, color: TXT, margin: 0, lineHeight: 1.6 }}>
              Phase 2A foundation shipped. Profile creation, family tree builder, oath tracker,
              pattern cluster analysis, and investigation tooling rolling out across this build
              cycle. — Jun 22, 2026
            </p>
          </div>

          {/* What this becomes */}
          <div style={{
            background: SURF2, border: `1px solid ${BDR}`,
            borderRadius: 6, padding: '20px 24px',
          }}>
            <div style={{
              fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em',
              color: DIM, marginBottom: 14,
            }}>
              COMING IN PHASE 2B+
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Create a new investigation for a subject or family line',
                'Build an ancestor tree with generational data',
                'Track known oaths, lodge memberships, and occult involvement',
                'Log bloodline events and identify recurring patterns',
                'AI-assisted pattern cluster analysis linking ancestors to active spirits',
                'Cultural dossier lookup for heritage-specific bloodline histories',
                'Secret society research (Freemasonry degrees, symbols, known oaths)',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: GOLD, fontFamily: cinzel, fontSize: 12, flexShrink: 0 }}>—</span>
                  <span style={{ fontFamily: crimson, fontSize: 15, color: DIM, lineHeight: 1.5 }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Disabled CTA */}
          <div>
            <button
              disabled
              style={{
                fontFamily: cinzel, fontSize: 11, letterSpacing: '0.12em',
                padding: '12px 28px', borderRadius: 4,
                background: 'rgba(201,168,76,0.12)',
                border: `1px solid rgba(201,168,76,0.3)`,
                color: 'rgba(201,168,76,0.4)',
                cursor: 'not-allowed',
              }}
            >
              + CREATE NEW INVESTIGATION
            </button>
            <p style={{
              fontFamily: crimson, fontSize: 13, color: DIM,
              margin: '8px 0 0', fontStyle: 'italic',
            }}>
              Profile creation coming in Phase 2B
            </p>
          </div>

        </div>
      )}
    </CommunitySidebarShell>
  )
}
