import { createFileRoute } from '@tanstack/react-router'
import { useAuth, useUser, SignInButton } from '@clerk/tanstack-start'
import { useState, useEffect, useRef, useCallback } from 'react'

export const Route = createFileRoute('/community')({
  ssr: false,
  component: CommunityPage,
})

// Theme-invariant tokens
const G      = '#C9A84C'
const AMBER  = '#d4903a'
const BR2    = 'rgba(201,168,76,0.35)'
const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

// CSS variable references for inline styles — browser resolves at paint time
const V = {
  bg:   'var(--wri-bg)',
  surf: 'var(--wri-surface)',
  s2:   'var(--wri-surface2)',
  bdr:  'var(--wri-border)',
  txt:  'var(--wri-text)',
  dim:  'var(--wri-dim)',
  mut:  'var(--wri-muted)',
}

const THEME_CSS = `
:root {
  --wri-bg: #0e0c09;
  --wri-surface: #161310;
  --wri-surface2: #1e1a14;
  --wri-border: rgba(201,168,76,0.18);
  --wri-text: #e8e0d0;
  --wri-dim: rgba(232,224,208,0.65);
  --wri-muted: rgba(232,224,208,0.38);
}
:root[data-theme="light"] {
  --wri-bg: #f5f0e8;
  --wri-surface: #ffffff;
  --wri-surface2: #f0ebe0;
  --wri-border: rgba(140,110,40,0.2);
  --wri-text: #1a1508;
  --wri-dim: rgba(26,21,8,0.55);
  --wri-muted: rgba(26,21,8,0.38);
}
`

// ── TIER BADGE ─────────────────────────────────────────────
function TierBadge({ tier }: { tier: string }) {
  const s: Record<string, React.CSSProperties> = {
    Free:      { color: '#c8bfa8', border: '1px solid rgba(200,191,168,0.25)' },
    Soldier:   { color: G,         border: `1px solid ${BR2}` },
    Commander: { color: AMBER,     border: '1px solid rgba(212,144,58,0.5)' },
    General:   { color: G,         border: `1px solid ${G}`, fontWeight: 700 },
  }
  return (
    <span style={{ ...(s[tier] || s.Free), fontFamily: cinzel, fontSize: 7, letterSpacing: '0.1em', padding: '1px 6px', borderRadius: 10, whiteSpace: 'nowrap' }}>
      {tier.toUpperCase()}
    </span>
  )
}

// ── STREAM HELPER ──────────────────────────────────────────
function streamFetch(path: string, method: string, token: string, apiKey: string, body?: object) {
  return fetch(`https://chat.stream-io-api.com${path}?api_key=${apiKey}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: token, 'Stream-Auth-Type': 'jwt' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).then(r => r.json())
}

interface StreamMsg {
  id: string
  text: string
  user: { id: string; name?: string; image?: string }
  created_at: string
}

// ── SIGN-IN GATE ───────────────────────────────────────────
function SignInGate() {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0c09' }}>
      <div style={{ background: '#161310', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 8, padding: '3rem 2.5rem', maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚔</div>
        <h2 style={{ fontFamily: cinzel, fontSize: 18, color: G, letterSpacing: '0.1em', marginBottom: 12 }}>War Room Community</h2>
        <p style={{ fontFamily: crimson, fontSize: 16, color: 'rgba(232,224,208,0.65)', fontStyle: 'italic', lineHeight: 1.7, marginBottom: 28 }}>
          Sign in to access the live community — a space for deliverance warriors.
        </p>
        <SignInButton mode="modal">
          <button style={{ width: '100%', padding: 13, background: G, color: '#0e0c09', border: 'none', borderRadius: 4, fontFamily: cinzel, fontSize: 11, letterSpacing: '0.12em', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase' }}>
            Sign In ⚔
          </button>
        </SignInButton>
      </div>
    </div>
  )
}

// ── MAIN PAGE ──────────────────────────────────────────────
function CommunityPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()

  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (typeof localStorage !== 'undefined' ? (localStorage.getItem('wri-theme') || 'dark') : 'dark') as 'dark' | 'light'
  )
  const [activeSection, setActiveSection] = useState('war-room')
  const [streamToken, setStreamToken]     = useState<string | null>(null)
  const [apiKey, setApiKey]               = useState<string | null>(null)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)

  const [posts, setPosts]             = useState<StreamMsg[]>([])
  const [draft, setDraft]             = useState('')
  const [sending, setSending]         = useState(false)
  const [prayers, setPrayers]         = useState<StreamMsg[]>([])
  const [prayerDraft, setPrayerDraft] = useState('')

  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const tier     = (user?.publicMetadata?.tier as string) || 'Free'
  const initials = ((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')).toUpperCase() || 'W'

  // Inject CSS variable definitions once
  useEffect(() => {
    if (!document.getElementById('wri-theme-vars')) {
      const style = document.createElement('style')
      style.id = 'wri-theme-vars'
      style.textContent = THEME_CSS
      document.head.appendChild(style)
    }
    return () => { document.getElementById('wri-theme-vars')?.remove() }
  }, [])

  // Sync theme attribute + localStorage
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('wri-theme', theme)
  }, [theme])

  // Hide site nav and AI chatbot; lock scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const nav     = document.querySelector('nav') as HTMLElement | null
    const chatBtn = document.querySelector('[aria-label="Open AI assistant"]') as HTMLElement | null
    if (nav) nav.style.display = 'none'
    if (chatBtn) chatBtn.style.display = 'none'
    return () => {
      document.body.style.overflow = ''
      if (nav) nav.style.display = ''
      if (chatBtn) chatBtn.style.display = ''
    }
  }, [])

  // Fetch Stream token
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let alive = true
    getToken().then(jwt => {
      if (!jwt) return
      fetch('/api/stream-token', { headers: { Authorization: `Bearer ${jwt}` } })
        .then(r => r.json())
        .then(d => {
          if (!alive) return
          if (d.error) { setError(d.error); setLoading(false); return }
          setStreamToken(d.token)
          setApiKey(d.apiKey)
          setLoading(false)
        })
        .catch(e => { if (alive) { setError(e.message); setLoading(false) } })
    })
    return () => { alive = false }
  }, [isLoaded, isSignedIn])

  const fetchPosts = useCallback(async () => {
    if (!streamToken || !apiKey) return
    try {
      const d = await streamFetch('/channels/messaging/war-room-general/query', 'POST', streamToken, apiKey, { state: true, messages: { limit: 50 } })
      if (d.messages) setPosts(d.messages)
    } catch {}
  }, [streamToken, apiKey])

  const fetchPrayers = useCallback(async () => {
    if (!streamToken || !apiKey) return
    try {
      const d = await streamFetch('/channels/messaging/prayer-wall-requests/query', 'POST', streamToken, apiKey, { state: true, messages: { limit: 20 } })
      if (d.messages) setPrayers(d.messages)
    } catch {}
  }, [streamToken, apiKey])

  useEffect(() => {
    if (!streamToken || !apiKey) return
    fetchPosts()
    fetchPrayers()
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => { fetchPosts(); fetchPrayers() }, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [streamToken, apiKey, fetchPosts, fetchPrayers])

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [posts])

  async function sendPost() {
    if (!draft.trim() || !streamToken || !apiKey || sending) return
    setSending(true)
    try {
      await streamFetch('/channels/messaging/war-room-general/message', 'POST', streamToken, apiKey, { message: { text: draft.trim() } })
      setDraft('')
      await fetchPosts()
    } finally { setSending(false) }
  }

  async function sendPrayer() {
    if (!prayerDraft.trim() || !streamToken || !apiKey) return
    await streamFetch('/channels/messaging/prayer-wall-requests/message', 'POST', streamToken, apiKey, { message: { text: prayerDraft.trim() } })
    setPrayerDraft('')
    await fetchPrayers()
  }

  if (!isLoaded || loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0c09' }}>
      <span style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.12em', color: G }}>Connecting to War Room...</span>
    </div>
  )
  if (!isSignedIn) return <SignInGate />
  if (error) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0c09', padding: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: cinzel, fontSize: 13, color: G, marginBottom: 8 }}>Connection error</div>
        <p style={{ fontFamily: crimson, fontSize: 14, color: 'rgba(232,224,208,0.65)', fontStyle: 'italic' }}>{error}</p>
      </div>
    </div>
  )

  // ── NAV HELPERS ────────────────────────────────────────────
  const sectionLabel = (label: string) => (
    <div style={{ padding: '14px 16px 4px', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.25em', color: 'rgba(201,168,76,0.6)' }}>
      {label}
    </div>
  )

  const NAV_DEFAULT = '#c8bfa8'

  const navItem = (label: string, section: string, icon?: string) => {
    const active = activeSection === section
    return (
      <button
        onClick={() => setActiveSection(section)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '7px 16px',
          background: active ? 'rgba(201,168,76,0.08)' : 'transparent',
          border: 'none', borderLeft: `2px solid ${active ? G : 'transparent'}`,
          textAlign: 'left', cursor: 'pointer',
          fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em',
          color: active ? G : NAV_DEFAULT,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(201,168,76,0.04)'; e.currentTarget.style.color = G } }}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = NAV_DEFAULT } }}
      >
        {icon && <span style={{ fontSize: 13, width: 18, flexShrink: 0 }}>{icon}</span>}
        {label}
      </button>
    )
  }

  const externalItem = (label: string, href: string, icon?: string) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '7px 16px',
        background: 'transparent', textDecoration: 'none',
        borderLeft: '2px solid transparent',
        fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em',
        color: NAV_DEFAULT, transition: 'color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = G }}
      onMouseLeave={e => { e.currentTarget.style.color = NAV_DEFAULT }}
    >
      {icon && <span style={{ fontSize: 13, width: 18, flexShrink: 0 }}>{icon}</span>}
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ fontSize: 9, opacity: 0.5 }}>↗</span>
    </a>
  )

  const dimItem = (label: string, icon?: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderLeft: '2px solid transparent', cursor: 'default' }}>
      {icon && <span style={{ fontSize: 13, width: 18, opacity: 0.4 }}>{icon}</span>}
      <span style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em', color: 'rgba(201,168,76,0.3)', flex: 1 }}>{label}</span>
      <span style={{ fontFamily: cinzel, fontSize: 7, color: 'rgba(201,168,76,0.3)', border: '1px solid rgba(201,168,76,0.2)', padding: '1px 5px', borderRadius: 8 }}>SOON</span>
    </div>
  )

  // ── POST CARD ──────────────────────────────────────────────
  const PostCard = ({ msg, pinned }: { msg: StreamMsg; pinned?: boolean }) => {
    const initial = (msg.user?.name || msg.user?.id || '?')[0].toUpperCase()
    const time    = new Date(msg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
    return (
      <div style={{ background: V.surf, border: `1px solid ${V.bdr}`, borderRadius: 6, padding: 16, marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: `1px solid ${V.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 12, color: G, flexShrink: 0, overflow: 'hidden' }}>
            {msg.user?.image ? <img src={msg.user.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', color: V.txt }}>{msg.user?.name || msg.user?.id || 'Warrior'}</span>
              {pinned && <span style={{ fontFamily: cinzel, fontSize: 7, color: G, border: `1px solid ${BR2}`, padding: '1px 6px', borderRadius: 8 }}>HOST</span>}
              <span style={{ fontFamily: crimson, fontSize: 11, color: V.mut }}>{time}</span>
            </div>
            <p style={{ fontFamily: crimson, fontSize: 15, color: V.txt, lineHeight: 1.7, margin: 0, wordBreak: 'break-word' }}>{msg.text}</p>
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              {[['🙏', Math.floor(Math.random() * 20) + 1], ['💬', Math.floor(Math.random() * 8)], ['🔥', Math.floor(Math.random() * 12)]].map(([icon, count]) => (
                <button key={String(icon)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: crimson, fontSize: 12, color: V.mut, padding: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = G)}
                  onMouseLeave={e => (e.currentTarget.style.color = V.mut)}>
                  {icon} {count}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const PINNED: StreamMsg = {
    id: 'pinned',
    text: 'Welcome to War Room Intel. Whether you are fighting for your own freedom or walking others into theirs — you are in the right place. Start by introducing yourself below.',
    user: { id: 'host', name: 'Pastor Justin Payne' },
    created_at: new Date().toISOString(),
  }

  // ── VIEWS ──────────────────────────────────────────────────
  const WarRoomView = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${V.bdr}`, background: V.surf, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontFamily: cinzel, fontSize: 14, color: G, letterSpacing: '0.1em' }}>⚔ The War Room</span>
        <button style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: '#0e0c09', background: G, border: 'none', borderRadius: 3, padding: '5px 12px', cursor: 'pointer' }}>+ New Post</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        <div style={{ background: V.surf, border: `1px dashed ${V.bdr}`, borderRadius: 6, padding: 14, marginBottom: 16, display: 'flex', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: `1px solid ${V.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 11, color: G, flexShrink: 0, overflow: 'hidden' }}>
            {user?.imageUrl ? <img src={user.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : initials}
          </div>
          <div style={{ flex: 1 }}>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) sendPost() }}
              placeholder="Share something with the War Room..."
              rows={2}
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: crimson, fontSize: 15, color: V.txt, resize: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={sendPost} disabled={sending || !draft.trim()}
                style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: '#0e0c09', background: sending || !draft.trim() ? 'rgba(201,168,76,0.3)' : G, border: 'none', borderRadius: 3, padding: '5px 14px', cursor: sending || !draft.trim() ? 'default' : 'pointer' }}>
                {sending ? '...' : 'Post ⚔'}
              </button>
            </div>
          </div>
        </div>
        <PostCard msg={PINNED} pinned />
        {posts.map(m => <PostCard key={m.id} msg={m} />)}
        <div ref={bottomRef} />
      </div>
    </div>
  )

  const PrayerView = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${V.bdr}`, background: V.surf, flexShrink: 0 }}>
        <span style={{ fontFamily: cinzel, fontSize: 14, color: G, letterSpacing: '0.1em' }}>🙏 Prayer Wall</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {prayers.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 40, color: V.mut, fontFamily: crimson, fontSize: 15, fontStyle: 'italic' }}>
            No prayer requests yet. Be the first.
          </div>
        )}
        {prayers.map(m => <PostCard key={m.id} msg={m} />)}
      </div>
      <div style={{ padding: '12px 20px', borderTop: `1px solid ${V.bdr}`, background: V.s2, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={prayerDraft} onChange={e => setPrayerDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendPrayer() }}
            placeholder="Add a prayer request..."
            style={{ flex: 1, background: V.bg, border: `1px solid ${V.bdr}`, borderRadius: 4, padding: '9px 14px', fontFamily: crimson, fontSize: 14, color: V.txt, outline: 'none' }} />
          <button onClick={sendPrayer} disabled={!prayerDraft.trim()}
            style={{ fontFamily: cinzel, fontSize: 9, padding: '9px 14px', background: prayerDraft.trim() ? G : 'rgba(201,168,76,0.3)', color: '#0e0c09', border: 'none', borderRadius: 4, cursor: prayerDraft.trim() ? 'pointer' : 'default' }}>
            🙏 Post
          </button>
        </div>
      </div>
    </div>
  )

  const PlaceholderView = ({ title, icon }: { title: string; icon: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontFamily: cinzel, fontSize: 13, letterSpacing: '0.1em', color: G, marginBottom: 8 }}>{title}</div>
      <div style={{ fontFamily: crimson, fontSize: 14, fontStyle: 'italic', color: V.mut }}>Coming soon</div>
    </div>
  )

  const LauncherView = ({ title, icon, href }: { title: string; icon: string; href: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <img src="/logo.png" alt="WRI" style={{ width: 52, height: 52, objectFit: 'contain', marginBottom: 20, opacity: 0.7 }} />
      <div style={{ fontFamily: cinzel, fontSize: 15, letterSpacing: '0.15em', color: G, marginBottom: 10 }}>{icon} {title}</div>
      <div style={{ fontFamily: crimson, fontSize: 15, fontStyle: 'italic', color: V.dim, marginBottom: 28 }}>
        This section opens as a full page
      </div>
      <button
        onClick={() => window.open(href, '_blank')}
        style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', color: '#0e0c09', background: G, border: 'none', borderRadius: 4, padding: '11px 28px', cursor: 'pointer' }}
      >
        Open Full Page →
      </button>
    </div>
  )

  // ── FULL LAYOUT ────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', display: 'grid', gridTemplateColumns: '260px 1fr 280px', background: V.bg, overflow: 'hidden' }}>

      {/* ── LEFT SIDEBAR ── */}
      <div style={{ display: 'flex', flexDirection: 'column', background: V.surf, borderRight: `1px solid ${V.bdr}`, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px', borderBottom: `1px solid ${V.bdr}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/logo.png" alt="WRI" style={{ width: 32, height: 32, objectFit: 'contain' }} />
              <div>
                <div style={{ fontFamily: cinzel, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: G }}>WAR ROOM</div>
                <div style={{ fontFamily: cinzel, fontSize: 7, letterSpacing: '0.2em', color: 'rgba(201,168,76,0.5)' }}>INTELLIGENCE CENTER</div>
              </div>
            </div>
            {/* Light/dark toggle */}
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '3px 5px', borderRadius: 4, lineHeight: 1, flexShrink: 0 }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>

          {/* User row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(201,168,76,0.06)', borderRadius: 4, border: `1px solid ${V.bdr}` }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: `1px solid ${V.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 10, color: G, flexShrink: 0, overflow: 'hidden' }}>
              {user?.imageUrl ? <img src={user.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', color: V.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.firstName} {user?.lastName}
              </div>
            </div>
            <TierBadge tier={tier} />
          </div>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {sectionLabel('COMMUNITY')}
          {navItem('The War Room', 'war-room', '⚔')}
          {navItem('Prayer Wall', 'prayer-wall', '🙏')}
          {navItem('Messages', 'messages', '💬')}
          {navItem('Members', 'members', '👥')}

          {sectionLabel('INTELLIGENCE')}
          {navItem('Demon Database', 'database', '📖')}
          {dimItem('Weekly Intel', '📡')}
          {navItem('Scripture Arsenal', 'arsenal', '✦')}

          {sectionLabel('TRAINING')}
          {navItem('Resources', 'resources', '📚')}
          {dimItem('Courses', '🎓')}
          {dimItem('Protocols', '🗡')}
          {dimItem("General's Table", '✦')}

          {sectionLabel('TOOLS')}
          {navItem('Assessment', 'assessment', '📋')}
          {navItem('Request Help', 'help', '🙏')}
          {dimItem('Events', '📅')}
          {externalItem('Settings', 'https://accounts.warroomintel.com/user', '⚙')}
        </div>
      </div>

      {/* ── CENTER ── */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: V.bg }}>
        {activeSection === 'war-room'    && <WarRoomView />}
        {activeSection === 'prayer-wall' && <PrayerView />}
        {activeSection === 'messages'    && <PlaceholderView title="Messages" icon="💬" />}
        {activeSection === 'members'     && <PlaceholderView title="Members" icon="👥" />}
        {activeSection === 'database'    && <LauncherView title="Demon Database"    icon="📖" href="/database" />}
        {activeSection === 'arsenal'     && <LauncherView title="Scripture Arsenal" icon="✦"  href="/arsenal" />}
        {activeSection === 'resources'   && <LauncherView title="Resources"         icon="📚" href="/resources" />}
        {activeSection === 'assessment'  && <LauncherView title="Assessment"        icon="📋" href="/assessment" />}
        {activeSection === 'help'        && <LauncherView title="Request Help"      icon="🙏" href="/help" />}
      </div>

      {/* ── RIGHT SIDEBAR ── */}
      <div style={{ display: 'flex', flexDirection: 'column', background: V.surf, borderLeft: `1px solid ${V.bdr}`, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 16px' }}>

          {/* Prayer Wall widget */}
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${V.bdr}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <span style={{ color: G }}>🙏</span>
              <span style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.2em', color: G }}>PRAYER WALL</span>
            </div>
            {prayers.slice(-3).reverse().map(p => (
              <div key={p.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${V.bdr}` }}>
                <div style={{ fontFamily: cinzel, fontSize: 8, color: '#c8bfa8', marginBottom: 4 }}>
                  {(p.user?.name || p.user?.id || 'Warrior').split(' ')[0]}
                </div>
                <div style={{ fontFamily: crimson, fontSize: 13, color: '#c8bfa8', lineHeight: 1.5 }}>
                  {p.text.length > 90 ? p.text.slice(0, 90) + '…' : p.text}
                </div>
              </div>
            ))}
            {prayers.length === 0 && (
              <div style={{ fontFamily: crimson, fontSize: 13, color: V.mut, fontStyle: 'italic' }}>No requests yet</div>
            )}
            <button onClick={() => setActiveSection('prayer-wall')}
              style={{ width: '100%', marginTop: 8, padding: '6px', background: 'transparent', border: `1px solid ${V.bdr}`, borderRadius: 3, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', color: G, cursor: 'pointer' }}>
              + Add Prayer Request
            </button>
          </div>

          {/* Upcoming Calls */}
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${V.bdr}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <span style={{ color: G }}>📅</span>
              <span style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.2em', color: G }}>UPCOMING CALLS</span>
            </div>
            {[
              { title: 'Group Warfare Prayer', date: 'Sat Jun 7 · 7pm CT', badge: 'Soldier' },
              { title: "General's Table",      date: 'Wed Jun 4 · 8pm CT', badge: 'General' },
            ].map(ev => (
              <div key={ev.title} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${V.bdr}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', color: '#c8bfa8' }}>{ev.title}</span>
                  <TierBadge tier={ev.badge} />
                </div>
                <div style={{ fontFamily: crimson, fontSize: 12, color: V.mut }}>{ev.date}</div>
              </div>
            ))}
          </div>

          {/* Active Warriors */}
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <span style={{ color: '#4caf50', fontSize: 8 }}>●</span>
              <span style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.2em', color: G }}>ACTIVE WARRIORS</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: `1px solid ${V.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 10, color: G, overflow: 'hidden' }}>
                  {user?.imageUrl ? <img src={user.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : initials}
                </div>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: '#4caf50', border: `2px solid ${V.surf}` }} />
              </div>
              <div>
                <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em', color: '#c8bfa8' }}>{user?.firstName || 'You'}</div>
                <TierBadge tier={tier} />
              </div>
            </div>
            <div style={{ fontFamily: crimson, fontSize: 12, color: V.mut, fontStyle: 'italic', marginTop: 8 }}>
              More warriors coming online...
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
