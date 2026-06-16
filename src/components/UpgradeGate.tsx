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
  isDark?: boolean
  children?: React.ReactNode
}

export function UpgradeGate({ featureName, description, requiredTier, variant = 'overlay', isDark = true, children }: UpgradeGateProps) {
  const { getToken } = useAuth()
  const { user } = useUser()
  const [upgradeMsg, setUpgradeMsg]       = useState<string | null>(null)
  const [upgradeMsgErr, setUpgradeMsgErr] = useState(false)
  const [confirmPending, setConfirmPending] = useState(false)

  const tier      = (user?.publicMetadata?.tier as string) || 'watchman'
  const role      = (user?.publicMetadata?.role as string) || ''
  const userLevel = getAccessLevel({ tier, role })
  const reqLevel  = TIER_LEVELS[requiredTier.toLowerCase()] ?? 0
  const hasAccess = userLevel >= reqLevel
  const tierLabel = requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)
  const direction = reqLevel >= userLevel ? 'upgrade' : 'downgrade'

  async function executeUpgrade() {
    setConfirmPending(false)
    setUpgradeMsg(null)
    setUpgradeMsgErr(false)
    const result = await callCheckoutApi(requiredTier, getToken)
    if (result.type === 'redirect') { window.location.href = result.url; return }
    if (result.type === 'modified') {
      if (result.direction === 'noop') { setUpgradeMsg("You're already on this tier."); return }
      if (result.direction === 'upgrade' && result.effective === 'now') {
        await user?.reload()
        setUpgradeMsg(`You're upgraded to ${tierLabel}. Your new tools are unlocked.`)
        return
      }
      if (result.direction === 'downgrade' && result.effective === 'period_end') {
        setUpgradeMsg(`Your plan will change to ${tierLabel} at the end of your billing period. You keep your current access until then.`)
        return
      }
    }
    if (result.type === 'error') {
      if (result.errorCode === 'sold_out') { setUpgradeMsgErr(true); setUpgradeMsg('Founding General spots are sold out.'); return }
      setUpgradeMsgErr(true)
      setUpgradeMsg('Upgrade failed. Please try again.')
    }
  }

  function handleUpgradeClick() {
    setConfirmPending(true)
  }

  const confirmDialog = confirmPending && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: isDark ? '#1a1726' : '#FFFFFF', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 12, width: '100%', maxWidth: 420, padding: '28px 24px', boxShadow: isDark ? 'none' : '0 1px 2px rgba(60,45,15,.05), 0 4px 14px rgba(60,45,15,.04)' }}>
        <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.1em', marginBottom: 12 }}>
          {direction === 'upgrade' ? `UPGRADE TO ${requiredTier.toUpperCase()}` : `CHANGE TO ${requiredTier.toUpperCase()}`}
        </div>
        <div style={{ fontFamily: crimson, fontSize: 14, color: isDark ? '#c8bfa8' : '#352F22', lineHeight: 1.6, marginBottom: 24 }}>
          {direction === 'upgrade'
            ? `You'll be charged the prorated difference today and unlock all ${tierLabel}-tier features immediately.`
            : `Your plan changes to ${tierLabel} at the end of your current billing period. You keep your current access until then.`}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={() => setConfirmPending(false)} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 6, color: isDark ? '#a09080' : '#574B33', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => void executeUpgrade()} style={{ padding: '9px 20px', background: G, color: '#0D0B14', borderRadius: 6, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
            {direction === 'upgrade' ? 'Confirm Upgrade' : 'Confirm Change'}
          </button>
        </div>
      </div>
    </div>
  )

  const noticeEl = upgradeMsg && (
    <div style={{ marginTop: 10, padding: '8px 12px', background: upgradeMsgErr ? 'rgba(239,68,68,0.1)' : 'rgba(201,168,76,0.08)', border: `1px solid ${upgradeMsgErr ? 'rgba(239,68,68,0.3)' : 'rgba(201,168,76,0.25)'}`, borderRadius: 6 }}>
      <span style={{ fontFamily: crimson, fontSize: 13, color: upgradeMsgErr ? '#f87171' : (isDark ? '#e8e0d0' : '#1F1B12') }}>{upgradeMsg}</span>
    </div>
  )

  if (variant === 'overlay') {
    if (hasAccess) return <>{children}</>
    return (
      <>
        {confirmDialog}
        <div style={{ position: 'relative', minHeight: 180 }}>
          <div style={{ filter: 'blur(4px)', userSelect: 'none' as const, pointerEvents: 'none' as const }}>
            {children}
          </div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(13,11,20,0.75)' : 'rgba(237,235,226,0.82)', borderRadius: 8 }}>
            <div style={{ fontFamily: cinzel, fontSize: 12, color: G, letterSpacing: '0.1em', marginBottom: 8 }}>⚔ {requiredTier.toUpperCase()} INTEL</div>
            <div style={{ fontFamily: crimson, fontSize: 14, color: isDark ? '#e8e0d0' : '#1F1B12', marginBottom: 16, textAlign: 'center' as const, padding: '0 20px', lineHeight: 1.5 }}>
              Upgrade to {tierLabel} to unlock this intelligence.
            </div>
            {noticeEl && <div style={{ marginBottom: 10, padding: '0 20px', width: '100%', boxSizing: 'border-box' as const }}>{noticeEl}</div>}
            <button
              onClick={handleUpgradeClick}
              style={{ padding: '8px 20px', background: G, color: '#0D0B14', borderRadius: 4, fontFamily: cinzel, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', border: 'none', cursor: 'pointer' }}
            >
              Upgrade to {tierLabel} to unlock
            </button>
          </div>
        </div>
      </>
    )
  }

  if (variant === 'banner') {
    return (
      <>
        {confirmDialog}
        <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 6, padding: '10px 14px', textAlign: 'center' as const, color: 'var(--gold)', fontSize: 13 }}>
          🔒 {featureName}.{' '}
          <button
            onClick={handleUpgradeClick}
            style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 13, padding: 0, textDecoration: 'underline' }}
          >
            Upgrade to {tierLabel} to access.
          </button>
          {noticeEl && <div style={{ marginTop: 6 }}>{noticeEl}</div>}
        </div>
      </>
    )
  }

  return (
    <>
      {confirmDialog}
      <div style={{ textAlign: 'center' as const, maxWidth: 480, padding: '0 20px' }}>
        <div style={{ fontSize: 40, color: G, marginBottom: 20 }}>⚔</div>
        <div style={{ fontFamily: cinzel, fontSize: 20, color: G, letterSpacing: '0.06em', marginBottom: description ? 12 : 24 }}>
          {requiredTier.toUpperCase()} TIER REQUIRED
        </div>
        {description && (
          <p style={{ fontFamily: crimson, fontSize: 15, color: isDark ? '#9a8c74' : '#574B33', lineHeight: 1.7, margin: '0 0 24px' }}>
            {description}
          </p>
        )}
        {noticeEl && <div style={{ marginBottom: 12 }}>{noticeEl}</div>}
        <button
          onClick={handleUpgradeClick}
          style={{ display: 'inline-block', background: G, color: '#0D0B14', fontFamily: cinzel, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', padding: '10px 28px', borderRadius: 6, border: 'none', cursor: 'pointer' }}
        >
          Upgrade to {tierLabel}
        </button>
      </div>
    </>
  )
}
