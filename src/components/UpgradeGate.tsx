import React, { useState } from 'react'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { getAccessLevel } from '@/lib/access'
import { callCheckoutApi } from '@/lib/upgrade'

const G      = '#C9A84C'
const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

const TIER_LEVELS: Record<string, number> = {
  watchman: 0, free: 0, soldier: 1, commander: 2, general: 3, minister: 4, commandant: 5,
}

export interface UpgradeGateProps {
  featureName: string
  description?: string
  requiredTier: string
  variant?: 'overlay' | 'banner' | 'screen'
  children?: React.ReactNode
}

export function UpgradeGate({ featureName, description, requiredTier, variant = 'overlay', children }: UpgradeGateProps) {
  const { getToken } = useAuth()
  const { user } = useUser()
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null)

  const tier      = (user?.publicMetadata?.tier as string) || 'watchman'
  const role      = (user?.publicMetadata?.role as string) || ''
  const userLevel = getAccessLevel({ tier, role })
  const reqLevel  = TIER_LEVELS[requiredTier.toLowerCase()] ?? 0
  const hasAccess = userLevel >= reqLevel
  const tierLabel = requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)

  async function handleUpgradeClick() {
    setUpgradeMsg(null)
    const result = await callCheckoutApi(requiredTier, getToken)
    if (result.type === 'redirect') { window.location.href = result.url; return }
    if (result.type === 'modified') {
      if (result.direction === 'noop') { setUpgradeMsg("You're already on this tier."); return }
      if (result.direction === 'upgrade' && result.effective === 'now') {
        await user?.reload()
        setUpgradeMsg("You're upgraded. Welcome up.")
        return
      }
      if (result.direction === 'downgrade' && result.effective === 'period_end') {
        setUpgradeMsg('Your plan will change at the end of your current billing period. You keep your current access until then.')
        return
      }
    }
    if (result.type === 'error') {
      if (result.errorCode === 'sold_out') { setUpgradeMsg('Founding General spots are sold out.'); return }
      setUpgradeMsg('Upgrade failed. Please try again.')
    }
  }

  if (variant === 'overlay') {
    if (hasAccess) return <>{children}</>
    return (
      <div style={{ position: 'relative', minHeight: 180 }}>
        <div style={{ filter: 'blur(4px)', userSelect: 'none' as const, pointerEvents: 'none' as const }}>
          {children}
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', background: 'rgba(13,11,20,0.75)', borderRadius: 8 }}>
          <div style={{ fontFamily: cinzel, fontSize: 12, color: G, letterSpacing: '0.1em', marginBottom: 8 }}>⚔ {requiredTier.toUpperCase()} INTEL</div>
          <div style={{ fontFamily: crimson, fontSize: 14, color: '#e8e0d0', marginBottom: 16, textAlign: 'center' as const, padding: '0 20px', lineHeight: 1.5 }}>
            Upgrade to {tierLabel} to unlock this intelligence.
          </div>
          {upgradeMsg && <div style={{ fontFamily: crimson, fontSize: 13, color: '#e8e0d0', marginBottom: 10, textAlign: 'center' as const, padding: '0 20px' }}>{upgradeMsg}</div>}
          <button
            onClick={handleUpgradeClick}
            style={{ padding: '8px 20px', background: G, color: '#0D0B14', borderRadius: 4, fontFamily: cinzel, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', border: 'none', cursor: 'pointer' }}
          >
            Upgrade to {tierLabel} to unlock
          </button>
        </div>
      </div>
    )
  }

  if (variant === 'banner') {
    return (
      <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 6, padding: '10px 14px', textAlign: 'center' as const, color: 'rgba(201,168,76,0.7)', fontSize: 13 }}>
        🔒 {featureName}.{' '}
        <button
          onClick={handleUpgradeClick}
          style={{ background: 'none', border: 'none', color: '#C9A84C', cursor: 'pointer', fontSize: 13, padding: 0, textDecoration: 'underline' }}
        >
          Upgrade to {tierLabel} to access.
        </button>
        {upgradeMsg && <div style={{ marginTop: 6, fontSize: 12, color: '#e8e0d0' }}>{upgradeMsg}</div>}
      </div>
    )
  }

  return (
    <div style={{ background: '#1a1726', border: '1px solid rgba(201,168,76,0.22)', borderRadius: 12, padding: '32px 28px', textAlign: 'center' as const, marginTop: 24 }}>
      <div style={{ fontSize: 36, marginBottom: 14 }}>🔒</div>
      <div style={{ fontFamily: cinzel, fontSize: 14, color: G, letterSpacing: '0.08em', marginBottom: 10 }}>
        {requiredTier.toUpperCase()}+ ACCESS REQUIRED
      </div>
      {description && (
        <div style={{ fontFamily: crimson, fontSize: 14, color: '#a09080', lineHeight: 1.6, maxWidth: 360, margin: '0 auto 24px' }}>
          {description}
        </div>
      )}
      {upgradeMsg && <div style={{ fontFamily: crimson, fontSize: 13, color: '#e8e0d0', marginBottom: 12 }}>{upgradeMsg}</div>}
      <button
        onClick={handleUpgradeClick}
        style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: '#0D0B14', background: G, padding: '12px 28px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 700 }}
      >
        Upgrade to {tierLabel} to unlock
      </button>
    </div>
  )
}
