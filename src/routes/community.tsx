import { createFileRoute } from '@tanstack/react-router'
import { useAuth, useUser, SignInButton, SignedIn, SignedOut } from '@clerk/tanstack-start'
import { useState, useEffect, useRef, useCallback } from 'react'

export const Route = createFileRoute('/community')({
  ssr: false,
  component: CommunityPage,
})

// ── CONSTANTS ─────────────────────────────────────────────
const G = '#C9A84C'       // gold
const BG = '#0e0c09'      // background
const S1 = '#161310'      // surface
const S2 = '#1e1a14'      // surface2
const BR = 'rgba(201,168,76,0.18)'  // border
const BR2 = 'rgba(201,168,76,0.35)' // border bright
const TXT = '#e8e0d0'
const DIM = 'rgba(232,224,208,0.65)'
const MUT = 'rgba(232,224,208,0.38)'
const cinzel = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

const TIER_ORDER: Record<string, number> = { Free: 0, Soldier: 1, Commander: 2, General: 3 }

const CHANNELS = [
  { id: 'war-room-general',       name: 'The War Room',           icon: '⚔', minTier: 'Free' },
  { id: 'intelligence-briefings', name: 'Intelligence Briefings', icon: '📋', minTier: 'Soldier' },
  { id: 'ministry-operations',    name: 'Ministry Operations',    icon: '🗡', minTier: 'Commander' },
  { id: 'generals-table',         name: "General's Table",        icon: '✦', minTier: 'General' },
]

interface Msg { id: string; text: string; user: { id: string; name?: string; image?: string }; created_at: string }

// ── STREAM REST HELPER ────────────────────────────────────
function streamFetch(path: string, method: string, token: string, apiKey: string, body?: object) {
  return fetch(`https://chat.stream-io-api.com${path}?api_key=${apiKey}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': token, 'Stream-Auth-Type': 'jwt' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).then(r => r.json())
}

// ── SIGN-IN GATE ──────────────────────────────────────────
function SignInGate() {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
      <div style={{ background: S1, border: `1px solid ${BR}`, borderRadius: 8, padding: '3rem 2.5rem', maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚔</div>
        <h2 style={{ fontFamily: cinzel, fontSize: 18, color: G, letterSpacing: '0.1em', marginBottom: 12 }}>War Room Community</h2>
        <p style={{ fontFamily: crimson, fontSize: 16, color: DIM, fontStyle: 'italic', lineHeight: 1.7, marginBottom: 28 }}>
          Sign in to access the live community — a space for deliverance warriors.
        </p>
        <SignInButton mode="modal">
          <button style={{ width: '100%', padding: 13, background: G, color: BG, border: 'none', borderRadius: 4, fontFamily: cinzel, fontSize: 11, letterSpacing: '0.12em', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase' }}>
            Sign In ⚔
          </button>
        </SignInButton>
      </div>
    </div>
  )
}

// ── COMMUNITY PAGE ────────────────────────────────────────
function CommunityPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()

  const [streamToken, setStreamToken] = useState<string | null>(null)
  const [apiKey, setApiKey]           = useState<string | null>(null)
  const [activeId, setActiveId]       = useState('war-room-general')
  const [messages, setMessages]       = useState<Msg[]>([])
  const [draft, setDraft]             = useState('')
  const [sending, setSending]         = useState(false)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  const tier      = (user?.publicMetadata?.tier as string) || 'Free'
  const tierRank  = TIER_ORDER[tier] ?? 0
  const allowed   = CHANNELS.filter(c => tierRank >= (TIER_ORDER[c.minTier] ?? 0))
  const locked    = CHANNELS.filter(c => tierRank < (TIER_ORDER[c.minTier] ?? 0))
  const active    = CHANNELS.find(c => c.id === activeId)!

  // ── Fetch Stream token ────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let alive = true
    async function init() {
      try {
        const jwt = await getToken()
        const res = await fetch('/api/stream-token', { headers: { Authorization: `Bearer ${jwt}` } })
        const d = await res.json()
        if (d.error) throw new Error(d.error)
        if (alive) { setStreamToken(d.token); setApiKey(d.apiKey); setLoading(false) }
      } catch (e: any) { if (alive) { setError(e.message); setLoading(false) } }
    }
    init()
    return () => { alive = false }
  }, [isLoaded, isSignedIn])

  // ── Poll messages ─────────────────────────────────────
  const fetchMessages = useCallback(async (channelId: string) => {
    if (!streamToken || !apiKey) return
    try {
      const d = await streamFetch(`/channels/messaging/${channelId}/query`, 'POST', streamToken, apiKey, { state: true, messages: { limit: 50 } })
      if (d.messages) {
        setMessages(d.messages)
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
    } catch {}
  }, [streamToken, apiKey])

  useEffect(() => {
    if (!streamToken || !apiKey) return
    fetchMessages(activeId)
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => fetchMessages(activeId), 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeId, streamToken, apiKey, fetchMessages])

  // ── Send message ──────────────────────────────────────
  async function send() {
    if (!draft.trim() || !streamToken || !apiKey || sending) return
    setSending(true)
    try {
      await streamFetch(`/channels/messaging/${activeId}/message`, 'POST', streamToken, apiKey, { message: { text: draft.trim() } })
      setDraft('')
      await fetchMessages(activeId)
    } finally { setSending(false); inputRef.current?.focus() }
  }

  // ── States ────────────────────────────────────────────
  if (!isLoaded || loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
      <span style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.12em', color: G }}>Connecting to War Room...</span>
    </div>
  )

  if (!isSignedIn) return <SignInGate />

  if (error) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, padding: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: cinzel, fontSize: 13, color: G, marginBottom: 8 }}>Connection error</div>
        <p style={{ fontFamily: crimson, fontSize: 14, color: DIM, fontStyle: 'italic', marginBottom: 12 }}>{error}</p>
        <p style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.06em' }}>Ensure STREAM_API_KEY · STREAM_API_SECRET · CLERK_SECRET_KEY are set in Netlify.</p>
      </div>
    </div>
  )

  // ── Layout ────────────────────────────────────────────
  return (
    <div style={{ height: 'calc(100vh - 73px)', display: 'grid', gridTemplateColumns: '220px 1fr', background: BG, overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <div style={{ display: 'flex', flexDirection: 'column', background: S1, borderRight: `1px solid ${BR}`, overflow: 'hidden' }}>

        {/* Sidebar header */}
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BR}`, flexShrink: 0 }}>
          <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.18em', color: G }}>WAR ROOM</div>
          <div style={{ fontFamily: cinzel, fontSize: 7, letterSpacing: '0.2em', color: MUT, marginBottom: 8 }}>INTEL COMMUNITY</div>
          <div style={{ display: 'inline-block', fontFamily: cinzel, fontSize: 7, letterSpacing: '0.1em', color: MUT, padding: '2px 8px', background: 'rgba(201,168,76,0.08)', border: `1px solid rgba(201,168,76,0.2)`, borderRadius: 2 }}>
            {tier.toUpperCase()}
          </div>
        </div>

        {/* Channel list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          <div style={{ padding: '8px 16px 4px', fontFamily: cinzel, fontSize: 7, letterSpacing: '0.22em', color: MUT }}>CHANNELS</div>
          {allowed.map(ch => {
            const on = ch.id === activeId
            return (
              <button key={ch.id} onClick={() => setActiveId(ch.id)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '8px 16px',
                background: on ? 'rgba(201,168,76,0.1)' : 'transparent',
                border: 'none', borderLeft: `2px solid ${on ? G : 'transparent'}`,
                textAlign: 'left', cursor: 'pointer', transition: 'background 0.15s',
                fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em',
                color: on ? G : DIM,
              }}
                onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'rgba(201,168,76,0.05)' }}
                onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent' }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>{ch.icon}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</span>
              </button>
            )
          })}

          {locked.length > 0 && (
            <>
              <div style={{ padding: '10px 16px 4px', fontFamily: cinzel, fontSize: 7, letterSpacing: '0.22em', color: MUT, marginTop: 8 }}>LOCKED</div>
              {locked.map(ch => (
                <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', opacity: 0.35, borderLeft: '2px solid transparent' }}>
                  <span style={{ fontSize: 12 }}>🔒</span>
                  <span style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: DIM }}>{ch.name}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Sidebar footer — user info */}
        <div style={{ padding: '10px 12px', borderTop: `1px solid ${BR}`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          {user?.imageUrl
            ? <img src={user.imageUrl} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            : <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: `1px solid ${BR}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: cinzel, fontSize: 10, color: G }}>
                {(user?.firstName || 'W')[0].toUpperCase()}
              </div>
          }
          <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em', color: MUT, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.firstName || 'Warrior'}
          </span>
        </div>
      </div>

      {/* ── Main chat ── */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Channel header */}
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${BR}`, background: S1, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 16 }}>{active.icon}</span>
          <span style={{ fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em', color: G }}>{active.name}</span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: 60, color: MUT, fontFamily: crimson, fontSize: 15, fontStyle: 'italic' }}>
              No messages yet. Be the first to speak.
            </div>
          )}
          {messages.map(m => {
            const isMe = m.user?.id === user?.id
            const initial = (m.user?.name || m.user?.id || '?')[0].toUpperCase()
            const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            return (
              <div key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'rgba(201,168,76,0.12)', border: `1px solid rgba(201,168,76,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 10, color: G }}>
                  {m.user?.image ? <img src={m.user.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: isMe ? G : DIM }}>
                      {m.user?.name || m.user?.id || 'Warrior'}
                    </span>
                    <span style={{ fontFamily: crimson, fontSize: 11, color: MUT }}>{time}</span>
                  </div>
                  <div style={{ fontFamily: crimson, fontSize: 15, color: TXT, lineHeight: 1.6, wordBreak: 'break-word' }}>{m.text}</div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <form onSubmit={e => { e.preventDefault(); send() }} style={{ padding: '12px 20px', borderTop: `1px solid ${BR}`, background: S2, display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={`Message ${active.name}...`}
            style={{ flex: 1, background: BG, border: `1px solid ${BR}`, borderRadius: 4, padding: '10px 14px', fontFamily: crimson, fontSize: 15, color: TXT, outline: 'none', transition: 'border-color 0.2s' }}
            onFocus={e => (e.currentTarget.style.borderColor = BR2)}
            onBlur={e => (e.currentTarget.style.borderColor = BR)}
          />
          <button type="submit" disabled={sending || !draft.trim()} style={{
            padding: '10px 18px', background: sending || !draft.trim() ? 'rgba(201,168,76,0.3)' : G,
            color: BG, border: 'none', borderRadius: 4, fontFamily: cinzel, fontSize: 10,
            letterSpacing: '0.1em', cursor: sending || !draft.trim() ? 'default' : 'pointer',
            transition: 'background 0.2s', flexShrink: 0,
          }}>
            {sending ? '...' : 'Send ⚔'}
          </button>
        </form>
      </div>
    </div>
  )
}
