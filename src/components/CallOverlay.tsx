import React, { useEffect, useRef, useState } from 'react'
import pkg from '@stream-io/video-react-sdk'
const { StreamVideoClient, StreamVideo, StreamCall } = pkg as any

interface CallOverlayProps {
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

export default function CallOverlay({ callType, otherUser, myUserId, streamToken, channelId, onEnd }: CallOverlayProps) {
  const [client, setClient] = useState<InstanceType<typeof StreamVideoClient> | null>(null)
  const [call, setCall] = useState<any>(null)
  const [callingState, setCallingState] = useState<string>('joining')
  const [elapsed, setElapsed] = useState(0)
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(callType === 'audio')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    const c = new StreamVideoClient({
      apiKey: STREAM_API_KEY,
      user: { id: myUserId, name: myUserId },
      token: streamToken,
    })

    const callId = `wri-${[myUserId, otherUser.id].sort().join('-')}-${Date.now()}`
    const cl = c.call('default', callId)

    cl.getOrCreate({
      ring: true,
      data: {
        members: [{ user_id: myUserId }, { user_id: otherUser.id }],
        custom: { channelId, callType },
      },
    }).then(() => cl.join()).then(() => {
      setCallingState('active')
      startTimeRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    }).catch((err: unknown) => {
      console.error('call error', err)
      setCallingState('error')
    })

    setClient(c)
    setCall(cl)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      cl.leave().catch(() => {})
      c.disconnectUser().catch(() => {})
    }
  }, [])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const handleEnd = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    const dur = Math.floor((Date.now() - startTimeRef.current) / 1000)
    call?.leave().catch(() => {})
    client?.disconnectUser().catch(() => {})
    onEnd(dur)
  }

  const getInitials = (name: string) =>
    name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??'

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.92)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  const cardStyle: React.CSSProperties = {
    width: '100%', maxWidth: 420,
    background: callType === 'video' ? '#0d1117' : '#0a0d1a',
    borderRadius: 16, overflow: 'hidden',
    border: '1px solid rgba(201,168,76,0.2)',
  }

  if (callingState === 'error') return (
    <div style={overlayStyle}>
      <div style={{ ...cardStyle, padding: 32, textAlign: 'center' }}>
        <div style={{ color: '#f87171', fontFamily: cinzel, fontSize: 12, marginBottom: 12 }}>CALL FAILED</div>
        <button
          onClick={() => onEnd(0)}
          style={{ fontFamily: cinzel, fontSize: 10, padding: '8px 20px', background: 'rgba(201,168,76,0.15)', border: '1px solid #C9A84C', color: G, borderRadius: 4, cursor: 'pointer' }}
        >
          CLOSE
        </button>
      </div>
    </div>
  )

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        {/* Timer bar */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: 'rgba(201,168,76,0.6)' }}>
            {callType === 'video' ? 'VIDEO CALL' : 'AUDIO CALL'} · WAR ROOM INTEL
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 13, color: callingState === 'active' ? 'white' : 'rgba(255,255,255,0.4)' }}>
            {callingState === 'active' ? formatTime(elapsed) : 'Connecting…'}
          </div>
        </div>

        {callType === 'video' && client && call ? (
          /* VIDEO LAYOUT */
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <div style={{ height: 280, background: '#0d1117', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '100%', height: '100%', display: 'flex', gap: 4, padding: 8 }}>
                  <div style={{ flex: 1, background: '#1a1f2e', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 16, color: G }}>
                      {getInitials(otherUser.name)}
                    </div>
                    <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                      {otherUser.name}
                    </div>
                  </div>
                </div>
                {/* PiP self view */}
                <div style={{ position: 'absolute', bottom: 12, right: 12, width: 80, height: 60, borderRadius: 8, background: '#1a2a3a', border: '1.5px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontFamily: cinzel, fontSize: 11, color: G }}>{getInitials(myUserId)}</div>
                </div>
              </div>
            </StreamCall>
          </StreamVideo>
        ) : (
          /* AUDIO LAYOUT */
          <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', width: 80, height: 80 }}>
              {callingState !== 'active' && (
                <>
                  <div style={{ position: 'absolute', inset: -16, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.2)', animation: 'pulse-ring 2s ease-out infinite' }} />
                  <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.15)', animation: 'pulse-ring 2s ease-out infinite 0.5s' }} />
                </>
              )}
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: '2px solid rgba(201,168,76,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 22, color: G, position: 'relative', zIndex: 1 }}>
                {getInitials(otherUser.name)}
              </div>
            </div>
            <div style={{ fontFamily: cinzel, fontSize: 15, color: 'white', letterSpacing: '0.05em' }}>{otherUser.name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {callingState === 'active' ? formatTime(elapsed) : 'Ringing…'}
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ padding: '16px 24px 20px', display: 'flex', justifyContent: 'center', gap: 16, alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            title="Mute"
            onClick={() => { call?.microphone?.toggle(); setMuted(m => !m) }}
            style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', background: muted ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.1)', color: muted ? G : 'white', fontSize: 18 }}
          >
            {muted ? '🔇' : '🎙'}
          </button>
          {callType === 'video' && (
            <button
              title="Camera"
              onClick={() => { call?.camera?.toggle(); setCameraOff(c => !c) }}
              style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', background: cameraOff ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.1)', color: cameraOff ? G : 'white', fontSize: 18 }}
            >
              {cameraOff ? '📵' : '📹'}
            </button>
          )}
          <button
            title="End call"
            onClick={handleEnd}
            style={{ width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer', background: '#dc2626', color: 'white', fontSize: 22 }}
          >
            📵
          </button>
          {callType === 'video' && (
            <button
              title="Screen share"
              onClick={() => call?.screenShare?.toggle()}
              style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 18 }}
            >
              🖥
            </button>
          )}
        </div>

        <style>{`
          @keyframes pulse-ring {
            0% { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(1.5); opacity: 0; }
          }
        `}</style>
      </div>
    </div>
  )
}
