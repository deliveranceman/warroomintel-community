// CallOverlay is the entry point for all calls.
// It loads the real Stream Video SDK component dynamically (browser-only) so the
// Netlify server bundle never touches @stream-io/video-react-sdk.
// While the SDK module loads, and as a permanent fallback on load failure,
// it renders a native WebRTC implementation.
import React, { useEffect, useRef, useState } from 'react'
import type { StreamCallOverlayProps } from './StreamVideoCallOverlay.client'

export interface CallOverlayProps {
  callType: 'audio' | 'video'
  otherUser: { id: string; name: string }
  myUserId: string
  streamToken: string
  channelId: string
  onEnd: (durationSeconds: number) => void
}

const cinzel = "'Cinzel', serif"
const G = '#C9A84C'

// ── Native WebRTC fallback (always available, no external deps) ───────────────
function NativeCallOverlay({ callType, otherUser, onEnd }: CallOverlayProps) {
  const [status, setStatus] = useState<'connecting' | 'active' | 'error'>('connecting')
  const [elapsed, setElapsed] = useState(0)
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(callType === 'audio')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef(Date.now())
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  const getInitials = (name: string) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??'
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  useEffect(() => {
    let cancelled = false
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          callType === 'video' ? { audio: true, video: { width: 640, height: 480 } } : { audio: true, video: false }
        )
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        localStreamRef.current = stream
        if (localVideoRef.current) { localVideoRef.current.srcObject = stream; localVideoRef.current.muted = true }

        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] })
        pcRef.current = pc
        stream.getTracks().forEach(t => pc.addTrack(t, stream))
        pc.ontrack = e => { if (remoteVideoRef.current && e.streams[0]) remoteVideoRef.current.srcObject = e.streams[0] }
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'failed') setStatus('error')
        }

        setStatus('active')
        startRef.current = Date.now()
        timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
      } catch (err) {
        console.error('[NativeCallOverlay]', err)
        if (!cancelled) setStatus('error')
      }
    }
    start()
    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
      localStreamRef.current?.getTracks().forEach(t => t.stop())
      pcRef.current?.close()
    }
  }, [])

  const handleEnd = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    pcRef.current?.close()
    onEnd(Math.floor((Date.now() - startRef.current) / 1000))
  }

  const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  const card: React.CSSProperties = { width: '100%', maxWidth: 400, background: '#0a0d1a', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(201,168,76,0.2)' }
  const btn = (active = false, danger = false): React.CSSProperties => ({ width: 46, height: 46, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: danger ? '#dc2626' : active ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.12)', color: danger ? 'white' : active ? G : 'white' })

  if (status === 'error') return (
    <div style={overlay}>
      <div style={{ ...card, padding: 32, textAlign: 'center' }}>
        <div style={{ color: '#f87171', fontFamily: cinzel, fontSize: 12, marginBottom: 8 }}>CALL FAILED</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 16 }}>Could not access microphone or camera</div>
        <button onClick={() => onEnd(0)} style={{ fontFamily: cinzel, fontSize: 10, padding: '8px 20px', background: 'rgba(201,168,76,0.15)', border: '1px solid #C9A84C', color: G, borderRadius: 4, cursor: 'pointer' }}>CLOSE</button>
      </div>
    </div>
  )

  return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: 'rgba(201,168,76,0.6)' }}>{callType === 'video' ? 'VIDEO CALL' : 'AUDIO CALL'} · WAR ROOM INTEL</div>
          <div style={{ fontFamily: 'monospace', fontSize: 13, color: status === 'active' ? 'white' : 'rgba(255,255,255,0.4)' }}>{status === 'active' ? fmt(elapsed) : 'Connecting…'}</div>
        </div>
        {callType === 'video' ? (
          <div style={{ position: 'relative', height: 260, background: '#0d1117' }}>
            <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: '2px solid rgba(201,168,76,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 18, color: G }}>{getInitials(otherUser.name)}</div>
            </div>
            <video ref={localVideoRef} autoPlay playsInline muted style={{ position: 'absolute', bottom: 10, right: 10, width: 80, height: 60, borderRadius: 8, objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.2)' }} />
            <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{otherUser.name}</div>
          </div>
        ) : (
          <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', inset: -16, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.2)', animation: 'pulse-ring 2s ease-out infinite' }} />
              <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.12)', animation: 'pulse-ring 2s ease-out infinite 0.6s' }} />
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: '2px solid rgba(201,168,76,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 22, color: G, zIndex: 1, position: 'relative' }}>{getInitials(otherUser.name)}</div>
            </div>
            <div style={{ fontFamily: cinzel, fontSize: 15, color: 'white', letterSpacing: '0.05em' }}>{otherUser.name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{status === 'active' ? fmt(elapsed) : 'Connecting…'}</div>
          </div>
        )}
        <div style={{ padding: '14px 24px 18px', display: 'flex', justifyContent: 'center', gap: 14, alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => { const t = localStreamRef.current?.getAudioTracks()[0]; if (t) { t.enabled = !t.enabled; setMuted(m => !m) } }} style={btn(muted)}>{muted ? '🔇' : '🎙'}</button>
          {callType === 'video' && <button onClick={() => { const t = localStreamRef.current?.getVideoTracks()[0]; if (t) { t.enabled = !t.enabled; setCameraOff(c => !c) } }} style={btn(cameraOff)}>{cameraOff ? '📵' : '📹'}</button>}
          <button onClick={handleEnd} style={{ ...btn(false, true), width: 54, height: 54, fontSize: 20 }}>📵</button>
        </div>
        <style>{`@keyframes pulse-ring { 0% { transform:scale(1);opacity:.6; } 100% { transform:scale(1.6);opacity:0; } }`}</style>
      </div>
    </div>
  )
}

// ── Dynamic loader ─────────────────────────────────────────────────────────────
export default function CallOverlay(props: CallOverlayProps) {
  const [SDKComponent, setSDKComponent] = useState<React.ComponentType<StreamCallOverlayProps> | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    import('./StreamVideoCallOverlay.client')
      .then(m => setSDKComponent(() => m.default))
      .catch(err => console.warn('[CallOverlay] SDK load failed, using native fallback:', err))
  }, [])

  // SDK loaded successfully → use real Stream Video
  if (SDKComponent) return <SDKComponent {...props} />

  // Always render native: either while SDK is loading (fast), or permanently after failure
  return <NativeCallOverlay {...props} />
}
