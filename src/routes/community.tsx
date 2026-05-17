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
  --wri-surface: #EDE6D3;
  --wri-surface2: #E5DCC5;
  --wri-border: rgba(139,105,20,0.25);
  --wri-text: #1C1407;
  --wri-dim: #3B2D0C;
  --wri-muted: #6B5520;
  --wri-card: #f5f0e8;
  --wri-gold: #8B6914;
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

// ── PROFILE MODAL ──────────────────────────────────────────
interface ProfileModalProps {
  member: any
  currentUserId: string
  onClose: () => void
  onStartDM: (memberId: string, memberName: string) => void
  isDark: boolean
}
function ProfileModal({ member, currentUserId, onClose, onStartDM, isDark }: ProfileModalProps) {
  const isOwn = member.id === currentUserId
  const tier = member.publicMetadata?.tier || 'Watchman'
  const tierColors: Record<string, string> = {
    General: '#C9A84C', Commander: '#8B9DCA', Soldier: '#7a9e7e', Watchman: '#6b6b7a'
  }
  const tierColor = tierColors[tier] || '#6b6b7a'
  const bg   = isDark ? '#0D0B14' : '#ffffff'
  const text = isDark ? '#f0ece0' : '#1a1a2e'
  const muted = '#6b6b7a'
  const mc = "'Cinzel', serif"
  const cr = "'Crimson Pro', Georgia, serif"
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: bg, border: '1px solid rgba(201,168,76,0.3)', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 24px 64px rgba(0,0,0,0.85)', overflow: 'hidden' }}>
        <div style={{ height: '72px', background: 'linear-gradient(135deg, rgba(201,168,76,0.12) 0%, rgba(13,11,20,0.9) 100%)', borderBottom: '1px solid rgba(201,168,76,0.12)', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '26px', height: '26px', color: '#C9A84C', cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ padding: '0 24px 24px', marginTop: '-36px' }}>
          <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(201,168,76,0.25), rgba(201,168,76,0.05))', border: `2px solid ${tierColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontFamily: mc, fontWeight: 'bold', color: '#C9A84C', marginBottom: '14px', overflow: 'hidden' }}>
            {member.imageUrl
              ? <img src={member.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (member.firstName?.[0] || member.username?.[0] || '?').toUpperCase()
            }
          </div>
          <div style={{ fontFamily: mc, fontSize: '18px', color: text, fontWeight: 700, letterSpacing: '0.04em', marginBottom: '6px' }}>
            {member.firstName} {member.lastName}
          </div>
          <div style={{ display: 'inline-block', padding: '2px 10px', border: `1px solid ${tierColor}`, borderRadius: '20px', fontSize: '10px', fontFamily: mc, letterSpacing: '0.1em', color: tierColor, textTransform: 'uppercase' as const, marginBottom: '14px' }}>{tier}</div>
          {member.publicMetadata?.bio && (
            <p style={{ fontSize: '13px', color: isDark ? '#a09898' : '#555', lineHeight: '1.6', marginBottom: '12px', fontFamily: cr }}>
              {member.publicMetadata.bio}
            </p>
          )}
          {member.publicMetadata?.location && (
            <div style={{ fontSize: '12px', color: muted, marginBottom: '10px' }}>📍 {member.publicMetadata.location}</div>
          )}
          {member.publicMetadata?.role && (
            <div style={{ fontSize: '12px', color: muted, marginBottom: '16px' }}>
              ⚔️ {member.publicMetadata.role === 'minister' ? 'Deliverance Minister' : member.publicMetadata.role}
            </div>
          )}
          {!isOwn ? (
            <button
              onClick={() => { onStartDM(member.id, member.firstName || member.username || 'Member'); onClose() }}
              style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid rgba(201,168,76,0.45)', borderRadius: '6px', color: '#C9A84C', fontFamily: mc, fontSize: '11px', letterSpacing: '0.08em', cursor: 'pointer' }}
            >💬 Send Direct Message</button>
          ) : (
            <div style={{ fontSize: '11px', color: muted, textAlign: 'center' as const, fontStyle: 'italic', fontFamily: cr }}>This is your profile</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── EDIT PROFILE MODAL ─────────────────────────────────────
interface EditProfileModalProps {
  userId: string
  existingBio: string
  existingLocation: string
  onClose: () => void
  isDark: boolean
}
function EditProfileModal({ userId, existingBio, existingLocation, onClose, isDark }: EditProfileModalProps) {
  const [bio,      setBio]      = useState(existingBio)
  const [location, setLocation] = useState(existingLocation)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const bg   = isDark ? '#0D0B14' : '#ffffff'
  const text = isDark ? '#f0ece0' : '#1a1a2e'
  const mc = "'Cinzel', serif"
  const cr = "'Crimson Pro', Georgia, serif"
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    border: '1px solid rgba(201,168,76,0.25)', borderRadius: '6px',
    padding: '10px 12px', color: text, fontFamily: cr,
    fontSize: '14px', outline: 'none',
  }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      await fetch('/api-update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, bio, location }),
      })
      setSaved(true)
      setTimeout(onClose, 800)
    } catch { /* silent */ } finally { setSaving(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: bg, border: '1px solid rgba(201,168,76,0.3)', borderRadius: '12px', width: '100%', maxWidth: '400px', padding: '28px', boxShadow: '0 24px 64px rgba(0,0,0,0.85)' }}>
        <div style={{ fontFamily: mc, fontSize: '13px', letterSpacing: '0.1em', color: '#C9A84C', textTransform: 'uppercase' as const, marginBottom: '22px' }}>
          Edit Profile
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontFamily: mc, fontSize: '9px', letterSpacing: '0.12em', color: '#6b6b7a', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Bio</label>
          <textarea
            value={bio} onChange={e => setBio(e.target.value)}
            maxLength={200} rows={3}
            placeholder="Brief description of your ministry or calling..."
            style={{ ...inputStyle, resize: 'vertical' as const }}
          />
          <div style={{ fontSize: '10px', color: '#6b6b7a', textAlign: 'right' as const, marginTop: '2px' }}>{bio.length}/200</div>
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontFamily: mc, fontSize: '9px', letterSpacing: '0.12em', color: '#6b6b7a', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Location</label>
          <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="City, State" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '6px', color: '#6b6b7a', fontFamily: mc, fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '10px', background: saved ? 'rgba(74,222,128,0.15)' : 'rgba(201,168,76,0.12)', border: `1px solid ${saved ? 'rgba(74,222,128,0.5)' : 'rgba(201,168,76,0.45)'}`, borderRadius: '6px', color: saved ? '#4ade80' : '#C9A84C', fontFamily: mc, fontSize: '11px', letterSpacing: '0.05em', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MESSAGES VIEW ─────────────────────────────────────────
function MessagesView({ isMobile, setSidebarOpen, streamToken, apiKey, user, userId, userName, pendingDMWith, onDMStarted }: {
  isMobile: boolean
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>
  streamToken: string
  apiKey: string
  user: any
  userId: string
  userName: string
  pendingDMWith?: string | null
  onDMStarted?: () => void
}) {
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null)
  const [hoveredConvo, setHoveredConvo]   = useState<string | null>(null)
  const [message, setMessage]             = useState('')
  const [conversations, setConversations] = useState<any[]>([])
  const [messages, setMessages]           = useState<any[]>([])
  const [loading, setLoading]             = useState(true)
  const [recentMsgs, setRecentMsgs]       = useState<Array<{
    id: string; channelId: string; senderName: string; text: string; ts: string; unread: boolean
  }>>([])

  // Fetch DM channels this user is a member of
  useEffect(() => {
    if (!streamToken || !apiKey || !userId) return
    async function loadConvos() {
      try {
        const d = await streamFetch('/channels', 'POST', streamToken, apiKey, {
          filter_conditions: {
            type: 'messaging',
            members: { '$in': [userId] },
            id: { '$nin': ['prayer-wall-requests', 'war-room-general'] },
          },
          sort: [{ field: 'last_message_at', direction: -1 }],
          state: true, watch: true, presence: true, limit: 30,
        })
        if (d.channels) setConversations(d.channels)
      } catch (err) {
        console.error('loadConvos error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadConvos()
    const interval = setInterval(loadConvos, 5000)
    return () => clearInterval(interval)
  }, [streamToken, apiKey, userId])

  // Load messages when a conversation is selected
  useEffect(() => {
    if (!selectedConvo || !streamToken || !apiKey) return
    async function loadMessages() {
      try {
        const d = await streamFetch(
          `/channels/messaging/${selectedConvo}/query`,
          'POST', streamToken, apiKey,
          { state: true, messages: { limit: 50 } }
        )
        if (d.messages) setMessages(d.messages)
      } catch (err) {
        console.error('loadMessages error:', err)
      }
    }
    loadMessages()
    const interval = setInterval(loadMessages, 3000)
    return () => clearInterval(interval)
  }, [selectedConvo, streamToken, apiKey])

  async function handleSend() {
    if (!message.trim() || !selectedConvo) return
    try {
      await streamFetch(
        `/channels/messaging/${selectedConvo}/message`,
        'POST', streamToken, apiKey,
        { message: { text: message.trim() } }
      )
      setMessage('')
    } catch (err) {
      console.error('send DM error:', err)
    }
  }

  // Load top-5 recent DMs for the sidebar
  useEffect(() => {
    if (!streamToken || !apiKey || !userId) return
    async function loadRecent() {
      try {
        const res = await fetch(
          `https://chat.stream-io-api.com/channels?api_key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': streamToken,
              'stream-auth-type': 'jwt',
            },
            body: JSON.stringify({
              filter_conditions: { type: 'messaging', members: { $in: [userId] } },
              sort: [{ field: 'last_message_at', direction: -1 }],
              limit: 5,
              message_limit: 1,
            }),
          }
        )
        const data = await res.json()
        const msgs: typeof recentMsgs = []
        for (const ch of (data.channels || [])) {
          const msg = ch.messages?.[0]
          if (!msg) continue
          msgs.push({
            id: msg.id,
            channelId: ch.channel.id,
            senderName: msg.user?.name || msg.user?.id || 'Unknown',
            text: msg.text || '',
            ts: msg.created_at,
            unread: (ch.channel.unread_count || 0) > 0,
          })
        }
        setRecentMsgs(msgs)
      } catch { /* silent */ }
    }
    loadRecent()
    const t = setInterval(loadRecent, 15000)
    return () => clearInterval(t)
  }, [streamToken, apiKey, userId])

  function fmtTime(ts: string) {
    if (!ts) return ''
    const d = new Date(ts), now = new Date()
    const mins = Math.floor((now.getTime() - d.getTime()) / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m`
    if (mins < 1440) return `${Math.floor(mins / 60)}h`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Create or find DM channel when pendingDMWith is set
  useEffect(() => {
    if (!pendingDMWith || !streamToken || !apiKey || !userId) return
    async function createOrFindDM() {
      const channelId = [userId, pendingDMWith].sort().join('-dm-')
      try {
        const d = await streamFetch(
          `/channels/messaging/${channelId}`,
          'POST', streamToken, apiKey,
          { data: { members: [userId, pendingDMWith] } }
        )
        if (d.channel?.id) setSelectedConvo(d.channel.id)
        else {
          const found = conversations.find((ch: any) =>
            (ch.members || []).some((m: any) => m.user_id === pendingDMWith)
          )
          if (found) setSelectedConvo((found.channel || found).id)
        }
      } catch (err) {
        console.error('createOrFindDM error:', err)
      }
      onDMStarted?.()
    }
    createOrFindDM()
  }, [pendingDMWith])

  function getConvoMeta(ch: any) {
    const channel = ch.channel || ch
    const lastMsg = ch.messages?.[ch.messages.length - 1]
    const members = ch.members || []
    const other   = members.find((m: any) => m.user_id !== userId)
    const name    = other?.user?.name || channel.name || 'Warrior'
    const avatar  = other?.user?.image || ''
    const unread  = channel.unread_count || 0
    const preview = lastMsg?.text || 'No messages yet'
    const time    = lastMsg?.created_at ? (() => {
      const diff = Date.now() - new Date(lastMsg.created_at).getTime()
      if (diff < 60000)   return 'now'
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
      return `${Math.floor(diff / 86400000)}d`
    })() : ''
    return { channel, name, avatar, unread, preview, time }
  }

  const selectedMeta = selectedConvo
    ? getConvoMeta(conversations.find(ch => (ch.channel || ch).id === selectedConvo) || {})
    : null

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Conversation list */}
      <div style={{ width: selectedConvo ? 260 : '100%', borderRight: selectedConvo ? `1px solid ${V.bdr}` : 'none', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${V.bdr}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(o => !o)} style={{ background: 'none', border: 'none', color: G, fontSize: 20, cursor: 'pointer' }}>☰</button>
          )}
          <span style={{ fontFamily: cinzel, fontSize: 18, color: G }}>💬 Messages</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: 24, textAlign: 'center', color: V.mut, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em' }}>
              LOADING...
            </div>
          )}
          {!loading && conversations.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: V.mut, fontFamily: "'Crimson Pro', Georgia, serif", fontSize: '15px', fontStyle: 'italic', textAlign: 'center' as const }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>💬</div>
              <div style={{ marginBottom: '8px', color: V.txt }}>No conversations yet</div>
              <div style={{ fontSize: '13px' }}>Go to Members to start a direct message</div>
            </div>
          )}
          {conversations.map(ch => {
            const { channel, name, avatar, unread, preview, time } = getConvoMeta(ch)
            return (
              <div key={channel.id}
                onClick={() => setSelectedConvo(channel.id)}
                onMouseEnter={() => setHoveredConvo(channel.id)}
                onMouseLeave={() => setHoveredConvo(null)}
                style={{
                  padding: '12px 16px 12px 13px',
                  borderBottom: `1px solid ${V.bdr}`,
                  borderLeft: selectedConvo === channel.id ? `3px solid ${G}` : '3px solid transparent',
                  cursor: 'pointer',
                  background: selectedConvo === channel.id
                    ? 'rgba(201,168,76,0.1)'
                    : hoveredConvo === channel.id
                    ? 'rgba(201,168,76,0.05)'
                    : 'transparent',
                  display: 'flex', gap: 10, alignItems: 'center',
                  transition: 'all 0.15s',
                }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: `1px solid rgba(201,168,76,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  {avatar
                    ? <img src={avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : <span style={{ fontFamily: cinzel, fontSize: 14, color: G }}>{name[0]?.toUpperCase()}</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontFamily: cinzel, fontSize: 12, color: G, letterSpacing: '0.05em' }}>{name}</span>
                    <span style={{ fontFamily: crimson, fontSize: 11, color: V.mut }}>{time}</span>
                  </div>
                  <div style={{ fontFamily: crimson, fontSize: 13, color: unread > 0 ? V.dim : V.mut, fontWeight: unread > 0 ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {preview}
                  </div>
                </div>
                {unread > 0 && (
                  <div style={{ minWidth: 18, height: 18, borderRadius: 9, background: '#e05c5c', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0 }}>
                    {unread}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Thread panel */}
      {selectedConvo && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${V.bdr}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <button onClick={() => setSelectedConvo(null)} style={{ background: 'none', border: 'none', color: G, fontSize: 18, cursor: 'pointer' }}>←</button>
            <span style={{ fontFamily: cinzel, fontSize: 16, color: G }}>{selectedMeta?.name || '—'}</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: V.mut, fontStyle: 'italic', fontFamily: crimson, fontSize: 14, marginTop: 40 }}>
                No messages yet. Say hello!
              </div>
            )}
            {messages.map(msg => {
              const isMe = msg.user?.id === userId
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                  {!isMe && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: cinzel, fontSize: 11, color: G }}>
                      {(msg.user?.name || 'W')[0].toUpperCase()}
                    </div>
                  )}
                  <div style={{
                    maxWidth: '70%',
                    background: isMe ? 'rgba(201,168,76,0.15)' : V.s2,
                    border: `1px solid ${isMe ? 'rgba(201,168,76,0.3)' : V.bdr}`,
                    borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    padding: '8px 12px',
                  }}>
                    <div style={{ fontFamily: crimson, fontSize: 14, color: V.txt, lineHeight: 1.5 }}>{msg.text}</div>
                    <div style={{ fontFamily: crimson, fontSize: 10, color: V.mut, marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ flexShrink: 0, borderTop: '1px solid rgba(201,168,76,0.12)', padding: '12px 16px', display: 'flex', gap: '8px', alignItems: 'flex-end', background: V.surf, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
            <textarea
              key="messages-input"
              autoComplete="off"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Send a message..."
              rows={2}
              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '10px 12px', color: V.txt, fontFamily: crimson, fontSize: '14px', outline: 'none', resize: 'none' }}
            />
            <button onClick={handleSend} disabled={!message.trim()}
              style={{ padding: '10px 16px', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '8px', color: '#C9A84C', fontFamily: cinzel, fontSize: '11px', cursor: message.trim() ? 'pointer' : 'default', alignSelf: 'flex-end' }}>
              Send →
            </button>
          </div>
        </div>
      )}

      {/* Right sidebar — recent messages */}
      {!isMobile && (
        <div style={{ width: '220px', flexShrink: 0, borderLeft: '1px solid rgba(201,168,76,0.12)', display: 'flex', flexDirection: 'column', background: 'rgba(13,11,20,0.5)' }}>
          <div style={{ padding: '14px 14px 10px', fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.12em', color: '#C9A84C', textTransform: 'uppercase' as const, borderBottom: '1px solid rgba(201,168,76,0.1)', flexShrink: 0 }}>
            📨 Recent
          </div>
          <div style={{ flex: 1, overflowY: 'auto' as const }}>
            {recentMsgs.length === 0
              ? <div style={{ padding: '20px 14px', fontSize: '12px', color: '#6b6b7a', fontStyle: 'italic', fontFamily: "'Crimson Pro', Georgia, serif" }}>No messages yet</div>
              : recentMsgs.map(msg => (
                <div
                  key={msg.id}
                  onClick={() => setSelectedConvo(msg.channelId)}
                  style={{ padding: '10px 14px', borderBottom: '1px solid rgba(201,168,76,0.07)', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.05)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', color: '#C9A84C', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: '130px' }}>
                      {msg.senderName}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {msg.unread && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A84C', flexShrink: 0 }} />}
                      <div style={{ fontSize: '9px', color: '#6b6b7a', flexShrink: 0 }}>{fmtTime(msg.ts)}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#7a7a8a', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                    {msg.text}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ── MEMBERS VIEW ──────────────────────────────────────────
interface MembersViewProps {
  members: any[]
  currentUserId: string
  currentUserTier: string
  currentUserRole: string
  onViewProfile: (member: any) => void
  onStartDM: (memberId: string, memberName: string) => void
  setActiveSection: (s: string) => void
  isDark: boolean
  isMobile: boolean
}

function MembersView({
  members, currentUserId, currentUserTier, currentUserRole,
  onViewProfile, onStartDM, setActiveSection, isDark, isMobile
}: MembersViewProps) {
  const [search, setSearch] = useState('')
  const [filterTier, setFilterTier] = useState('All')

  const TIER_ORDER: Record<string, number> = { Watchman: 1, Soldier: 2, Commander: 3, General: 4 }
  const TIER_COLORS: Record<string, string> = {
    General: '#C9A84C', Commander: '#8B9DCA', Soldier: '#7a9e7e', Watchman: '#6b6b7a'
  }
  const tiers = ['All', 'General', 'Commander', 'Soldier', 'Watchman']
  const canDM = (currentUserRole === 'minister' || currentUserRole === 'admin')
    || (TIER_ORDER[currentUserTier] || 1) >= 2

  const filtered = members.filter(m => {
    const name = `${m.firstName || ''} ${m.lastName || ''} ${m.username || ''}`.toLowerCase()
    const matchSearch = !search || name.includes(search.toLowerCase())
    const matchTier = filterTier === 'All' || (m.publicMetadata?.tier || 'Watchman') === filterTier
    return matchSearch && matchTier
  })

  const bg    = isDark ? '#0D0B14' : '#f5f0e8'
  const surf  = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
  const bdr   = isDark ? 'rgba(201,168,76,0.12)' : 'rgba(139,105,20,0.15)'
  const text  = isDark ? '#f0ece0' : '#1a1a2e'
  const muted = isDark ? '#6b6b7a' : '#888'
  const mc = "'Cinzel', serif"
  const cr = "'Crimson Pro', Georgia, serif"

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: bg }}>

      {/* Header */}
      <div style={{ padding: isMobile ? '16px' : '20px 24px', borderBottom: `1px solid ${bdr}`, flexShrink: 0 }}>
        <div style={{ fontFamily: mc, fontSize: isMobile ? '14px' : '16px', letterSpacing: '0.12em', color: '#C9A84C', marginBottom: '14px' }}>
          👥 Members
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search members..."
          style={{
            width: '100%', boxSizing: 'border-box',
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            border: `1px solid ${bdr}`, borderRadius: '6px',
            padding: '8px 12px', color: text,
            fontFamily: cr, fontSize: '14px', outline: 'none',
            marginBottom: '12px',
          }}
        />
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
          {tiers.map(t => (
            <button
              key={t}
              onClick={() => setFilterTier(t)}
              style={{
                padding: '3px 10px',
                background: filterTier === t ? 'rgba(201,168,76,0.15)' : 'transparent',
                border: `1px solid ${filterTier === t ? 'rgba(201,168,76,0.5)' : bdr}`,
                borderRadius: '20px',
                color: filterTier === t ? '#C9A84C' : muted,
                fontFamily: mc, fontSize: '9px', letterSpacing: '0.1em',
                cursor: 'pointer', transition: 'all 0.15s',
                textTransform: 'uppercase' as const,
              }}
            >{t}</button>
          ))}
          <span style={{ marginLeft: 'auto', fontFamily: mc, fontSize: '9px', color: muted, letterSpacing: '0.08em', alignSelf: 'center' }}>
            {filtered.length} warrior{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto' as const, padding: isMobile ? '12px' : '20px 24px' }}>
        {members.length === 0 ? (
          <div style={{ textAlign: 'center' as const, padding: '60px 20px', color: muted, fontFamily: cr, fontSize: '15px', fontStyle: 'italic' }}>
            Loading warriors...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center' as const, padding: '60px 20px', color: muted, fontFamily: cr, fontSize: '15px', fontStyle: 'italic' }}>
            No members match your search.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px',
          }}>
            {filtered.map(member => {
              const tier = member.publicMetadata?.tier || 'Watchman'
              const tierColor = TIER_COLORS[tier] || '#6b6b7a'
              const isOwn = member.id === currentUserId
              const displayName = member.firstName
                ? `${member.firstName}${member.lastName ? ' ' + member.lastName : ''}`
                : member.username || 'Warrior'

              return (
                <div
                  key={member.id}
                  onClick={() => onViewProfile(member)}
                  style={{
                    background: surf, border: `1px solid ${bdr}`,
                    borderRadius: '10px', padding: '18px 14px',
                    cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '8px', position: 'relative' as const,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = tierColor
                    ;(e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = bdr
                    ;(e.currentTarget as HTMLElement).style.background = surf
                  }}
                >
                  {isOwn && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '9px', fontFamily: mc, letterSpacing: '0.08em', color: '#C9A84C', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '10px', padding: '1px 6px' }}>You</div>
                  )}
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(201,168,76,0.12)', border: `2px solid ${tierColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontFamily: mc, fontWeight: 'bold', color: '#C9A84C', overflow: 'hidden', flexShrink: 0 }}>
                    {member.imageUrl
                      ? <img src={member.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : displayName[0]?.toUpperCase()
                    }
                  </div>
                  <div style={{ fontFamily: mc, fontSize: '11px', letterSpacing: '0.05em', color: text, textAlign: 'center' as const, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: '100%' }}>
                    {displayName}
                  </div>
                  <div style={{ padding: '2px 8px', border: `1px solid ${tierColor}`, borderRadius: '20px', fontSize: '9px', fontFamily: mc, letterSpacing: '0.1em', color: tierColor, textTransform: 'uppercase' as const }}>
                    {tier}
                  </div>
                  {member.publicMetadata?.location && (
                    <div style={{ fontSize: '11px', color: muted, fontFamily: cr }}>
                      📍 {member.publicMetadata.location}
                    </div>
                  )}
                  {!isOwn && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        if (canDM) {
                          onStartDM(member.id, displayName)
                          setActiveSection('messages')
                        } else {
                          onViewProfile(member)
                        }
                      }}
                      style={{
                        marginTop: '4px', padding: '5px 12px',
                        background: canDM ? 'rgba(201,168,76,0.1)' : 'transparent',
                        border: `1px solid ${canDM ? 'rgba(201,168,76,0.4)' : bdr}`,
                        borderRadius: '6px', color: canDM ? '#C9A84C' : muted,
                        fontFamily: mc, fontSize: '9px', letterSpacing: '0.08em',
                        cursor: 'pointer', textTransform: 'uppercase' as const,
                      }}
                    >
                      {canDM ? '💬 Message' : '🔒 Soldier+'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── POST CARD ──────────────────────────────────────────────
function PostCard({ msg, pinned, actions }: { msg: StreamMsg; pinned?: boolean; actions?: React.ReactNode }) {
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
            {(() => {
              const h = (s: string, n: number) => { let v = 0; for (let i = 0; i < s.length; i++) v = (v * 31 + s.charCodeAt(i)) & 0xffff; return v % n }
              return [['🙏', h(msg.id, 20) + 1], ['💬', h(msg.id + '2', 8)], ['🔥', h(msg.id + '3', 12)]].map(([icon, count]) => (
                <button key={String(icon)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: crimson, fontSize: 14, color: V.mut, padding: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = G)}
                  onMouseLeave={e => (e.currentTarget.style.color = V.mut)}>
                  {icon} {count}
                </button>
              ))
            })()}
          </div>
          {actions && (
            <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: `1px solid ${V.bdr}` }}>
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── PRAYER VIEW ────────────────────────────────────────────
interface PrayerViewProps {
  streamToken: string
  apiKey: string
  userId: string
  userName: string
  userImageUrl: string
  isDark: boolean
  isMobile: boolean
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>
}
function PrayerView({ streamToken, apiKey, userId, isMobile, setSidebarOpen }: PrayerViewProps) {
  const [draft,   setDraft]   = useState('')
  const [prayers, setPrayers] = useState<StreamMsg[]>([])

  const fetchPrayers = useCallback(async () => {
    if (!streamToken || !apiKey) return
    try {
      const d = await streamFetch('/channels/messaging/prayer-wall-requests/query', 'POST', streamToken, apiKey, { state: true, messages: { limit: 20 } })
      if (d.messages) {
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
        setPrayers(d.messages.filter((m: StreamMsg) => new Date(m.created_at).getTime() > cutoff))
      }
    } catch {}
  }, [streamToken, apiKey])

  useEffect(() => {
    fetchPrayers()
    const t = setInterval(fetchPrayers, 30000)
    return () => clearInterval(t)
  }, [fetchPrayers])

  async function handleDeletePrayer(messageId: string) {
    if (!confirm('Delete this prayer request?')) return
    try {
      await streamFetch(`/messages/${messageId}`, 'DELETE', streamToken, apiKey, undefined)
      await fetchPrayers()
    } catch (err) { console.error('Delete prayer failed:', err) }
  }

  async function handleSend() {
    if (!draft.trim() || !streamToken || !apiKey) return
    try {
      await streamFetch('/channels/messaging/prayer-wall-requests/message', 'POST', streamToken, apiKey, { message: { text: draft.trim() } })
      setDraft('')
      await fetchPrayers()
    } catch (err) { console.error('PRAYER ERROR:', err) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${V.bdr}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={() => setSidebarOpen(o => !o)}
          style={{ background: 'none', border: 'none', color: G, fontSize: 20, cursor: 'pointer', display: isMobile ? 'block' : 'none' }}>
          ☰
        </button>
        <span style={{ fontFamily: cinzel, fontSize: 18, color: G }}>🙏 Prayer Wall</span>
      </div>
      <div style={{ margin: '12px 20px 0', padding: '10px 14px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'flex-start', flexShrink: 0 }}>
        <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>⚠️</span>
        <p style={{ margin: 0, fontFamily: crimson, fontSize: 13, color: V.mut, lineHeight: 1.5 }}>
          <strong style={{ color: V.dim }}>Public wall.</strong>{' '}
          This section is visible to all visitors. Do not share personal contact information,
          addresses, or sensitive details. While this wall is monitored, posts from the community
          may appear before review. War Room Intel is not responsible for content submitted by users.
          Report concerns to{' '}
          <a href="mailto:exorcist@warroomintel.com" style={{ color: G, textDecoration: 'none' }}>exorcist@warroomintel.com</a>.
        </p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {prayers.length === 0 && (
          <div style={{ textAlign: 'center', color: V.mut, fontStyle: 'italic', marginTop: 60, fontFamily: crimson, fontSize: 17 }}>
            No prayer requests yet. Be the first.
          </div>
        )}
        {prayers.map(m => (
          <PostCard key={m.id} msg={m}
            actions={m.user?.id === userId ? (
              <button
                onClick={() => handleDeletePrayer(m.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: V.mut, fontFamily: cinzel, letterSpacing: '0.06em', padding: '2px 6px', borderRadius: '4px' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#e05c5c'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = V.mut}
              >🗑 Delete</button>
            ) : undefined}
          />
        ))}
      </div>
      <div style={{ padding: '12px 20px', borderTop: `1px solid ${V.bdr}`, background: V.s2, flexShrink: 0, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Add a prayer request..."
            style={{ flex: 1, background: V.bg, border: `1px solid ${V.bdr}`, borderRadius: 8, padding: '10px 14px', color: V.txt, fontFamily: crimson, fontSize: 16, outline: 'none' }}
          />
          <button onClick={handleSend} disabled={!draft.trim()}
            style={{ background: draft.trim() ? G : 'rgba(201,168,76,0.3)', color: draft.trim() ? '#0D0B14' : V.mut, border: 'none', borderRadius: 8, padding: '10px 18px', fontFamily: cinzel, fontSize: 13, cursor: draft.trim() ? 'pointer' : 'default', fontWeight: 700, whiteSpace: 'nowrap' }}>
            🙏 Post
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN PAGE ──────────────────────────────────────────────
function CommunityPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark'
    const stored = localStorage.getItem('wri-theme')
    return (stored === 'dark' || stored === 'light') ? stored : 'dark'
  })
  const [isMobile, setIsMobile]       = useState(() => window.innerWidth < 768)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('war-room')

  const [streamToken, setStreamToken] = useState<string>('')
  const [apiKey, setApiKey]           = useState<string>('')
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  const [posts, setPosts]             = useState<StreamMsg[]>([])
  const [draft, setDraft]             = useState('')
  const [sending, setSending]         = useState(false)
  const [prayers, setPrayers]         = useState<StreamMsg[]>([])
  const [unreadDMs, setUnreadDMs]     = useState(0)
  const [hoveredPrayer, setHoveredPrayer] = useState<any>(null)
  const [hoverY, setHoverY]               = useState(0)
  const [members, setMembers]             = useState<any[]>([])
  const [viewingProfile, setViewingProfile] = useState<any>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [pendingDMWith, setPendingDMWith]   = useState<string | null>(null)
  const [recentMessages, setRecentMessages] = useState<Array<{
    id: string; senderName: string; text: string; timeAgo: string
  }>>([])

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

  // Fetch Stream token — upserts user in Stream then returns a valid token
  useEffect(() => {
    if (!user?.id) return
    fetch('/api/stream-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId:    user.id,
        userName:  user.fullName || user.firstName || 'Warrior',
        userImage: user.imageUrl || '',
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.token) {
          setStreamToken(data.token)
          setApiKey(data.apiKey)
          setLoading(false)
          console.log('Stream token obtained successfully')
        } else {
          console.error('No token returned:', data)
          setError(data.error || 'Stream token error')
          setLoading(false)
        }
      })
      .catch(err => {
        console.error('stream-token fetch error:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [user?.id])

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
      if (d.messages) {
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
        setPrayers(
          d.messages.filter((m: StreamMsg) =>
            new Date(m.created_at).getTime() > cutoff
          )
        )
      }
    } catch {}
  }, [streamToken, apiKey])

  useEffect(() => {
    if (!streamToken || !apiKey) return
    fetchPosts()
    fetchPrayers()
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => { fetchPosts(); fetchPrayers() }, 30000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [streamToken, apiKey, fetchPosts, fetchPrayers])

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [posts])

  // Phase 3 — browser tab title reflects unread DMs
  useEffect(() => {
    if (unreadDMs > 0) {
      document.title = `💬 (${unreadDMs}) War Room Intel`
    } else {
      document.title = 'War Room Intel'
    }
    return () => { document.title = 'War Room Intel' }
  }, [unreadDMs])

  // Phase 4 — web push permission + service worker registration
  async function requestPushPermission() {
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') return
    if (Notification.permission === 'denied') return
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        console.log('SW registered:', reg.scope)
        await fetch('/api/push-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            subscription: { endpoint: reg.scope, keys: {} },
          }),
        })
      } catch (err) {
        console.error('SW registration failed:', err)
      }
    }
  }

  useEffect(() => {
    if (streamToken) setTimeout(requestPushPermission, 3000)
  }, [streamToken])

  useEffect(() => {
    if (!user?.id) return
    fetch('/api-get-members')
      .then(r => r.json())
      .then(data => {
        console.log('get-members response:', data)
        if (Array.isArray(data.members)) setMembers(data.members)
      })
      .catch(err => console.error('get-members error:', err))
  }, [user?.id])

  useEffect(() => {
    if (!streamToken || !apiKey) return
    async function loadRecentMessages() {
      try {
        const uid = user?.id
        if (!uid) return
        const res = await fetch(
          `https://chat.stream-io-api.com/channels?api_key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': streamToken, 'stream-auth-type': 'jwt' },
            body: JSON.stringify({
              filter_conditions: { type: 'messaging', members: { $in: [uid] } },
              sort: [{ field: 'last_message_at', direction: -1 }],
              limit: 5, message_limit: 1,
            }),
          }
        )
        const data = await res.json()
        const msgs: typeof recentMessages = []
        for (const ch of (data.channels || [])) {
          const msg = ch.messages?.[0]
          if (!msg) continue
          const d = new Date(msg.created_at), now = new Date()
          const mins = Math.floor((now.getTime() - d.getTime()) / 60000)
          const timeAgo = mins < 1 ? 'now' : mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins / 60)}h` : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          msgs.push({ id: msg.id, senderName: msg.user?.name || msg.user?.id || 'Warrior', text: msg.text || '', timeAgo })
        }
        setRecentMessages(msgs)
      } catch { /* silent */ }
    }
    loadRecentMessages()
    const t = setInterval(loadRecentMessages, 20000)
    return () => clearInterval(t)
  }, [streamToken, apiKey, user?.id])

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

  const isDark = theme !== 'light'

  // ── NAV HELPERS ────────────────────────────────────────────
  const sectionLabel = (label: string) => (
    <div style={{ padding: '12px 16px 4px 16px', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.18em', color: theme === 'light' ? V.mut : V.gold }}>
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
      style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', color: G, fontSize: '20px', flexShrink: 0 }}
      aria-label="Open navigation"
    >
      ☰
    </button>
  ) : null

  const PINNED: StreamMsg = {
    id: 'pinned',
    text: 'Welcome to War Room Intel. Whether you are fighting for your own freedom or walking others into theirs — you are in the right place. Start by introducing yourself below.',
    user: { id: 'host', name: 'Pastor Justin Payne' },
    created_at: new Date().toISOString(),
  }

  // ── VIEWS ──────────────────────────────────────────────────
  const WarRoomView = () => {
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editText,  setEditText]  = useState('')

    async function handleDeletePost(messageId: string) {
      if (!confirm('Delete this post?')) return
      try {
        await streamFetch(`/messages/${messageId}`, 'DELETE', streamToken, apiKey, undefined)
        await fetchPosts()
      } catch (err) { console.error('Delete failed:', err) }
    }

    async function handleEditPost(messageId: string) {
      try {
        await streamFetch(`/messages/${messageId}`, 'PUT', streamToken, apiKey, { message: { text: editText } })
        setEditingId(null)
        await fetchPosts()
      } catch (err) { console.error('Edit failed:', err) }
    }

    return (
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
          {posts.map(msg => (
            <PostCard key={msg.id} msg={msg}
              actions={msg.user?.id === user?.id ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {editingId === msg.id ? (
                    <>
                      <textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        rows={2}
                        style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', padding: '6px 10px', color: V.txt, fontFamily: crimson, fontSize: '14px', outline: 'none', resize: 'none' as const }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
                        <button onClick={() => handleEditPost(msg.id)} style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '4px', color: G, fontFamily: cinzel, fontSize: '10px', padding: '3px 8px', cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setEditingId(null)} style={{ background: 'none', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '4px', color: V.mut, fontFamily: cinzel, fontSize: '10px', padding: '3px 8px', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setEditingId(msg.id); setEditText(msg.text || '') }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: V.mut, fontFamily: cinzel, letterSpacing: '0.06em', padding: '2px 6px', borderRadius: '4px' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = G}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = V.mut}
                      >✏ Edit</button>
                      <button
                        onClick={() => handleDeletePost(msg.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: V.mut, fontFamily: cinzel, letterSpacing: '0.06em', padding: '2px 6px', borderRadius: '4px' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#e05c5c'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = V.mut}
                      >🗑 Delete</button>
                    </>
                  )}
                </div>
              ) : undefined}
            />
          ))}
          <div ref={bottomRef} />
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

        {/* User row — compact */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid rgba(201,168,76,0.4)`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(201,168,76,0.12)', fontFamily: cinzel, fontSize: 11, color: G }}>
              {user?.imageUrl ? <img src={user.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : initials}
            </div>
            {unreadDMs > 0 && (
              <div style={{ position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: '#e05c5c', border: `2px solid ${V.bg}` }} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: cinzel, fontSize: 13, color: V.txt, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.firstName || user?.fullName || 'Warrior'}
            </div>
            <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 1 }}>
              {tier}
            </div>
          </div>
          <SignOutButton>
            <button style={{ background: 'none', border: `1px solid rgba(201,168,76,0.2)`, borderRadius: 4, color: V.mut, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px', cursor: 'pointer', flexShrink: 0, transition: 'color 0.15s, border-color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = G; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.color = V.mut; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)' }}
            >
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        <div
          onClick={() => { setActiveSection('war-room'); setSidebarOpen(false) }}
          style={{ padding: '14px 16px 8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: activeSection === 'war-room' ? V.gold : V.mut }}>
            ✕ Community
          </span>
        </div>
        {navItem('Prayer Wall', 'prayer-wall', '🙏')}
        {/* Messages — inline for unread badge */}
        {(() => {
          const active = activeSection === 'messages'
          return (
            <button
              onClick={() => { setActiveSection('messages'); if (isMobile) setSidebarOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 16px', background: active ? 'rgba(201,168,76,0.1)' : 'transparent', border: 'none', borderLeft: `2px solid ${active ? G : 'transparent'}`, textAlign: 'left', cursor: 'pointer', fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em', color: active ? G : NAV_DEFAULT, transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(201,168,76,0.05)'; e.currentTarget.style.color = G } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = NAV_DEFAULT } }}
            >
              <span style={{ fontSize: 14, width: 20, flexShrink: 0 }}>💬</span>
              <span style={{ flex: 1 }}>Messages</span>
              {unreadDMs > 0 && (
                <div style={{ minWidth: 18, height: 18, borderRadius: 9, background: '#e05c5c', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {unreadDMs}
                </div>
              )}
            </button>
          )
        })()}
        {navItem('Members', 'members', '👥')}

        <div style={{ paddingTop: 16 }}>{navItem('Demon Database', 'database', '📖')}</div>
        {dimItem('Weekly Intel', '📡')}

        {sectionLabel('TRAINING')}
        {navItem('Resources', 'resources', '📚')}
        {dimItem('Courses', '🎓')}
        {dimItem('Protocols', '🗡')}
        {dimItem("General's Table", '✦')}

        {sectionLabel('TOOLS')}
        {navItem('Assessment', 'assessment', '📋')}
        {navItem('Request Help', 'help', '🙏')}
        {dimItem('Events', '📅')}
        <button
          onClick={() => { setEditingProfile(true); if (isMobile) setSidebarOpen(false) }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 16px', background: 'transparent', border: 'none', borderLeft: '2px solid transparent', textAlign: 'left', cursor: 'pointer', fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em', color: NAV_DEFAULT, transition: 'color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = G }}
          onMouseLeave={e => { e.currentTarget.style.color = NAV_DEFAULT }}
        >
          <span style={{ fontSize: 14, width: 20, flexShrink: 0 }}>⚙</span>
          Settings
        </button>
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
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: 'rgba(0,0,0,0.6)', WebkitOverflowScrolling: 'touch' as any }}
        />
      )}

      {/* ── LEFT SIDEBAR ── */}
      <div style={isMobile ? {
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: '280px', zIndex: 1000,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        display: 'flex', flexDirection: 'column',
        background: V.surf, borderRight: `1px solid ${V.bdr}`,
        overflowY: 'auto' as const, WebkitOverflowScrolling: 'touch' as any,
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
        {activeSection === 'prayer-wall' && (
          <PrayerView
            streamToken={streamToken}
            apiKey={apiKey}
            userId={user?.id || ''}
            userName={user?.fullName || user?.firstName || 'Warrior'}
            userImageUrl={user?.imageUrl || ''}
            isDark={theme !== 'light'}
            isMobile={isMobile}
            setSidebarOpen={setSidebarOpen}
          />
        )}
        {activeSection === 'messages'    && <MessagesView isMobile={isMobile} setSidebarOpen={setSidebarOpen} streamToken={streamToken} apiKey={apiKey} user={user} userId={user?.id || ''} userName={user?.fullName || user?.firstName || 'Warrior'} pendingDMWith={pendingDMWith} onDMStarted={() => setPendingDMWith(null)} />}
        {activeSection === 'members'     && (
          <MembersView
            members={members}
            currentUserId={user?.id || ''}
            currentUserTier={(user?.publicMetadata?.tier as string) || 'Watchman'}
            currentUserRole={(user?.publicMetadata?.role as string) || 'member'}
            onViewProfile={setViewingProfile}
            onStartDM={(memberId, memberName) => {
              setPendingDMWith(memberId)
              setActiveSection('messages')
            }}
            setActiveSection={setActiveSection}
            isDark={theme !== 'light'}
            isMobile={isMobile}
          />
        )}
        {activeSection === 'database'    && <DatabaseView />}
        {activeSection === 'arsenal'     && <LauncherView title="Scripture Arsenal" icon="✦"  href="/arsenal" />}
        {activeSection === 'resources'   && <LauncherView title="Resources"         icon="📚" href="/resources" />}
        {activeSection === 'assessment'  && <LauncherView title="Assessment"        icon="📋" href="/assessment" />}
        {activeSection === 'help'        && <LauncherView title="Request Help"      icon="🙏" href="/help" />}
      </div>

      {/* ── MODALS ── */}
      {viewingProfile && (
        <ProfileModal
          member={viewingProfile}
          currentUserId={user?.id || ''}
          isDark={theme !== 'light'}
          onClose={() => setViewingProfile(null)}
          onStartDM={(memberId, _memberName) => {
            setViewingProfile(null)
            setActiveSection('messages')
            setPendingDMWith(memberId)
          }}
        />
      )}
      {editingProfile && (
        <EditProfileModal
          userId={user?.id || ''}
          existingBio={(user?.publicMetadata?.bio as string) || ''}
          existingLocation={(user?.publicMetadata?.location as string) || ''}
          isDark={theme !== 'light'}
          onClose={() => setEditingProfile(false)}
        />
      )}

      {/* ── RIGHT SIDEBAR — desktop only ── */}
      {!isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', background: V.surf, borderLeft: `1px solid ${V.bdr}`, overflow: 'visible', position: 'relative' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 16px' }}>

            {/* Prayer Wall widget */}
            <div style={{ marginBottom: 24, padding: '14px 16px', borderBottom: `1px solid ${V.bdr}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 16 }}>🙏</span>
                <span style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.12em', color: G, textTransform: 'uppercase' }}>
                  Prayer Wall
                </span>
              </div>
              {/* Callout — rendered once OUTSIDE the scrollable div, position:fixed */}
              {hoveredPrayer && (
                <div style={{
                  position: 'fixed', right: 300, top: hoverY,
                  width: 240, background: V.s2,
                  border: `1px solid rgba(201,168,76,0.45)`,
                  borderRadius: 10, padding: '14px 16px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
                  zIndex: 9999, pointerEvents: 'none',
                }}>
                  <div style={{ position: 'absolute', right: -6, top: 16, width: 10, height: 10, background: V.s2, border: `1px solid rgba(201,168,76,0.45)`, borderLeft: 'none', borderBottom: 'none', transform: 'rotate(45deg)' }} />
                  <div style={{ fontFamily: cinzel, fontSize: 11, color: G, marginBottom: 6, letterSpacing: '0.08em' }}>
                    {(hoveredPrayer.user?.name || 'Warrior').split(' ')[0]}
                    <span style={{ color: V.mut, fontWeight: 400 }}>{' · '}{(() => {
                      const diff = Date.now() - new Date(hoveredPrayer.created_at).getTime()
                      if (diff < 60000) return 'just now'
                      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
                      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
                      return `${Math.floor(diff / 86400000)}d ago`
                    })()}</span>
                  </div>
                  <div style={{ fontFamily: crimson, fontSize: 14, color: V.txt, lineHeight: 1.55 }}>
                    {hoveredPrayer.text.length > 220 ? hoveredPrayer.text.slice(0, 220) + '…' : hoveredPrayer.text}
                  </div>
                  <div style={{ marginTop: 8, fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Click to open Prayer Wall →
                  </div>
                </div>
              )}

              <div style={{ maxHeight: 220, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${V.bdr} transparent` } as React.CSSProperties}>
                {prayers.length === 0 ? (
                  <div style={{ color: V.mut, fontStyle: 'italic', fontFamily: crimson, fontSize: 14 }}>
                    No requests yet
                  </div>
                ) : (
                  [...prayers].reverse().slice(0, 8).map(p => {
                    const name = (p.user?.name || 'Warrior').split(' ')[0]
                    const preview = p.text.length > 70 ? p.text.slice(0, 70) + '…' : p.text
                    const isHovered = hoveredPrayer?.id === p.id
                    return (
                      <div key={p.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${V.bdr}` }}>
                        <div
                          onClick={() => setActiveSection('prayer-wall')}
                          onMouseEnter={e => { setHoverY((e.currentTarget as HTMLElement).getBoundingClientRect().top); setHoveredPrayer(p) }}
                          onMouseLeave={() => setHoveredPrayer(null)}
                          style={{ cursor: 'pointer', background: isHovered ? 'rgba(201,168,76,0.06)' : 'transparent', borderRadius: 6, padding: '4px 6px', transition: 'background 0.15s ease' }}>
                          <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.08em', marginBottom: 2 }}>{name}</div>
                          <div style={{ fontFamily: crimson, fontSize: 13, color: V.dim, lineHeight: 1.4 }}>{preview}</div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              <button
                onClick={() => setActiveSection('prayer-wall')}
                style={{ width: '100%', marginTop: 10, padding: '8px 12px', background: 'transparent', border: `1px solid rgba(201,168,76,0.35)`, borderRadius: 6, color: V.gold, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'rgba(201,168,76,0.1)'; el.style.borderColor = 'rgba(201,168,76,0.6)' }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'transparent'; el.style.borderColor = 'rgba(201,168,76,0.35)' }}>
                + Add Prayer Request
              </button>
            </div>

            {/* Recent Messages */}
            <div style={{ borderBottom: `1px solid ${V.bdr}`, padding: '0' }}>
              <div style={{ padding: '10px 14px 8px', fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.12em', color: G, textTransform: 'uppercase' as const }}>
                📨 Recent Messages
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' as const }}>
                {recentMessages.length === 0 ? (
                  <div style={{ padding: '8px 14px 12px', fontSize: '12px', color: V.mut, fontStyle: 'italic', fontFamily: crimson }}>
                    No messages yet
                  </div>
                ) : (
                  recentMessages.slice(0, 5).map((msg: any) => (
                    <div
                      key={msg.id}
                      onClick={() => setActiveSection('messages')}
                      style={{ padding: '8px 14px', borderBottom: `1px solid ${V.bdr}`, cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.05)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ fontFamily: cinzel, fontSize: '10px', color: G, letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: '130px' }}>
                          {msg.senderName}
                        </span>
                        <span style={{ fontSize: '9px', color: V.mut, flexShrink: 0 }}>{msg.timeAgo}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: V.mut, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
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
