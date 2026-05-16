import { createFileRoute } from '@tanstack/react-router'
import { useAuth, useUser, SignOutButton } from '@clerk/tanstack-start'
import { useState, useEffect, useRef, useCallback } from 'react'

export const Route = createFileRoute('/community')({
  ssr: false,
  component: CommunityPage,
})

const G      = '#C9A84C'
const AMBER  = '#d4903a'
const BR2    = 'rgba(201,168,76,0.35)'
const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

const V = {
  bg:   'var(--wri-bg)',
  surf: 'var(--wri-surface)',
  s2:   'var(--wri-surface2)',
  bdr:  'var(--wri-border)',
  txt:  'var(--wri-text)',
  dim:  'var(--wri-dim)',
  mut:  'var(--wri-muted)',
  card: 'var(--wri-card)',
  gold: 'var(--wri-gold)',
}

const THEME_CSS = `
.prayer-hover-item:hover .prayer-callout {
  opacity: 1 !important;
  transform: translateX(0) !important;
  pointer-events: auto !important;
}
:root {
  --wri-bg: #0e0c09;
  --wri-surface: #1c1814;
  --wri-surface2: #242018;
  --wri-border: rgba(201,168,76,0.25);
  --wri-text: #f0e8d8;
  --wri-dim: #c8b896;
  --wri-muted: #9a8c74;
  --wri-card: #201c16;
  --wri-gold: #C9A84C;
}
:root[data-theme="light"] {
  --wri-bg: #f0ebe0;
  --wri-surface: #faf7f2;
  --wri-surface2: #ede8dc;
  --wri-border: rgba(100,70,20,0.25);
  --wri-text: #1a1208;
  --wri-dim: #3d3020;
  --wri-muted: #6b5a40;
  --wri-card: #f5f0e8;
  --wri-gold: #8a6d20;
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
    <span style={{ ...(s[tier] || s.Free), fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', padding: '1px 6px', borderRadius: 10, whiteSpace: 'nowrap' }}>
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
  useEffect(() => {
    window.location.href =
      'https://accounts.warroomintel.com/sign-in?redirect_url=' +
      encodeURIComponent('https://warroomintel.com/community')
  }, [])
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0c09' }}>
      <span style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.12em', color: G }}>Redirecting to sign in...</span>
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
  const [isMobile, setIsMobile]       = useState(() => window.innerWidth < 768)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('war-room')

  const [streamToken, setStreamToken] = useState<string | null>(null)
  const [apiKey, setApiKey]           = useState<string | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  const [posts, setPosts]             = useState<StreamMsg[]>([])
  const [draft, setDraft]             = useState('')
  const [sending, setSending]         = useState(false)
  const [prayers, setPrayers]         = useState<StreamMsg[]>([])

  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const tier     = (user?.publicMetadata?.tier as string) || 'Free'
  const initials = ((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')).toUpperCase() || 'W'

  // Responsive breakpoint
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close sidebar when switching to desktop
  useEffect(() => { if (!isMobile) setSidebarOpen(false) }, [isMobile])

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
        <p style={{ fontFamily: crimson, fontSize: 14, color: 'rgba(221,213,192,0.65)', fontStyle: 'italic' }}>{error}</p>
      </div>
    </div>
  )

  // ── NAV HELPERS ────────────────────────────────────────────
  const sectionLabel = (label: string) => (
    <div style={{ padding: '14px 16px 4px', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.25em', color: V.gold }}>
      {label}
    </div>
  )

  const NAV_DEFAULT = V.txt

  const navItem = (label: string, section: string, icon?: string) => {
    const active = activeSection === section
    return (
      <button
        onClick={() => { setActiveSection(section); if (isMobile) setSidebarOpen(false) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '8px 16px',
          background: active ? 'rgba(201,168,76,0.1)' : 'transparent',
          border: 'none', borderLeft: `2px solid ${active ? G : 'transparent'}`,
          textAlign: 'left', cursor: 'pointer',
          fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em',
          color: active ? G : NAV_DEFAULT,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(201,168,76,0.05)'; e.currentTarget.style.color = G } }}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = NAV_DEFAULT } }}
      >
        {icon && <span style={{ fontSize: 14, width: 20, flexShrink: 0 }}>{icon}</span>}
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
        width: '100%', padding: '8px 16px',
        background: 'transparent', textDecoration: 'none',
        borderLeft: '2px solid transparent',
        fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em',
        color: NAV_DEFAULT, transition: 'color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = G }}
      onMouseLeave={e => { e.currentTarget.style.color = NAV_DEFAULT }}
    >
      {icon && <span style={{ fontSize: 14, width: 20, flexShrink: 0 }}>{icon}</span>}
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ fontSize: 10, opacity: 0.5 }}>↗</span>
    </a>
  )

  const dimItem = (label: string, icon?: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderLeft: '2px solid transparent', cursor: 'default' }}>
      {icon && <span style={{ fontSize: 14, width: 20, opacity: 0.5 }}>{icon}</span>}
      <span style={{ fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em', color: V.mut, flex: 1 }}>{label}</span>
      <span style={{ fontFamily: cinzel, fontSize: 8, color: V.mut, border: `1px solid ${V.bdr}`, padding: '1px 5px', borderRadius: 8 }}>SOON</span>
    </div>
  )

  // Hamburger button for mobile center headers
  const Hamburger = () => isMobile ? (
    <button
      onClick={() => setSidebarOpen(true)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: G, padding: '0 12px 0 0', lineHeight: 1, flexShrink: 0 }}
      aria-label="Open navigation"
    >
      ☰
    </button>
  ) : null

  // ── POST CARD ──────────────────────────────────────────────
  const PostCard = ({ msg, pinned }: { msg: StreamMsg; pinned?: boolean }) => {
    const initial = (msg.user?.name || msg.user?.id || '?')[0].toUpperCase()
    const time    = new Date(msg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
    return (
      <div style={{ background: V.card, border: `1px solid ${V.bdr}`, borderRadius: 6, padding: 20, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: `1px solid ${V.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 13, color: G, flexShrink: 0, overflow: 'hidden' }}>
            {msg.user?.image ? <img src={msg.user.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: cinzel, fontSize: 15, letterSpacing: '0.06em', color: V.txt }}>{msg.user?.name || msg.user?.id || 'Warrior'}</span>
              {pinned && <span style={{ fontFamily: cinzel, fontSize: 8, color: G, border: `1px solid ${BR2}`, padding: '1px 6px', borderRadius: 8 }}>HOST</span>}
              <span style={{ fontFamily: crimson, fontSize: 13, color: V.mut }}>{time}</span>
            </div>
            <p style={{ fontFamily: crimson, fontSize: 16, color: V.txt, lineHeight: 1.75, margin: 0, wordBreak: 'break-word' }}>{msg.text}</p>
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              {[['🙏', Math.floor(Math.random() * 20) + 1], ['💬', Math.floor(Math.random() * 8)], ['🔥', Math.floor(Math.random() * 12)]].map(([icon, count]) => (
                <button key={String(icon)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: crimson, fontSize: 14, color: V.mut, padding: 0 }}
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
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${V.bdr}`, background: V.surf, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <Hamburger />
        <span style={{ fontFamily: cinzel, fontSize: 14, color: G, letterSpacing: '0.1em', flex: 1 }}>⚔ The War Room</span>
        <button style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: '#0e0c09', background: G, border: 'none', borderRadius: 3, padding: '5px 12px', cursor: 'pointer' }}>+ New Post</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px 16px' : '16px 20px' }}>
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
              rows={isMobile ? 4 : 2}
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

  const PrayerView = () => {
    const [draft, setDraft] = useState('')

    async function handleSend() {
      if (!draft.trim() || !streamToken || !apiKey) return
      await streamFetch(
        '/channels/messaging/prayer-wall-requests/message',
        'POST', streamToken, apiKey,
        { message: { text: draft.trim() } }
      )
      setDraft('')
      await fetchPrayers()
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${V.bdr}`,
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(o => !o)}
            style={{ background: 'none', border: 'none', color: G,
              fontSize: 20, cursor: 'pointer', display: isMobile ? 'block' : 'none' }}>
            ☰
          </button>
          <span style={{ fontFamily: cinzel, fontSize: 18, color: G }}>
            🙏 Prayer Wall
          </span>
        </div>

        {/* Disclaimer banner */}
        <div style={{
          margin: '12px 20px 0',
          padding: '10px 14px',
          background: 'rgba(201,168,76,0.06)',
          border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: 8,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>⚠️</span>
          <p style={{ margin: 0, fontFamily: crimson, fontSize: 13, color: V.mut, lineHeight: 1.5 }}>
            <strong style={{ color: V.dim }}>Public wall.</strong>{' '}
            This section is visible to all visitors. Do not share personal contact information,
            addresses, or sensitive details. While this wall is monitored, posts from the community
            may appear before review. War Room Intel is not responsible for content submitted by users.
            Report concerns to{' '}
            <a href="mailto:exorcist@warroomintel.com" style={{ color: G, textDecoration: 'none' }}>
              exorcist@warroomintel.com
            </a>.
          </p>
        </div>

        {/* Message list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {prayers.length === 0 && (
            <div style={{ textAlign: 'center', color: V.mut, fontStyle: 'italic',
              marginTop: 60, fontFamily: crimson, fontSize: 17 }}>
              No prayer requests yet. Be the first.
            </div>
          )}
          {prayers.map(m => <PostCard key={m.id} msg={m} />)}
        </div>

        {/* Input bar */}
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${V.bdr}`,
          background: V.s2, flexShrink: 0,
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Add a prayer request..."
              style={{ flex: 1, background: V.bg, border: `1px solid ${V.bdr}`,
                borderRadius: 8, padding: '10px 14px', color: V.txt,
                fontFamily: crimson, fontSize: 16, outline: 'none' }}
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim()}
              style={{ background: draft.trim() ? G : 'rgba(201,168,76,0.3)',
                color: draft.trim() ? '#0D0B14' : V.mut,
                border: 'none', borderRadius: 8, padding: '10px 18px',
                fontFamily: cinzel, fontSize: 13, cursor: draft.trim() ? 'pointer' : 'default',
                fontWeight: 700, whiteSpace: 'nowrap' }}>
              🙏 Post
            </button>
          </div>
        </div>
      </div>
    )
  }

  const PlaceholderView = ({ title, icon }: { title: string; icon: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {isMobile && (
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${V.bdr}`, background: V.surf, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Hamburger />
          <span style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.1em' }}>{icon} {title}</span>
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {!isMobile && <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>}
        <div style={{ fontFamily: cinzel, fontSize: 13, letterSpacing: '0.1em', color: G, marginBottom: 8 }}>{title}</div>
        <div style={{ fontFamily: crimson, fontSize: 14, fontStyle: 'italic', color: V.mut }}>Coming soon</div>
      </div>
    </div>
  )

  const LauncherView = ({ title, icon, href }: { title: string; icon: string; href: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {isMobile && (
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${V.bdr}`, background: V.surf, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Hamburger />
          <span style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.1em' }}>{icon} {title}</span>
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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
    </div>
  )

  // ── DATABASE VIEW ──────────────────────────────────────────
  const DatabaseView = () => {
    const [query, setQuery]         = useState('')
    const [filter, setFilter]       = useState('All')
    const [entries, setEntries]     = useState<any[]>([])
    const [dbLoading, setDbLoading] = useState(true)
    const [expanded, setExpanded]   = useState<string | null>(null)

    useEffect(() => {
      fetch('/api/demons')
        .then(r => r.json())
        .then(d => {
          setEntries(d.demons || d.records || [])
          console.log('Sample entry fields:', JSON.stringify(
            d.demons?.[0]?.fields || d.records?.[0]?.fields || d.demons?.[0] || d.records?.[0],
            null, 2
          ))
        })
        .catch(console.error)
        .finally(() => setDbLoading(false))
    }, [])

    const CLASS_COLOR: Record<string, string> = {
      Strongman:    '#C9A84C',
      Familiar:     '#4a9eff',
      Marine:       '#a855f7',
      Rejection:    '#ff6b6b',
      Generational: '#22c55e',
      Religious:    '#f97316',
      Sexual:       '#ec4899',
    }

    function getColor(cls: string) {
      for (const [key, val] of Object.entries(CLASS_COLOR)) {
        if (cls?.toLowerCase().includes(key.toLowerCase())) return val
      }
      return G
    }

    const FILTERS = ['All', 'Strongman', 'Familiar', 'Marine', 'Generational', 'Religious']

    const filtered = entries.filter(e => {
      const f = e.fields || e
      const name           = f.Name || f.name || ''
      const aliases        = f.Aliases || f.aliases || ''
      const manifestations = f.Manifestations || f.manifestations || ''
      const wound          = f['Wound Pattern'] || f.wound || ''
      const cls            = f.Classification || f.classification || ''
      const matchesSearch  = !query ||
        [name, aliases, manifestations, wound].some(s => s.toLowerCase().includes(query.toLowerCase()))
      const matchesFilter  = filter === 'All' || cls.toLowerCase().includes(filter.toLowerCase())
      return matchesSearch && matchesFilter
    })

    const isDark   = theme !== 'light'
    const dbBg     = isDark ? '#0e0c09' : '#f5f0e8'
    const dbSurf   = isDark ? '#1a1714' : '#ffffff'
    const dbBorder = isDark ? 'rgba(201,168,76,0.18)' : 'rgba(140,110,40,0.2)'
    const dbText   = isDark ? '#ddd5c0' : '#2a2015'
    const dbDim    = isDark ? '#c8bfa8' : '#4a3f2a'

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: dbBg, overflow: 'hidden' }}>

        {/* Header + search */}
        <div style={{ padding: '14px 20px 12px', borderBottom: `1px solid ${dbBorder}`, background: dbSurf, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <Hamburger />
            <span style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.2em', color: G }}>⚔ INTEL DATABASE</span>
          </div>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search spirits, wounds, manifestations, aliases..."
            style={{
              width: '100%', padding: '10px 14px',
              background: dbBg, border: `1px solid ${query ? G : dbBorder}`,
              borderRadius: 8, fontFamily: crimson, fontSize: 15,
              color: dbText, outline: 'none', boxSizing: 'border-box',
              marginBottom: 10, transition: 'border-color 0.2s',
            }}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '4px 12px',
                background: filter === f ? 'rgba(201,168,76,0.15)' : 'transparent',
                border: `1px solid ${filter === f ? G : dbBorder}`,
                borderRadius: 20, fontFamily: cinzel, fontSize: 9,
                letterSpacing: '0.08em', color: filter === f ? G : dbDim,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Count bar */}
        <div style={{ padding: '8px 20px', flexShrink: 0, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: dbDim }}>
          {dbLoading ? 'Loading database...' : `${filtered.length} ENTRIES`}
          {!dbLoading && query && ` matching "${query}"`}
        </div>

        {/* Cards grid */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '8px 16px 16px',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12, alignContent: 'start',
        }}>
          {dbLoading && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: dbDim, fontFamily: cinzel, fontSize: 11, letterSpacing: '0.12em' }}>
              ACCESSING DATABASE...
            </div>
          )}
          {!dbLoading && filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: dbDim, fontFamily: crimson, fontSize: 16, fontStyle: 'italic' }}>
              No entries found. Try different search terms.
            </div>
          )}
          {filtered.map((entry, i) => {
            const f              = entry.fields || entry
            const id             = entry.id || String(i)
            const name           = f.Name || f.name || 'Unknown'
            const cls            = f.Classification || f.classification || ''
            const aliases        = f.Aliases || f.aliases || ''
            const description    = f['Wound Pattern'] || f['Entry Description'] || f.description || ''
            const manifestations = f.Manifestations || f.manifestations || ''
            const companions     = f['Companion Spirits'] || f.companions || ''
            const scriptures     = f['Key Scriptures'] || f.scriptures || ''
            const approach       = f['Ministry Approach'] || f.approach || ''
            const notes          = f["Minister's Notes"] || f.notes || ''
            const isOpen         = expanded === id
            const color          = getColor(cls)
            const companionList  = companions ? companions.split(',').map((c: string) => c.trim()).filter(Boolean) : []

            return (
              <div key={id} onClick={() => setExpanded(isOpen ? null : id)} style={{
                background: dbSurf, border: `1px solid ${color}40`,
                borderLeft: `3px solid ${color}`, borderRadius: 8,
                padding: 14, cursor: 'pointer', transition: 'box-shadow 0.2s',
              }}>
                {/* Name + classification badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 14, color, fontWeight: 600 }}>{name}</div>
                  {cls && (
                    <div style={{ fontFamily: cinzel, fontSize: 7, letterSpacing: '0.08em', background: color + '20', color, padding: '2px 7px', borderRadius: 3, flexShrink: 0, marginLeft: 8 }}>
                      {cls.toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Aliases */}
                {aliases && (
                  <div style={{ fontFamily: crimson, fontSize: 11, color: dbDim, fontStyle: 'italic', marginBottom: 6 }}>
                    aka {aliases}
                  </div>
                )}

                {/* Description (clamped when collapsed) */}
                <div style={{
                  fontFamily: crimson, fontSize: 13, color: dbText, lineHeight: 1.55, marginBottom: 8,
                  ...(isOpen ? {} : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }),
                }}>
                  {description}
                </div>

                {/* Companion chips */}
                {companionList.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 7, letterSpacing: '0.15em', color: color + '88', marginBottom: 4 }}>COMPANIONS</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {companionList.slice(0, isOpen ? undefined : 3).map((c: string, ci: number) => (
                        <span key={ci}
                          onClick={e => { e.stopPropagation(); setQuery(c); setExpanded(null) }}
                          style={{ fontFamily: cinzel, fontSize: 8, color, border: `1px solid ${color}44`, padding: '2px 7px', borderRadius: 3, cursor: 'pointer' }}
                          title={`Search for ${c}`}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${dbBorder}` }}>
                    {manifestations && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.15em', color: color + '88', marginBottom: 4 }}>MANIFESTATIONS</div>
                        <div style={{ fontFamily: crimson, fontSize: 13, color: dbText, lineHeight: 1.6 }}>{manifestations}</div>
                      </div>
                    )}
                    {approach && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.15em', color: color + '88', marginBottom: 4 }}>MINISTRY APPROACH</div>
                        <div style={{ fontFamily: crimson, fontSize: 13, color: dbText, lineHeight: 1.6 }}>{approach}</div>
                      </div>
                    )}
                    {scriptures && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.15em', color: G + '88', marginBottom: 4 }}>KEY SCRIPTURES</div>
                        <div style={{ fontFamily: crimson, fontSize: 13, color: G, lineHeight: 1.6, fontStyle: 'italic' }}>{scriptures}</div>
                      </div>
                    )}
                    {notes && (
                      <div style={{ marginTop: 8, padding: '10px 12px', background: dbBg, border: `1px solid ${dbBorder}`, borderRadius: 6 }}>
                        <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.15em', color: color + '88', marginBottom: 4 }}>MINISTER'S NOTES</div>
                        <div style={{ fontFamily: crimson, fontSize: 13, color: dbText, lineHeight: 1.6 }}>{notes}</div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ textAlign: 'center', marginTop: 8, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', color: color + '66' }}>
                  {isOpen ? '▲ COLLAPSE' : '▼ EXPAND FULL ENTRY'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── SIDEBAR CONTENT (shared between desktop and mobile overlay) ──
  const SidebarContent = () => (
    <>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Light/dark toggle */}
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '3px 5px', borderRadius: 4, lineHeight: 1 }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {/* Close button on mobile */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: NAV_DEFAULT, padding: '2px 4px', lineHeight: 1 }}
                aria-label="Close navigation"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* User row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(201,168,76,0.06)', borderRadius: 4, border: `1px solid ${V.bdr}` }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: `1px solid ${V.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 10, color: G, flexShrink: 0, overflow: 'hidden' }}>
            {user?.imageUrl ? <img src={user.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: cinzel, fontSize: 13, letterSpacing: '0.04em', color: V.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.firstName} {user?.lastName}
            </div>
          </div>
          <TierBadge tier={tier} />
        </div>

        {/* Sign out */}
        <SignOutButton>
          <button style={{
            width: '100%', padding: '9px 16px', marginTop: 8,
            background: 'transparent', border: `1px solid ${V.bdr}`,
            borderRadius: 6, fontFamily: cinzel, fontSize: 10,
            letterSpacing: '0.12em', color: V.mut, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = V.txt; e.currentTarget.style.borderColor = V.dim }}
            onMouseLeave={e => { e.currentTarget.style.color = V.mut; e.currentTarget.style.borderColor = V.bdr }}
          >
            SIGN OUT
          </button>
        </SignOutButton>
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
    </>
  )

  // ── FULL LAYOUT ────────────────────────────────────────────
  return (
    <div style={{
      height: '100vh',
      display: isMobile ? 'block' : 'grid',
      gridTemplateColumns: isMobile ? undefined : '280px 1fr 280px',
      background: V.bg,
      overflow: 'hidden',
      position: 'relative',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 49 }}
        />
      )}

      {/* ── LEFT SIDEBAR ── */}
      <div style={isMobile ? {
        position: 'fixed', top: 0, left: 0, height: '100vh', width: 280,
        zIndex: 50, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        display: 'flex', flexDirection: 'column',
        background: V.surf, borderRight: `1px solid ${V.bdr}`, overflow: 'hidden',
        paddingBottom: 'env(safe-area-inset-bottom)',
      } : {
        display: 'flex', flexDirection: 'column',
        background: V.surf, borderRight: `1px solid ${V.bdr}`, overflow: 'hidden',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <SidebarContent />
      </div>

      {/* ── CENTER ── */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: V.bg, height: isMobile ? '100vh' : undefined }}>
        {activeSection === 'war-room'    && <WarRoomView />}
        {activeSection === 'prayer-wall' && <PrayerView />}
        {activeSection === 'messages'    && <PlaceholderView title="Messages" icon="💬" />}
        {activeSection === 'members'     && <PlaceholderView title="Members" icon="👥" />}
        {activeSection === 'database'    && <DatabaseView />}
        {activeSection === 'arsenal'     && <LauncherView title="Scripture Arsenal" icon="✦"  href="/arsenal" />}
        {activeSection === 'resources'   && <LauncherView title="Resources"         icon="📚" href="/resources" />}
        {activeSection === 'assessment'  && <LauncherView title="Assessment"        icon="📋" href="/assessment" />}
        {activeSection === 'help'        && <LauncherView title="Request Help"      icon="🙏" href="/help" />}
      </div>

      {/* ── RIGHT SIDEBAR — desktop only ── */}
      {!isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', background: V.surf, borderLeft: `1px solid ${V.bdr}`, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 16px' }}>

            {/* Prayer Wall widget */}
            <div style={{ marginBottom: 24, padding: '14px 16px', borderBottom: `1px solid ${V.bdr}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 16 }}>🙏</span>
                <span style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.12em', color: G, textTransform: 'uppercase' }}>
                  Prayer Wall
                </span>
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${V.bdr} transparent` } as React.CSSProperties}>
                {prayers.length === 0 ? (
                  <div style={{ color: V.mut, fontStyle: 'italic', fontFamily: crimson, fontSize: 14 }}>
                    No requests yet
                  </div>
                ) : (
                  [...prayers].reverse().slice(0, 5).map(p => {
                    const name = (p.user?.name || p.user?.id || 'Warrior').split(' ')[0]
                    const preview = p.text.length > 80 ? p.text.slice(0, 80) + '…' : p.text
                    const full = p.text.length > 200 ? p.text.slice(0, 200) + '…' : p.text
                    const timeAgo = p.created_at
                      ? (() => {
                          const diff = Date.now() - new Date(p.created_at).getTime()
                          if (diff < 60000) return 'just now'
                          if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
                          if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
                          return `${Math.floor(diff / 86400000)}d ago`
                        })()
                      : ''
                    return (
                      <div key={p.id}
                        style={{ position: 'relative', marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${V.bdr}` }}
                        className="prayer-hover-item">
                        {/* Callout card — appears on hover via CSS */}
                        <div className="prayer-callout"
                          style={{
                            position: 'absolute', right: '100%', top: 0,
                            marginRight: 12, width: 260,
                            background: V.s2, border: `1px solid ${V.bdr}`,
                            borderRadius: 10, padding: '14px 16px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                            pointerEvents: 'none',
                            opacity: 0, transform: 'translateX(8px)',
                            transition: 'opacity 0.18s ease, transform 0.18s ease',
                            zIndex: 100,
                          }}>
                          {/* Arrow pointing right */}
                          <div style={{
                            position: 'absolute', right: -7, top: 14,
                            width: 12, height: 12,
                            background: V.s2, border: `1px solid ${V.bdr}`,
                            borderLeft: 'none', borderBottom: 'none',
                            transform: 'rotate(45deg)',
                          }} />
                          <div style={{ fontFamily: cinzel, fontSize: 11, color: G, marginBottom: 6, letterSpacing: '0.08em' }}>
                            {name} · <span style={{ color: V.mut }}>{timeAgo}</span>
                          </div>
                          <div style={{ fontFamily: crimson, fontSize: 15, color: V.txt, lineHeight: 1.55 }}>
                            {full}
                          </div>
                          <div style={{ marginTop: 10, fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            Click to open Prayer Wall →
                          </div>
                        </div>
                        {/* Clickable row */}
                        <div onClick={() => setActiveSection('prayer-wall')} style={{ cursor: 'pointer' }}>
                          <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.08em', marginBottom: 3 }}>
                            {name}
                          </div>
                          <div style={{ fontFamily: crimson, fontSize: 13, color: V.dim, lineHeight: 1.4 }}>
                            {preview}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              <button
                onClick={() => setActiveSection('prayer-wall')}
                style={{ width: '100%', marginTop: 8, padding: '8px', background: 'transparent', border: `1px solid ${V.bdr}`, borderRadius: 6, color: G, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase' }}>
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
                    <span style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.04em', color: V.txt }}>{ev.title}</span>
                    <TierBadge tier={ev.badge} />
                  </div>
                  <div style={{ fontFamily: crimson, fontSize: 13, color: V.dim }}>{ev.date}</div>
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
                  <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.04em', color: V.txt }}>{user?.firstName || 'You'}</div>
                  <TierBadge tier={tier} />
                </div>
              </div>
              <div style={{ fontFamily: crimson, fontSize: 13, color: V.dim, fontStyle: 'italic', marginTop: 8 }}>
                More warriors coming online...
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
