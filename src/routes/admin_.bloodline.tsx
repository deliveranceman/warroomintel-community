import { createFileRoute } from '@tanstack/react-router'
import { useUser } from '@clerk/tanstack-start'
import { getAccessLevel } from '@/lib/access'
import { AdminNav } from '../components/admin/AdminNav'

export const Route = createFileRoute('/admin_/bloodline')({
  component: AdminBloodlinePage,
})

const PAGE_BG  = '#EDEBE2'
const CARD_BG  = '#FFFFFF'
const BDR      = '#E5E0D5'
const GOLD     = '#8B6914'
const DEEP     = '#604408'
const TEXT     = '#1a1a1a'
const MUTED    = '#6b6b6b'
const cinzel   = "'Cinzel', serif"
const crimson  = "'Crimson Pro', serif"

function AdminBloodlinePage() {
  const { user, isLoaded, isSignedIn } = useUser()

  const tier    = (user?.publicMetadata as any)?.tier as string | undefined
  const role    = (user?.publicMetadata as any)?.role as string | undefined
  const isAdmin = getAccessLevel({ tier, role }) >= 4

  // Gate: Clerk resolving
  if (!isLoaded) {
    return (
      <div style={{
        minHeight:      '100vh',
        background:     PAGE_BG,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontFamily:     crimson,
        color:          MUTED,
        fontSize:       14,
      }}>
        Verifying access...
      </div>
    )
  }

  // Gate: not signed in or insufficient tier
  if (!isSignedIn || !isAdmin) {
    return (
      <div style={{
        minHeight:      '100vh',
        background:     PAGE_BG,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        24,
      }}>
        <div style={{
          maxWidth:     420,
          background:   CARD_BG,
          border:       `1px solid ${BDR}`,
          borderRadius: 6,
          padding:      32,
          textAlign:    'center',
        }}>
          <div style={{
            fontFamily:    cinzel,
            fontSize:      14,
            fontWeight:    600,
            color:         DEEP,
            letterSpacing: '0.15em',
            marginBottom:  12,
          }}>
            ACCESS DENIED
          </div>
          <p style={{
            fontFamily: crimson,
            fontSize:   15,
            color:      TEXT,
            margin:     '0 0 20px 0',
            lineHeight: 1.5,
          }}>
            This area is restricted to Minister tier and above.
          </p>
          <a href="/community" style={{
            fontFamily:     cinzel,
            fontSize:       12,
            color:          GOLD,
            textDecoration: 'none',
            letterSpacing:  '0.1em',
          }}>
            Return to Community
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, color: TEXT }}>
      <AdminNav current="bloodline-overview" />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 28px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontFamily:    cinzel, fontSize: 9,
            letterSpacing: '0.18em', color: MUTED,
            textTransform: 'uppercase', marginBottom: 6,
          }}>
            Admin / Bloodline
          </div>
          <h1 style={{
            fontFamily: cinzel, fontSize: 24, fontWeight: 700,
            color: DEEP, margin: 0, letterSpacing: '0.05em',
          }}>
            Bloodline Intelligence Center
          </h1>
          <p style={{
            fontFamily: crimson, fontSize: 15, color: MUTED,
            margin: '8px 0 0', lineHeight: 1.5,
          }}>
            Minister oversight dashboard. View, moderate, and administer bloodline
            investigation profiles across the community.
          </p>
        </div>

        {/* Foundation notice */}
        <div style={{
          background:   CARD_BG,
          border:       `1px solid ${BDR}`,
          borderLeft:   `3px solid ${GOLD}`,
          borderRadius: 6,
          padding:      '18px 22px',
          marginBottom: 24,
        }}>
          <div style={{
            fontFamily:    cinzel, fontSize: 9,
            letterSpacing: '0.12em', color: GOLD, marginBottom: 8,
          }}>
            PHASE 2A FOUNDATION
          </div>
          <p style={{ fontFamily: crimson, fontSize: 15, color: TEXT, margin: 0, lineHeight: 1.6 }}>
            Types, access helper, and placeholder routes shipped. Profile creation, family tree
            management, and oversight tooling rolling out across Phase 2B+. Admin endpoints
            (list all profiles, view individual profiles, moderate) land next build cycle.
          </p>
        </div>

        {/* Profiles placeholder */}
        <div style={{
          background:   CARD_BG,
          border:       `1px solid ${BDR}`,
          borderRadius: 6,
          padding:      '24px',
          marginBottom: 24,
        }}>
          <div style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            marginBottom:   16,
          }}>
            <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.12em', color: DEEP }}>
              ALL PROFILES
            </div>
            <div style={{
              fontFamily:    cinzel, fontSize: 9,
              letterSpacing: '0.1em', color: MUTED,
            }}>
              0 profiles
            </div>
          </div>
          <div style={{
            padding:    '32px 0',
            textAlign:  'center',
            fontFamily: crimson,
            fontSize:   15,
            color:      MUTED,
            fontStyle:  'italic',
          }}>
            No profiles yet. Community members will create bloodline investigations
            once profile creation endpoints ship in Phase 2B.
          </div>
        </div>

        {/* Coming in 2B */}
        <div style={{
          background:   CARD_BG,
          border:       `1px solid ${BDR}`,
          borderRadius: 6,
          padding:      '24px',
        }}>
          <div style={{
            fontFamily:    cinzel, fontSize: 9,
            letterSpacing: '0.12em', color: MUTED, marginBottom: 14,
          }}>
            COMING IN PHASE 2B+
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              'List all active investigation profiles with subject name, status, creator',
              'View individual profile detail (ancestors, events, oaths, pattern clusters)',
              'Moderate profiles: pause, close, or flag for review',
              'Cultural dossier admin: manage cultural background research entries',
              'Secret society admin: manage lodge/order reference data',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: GOLD, fontFamily: cinzel, fontSize: 11, flexShrink: 0 }}>—</span>
                <span style={{ fontFamily: crimson, fontSize: 14, color: MUTED, lineHeight: 1.5 }}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
