import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth, useUser, SignInButton, SignUpButton } from '@clerk/tanstack-start'

export const Route = createFileRoute('/community')({
  ssr: false,
  component: CommunityPage,
})

// ── STYLE TOKENS ─────────────────────────────────────────
const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"
const gold    = 'var(--gold)'
const deep    = 'var(--deep)'
const surface = 'var(--surface)'
const surface2 = 'var(--surface2)'
const border  = 'var(--border)'
const textDim = 'var(--text-dim)'
const muted   = 'var(--muted)'

// ── CHANNEL CONFIG ────────────────────────────────────────
const TIER_ORDER: Record<string, number> = { Free: 0, Soldier: 1, Commander: 2, General: 3 }

const CHANNELS = [
  { id: 'war-room-general',       name: 'The War Room',           icon: '⚔', minTier: 'Free' },
  { id: 'intelligence-briefings', name: 'Intelligence Briefings', icon: '📋', minTier: 'Soldier' },
  { id: 'ministry-operations',    name: 'Ministry Operations',    icon: '🗡', minTier: 'Commander' },
  { id: 'generals-table',         name: "General's Table",        icon: '✦', minTier: 'General' },
]

interface StreamMessage {
  id: string
  text: string
  user: { id: string; name?: string; image?: string }
  created_at: string
}

// ── STREAM API HELPER ────────────────────────────────────
function streamFetch(path: string, method: string, token: string, apiKey: string, body?: object) {
  return fetch(`https://chat.stream-io-api.com${path}?api_key=${apiKey}`, {
    method,
    headers: {
      'Content-Type':     'application/json',
      'Authorization':    token,
      'Stream-Auth-Type': 'jwt',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).then(r => r.json())
}

// ── SIGN-IN GATE ─────────────────────────────────────────
function SignInGate() {
  return (
    <div style={{ minHeight: 'calc(100vh - 73px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: deep }}>
      <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '8px', padding: '3rem 2.5rem', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚔</div>
        <h2 style={{ fontFamily: cinzel, fontSize: '18px', color: gold, letterSpacing: '0.1em', marginBottom: '12px' }}>War Room Community</h2>
        <p style={{ fontFamily: crimson, fontSize: '16px', color: textDim, fontStyle: 'italic', lineHeight: 1.7, marginBottom: '28px' }}>
          Sign in to access the War Room community — a live space for deliverance warriors.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <SignInButton mode="modal">
            <button style={{ width: '100%', padding: '13px', background: gold, color: deep, border: 'none', borderRadius: '4px', fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.12em', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase' }}>Sign In ⚔</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button style={{ width: '100%', padding: '13px', background: 'transparent', color: gold, border: `1px solid ${border}`, borderRadius: '4px', fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.12em', cursor: 'pointer', textTransform: 'uppercase' }}>Join Free</button>
          </SignUpButton>
        </div>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────
function CommunityPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()

  const [streamToken, setStreamToken] = useState<string | null>(null)
  const [apiKey, setApiKey]           = useState<string | null>(null)
  const [userId, setUserId]           = useState<string | null>(null)
  const [activeChannelId, setActiveChannelId] = useState('war-room-general')
  const [messages, setMessages]       = useState<StreamMessage[]>([])
  const [newMessage, setNewMessage]   = useState('')
  const [sending, setSending]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [loading, setLoading]         = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null)

  const tier = (user?.publicMetadata?.tier as string) || 'Free'

  const allowedChannels = CHANNELS.filter(
    ch => TIER_ORDER[tier] >= TIER_ORDER[ch.minTier]
  )
  const lockedChannels = CHANNELS.filter(
    ch => TIER_ORDER[tier] < TIER_ORDER[ch.minTier]
  )

  // ── Fetch Stream token on mount ───────────────────────
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    async function init() {
      try {
        const clerkToken = await getToken()
        if (!clerkToken) throw new Error('No Clerk token')

        const res = await fetch('/api/stream-token', {
          headers: { 'Authorization': `Bearer ${clerkToken}` },
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)

        setStreamToken(data.token)
        setApiKey(data.apiKey)
        setUserId(data.userId)
        setLoading(false)
      } catch (err: any) {
        setError(err.message)
        setLoading(false)
      }
    }

    init()
  }, [isLoaded, isSignedIn])

  // ── Fetch messages for active channel ────────────────
  const fetchMessages = useCallback(async (channelId: string, token: string, key: string) => {
    try {
      const data = await streamFetch(
        `/channels/messaging/${channelId}/query`,
        'POST',
        token,
        key,
        { state: true, messages: { limit: 50 } }
      )
      if (data.messages) {
        setMessages(data.messages)
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
    } catch {
      // silently retry on next poll
    }
  }, [])

  // ── Poll for new messages every 5s ───────────────────
  useEffect(() => {
    if (!streamToken || !apiKey) return

    fetchMessages(activeChannelId, streamToken, apiKey)

    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => {
      fetchMessages(activeChannelId, streamToken, apiKey)
    }, 5000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [activeChannelId, streamToken, apiKey, fetchMessages])

  // ── Send message ──────────────────────────────────────
  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !streamToken || !apiKey || sending) return

    setSending(true)
    try {
      await streamFetch(
        `/channels/messaging/${activeChannelId}/message`,
        'POST',
        streamToken,
        apiKey,
        { message: { text: newMessage.trim() } }
      )
      setNewMessage('')
      await fetchMessages(activeChannelId, streamToken, apiKey)
    } catch (err: any) {
      console.error('Send failed:', err.message)
    } finally {
      setSending(false)
    }
  }

  // ── Early returns ─────────────────────────────────────
  if (!isLoaded || !isSignedIn) return <SignInGate />

  if (loading) {
    return (
      <div style={{ minHeight: 'calc(100vh - 73px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: deep }}>
        <span style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.12em', color: gold }}>Connecting to War Room...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: 'calc(100vh - 73px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: deep, padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: cinzel, fontSize: '13px', color: gold, marginBottom: '8px' }}>Connection error</div>
          <p style={{ fontFamily: crimson, fontSize: '14px', color: textDim, fontStyle: 'italic', marginBottom: '12px' }}>{error}</p>
          <p style={{ fontFamily: cinzel, fontSize: '9px', color: muted, letterSpacing: '0.06em' }}>Required: STREAM_API_KEY · STREAM_API_SECRET · CLERK_SECRET_KEY</p>
        </div>
      </div>
    )
  }

  const activeChannel = CHANNELS.find(ch => ch.id === activeChannelId)

  return (
    <div style={{ height: 'calc(100vh - 73px)', display: 'grid', gridTemplateColumns: '240px 1fr', background: deep, overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <div style={{ borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column', background: surface, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: `1px solid ${border}` }}>
          <div style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.18em', color: gold, marginBottom: '2px' }}>WAR ROOM</div>
          <div style={{ fontFamily: cinzel, fontSize: '7px', letterSpacing: '0.2em', color: muted }}>INTEL COMMUNITY</div>
          <div style={{ marginTop: '8px', fontFamily: cinzel, fontSize: '7px', letterSpacing: '0.1em', color: muted, padding: '2px 8px', background: 'rgba(201,168,76,0.08)', border: `1px solid rgba(201,168,76,0.2)`, borderRadius: '2px', display: 'inline-block' }}>
            {tier.toUpperCase()}
          </div>
        </div>

        {/* Channel list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          <div style={{ padding: '8px 16px 4px', fontFamily: cinzel, fontSize: '7px', letterSpacing: '0.22em', color: muted }}>CHANNELS</div>

          {allowedChannels.map(ch => {
            const active = ch.id === activeChannelId
            return (
              <button key={ch.id} onClick={() => setActiveChannelId(ch.id)}
                style={{
                  width: '100%', padding: '9px 16px', background: 'none', border: 'none',
                  borderLeft: active ? `2px solid ${gold}` : '2px solid transparent',
                  textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                  background: active ? 'rgba(201,168,76,0.1)' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(201,168,76,0.05)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>{ch.icon}</span>
                <span style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.08em', color: active ? gold : textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ch.name}
                </span>
              </button>
            )
          })}

          {lockedChannels.length > 0 && (
            <>
              <div style={{ padding: '12px 16px 4px', fontFamily: cinzel, fontSize: '7px', letterSpacing: '0.22em', color: muted }}>LOCKED</div>
              {lockedChannels.map(ch => (
                <div key={ch.id} style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.35, borderLeft: '2px solid transparent' }}>
                  <span style={{ fontSize: '14px' }}>🔒</span>
                  <span style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.08em', color: textDim }}>{ch.name}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* User footer */}
        {userId && (
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {user?.imageUrl && (
              <img src={user.imageUrl} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
            )}
            <span style={{ fontFamily: cinzel, fontSize: '8px', letterSpacing: '0.06em', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.firstName || userId.slice(0, 12)}
            </span>
          </div>
        )}
      </div>

      {/* ── Main chat area ── */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: deep }}>
        {/* Channel header */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '10px', background: surface, flexShrink: 0 }}>
          <span style={{ fontSize: '16px' }}>{activeChannel?.icon}</span>
          <span style={{ fontFamily: cinzel, fontSize: '12px', letterSpacing: '0.1em', color: gold }}>{activeChannel?.name}</span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: '60px', color: muted, fontFamily: crimson, fontSize: '15px', fontStyle: 'italic' }}>
              No messages yet. Be the first to speak.
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: `1px solid rgba(201,168,76,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                {msg.user?.image
                  ? <img src={msg.user.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontFamily: cinzel, fontSize: '10px', color: gold }}>{(msg.user?.name || msg.user?.id || '?')[0].toUpperCase()}</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.08em', color: msg.user?.id === userId ? gold : textDim }}>
                    {msg.user?.name || msg.user?.id || 'Warrior'}
                  </span>
                  <span style={{ fontFamily: crimson, fontSize: '11px', color: muted }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ fontFamily: crimson, fontSize: '15px', color: 'var(--text)', lineHeight: 1.6, wordBreak: 'break-word' }}>
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <form onSubmit={handleSend} style={{ padding: '12px 20px', borderTop: `1px solid ${border}`, background: surface2, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder={`Message ${activeChannel?.name || ''}...`}
              style={{ flex: 1, background: deep, border: `1px solid ${border}`, borderRadius: '4px', padding: '10px 14px', fontFamily: crimson, fontSize: '15px', color: 'var(--text)', outline: 'none' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.45)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.18)')}
            />
            <button type="submit" disabled={sending || !newMessage.trim()}
              style={{ padding: '10px 18px', background: sending || !newMessage.trim() ? 'rgba(201,168,76,0.3)' : gold, color: deep, border: 'none', borderRadius: '4px', fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.1em', cursor: sending || !newMessage.trim() ? 'default' : 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
              {sending ? '...' : 'Send ⚔'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
