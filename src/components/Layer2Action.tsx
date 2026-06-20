import { useState } from 'react'
import { useAuth } from '@clerk/tanstack-start'

export type Layer2ActionKind = 'retrofit' | 'extract'

export interface Layer2ActionProps {
  kind: Layer2ActionKind
  targetId: string
  lastExtractionAt: string | null
  lastExtractionError: string | null
  alreadyExtracted?: boolean
  onSuccess?: () => void
  compact?: boolean
}

const ENDPOINTS: Record<Layer2ActionKind, { url: string; bodyKey: string; label: string }> = {
  retrofit: {
    url:     '/api/admin-retrofit-layer2-background',
    bodyKey: 'lesId',
    label:   'Retrofit L2',
  },
  extract: {
    url:     '/api/candidate-run-layer2-background',
    bodyKey: 'candidateId',
    label:   'Run L2',
  },
}

// How long after a successful 202 fire to show the optimistic ⏳ badge (ms).
const OPTIMISTIC_TTL_MS = 60_000

export function Layer2Action({
  kind,
  targetId,
  lastExtractionAt,
  lastExtractionError,
  alreadyExtracted,
  onSuccess,
  compact = false,
}: Layer2ActionProps) {
  const { getToken } = useAuth()

  const [firing, setFiring]         = useState(false)
  const [fireError, setFireError]   = useState<string | null>(null)
  const [firedAt, setFiredAt]       = useState<number | null>(null)

  const ep = ENDPOINTS[kind]

  const isOptimistic = firedAt !== null && Date.now() - firedAt < OPTIMISTIC_TTL_MS

  async function handleFire() {
    setFiring(true)
    setFireError(null)
    try {
      const token = await getToken()
      const res   = await fetch(ep.url, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ [ep.bodyKey]: targetId }),
      })
      if (res.status === 202 || res.ok) {
        setFiredAt(Date.now())
        onSuccess?.()
      } else {
        const text = await res.text().catch(() => String(res.status))
        setFireError(`HTTP ${res.status}: ${text.slice(0, 120)}`)
      }
    } catch (err: any) {
      setFireError(err?.message ?? String(err))
    } finally {
      setFiring(false)
    }
  }

  // Badge derivation — priority order: fire error > optimistic > db error > db success
  let badge: React.ReactNode = null
  if (fireError) {
    badge = (
      <span title={fireError} style={{ color: '#f59e0b', fontSize: compact ? 11 : 12 }}>
        ⚠ {compact ? null : 'Fire failed'}
      </span>
    )
  } else if (isOptimistic) {
    badge = (
      <span style={{ color: '#60a5fa', fontSize: compact ? 11 : 12 }}>
        ⏳ {compact ? null : 'Running…'}
      </span>
    )
  } else if (lastExtractionError && lastExtractionError.startsWith('skipped:')) {
    badge = (
      <span title={lastExtractionError} style={{ color: '#a78bfa', fontSize: compact ? 11 : 12 }}>
        ⏭ {compact ? null : 'Skipped'}
      </span>
    )
  } else if (lastExtractionError) {
    badge = (
      <span title={lastExtractionError} style={{ color: '#f87171', fontSize: compact ? 11 : 12 }}>
        ✗ {compact ? null : lastExtractionError.slice(0, 40)}
      </span>
    )
  } else if (lastExtractionAt) {
    const ts = new Date(lastExtractionAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    badge = (
      <span title={`Extracted at ${lastExtractionAt}`} style={{ color: '#4ade80', fontSize: compact ? 11 : 12 }}>
        ✓ {compact ? null : ts}
      </span>
    )
  }

  const disabled = firing || isOptimistic

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <button
        onClick={handleFire}
        disabled={disabled}
        title={alreadyExtracted ? `Re-run ${ep.label}` : ep.label}
        style={{
          padding:       compact ? '2px 6px' : '3px 8px',
          fontSize:      compact ? 11 : 12,
          borderRadius:  4,
          border:        '1px solid #6366f1',
          background:    disabled ? '#312e81' : '#4f46e5',
          color:         disabled ? '#a5b4fc' : '#fff',
          cursor:        disabled ? 'not-allowed' : 'pointer',
          whiteSpace:    'nowrap',
          opacity:       disabled ? 0.7 : 1,
        }}
      >
        {firing ? '…' : alreadyExtracted ? `↺ ${ep.label}` : `⚡ ${ep.label}`}
      </button>
      {badge}
    </span>
  )
}
