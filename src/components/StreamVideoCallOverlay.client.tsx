// This file is only ever loaded via dynamic import() from CallOverlay.tsx.
// It must never be statically imported anywhere — that keeps @stream-io/video-react-sdk
// out of the Netlify server bundle entirely.
import React, { useEffect, useRef, useState } from 'react'
import {
  StreamVideoClient,
  StreamVideo,
  StreamCall,
  useCallStateHooks,
  CallingState,
  ParticipantView,
} from '@stream-io/video-react-sdk'

export interface StreamCallOverlayProps {
  callType: 'audio' | 'video'
  otherUser: { id: string; name: string }
  myUserId: string
  streamToken: string
  channelId: string
  onEnd: (durationSeconds: number) => void
}

const STREAM_API_KEY = 'gsx7ykbj4rzr'
const cinzel = "'Cinzel', serif"
const G = '#C9A84C'

// ── Inner component — must be rendered inside <StreamVideo> + <StreamCall> ────
function CallControls({
  callType,
  otherUser,
  elapsed,
  callingState,
  onHangUp,
}: {
  callType: 'audio' | 'video'
  otherUser: { id: string; name: string }
  elapsed: number
  callingState: string
  onHangUp: () => void
}) {
  const { useParticipants, useLocalParticipant } = useCallStateHooks()
  const participants = useParticipants()
  const local = useLocalParticipant()
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(callType === 'audio')

  const { useCall } = useCallStateHooks()
  const call = useCall()

  const getInitials = (name: string) =>
    name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??'
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const card: React.CSSProperties = {
    width: '100%', maxWidth: 420,
    background: callType === 'video' ? '#0d1117' : '#0a0d1a',
    borderRadius: 16, overflow: 'hidden',
    border: '1px solid rgba(201,168,76,0.2)',
  }

  const btn = (active = false, danger = false): React.CSSProperties => ({
    width: 46, height: 46, borderRadius: '50%', border: 'none', cursor: 'pointer',
    fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: danger ? '#dc2626' : active ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.12)',
    color: danger ? 'white' : active ? G : 'white',
  })

  const isConnected = callingState === CallingState.JOINED

  const remoteParticipants = participants.filter(p => p.userId !== local?.userId)

  return (
    <div style={card}>
      {/* Timer bar */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: 'rgba(201,168,76,0.6)' }}>
          {callType === 'video' ? 'VIDEO CALL' : 'AUDIO CALL'} · WAR ROOM INTEL
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 13, color: isConnected ? 'white' : 'rgba(255,255,255,0.4)' }}>
          {isConnected ? fmt(elapsed) : 'Connecting…'}
        </div>
      </div>

      {callType === 'video' ? (
        <div style={{ position: 'relative', height: 280, background: '#0d1117', display: 'flex' }}>
          {/* Remote participant */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {remoteParticipants[0] ? (
              <div style={{ width: '100%', height: '100%' }}>
                <ParticipantView participant={remoteParticipants[0]} />
              </div>
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#1a1f2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: '2px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 17, color: G }}>
                  {getInitials(otherUser.name)}
                </div>
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{otherUser.name}</div>
          </div>
          {/* Self PiP */}
          {local && !cameraOff && (
            <div style={{ position: 'absolute', bottom: 12, right: 12, width: 84, height: 64, borderRadius: 8, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.2)' }}>
              <ParticipantView participant={local} />
            </div>
          )}
          {(!local || cameraOff) && (
            <div style={{ position: 'absolute', bottom: 12, right: 12, width: 84, height: 64, borderRadius: 8, background: '#1a2a3a', border: '1.5px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: cinzel, fontSize: 11, color: G }}>You</span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {!isConnected && (
              <>
                <div style={{ position: 'absolute', inset: -16, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.2)', animation: 'pulse-ring 2s ease-out infinite' }} />
                <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.12)', animation: 'pulse-ring 2s ease-out infinite 0.6s' }} />
              </>
            )}
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: '2px solid rgba(201,168,76,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 22, color: G, zIndex: 1, position: 'relative' }}>
              {getInitials(otherUser.name)}
            </div>
          </div>
          <div style={{ fontFamily: cinzel, fontSize: 15, color: 'white', letterSpacing: '0.05em' }}>{otherUser.name}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{isConnected ? fmt(elapsed) : 'Ringing…'}</div>
        </div>
      )}

      {/* Controls */}
      <div style={{ padding: '14px 24px 18px', display: 'flex', justifyContent: 'center', gap: 14, alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => { call?.microphone.toggle(); setMuted(m => !m) }}
          style={btn(muted)}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? '🔇' : '🎙'}
        </button>
        {callType === 'video' && (
          <button
            onClick={() => { call?.camera.toggle(); setCameraOff(c => !c) }}
            style={btn(cameraOff)}
            title={cameraOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {cameraOff ? '📵' : '📹'}
          </button>
        )}
        <button
          onClick={onHangUp}
          style={{ ...btn(false, true), width: 54, height: 54, fontSize: 20 }}
          title="End call"
        >
          📵
        </button>
        {callType === 'video' && (
          <button
            onClick={() => call?.screenShare.toggle()}
            style={btn()}
            title="Share screen"
          >
            🖥
          </button>
        )}
      </div>

      <style>{`@keyframes pulse-ring { 0% { transform:scale(1);opacity:.6; } 100% { transform:scale(1.6);opacity:0; } }`}</style>
    </div>
  )
}

// ── Main exported component ───────────────────────────────────────────────────
export default function StreamVideoCallOverlay({
  callType, otherUser, myUserId, streamToken, channelId, onEnd,
}: StreamCallOverlayProps) {
  const [client, setClient] = useState<StreamVideoClient | null>(null)
  const [call, setCall]     = useState<ReturnType<StreamVideoClient['call']> | null>(null)
  const [callingState, setCallingState] = useState<string>(CallingState.UNKNOWN)
  const [elapsed, setElapsed]     = useState(0)
  const [initError, setInitError] = useState(false)
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef    = useRef(Date.now())
  const cleanedUp   = useRef(false)

  useEffect(() => {
    const c = new StreamVideoClient({
      apiKey: STREAM_API_KEY,
      user: { id: myUserId, name: myUserId },
      token: streamToken,
    })

    const callId = `wri-${[myUserId, otherUser.id].sort().join('-')}-${Date.now()}`
    const cl = c.call('default', callId)

    const unsubscribe = cl.on('call.session_participant_joined', () => {
      if (cleanedUp.current) return
      setCallingState(CallingState.JOINED)
      startRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
      }, 1000)
    })

    cl.getOrCreate({
      ring: true,
      data: {
        members: [{ user_id: myUserId }, { user_id: otherUser.id }],
        custom: { channelId, callType },
      },
    })
      .then(() => cl.join())
      .then(() => {
        if (cleanedUp.current) return
        setCallingState(CallingState.JOINED)
        startRef.current = Date.now()
        timerRef.current = setInterval(() => {
          setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
        }, 1000)
      })
      .catch(err => {
        console.error('[StreamVideoCallOverlay] call setup error', err)
        if (!cleanedUp.current) setInitError(true)
      })

    setClient(c)
    setCall(cl)

    return () => {
      cleanedUp.current = true
      if (timerRef.current) clearInterval(timerRef.current)
      unsubscribe()
      cl.leave().catch(() => {})
      c.disconnectUser().catch(() => {})
    }
  }, [])

  const handleHangUp = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    const dur = Math.floor((Date.now() - startRef.current) / 1000)
    call?.leave().catch(() => {})
    client?.disconnectUser().catch(() => {})
    onEnd(dur)
  }

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.92)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  if (initError) return (
    <div style={overlay}>
      <div style={{ maxWidth: 400, width: '100%', background: '#0a0d1a', borderRadius: 16, padding: 32, textAlign: 'center', border: '1px solid rgba(201,168,76,0.2)' }}>
        <div style={{ color: '#f87171', fontFamily: cinzel, fontSize: 12, marginBottom: 8 }}>CALL FAILED</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 16 }}>Could not connect to call</div>
        <button onClick={() => onEnd(0)} style={{ fontFamily: cinzel, fontSize: 10, padding: '8px 20px', background: 'rgba(201,168,76,0.15)', border: '1px solid #C9A84C', color: G, borderRadius: 4, cursor: 'pointer' }}>CLOSE</button>
      </div>
    </div>
  )

  if (!client || !call) return (
    <div style={overlay}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em' }}>CONNECTING…</div>
    </div>
  )

  return (
    <div style={overlay}>
      <StreamVideo client={client}>
        <StreamCall call={call}>
          <CallControls
            callType={callType}
            otherUser={otherUser}
            elapsed={elapsed}
            callingState={callingState}
            onHangUp={handleHangUp}
          />
        </StreamCall>
      </StreamVideo>
    </div>
  )
}
