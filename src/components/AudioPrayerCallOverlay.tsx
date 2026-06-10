import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/tanstack-start'
import { StreamVideo, StreamCall, SpeakerLayout } from '@stream-io/video-react-sdk'

export interface AudioPrayerCallOverlayProps {
  callId: string
  callType: string
  channelId: string
  recipientName: string
  recipientId: string
  isCaller: boolean
  onEnd: () => void
}

const cinzel = "'Cinzel', serif"
const G      = '#C9A84C'
const BG     = '#0D0B14'

function Initials({ name }: { name: string }) {
  const i = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??'
  return <>{i}</>
}

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function AudioPrayerCallOverlay({
  callId, callType, recipientName, isCaller, onEnd,
}: AudioPrayerCallOverlayProps) {
  const { getToken } = useAuth()
  const [status,   setStatus]   = useState<'connecting' | 'active' | 'error'>('connecting')
  const [errorMsg, setErrorMsg] = useState('Could not connect to prayer call. Check mic permissions.')
  const [muted,    setMuted]    = useState(false)
  const [elapsed,  setElapsed]  = useState(0)
  const [debugLog, setDebugLog] = useState<string[]>([])
  const [joinedCall, setJoinedCall] = useState<any>(null)

  // All SDK refs typed as any — SDK only loaded in browser via dynamic import
  const clientRef = useRef<any>(null)
  const callRef   = useRef<any>(null)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef  = useRef(Date.now())

  const dbg = (msg: string) => {
    console.log('[WRI-CALL]', msg)
    setDebugLog(prev => [...prev.slice(-8), `${new Date().toLocaleTimeString()}: ${msg}`])
  }

  // Ring tone for caller while connecting
  useEffect(() => {
    if (!isCaller || status !== 'connecting') return
    let stopped = false
    let ctx: AudioContext | null = null

    const ring = () => {
      if (stopped) return
      ctx = new AudioContext()
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 440
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0)
      osc.start()
      osc.stop(ctx.currentTime + 1.0)
      osc.onended = () => {
        ctx?.close()
        if (!stopped) setTimeout(ring, 2000)
      }
    }

    ring()
    return () => { stopped = true; ctx?.close() }
  }, [isCaller, status])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        dbg('Getting auth token...')
        const authToken = await getToken()
        if (!authToken) throw new Error('No auth token')
        dbg('Auth token OK')

        // Dynamic import — never executes during SSR
        dbg('Loading StreamVideoClient SDK...')
        const { StreamVideoClient } = await import('@stream-io/video-react-sdk')
        dbg('SDK loaded')

        // Get a Stream Video token
        dbg('Fetching video token...')
        const vtRes = await fetch('/api/stream-video-token', {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        dbg(`Token response status: ${vtRes.status}`)
        if (!vtRes.ok) {
          const body = await vtRes.text()
          dbg(`Token error body: ${body.slice(0, 200)}`)
          throw new Error(`Token ${vtRes.status}: ${body}`)
        }
        const { apiKey, token: videoToken, userId, name } = await vtRes.json()
        dbg(`Token OK — callId: ${callId} userId: ${userId}`)

        if (cancelled) return

        // Init the Stream Video client
        dbg('Creating StreamVideoClient...')
        const client = new StreamVideoClient({
          apiKey,
          user: { id: userId, name },
          token: videoToken,
        })
        clientRef.current = client
        dbg('Client created')

        // Join / create the call — DIAG: hardcoded 'default' to isolate call type as the WS failure variable
        dbg(`[VIDEO DIAG] Getting call — type: default id: ${callId}`)
        const call = client.call('default', callId)
        callRef.current = call
        dbg('Call object ready')

        dbg('Requesting mic permission...')
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true })
          dbg('Mic granted')
        } catch (micErr: any) {
          dbg(`Mic DENIED: ${micErr?.message}`)
          throw micErr
        }

        dbg(`[VIDEO DIAG] callType=default callId=${callId} userId=${userId} isCaller=${isCaller} tokenLen=${videoToken?.length}`)
        dbg('Calling join()...')
        try {
          await (isCaller ? call.join({ create: true }) : call.join())
          dbg('join() success — call state: ' + JSON.stringify(call.state?.callingState))
        } catch (joinErr: any) {
          dbg(`join() FAILED: ${JSON.stringify(joinErr, Object.getOwnPropertyNames(joinErr))}`)
          throw joinErr
        }

        if (cancelled) {
          await call.leave().catch(() => {})
          await client.disconnectUser().catch(() => {})
          return
        }

        // Disable camera fire-and-forget — do not await (can hang indefinitely)
        call.camera.disable().catch(() => {})
        dbg('join() resolved — starting call')
        setJoinedCall(call)

        startRef.current = Date.now()
        timerRef.current = setInterval(
          () => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)),
          1000,
        )

        if (!isCaller) {
          setStatus('active')
          dbg('Callee — active')
        } else {
          dbg('Caller — waiting for recipient to join')
          const ringCheck = setInterval(() => {
            if (cancelled) { clearInterval(ringCheck); return }
            const parts = (call.state?.participants || []) as any[]
            dbg(`Ring check — participants: ${parts.length}`)
            if (parts.length >= 2) {
              setStatus('active')
              clearInterval(ringCheck)
              dbg('Recipient joined — active')
            }
          }, 2000)
          setTimeout(() => { clearInterval(ringCheck) }, 60000)
        }
      } catch (err: any) {
        const msg = err?.message || String(err)
        dbg(`INIT ERROR: ${msg}`)
        console.error('[AudioPrayerCallOverlay]', msg)
        if (!cancelled) {
          if (msg.includes('permission') || msg.includes('Permission') || msg.includes('NotAllowed')) {
            setErrorMsg('Microphone permission denied. Please allow mic access and try again.')
          } else if (msg.includes('token') || msg.includes('auth') || msg.includes('401')) {
            setErrorMsg('Authentication failed. Please try again.')
          } else {
            setErrorMsg(`Connection failed: ${msg}`)
          }
          setStatus('error')
        }
      }
    }

    init()

    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
      callRef.current?.leave().catch(() => {})
      clientRef.current?.disconnectUser().catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId, callType])

  const handleEnd = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    try { await callRef.current?.leave() } catch {}
    try { await clientRef.current?.disconnectUser() } catch {}
    onEnd()
  }

  const toggleMute = async () => {
    try {
      if (muted) {
        await callRef.current?.microphone.enable()
      } else {
        await callRef.current?.microphone.disable()
      }
      setMuted(m => !m)
    } catch {}
  }

  const debugPanel = debugLog.length > 0 ? (
    <div style={{
      marginTop: 16,
      padding: '10px 12px',
      background: 'rgba(0,0,0,0.5)',
      borderRadius: 8,
      maxWidth: 320,
      maxHeight: 200,
      overflowY: 'auto',
    }}>
      {debugLog.map((line, i) => (
        <div key={i} style={{
          fontSize: 10,
          color: line.includes('FAIL') || line.includes('DENIED') || line.includes('ERROR') ? '#ef4444' : '#9a8c74',
          fontFamily: 'monospace',
          lineHeight: 1.6,
          wordBreak: 'break-all',
        }}>
          {line}
        </div>
      ))}
    </div>
  ) : null

  // ── Overlay styles ─────────────────────────────────────────────────────────
  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 2000,
    background: 'rgba(5,4,15,0.96)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(8px)',
    flexDirection: 'column',
  }
  const card: React.CSSProperties = {
    width: '100%', maxWidth: 360,
    background: BG,
    borderRadius: 16,
    border: '1px solid rgba(201,168,76,0.25)',
    boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
    overflow: 'hidden',
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div style={overlay}>
        <div style={{ ...card, padding: 32, textAlign: 'center' }}>
          <div style={{ color: '#f87171', fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em', marginBottom: 8 }}>
            CALL FAILED
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 20 }}>
            {errorMsg}
          </div>
          <button
            onClick={handleEnd}
            style={{
              fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em',
              padding: '8px 24px', background: 'rgba(201,168,76,0.15)',
              border: `1px solid ${G}`, color: G, borderRadius: 6, cursor: 'pointer',
            }}
          >
            CLOSE
          </button>
        </div>
        {debugPanel}
      </div>
    )
  }

  // ── Main call UI ───────────────────────────────────────────────────────────
  return (
    <div style={overlay}>
      <div style={card}>
        {/* Header bar */}
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.14em', color: 'rgba(201,168,76,0.6)' }}>
            🎙 PRAYER CALL · WAR ROOM INTEL
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: status === 'active' ? '#fff' : 'rgba(255,255,255,0.35)' }}>
            {status === 'active' ? fmt(elapsed) : 'Connecting…'}
          </span>
        </div>

        {/* Avatar + name */}
        <div style={{ padding: '40px 24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative', width: 88, height: 88 }}>
            {/* Pulse rings when active */}
            {status === 'active' && (
              <>
                <div style={{
                  position: 'absolute', inset: -18, borderRadius: '50%',
                  border: '1px solid rgba(201,168,76,0.18)',
                  animation: 'prayer-pulse 2.4s ease-out infinite',
                }} />
                <div style={{
                  position: 'absolute', inset: -9, borderRadius: '50%',
                  border: '1px solid rgba(201,168,76,0.12)',
                  animation: 'prayer-pulse 2.4s ease-out infinite 0.8s',
                }} />
              </>
            )}
            <div style={{
              position: 'relative', zIndex: 1,
              width: 88, height: 88, borderRadius: '50%',
              background: 'rgba(201,168,76,0.12)',
              border: `2px solid rgba(201,168,76,${status === 'active' ? '0.5' : '0.25'})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: cinzel, fontSize: 24, color: G,
            }}>
              <Initials name={recipientName} />
            </div>
          </div>

          <div style={{ fontFamily: cinzel, fontSize: 15, color: '#fff', letterSpacing: '0.05em', textAlign: 'center' }}>
            {recipientName}
          </div>
          <div style={{ fontSize: 11, color: status === 'active' ? 'rgba(74,222,128,0.8)' : 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>
            {status === 'connecting' ? (isCaller ? 'Ringing…' : 'Connecting…') : status === 'active' ? '● Connected' : 'Ended'}
          </div>

          {/* Debug panel — visible during connecting and after connected */}
          {debugPanel}
        </div>

        {/* Controls */}
        <div style={{
          padding: '16px 24px 24px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', justifyContent: 'center', gap: 20, alignItems: 'center',
        }}>
          {/* Mute button */}
          <button
            onClick={toggleMute}
            title={muted ? 'Unmute' : 'Mute'}
            style={{
              width: 50, height: 50, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: muted ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.1)',
              color: muted ? G : '#fff',
              fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
          >
            {muted ? '🔇' : '🎙'}
          </button>

          {/* End call button */}
          <button
            onClick={handleEnd}
            title="End call"
            style={{
              width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: '#dc2626',
              color: '#fff', fontSize: 22,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(220,38,38,0.4)',
            }}
          >
            📵
          </button>
        </div>
      </div>

      <style>{`
        @keyframes prayer-pulse {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.7); opacity: 0; }
        }
      `}</style>

      {/* Hidden SDK providers — mounts SDK's managed <audio autoPlay> elements for remote tracks */}
      {clientRef.current && joinedCall && (
        <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
          <StreamVideo client={clientRef.current}>
            <StreamCall call={joinedCall}>
              <SpeakerLayout />
            </StreamCall>
          </StreamVideo>
        </div>
      )}
    </div>
  )
}
