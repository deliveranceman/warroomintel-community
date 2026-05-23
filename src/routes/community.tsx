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


const THEME_CSS = `
.prayer-hover-item:hover .prayer-callout {
  opacity: 1 !important;
  transform: translateX(0) !important;
  pointer-events: auto !important;
}
.msg-row:hover .msg-actions { opacity: 1 !important; }
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
    Watchman:  { color: '#c8bfa8', border: '1px solid rgba(200,191,168,0.25)' },
    Soldier:   { color: G,         border: `1px solid ${BR2}` },
    Commander: { color: AMBER,     border: '1px solid rgba(212,144,58,0.5)' },
    General:   { color: G,         border: `1px solid ${G}`, fontWeight: 700 },
  }
  return (
    <span style={{ ...(s[tier] || s.Watchman), fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', padding: '1px 6px', borderRadius: 10, whiteSpace: 'nowrap' }}>
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
  reaction_counts?: Record<string, number>
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
  firstName: string
  lastName: string
  imageUrl: string
  existingBio: string
  existingCity: string
  existingState: string
  onClose: () => void
  isDark: boolean
}
function EditProfileModal({ userId: _userId, firstName, lastName, imageUrl, existingBio, existingCity, existingState, onClose, isDark }: EditProfileModalProps) {
  const { getToken } = useAuth()
  const { user }     = useUser()
  const [bio,     setBio]     = useState(existingBio)
  const [city,    setCity]    = useState(existingCity)
  const [state,   setState]   = useState(existingState)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [saveErr, setSaveErr] = useState('')

  const bg   = isDark ? '#0D0B14' : '#ffffff'
  const surf = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'
  const text = isDark ? '#f0ece0' : '#1a1a2e'
  const dim  = isDark ? '#6b6b7a' : '#8a8a9a'
  const bdr  = 'rgba(201,168,76,0.25)'
  const mc   = "'Cinzel', serif"
  const cr   = "'Crimson Pro', Georgia, serif"

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: surf, border: `1px solid ${bdr}`, borderRadius: '6px',
    padding: '10px 12px', color: text, fontFamily: cr,
    fontSize: '14px', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontFamily: mc, fontSize: '9px',
    letterSpacing: '0.12em', color: dim, textTransform: 'uppercase',
    marginBottom: '6px',
  }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    setSaveErr('')
    try {
      const token = await getToken()
      const res = await fetch('/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ bio, city, state }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Save failed')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) { setSaveErr(e?.message || 'Save failed. Try again.') } finally { setSaving(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: bg, border: '1px solid rgba(201,168,76,0.3)', borderRadius: '12px', width: '100%', maxWidth: '440px', padding: '28px', boxShadow: '0 24px 64px rgba(0,0,0,0.9)', position: 'relative' }}>

        {/* Header */}
        <div style={{ fontFamily: mc, fontSize: '12px', letterSpacing: '0.12em', color: '#C9A84C', textTransform: 'uppercase' as const, marginBottom: '20px' }}>
          ⚙ Profile Settings
        </div>

        {/* Profile card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: '16px 18px', background: surf, border: `1px solid ${bdr}`, borderRadius: 10 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(201,168,76,0.4)', flexShrink: 0, background: surf }}>
            {imageUrl
              ? <img src={imageUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mc, fontSize: 22, color: '#C9A84C' }}>{(firstName?.[0] || '?').toUpperCase()}</div>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: mc, fontSize: 14, color: '#C9A84C', marginBottom: 3 }}>{firstName} {lastName}</div>
            <div style={{ fontSize: 12, color: dim, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{user?.primaryEmailAddress?.emailAddress}</div>
            <div style={{ fontSize: 10, color: dim, fontFamily: mc, letterSpacing: '0.06em' }}>
              {((user?.publicMetadata?.tier as string) || 'Free').toUpperCase()} · {(user?.publicMetadata?.role as string) || 'member'}
            </div>
          </div>
          <a href="https://accounts.warroomintel.com/user" target="_blank" rel="noopener noreferrer" style={{ fontFamily: mc, fontSize: '9px', letterSpacing: '0.08em', color: dim, textDecoration: 'none', borderBottom: `1px solid ${bdr}`, paddingBottom: 1, flexShrink: 0 }}>
            Change Photo →
          </a>
        </div>

        {/* Name row — read only */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>First Name</label>
            <div style={{ ...inputStyle, color: dim, cursor: 'default', userSelect: 'none' as const }}>{firstName || '—'}</div>
          </div>
          <div>
            <label style={labelStyle}>Last Name</label>
            <div style={{ ...inputStyle, color: dim, cursor: 'default', userSelect: 'none' as const }}>{lastName || '—'}</div>
          </div>
        </div>
        <p style={{ fontSize: '10px', color: dim, fontFamily: cr, fontStyle: 'italic', marginBottom: '20px', marginTop: '-6px' }}>
          Name is managed by Clerk. <a href="https://accounts.warroomintel.com/user" target="_blank" rel="noopener noreferrer" style={{ color: '#C9A84C' }}>Edit on account page →</a>
        </p>

        {/* City + State */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>City</label>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="City" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>State</label>
            <input value={state} onChange={e => setState(e.target.value)} placeholder="TX" maxLength={2} style={inputStyle} />
          </div>
        </div>

        {/* Bio */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Bio</label>
          <textarea
            value={bio} onChange={e => setBio(e.target.value.slice(0, 280))}
            rows={4}
            placeholder="Brief description of your ministry or calling..."
            style={{ ...inputStyle, resize: 'vertical' as const }}
          />
          <div style={{ fontSize: '10px', color: bio.length > 250 ? '#f97316' : dim, textAlign: 'right' as const, marginTop: '3px' }}>{bio.length}/280</div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'transparent', border: `1px solid ${bdr}`, borderRadius: '6px', color: dim, fontFamily: mc, fontSize: '10px', letterSpacing: '0.05em', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '10px', background: 'rgba(201,168,76,0.12)', border: `1px solid rgba(201,168,76,0.4)`, borderRadius: '6px', color: '#C9A84C', fontFamily: mc, fontSize: '10px', letterSpacing: '0.08em', cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
            {saving ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
        </div>
        {saved    && <div style={{ fontSize: 13, color: '#4ade80', marginBottom: 8, fontFamily: cr }}>✓ Profile updated successfully</div>}
        {saveErr  && <div style={{ fontSize: 13, color: '#f87171', marginBottom: 8, fontFamily: cr }}>⚠ {saveErr}</div>}

        {/* Account Security */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${bdr}` }}>
          <div style={{ fontFamily: mc, fontSize: 9, letterSpacing: '0.12em', color: dim, textTransform: 'uppercase' as const, marginBottom: 10 }}>Account Security</div>
          <a href="https://accounts.warroomintel.com/user" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', background: 'transparent', border: `1px solid ${bdr}`, borderRadius: 5, padding: '8px 16px', fontFamily: mc, fontSize: 10, color: dim, textDecoration: 'none', letterSpacing: '0.06em' }}>
            Change Password →
          </a>
        </div>
      </div>
    </div>
  )
}

// ── MESSAGES VIEW ─────────────────────────────────────────
function MessagesView({ isMobile, setSidebarOpen, streamToken, apiKey, user, userId, userName, pendingDMWith, onDMStarted, isDark = true, dmMembers = [], onStartDM, onUnreadChange }: {
  isMobile: boolean
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>
  streamToken: string
  apiKey: string
  user: any
  userId: string
  userName: string
  pendingDMWith?: string | null
  onDMStarted?: () => void
  isDark?: boolean
  dmMembers?: any[]
  onStartDM?: (memberId: string, memberName: string) => void
  onUnreadChange?: (count: number) => void
}) {
  const V = {
    bg: isDark ? '#0D0B14' : '#f5f0e8', surf: isDark ? '#1a1714' : '#f0ebe3',
    card: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    bdr: isDark ? 'rgba(201,168,76,0.15)' : 'rgba(160,120,48,0.25)',
    txt: isDark ? '#f0e8d8' : '#1a1410', mut: isDark ? '#9a8c74' : '#5c4a3a',
    dim: isDark ? '#c8b99a' : '#7a6555', s2: isDark ? '#1c1814' : '#e8e0d4', gold: isDark ? '#C9A84C' : '#a07830',
  }
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [messages, setMessages]           = useState<any[]>([])
  const [loading, setLoading]             = useState(true)
  const [searchQuery, setSearchQuery]     = useState('')
  const [showNewDM, setShowNewDM]         = useState(false)
  const [msgDraft, setMsgDraft]           = useState('')
  const [newDMSearch, setNewDMSearch]     = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [headerOtherId, setHeaderOtherId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const dmFileRef = useRef<HTMLInputElement>(null)

  // Fetch DM channels this user is a member of
  const loadConvos = useCallback(async () => {
    if (!streamToken || !apiKey || !userId) return
    try {
      const d = await streamFetch('/channels', 'POST', streamToken, apiKey, {
        filter_conditions: {
          type: 'messaging',
          members: { $in: [userId] },
        },
        sort: [{ field: 'last_message_at', direction: -1 }],
        state: true,
        watch: false,
        presence: false,
        limit: 30,
        message_limit: 1,
        member_limit: 10,
      })
      const filtered = (d.channels || []).filter((ch: any) => {
        const id = ch.channel?.id || ch.id
        return id !== 'prayer-wall-requests' && id !== 'war-room-general'
      })
      setConversations(filtered)
      const total = filtered.reduce((sum: number, ch: any) => sum + (ch.channel?.unread_count || 0), 0)
      onUnreadChange?.(total)
      console.log('loadConvos result:', filtered.length, filtered.map((c: any) => c.channel?.id || c.id))
      console.log('raw channels from Stream:', d.channels?.length, d.channels?.map((c: any) => c.channel?.id))
    } catch (err) {
      console.error('loadConvos error:', err)
    } finally {
      setLoading(false)
    }
  }, [streamToken, apiKey, userId])

  useEffect(() => {
    loadConvos()
    const interval = setInterval(loadConvos, 8000)
    return () => clearInterval(interval)
  }, [loadConvos])

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
        if (d.messages) {
          setMessages(d.messages)
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        }
        // Extract typing users from channel state
        const typing = Object.keys(d.channel?.typing || {}).filter((id: string) => id !== userId)
        setTypingUsers(typing.map((id: string) => {
          const m = dmMembers.find((mem: any) => mem.id === id)
          return m ? (m.firstName || m.username || 'Someone') : 'Someone'
        }))
      } catch (err) {
        console.error('loadMessages error:', err)
      }
    }
    loadMessages()
  }, [selectedConvo, streamToken, apiKey])

  async function sendTyping() {
    if (!selectedConvo || !streamToken || !apiKey) return
    await streamFetch(`/channels/messaging/${selectedConvo}/event`, 'POST', streamToken, apiKey, {
      event: { type: 'typing.start', user_id: userId }
    })
  }

  async function handleSendMessage() {
    if (!msgDraft.trim() || !selectedConvo || !streamToken || !apiKey) return
    const text = msgDraft.trim()
    setMsgDraft('')
    try {
      await streamFetch(
        `/channels/messaging/${selectedConvo}/message`,
        'POST', streamToken, apiKey,
        { message: { text, user_id: userId } }
      )
      const d = await streamFetch(
        `/channels/messaging/${selectedConvo}/query`,
        'POST', streamToken, apiKey,
        { state: true, messages: { limit: 50 } }
      )
      if (d.messages) {
        setMessages(d.messages)
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    } catch (err) {
      console.error('Send failed:', err)
      setMsgDraft(text)
    }
  }

  // Create or find DM channel when pendingDMWith is set
  useEffect(() => {
    if (!pendingDMWith || !streamToken || !apiKey || !userId) return
    async function createOrFindDM() {
      const sortedIds = [userId, pendingDMWith].sort()
      const hash = (s: string) => s.split('').reduce((a, c) => (Math.imul(31, a) + c.charCodeAt(0)) | 0, 0).toString(36).replace('-', 'z')
      const channelId = ('dm' + hash(sortedIds[0]) + hash(sortedIds[1])).slice(0, 64)
      try {
        // Server-side call — client JWT cannot register other users as members
        const res = await fetch('/api/create-dm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, otherUserId: pendingDMWith }),
        })
        const { channelId: serverChannelId, error } = await res.json()
        if (error) throw new Error(error)
        console.log('create-dm server response: channelId =', serverChannelId)
        setSelectedConvo(serverChannelId)
        setHeaderOtherId(pendingDMWith)
        setTimeout(() => loadConvos(), 800)
      } catch (err) {
        console.error('createOrFindDM error:', err)
      }
      onDMStarted?.()
    }
    createOrFindDM()
  }, [pendingDMWith])

  function getConvoMeta(ch: any) {
    const channel = ch.channel || ch
    if (channel.id === 'war-room-general') {
      return { channel, name: '⚔ War Room', avatar: '', unread: 0, preview: 'Group channel · all members', time: '' }
    }
    const lastMsg = ch.messages?.[ch.messages.length - 1]
    const members = ch.members || []
    const other   = members.find((m: any) => m.user_id !== userId)
    const otherId = other?.user_id || null
    const clerkMatch = dmMembers.find((m: any) => m.id === otherId)
    const clerkName = clerkMatch ? (`${clerkMatch.firstName || ''} ${clerkMatch.lastName || ''}`).trim() : ''
    const streamName = (other?.user?.name && !other.user.name.startsWith('user_')) ? other.user.name : ''
    const name = clerkName || streamName || (otherId ? otherId.slice(0, 12) : (other ? 'Warrior' : 'Loading...'))
    const avatar  = clerkMatch?.imageUrl || other?.user?.image || ''
    const unread  = channel.unread_count || 0
    const preview = lastMsg?.text || 'No messages yet'
    const time    = lastMsg?.created_at ? (() => {
      const diff = Date.now() - new Date(lastMsg.created_at).getTime()
      if (diff < 60000)   return 'now'
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
      return `${Math.floor(diff / 86400000)}d`
    })() : ''
    return { channel, name, avatar, unread, preview, time, otherId: other?.user_id || null }
  }

  const filteredConvos = conversations.filter(ch => {
    if (!searchQuery) return true
    const { name } = getConvoMeta(ch)
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* LEFT PANEL — conversation list */}
      <div style={{ width: '260px', flexShrink: 0, borderRight: `1px solid ${V.bdr}`, display: 'flex', flexDirection: 'column', background: V.surf }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${V.bdr}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(o => !o)} style={{ background: 'none', border: 'none', color: G, fontSize: 20, cursor: 'pointer', flexShrink: 0 }}>☰</button>
            )}
            <span style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.1em' }}>💬 Direct Messages</span>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            style={{ width: '100%', boxSizing: 'border-box', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${V.bdr}`, borderRadius: 6, padding: '7px 10px', color: V.txt, fontFamily: crimson, fontSize: 13, outline: 'none' }}
          />
        </div>
        <button
          onClick={() => setShowNewDM(true)}
          style={{ margin: '10px 12px', padding: '8px 12px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: 6, color: G, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const }}
        >+ New Message</button>
        <div style={{ flex: 1, overflowY: 'auto' as const }}>
          {loading && (
            <div style={{ padding: 20, textAlign: 'center' as const, color: V.mut, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em' }}>LOADING...</div>
          )}
          {!loading && filteredConvos.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center' as const, color: V.mut, fontFamily: crimson, fontSize: 13, fontStyle: 'italic' }}>
              No conversations yet.<br/>Click "+ New Message" to start one.
            </div>
          )}
          {filteredConvos.map(ch => {
            const { channel, name, avatar, unread, preview, time, otherId } = getConvoMeta(ch)
            const isActive = selectedConvo === channel.id
            return (
              <div
                key={channel.id}
                onClick={() => { setSelectedConvo(channel.id); setHeaderOtherId(otherId) }}
                style={{ padding: '12px 16px', borderBottom: `1px solid ${V.bdr}`, cursor: 'pointer', background: isActive ? 'rgba(201,168,76,0.08)' : 'transparent', borderLeft: isActive ? '2px solid #C9A84C' : '2px solid transparent', transition: 'background 0.15s' }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.04)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 14, color: G, flexShrink: 0, overflow: 'hidden' }}>
                    {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontFamily: cinzel, fontSize: 11, color: isActive ? G : V.txt, letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: '120px' }}>{name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        {time && <span style={{ fontSize: 10, color: V.mut }}>{time}</span>}
                        {unread > 0 && <div style={{ minWidth: 16, height: 16, borderRadius: 8, background: '#e05c5c', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{unread}</div>}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: V.mut, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, fontFamily: crimson }}>{preview || 'No messages yet'}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* RIGHT PANEL — thread or empty state */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: V.bg, minWidth: 0 }}>
        {!selectedConvo ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: V.mut, fontFamily: crimson }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
            <div style={{ fontFamily: cinzel, fontSize: 14, color: V.txt, marginBottom: 8, letterSpacing: '0.06em' }}>Your Direct Messages</div>
            <div style={{ fontSize: 14, fontStyle: 'italic', marginBottom: 20 }}>Select a conversation or start a new one</div>
            <button
              onClick={() => setShowNewDM(true)}
              style={{ padding: '10px 20px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 8, color: G, fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const }}
            >+ New Message</button>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Thread header */}
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${V.bdr}`, flexShrink: 0, background: V.surf, display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setSelectedConvo(null)} style={{ background: 'none', border: 'none', color: V.mut, cursor: 'pointer', fontSize: 18, padding: 0, lineHeight: 1 }}>←</button>
              {(() => {
                const headerMeta = selectedConvo ? getConvoMeta(conversations.find((c: any) => (c.channel?.id || c.id) === selectedConvo) || {}) : null
                const clerkMatch = dmMembers?.find((m: any) => headerOtherId === m.id)
                const clerkName = clerkMatch ? (`${clerkMatch.firstName || ''} ${clerkMatch.lastName || ''}`).trim() : (headerMeta?.name && !headerMeta.name.startsWith('user_') && headerMeta.name !== 'Loading...' ? headerMeta.name : '')
                const name = (headerMeta?.name && headerMeta.name !== 'Loading...') ? headerMeta.name : (clerkName || 'Warrior')
                const avatar = headerMeta?.avatar || ''
                return (
                  <>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 13, color: G, overflow: 'hidden', flexShrink: 0 }}>
                      {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name[0]?.toUpperCase()}
                    </div>
                    <span style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.06em' }}>{name}</span>
                  </>
                )
              })()}
            </div>
            {/* Messages scroll */}
            <div style={{ flex: 1, overflowY: 'auto' as const, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center' as const, color: V.mut, fontStyle: 'italic', fontFamily: crimson, fontSize: 14, marginTop: 40 }}>
                  Start the conversation
                </div>
              )}
              {messages.filter(msg => msg.type !== 'deleted' && !msg.deleted_at).map(msg => {
                const isMe = msg.user?.id === userId
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: 8 }}>
                    {!isMe && (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 11, color: G, flexShrink: 0, overflow: 'hidden', alignSelf: 'flex-end' }}>
                        {msg.user?.image ? <img src={msg.user.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (msg.user?.name || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div style={{ maxWidth: '65%' }}>
                      {!isMe && <div style={{ fontFamily: cinzel, fontSize: 10, color: V.mut, marginBottom: 3, letterSpacing: '0.04em' }}>{msg.user?.name || 'Warrior'}</div>}
                      <div style={{ background: isMe ? G : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'), color: isMe ? '#0D0B14' : V.txt, borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '10px 14px', fontFamily: crimson, fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word' }}>
                        {msg.text}
                        {(msg as any).attachments?.map((att: any, i: number) => (
                          att.type === 'image' || att.image_url || att.thumb_url ? (
                            <img key={i} src={att.asset_url || att.image_url || att.thumb_url} alt={att.title || 'image'}
                              style={{ display: 'block', maxWidth: '100%', maxHeight: 300, borderRadius: 8, marginTop: msg.text ? 6 : 0, cursor: 'pointer' }}
                              onClick={() => window.open(att.asset_url || att.image_url, '_blank')}
                            />
                          ) : att.asset_url ? (
                            <a key={i} href={att.asset_url} target="_blank" rel="noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: msg.text ? 6 : 0, color: '#C9A84C', fontSize: 13, textDecoration: 'none' }}>
                              📄 {att.title || 'File'}
                            </a>
                          ) : null
                        ))}
                        {(msg as any).attachments?.filter((att: any) => att.type === 'url' || att.og_scrape_url).map((att: any, i: number) => (
                          <a key={`url-${i}`} href={att.og_scrape_url || att.title_link} target="_blank" rel="noreferrer"
                            style={{ display: 'block', marginTop: 8, borderRadius: 8, border: '1px solid rgba(201,168,76,0.2)', overflow: 'hidden', textDecoration: 'none', background: 'rgba(201,168,76,0.05)' }}>
                            {att.image_url && <img src={att.image_url} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover' as const }} />}
                            <div style={{ padding: '8px 10px' }}>
                              {att.title && <div style={{ fontFamily: cinzel, fontSize: 12, color: '#C9A84C', marginBottom: 2 }}>{att.title}</div>}
                              {att.text && <div style={{ fontFamily: crimson, fontSize: 12, color: V.mut, lineHeight: 1.4 }}>{att.text.slice(0, 120)}{att.text.length > 120 ? '...' : ''}</div>}
                              <div style={{ fontFamily: crimson, fontSize: 11, color: V.mut, marginTop: 4, opacity: 0.7 }}>{att.og_scrape_url}</div>
                            </div>
                          </a>
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: V.mut, marginTop: 3, textAlign: isMe ? 'right' as const : 'left' as const }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
            {/* Send bar */}
            <div style={{ flexShrink: 0, position: 'relative' }}>
              {showEmojiPicker && (
                <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, padding: '8px 12px', background: V.s2, borderTop: `1px solid ${V.bdr}`, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {['🙏','❤️','🔥','✝️','⚔️','😭','🛡️','💪','🕊️','🌟'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => { setMsgDraft(d => d + emoji); setShowEmojiPicker(false) }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 20, padding: '4px 6px', borderRadius: 6 }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.1)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >{emoji}</button>
                  ))}
                </div>
              )}
              {typingUsers.length > 0 && (
                <div style={{ padding: '4px 16px', fontSize: 12, color: V.mut, fontStyle: 'italic', fontFamily: crimson }}>
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </div>
              )}
              <div style={{ borderTop: `1px solid ${V.bdr}`, padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'flex-end', background: V.s2, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                <input
                  ref={dmFileRef}
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  style={{ display: 'none' }}
                  onChange={async e => {
                    const file = e.target.files?.[0]
                    if (!file || !selectedConvo || !streamToken || !apiKey) return
                    e.target.value = ''
                    const form = new FormData()
                    form.append('file', file)
                    form.append('user_id', userId)
                    const isImage = file.type.startsWith('image/')
                    const endpoint = isImage ? `/channels/messaging/${selectedConvo}/image` : `/channels/messaging/${selectedConvo}/file`
                    const res = await fetch(`https://chat.stream-io-api.com${endpoint}?api_key=${apiKey}`, {
                      method: 'POST',
                      headers: { Authorization: streamToken, 'Stream-Auth-Type': 'jwt' },
                      body: form,
                    })
                    const data = await res.json()
                    const url = data.file || data.image_url || data.url
                    if (url) {
                      await streamFetch(`/channels/messaging/${selectedConvo}/message`, 'POST', streamToken, apiKey, {
                        message: { text: '', attachments: [{ type: isImage ? 'image' : 'file', asset_url: url, title: file.name, file_size: file.size }] }
                      })
                      const d = await streamFetch(`/channels/messaging/${selectedConvo}/query`, 'POST', streamToken, apiKey, { state: true, messages: { limit: 50 } })
                      if (d.messages) setMessages(d.messages)
                    }
                  }}
                />
                <button
                  title="Attach file or image"
                  onClick={() => dmFileRef.current?.click()}
                  style={{ padding: '10px', background: 'transparent', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 8, color: V.mut, cursor: 'pointer', alignSelf: 'flex-end', flexShrink: 0, fontSize: 16 }}
                >📎</button>
                <button
                  onClick={() => setShowEmojiPicker(v => !v)}
                  style={{ padding: '10px', background: showEmojiPicker ? 'rgba(201,168,76,0.15)' : 'transparent', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 8, color: V.mut, cursor: 'pointer', alignSelf: 'flex-end', flexShrink: 0, fontSize: 16 }}
                >😊</button>
                <textarea
                  value={msgDraft}
                  onChange={e => { setMsgDraft(e.target.value); sendTyping() }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
                  placeholder="Type a message... (Enter to send)"
                  rows={2}
                  style={{ flex: 1, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, padding: '10px 12px', color: V.txt, fontFamily: crimson, fontSize: 14, outline: 'none', resize: 'none' as const }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!msgDraft.trim()}
                  style={{ padding: '10px 16px', flexShrink: 0, background: msgDraft.trim() ? G : 'rgba(201,168,76,0.2)', border: 'none', borderRadius: 8, color: msgDraft.trim() ? '#0D0B14' : V.mut, fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', cursor: msgDraft.trim() ? 'pointer' : 'not-allowed', fontWeight: 700, alignSelf: 'flex-end' }}
                >Send</button>
              </div>
            </div>
          </div>
        )}

        {/* New DM modal */}
        {showNewDM && (
          <div onClick={() => setShowNewDM(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: isDark ? '#0D0B14' : '#fff', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 12, width: '100%', maxWidth: 400, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.85)' }}>
              <div style={{ fontFamily: cinzel, fontSize: 13, letterSpacing: '0.1em', color: G, marginBottom: 16 }}>New Direct Message</div>
              <input
                autoFocus
                type="text"
                value={newDMSearch}
                onChange={e => setNewDMSearch(e.target.value)}
                placeholder="Search members..."
                style={{ width: '100%', boxSizing: 'border-box', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 6, padding: '8px 12px', color: isDark ? '#f0e8d8' : '#1C1407', fontFamily: crimson, fontSize: 14, outline: 'none', marginBottom: 12 }}
              />
              <div style={{ maxHeight: 240, overflowY: 'auto' as const }}>
                {dmMembers.filter(m => m.id !== userId && `${m.firstName || ''} ${m.lastName || ''} ${m.username || ''}`.toLowerCase().includes(newDMSearch.toLowerCase())).map(m => {
                  const name = m.firstName ? `${m.firstName} ${m.lastName || ''}`.trim() : m.username || 'Member'
                  return (
                    <div
                      key={m.id}
                      onClick={() => { onStartDM?.(m.id, name); setShowNewDM(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.08)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 13, color: G, overflow: 'hidden', flexShrink: 0 }}>
                        {m.imageUrl ? <img src={m.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontFamily: cinzel, fontSize: 11, color: isDark ? '#f0e8d8' : '#1C1407', letterSpacing: '0.04em' }}>{name}</div>
                        <TierBadge tier={m.publicMetadata?.tier || 'Watchman'} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
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

function MembersView({ members, currentUserId, currentUserTier, currentUserRole, onViewProfile, onStartDM, setActiveSection, isDark, isMobile }: MembersViewProps) {
  const [search, setSearch]       = useState('')
  const [filterTier, setFilterTier] = useState('All')

  const TIER_ORDER: Record<string,number> = { Watchman:1, Soldier:2, Commander:3, General:4 }
  const TIER_COLORS: Record<string,string> = { General:'#C9A84C', Commander:'#8B9DCA', Soldier:'#7a9e7e', Watchman:'#6b6b7a' }
  const TIER_GLOW:  Record<string,string> = { General:'rgba(201,168,76,0.25)', Commander:'rgba(139,157,202,0.2)', Soldier:'rgba(122,158,126,0.15)', Watchman:'rgba(107,107,122,0.1)' }

  const bg   = isDark ? '#0D0B14' : '#f5f3ee'
  const s1   = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
  const s2   = isDark ? 'rgba(255,255,255,0.06)' : '#ffffff'
  const bdr  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const txt  = isDark ? '#e8e0d0' : '#1a1a2e'
  const muted = isDark ? 'rgba(232,224,208,0.45)' : 'rgba(26,26,46,0.45)'
  const mc   = cinzel

  const tierNum = TIER_ORDER[currentUserTier || 'Watchman'] || 1
  const canDM   = currentUserRole === 'admin' || tierNum >= 2

  const q = search.toLowerCase()
  const filtered = members
    .filter(m => {
      const name = `${m.firstName||''} ${m.lastName||''} ${m.username||''}`.toLowerCase()
      const matchSearch = !q || name.includes(q)
      const matchTier   = filterTier === 'All' || (m.publicMetadata?.tier || 'Watchman') === filterTier
      return matchSearch && matchTier
    })
    .sort((a,b) => {
      const ta = TIER_ORDER[a.publicMetadata?.tier || 'Watchman'] || 1
      const tb = TIER_ORDER[b.publicMetadata?.tier || 'Watchman'] || 1
      if (tb !== ta) return tb - ta
      return `${a.firstName}${a.lastName}`.localeCompare(`${b.firstName}${b.lastName}`)
    })

  const featured  = filtered.filter(m => ['General','Commander'].includes(m.publicMetadata?.tier || ''))
  const roster    = filtered.filter(m => !['General','Commander'].includes(m.publicMetadata?.tier || ''))

  function MemberCard({ member, large = false }: { member: any, large?: boolean }) {
    const tier        = member.publicMetadata?.tier || 'Watchman'
    const tierColor   = TIER_COLORS[tier] || '#6b6b7a'
    const tierGlow    = TIER_GLOW[tier] || 'transparent'
    const isOwn       = member.id === currentUserId
    const displayName = member.fullName || (member.firstName ? `${member.firstName} ${member.lastName||''}`.trim() : member.username || 'Warrior')
    const avatarSize  = large ? 72 : 48
    const initials    = ((member.firstName?.[0]||'') + (member.lastName?.[0]||'')).toUpperCase() || displayName[0]?.toUpperCase() || 'W'

    return (
      <div
        onClick={() => onViewProfile(member)}
        style={{
          background: large ? `linear-gradient(135deg, ${s2}, ${tierGlow})` : s2,
          border: `1px solid ${large ? tierColor + '55' : bdr}`,
          borderRadius: large ? 16 : 12,
          padding: large ? '24px 20px' : '16px 14px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          gap: large ? 10 : 8,
          position: 'relative' as const,
          transition: 'transform 0.15s, box-shadow 0.15s',
          boxShadow: large ? `0 4px 24px ${tierGlow}` : 'none',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${tierGlow}` }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = large ? `0 4px 24px ${tierGlow}` : 'none' }}
      >
        {isOwn && (
          <div style={{ position:'absolute', top:8, right:8, fontSize:9, fontFamily:mc, color:'#C9A84C', letterSpacing:'0.08em', background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:4, padding:'2px 6px' }}>YOU</div>
        )}
        {large && tier === 'General' && (
          <div style={{ position:'absolute', top:10, left:12, fontSize:14 }}>⚔️</div>
        )}
        {large && tier === 'Commander' && (
          <div style={{ position:'absolute', top:10, left:12, fontSize:14 }}>🛡️</div>
        )}
        <div style={{ width:avatarSize, height:avatarSize, borderRadius:'50%', border:`2px solid ${tierColor}`, overflow:'hidden', flexShrink:0, background:`rgba(201,168,76,0.1)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:large?24:16, fontFamily:mc, color:'#C9A84C', boxShadow: large ? `0 0 16px ${tierGlow}` : 'none' }}>
          {member.imageUrl ? <img src={member.imageUrl} alt={displayName} style={{ width:'100%', height:'100%', objectFit:'cover' as const }} /> : initials}
        </div>
        <div style={{ textAlign:'center' as const, width:'100%' }}>
          <div style={{ fontFamily:mc, fontSize: large ? 13 : 11, color:txt, letterSpacing:'0.05em', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{displayName}</div>
          <div style={{ display:'inline-block', marginTop:4, padding:'2px 8px', borderRadius:10, background:`${tierColor}22`, border:`1px solid ${tierColor}55`, fontFamily:mc, fontSize:9, color:tierColor, letterSpacing:'0.1em', textTransform:'uppercase' as const }}>{tier}</div>
        </div>
        {!isOwn && (
          <button
            onClick={e => { e.stopPropagation(); canDM ? onStartDM(member.id, displayName) : onViewProfile(member) }}
            style={{ marginTop:2, padding: large ? '6px 18px' : '4px 12px', background: canDM ? 'rgba(201,168,76,0.1)' : 'transparent', border:`1px solid ${canDM ? 'rgba(201,168,76,0.4)' : bdr}`, borderRadius:6, color: canDM ? '#C9A84C' : muted, fontFamily:mc, fontSize:9, letterSpacing:'0.08em', cursor:'pointer', textTransform:'uppercase' as const }}
          >{canDM ? '💬 Message' : '🔒 Soldier+'}</button>
        )}
      </div>
    )
  }

  return (
    <div style={{ flex:1, overflowY:'auto' as const, background:bg, padding: isMobile ? '16px' : '24px 32px' }}>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:mc, fontSize: isMobile ? 18 : 22, color:'#C9A84C', letterSpacing:'0.12em', marginBottom:4 }}>⚔ INTEL ROSTER</div>
        <div style={{ fontFamily:crimson, fontSize:14, color:muted }}>{members.length} warrior{members.length!==1?'s':''} registered</div>
      </div>

      {/* Search + Filter */}
      <div style={{ display:'flex', gap:10, marginBottom:24, flexWrap:'wrap' as const }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search warriors..."
          style={{ flex:1, minWidth:160, padding:'8px 12px', background:s2, border:`1px solid ${bdr}`, borderRadius:8, color:txt, fontFamily:crimson, fontSize:14, outline:'none' }}
        />
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' as const }}>
          {['All','General','Commander','Soldier','Watchman'].map(t => (
            <button key={t} onClick={() => setFilterTier(t)}
              style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${filterTier===t ? TIER_COLORS[t]||'#C9A84C' : bdr}`, background: filterTier===t ? (TIER_COLORS[t]||'#C9A84C')+'22' : 'transparent', color: filterTier===t ? (TIER_COLORS[t]||'#C9A84C') : muted, fontFamily:mc, fontSize:9, letterSpacing:'0.08em', cursor:'pointer', textTransform:'uppercase' as const }}
            >{t}</button>
          ))}
        </div>
      </div>

      {/* Featured: Generals + Commanders */}
      {featured.length > 0 && (
        <div style={{ marginBottom:32 }}>
          <div style={{ fontFamily:mc, fontSize:10, color:muted, letterSpacing:'0.15em', marginBottom:12, textTransform:'uppercase' as const }}>— Field Leadership —</div>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : `repeat(${Math.min(featured.length, 4)}, 1fr)`, gap:16 }}>
            {featured.map(m => <MemberCard key={m.id} member={m} large={true} />)}
          </div>
        </div>
      )}

      {/* Roster: Soldiers + Watchmen */}
      {roster.length > 0 && (
        <div>
          {featured.length > 0 && <div style={{ fontFamily:mc, fontSize:10, color:muted, letterSpacing:'0.15em', marginBottom:12, textTransform:'uppercase' as const }}>— Active Warriors —</div>}
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(140px, 1fr))', gap:12 }}>
            {roster.map(m => <MemberCard key={m.id} member={m} large={false} />)}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign:'center' as const, padding:'60px 20px', color:muted, fontFamily:crimson, fontSize:16 }}>No warriors found.</div>
      )}
    </div>
  )
}

// ── POST CARD ──────────────────────────────────────────────
function PostCard({ msg, pinned, actions, isDark = true, hoveredId, onHover, streamToken, apiKey, onReaction }: {
  msg: StreamMsg; pinned?: boolean; actions?: React.ReactNode; isDark?: boolean;
  hoveredId?: string | null; onHover?: (id: string | null) => void;
  streamToken?: string; apiKey?: string; onReaction?: () => void;
}) {
  const V = {
    bg: isDark ? '#0D0B14' : '#f5f0e8', surf: isDark ? '#1a1714' : '#f0ebe3',
    card: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    bdr: isDark ? 'rgba(201,168,76,0.15)' : 'rgba(160,120,48,0.25)',
    txt: isDark ? '#f0e8d8' : '#1a1410', mut: isDark ? '#9a8c74' : '#5c4a3a',
    dim: isDark ? '#c8b99a' : '#7a6555', s2: isDark ? '#1c1814' : '#e8e0d4', gold: isDark ? '#C9A84C' : '#a07830',
  }
  const emojiMap: Record<string, string> = { pray: '🙏', love: '❤️', fire: '🔥', cross: '✝️', sword: '⚔️' }
  const initial = (msg.user?.name || msg.user?.id || '?')[0].toUpperCase()
  const time    = new Date(msg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
  return (
    <div
      onMouseEnter={() => onHover?.(msg.id)}
      onMouseLeave={() => onHover?.(null)}
      style={{ background: V.card, border: `1px solid ${V.bdr}`, borderRadius: 6, padding: 20, marginBottom: 12, position: 'relative', overflow: 'visible' }}
    >
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
          {/* Reactions */}
          <div style={{ position: 'relative', display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginTop: 8, alignItems: 'center' }}>
            {hoveredId === msg.id && streamToken && (
              <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 4, display: 'flex', gap: 3, background: V.surf, border: `1px solid ${V.bdr}`, borderRadius: 16, padding: '3px 8px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', zIndex: 9999, whiteSpace: 'nowrap' as const }}>
                {([['pray','🙏'],['love','❤️'],['fire','🔥'],['cross','✝️'],['sword','⚔️']] as [string,string][]).map(([type, emoji]) => (
                  <button
                    key={type}
                    onClick={() => {
                      if (streamToken && apiKey) {
                        streamFetch(`/messages/${msg.id}/reaction`, 'POST', streamToken, apiKey, { reaction: { type } })
                          .then(() => onReaction?.())
                      }
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 4px', borderRadius: 8, transition: 'transform 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
                  >{emoji}</button>
                ))}
              </div>
            )}
            {msg.reaction_counts && Object.entries(msg.reaction_counts).map(([type, count]) => (
              <button
                key={type}
                onClick={() => {
                  if (streamToken && apiKey) {
                    streamFetch(`/messages/${msg.id}/reaction`, 'POST', streamToken, apiKey, { reaction: { type } })
                      .then(() => onReaction?.())
                  }
                }}
                style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 12, padding: '2px 7px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, color: V.txt }}
              >
                {emojiMap[type] || type} <span style={{ fontSize: 10, color: V.mut }}>{String(count)}</span>
              </button>
            ))}
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
function PrayerView({ streamToken, apiKey, userId, isMobile, isDark, setSidebarOpen }: PrayerViewProps) {
  const V = {
    bg: isDark ? '#0D0B14' : '#f5f0e8', surf: isDark ? '#1a1714' : '#f0ebe3',
    card: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    bdr: isDark ? 'rgba(201,168,76,0.15)' : 'rgba(160,120,48,0.25)',
    txt: isDark ? '#f0e8d8' : '#1a1410', mut: isDark ? '#9a8c74' : '#5c4a3a',
    dim: isDark ? '#c8b99a' : '#7a6555', s2: isDark ? '#1c1814' : '#e8e0d4', gold: isDark ? '#C9A84C' : '#a07830',
  }
  const [draft,           setDraft]           = useState('')
  const [prayers,         setPrayers]         = useState<StreamMsg[]>([])
  const [hoveredPrayerId, setHoveredPrayerId] = useState<string | null>(null)
  const [editingPostId,   setEditingPostId]   = useState<string | null>(null)
  const [editDraft,       setEditDraft]       = useState('')
  const [showPrayerEmoji, setShowPrayerEmoji] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const PRAYER_EMOJIS = ['🙏','❤️','🔥','✝️','⚔️','💪','🕊️','👑','🌿','💧','🗡️','📖','🏔️','⭐','🌟','💛','🤍','🫶','🙌','✨']

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
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${V.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(o => !o)}
              style={{ background: 'none', border: 'none', color: G, fontSize: 20, cursor: 'pointer' }}>
              ☰
            </button>
          )}
          <span style={{ fontFamily: cinzel, fontSize: 18, color: G }}>🙏 Prayer Wall</span>
        </div>
        <button
          onClick={() => inputRef.current?.focus()}
          style={{ padding: '6px 14px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '6px', color: G, fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const }}
        >+ Add Prayer</button>
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
          <PostCard
            key={m.id}
            msg={m}
            isDark={isDark}
            hoveredId={hoveredPrayerId}
            onHover={setHoveredPrayerId}
            streamToken={streamToken}
            apiKey={apiKey}
            onReaction={fetchPrayers}
            actions={m.user?.id === userId || user?.publicMetadata?.role === 'minister' ? (
              editingPostId === m.id ? (
                <div>
                  <textarea
                    value={editDraft}
                    onChange={e => setEditDraft(e.target.value)}
                    rows={3}
                    style={{ width: '100%', boxSizing: 'border-box', background: V.card, border: `1px solid ${V.bdr}`, borderRadius: 4, padding: '6px 8px', color: V.txt, fontFamily: crimson, fontSize: 14, resize: 'none' as const, outline: 'none', marginBottom: 6 }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => streamFetch(`/messages/${m.id}`, 'PUT', streamToken, apiKey, { message: { text: editDraft } }).then(() => { fetchPrayers(); setEditingPostId(null) })}
                      style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 4, color: G, fontFamily: cinzel, fontSize: 10, padding: '3px 8px', cursor: 'pointer' }}
                    >Save</button>
                    <button
                      onClick={() => setEditingPostId(null)}
                      style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: V.mut, fontFamily: cinzel, fontSize: 10, padding: '3px 8px', cursor: 'pointer' }}
                    >Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => { setEditingPostId(m.id); setEditDraft(m.text || '') }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: V.mut, fontFamily: cinzel, letterSpacing: '0.06em', padding: '2px 6px', borderRadius: '4px' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = G}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = V.mut}
                  >✏ Edit</button>
                  <button
                    onClick={() => handleDeletePrayer(m.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: V.mut, fontFamily: cinzel, letterSpacing: '0.06em', padding: '2px 6px', borderRadius: '4px' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#e05c5c'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = V.mut}
                  >🗑 Delete</button>
                </div>
              )
            ) : undefined}
          />
        ))}
      </div>
      <div style={{ padding: '12px 20px', borderTop: `1px solid ${V.bdr}`, background: V.s2, flexShrink: 0, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Add a prayer request..."
            style={{ flex: 1, background: V.bg, border: `1px solid ${V.bdr}`, borderRadius: 8, padding: '10px 14px', color: V.txt, fontFamily: crimson, fontSize: 16, outline: 'none' }}
          />
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              type="button"
              onClick={() => setShowPrayerEmoji(p => !p)}
              style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 18, color: '#C9A84C' }}
              title="Add emoji"
            >😊</button>
            {showPrayerEmoji && (
              <div style={{ position: 'absolute', bottom: '110%', left: 0, background: '#1a1628', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8, padding: 8, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, zIndex: 1000, width: 180 }}>
                {PRAYER_EMOJIS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => { setDraft(prev => prev + e); setShowPrayerEmoji(false) }}
                    style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', padding: 4, borderRadius: 4, lineHeight: 1 }}
                  >{e}</button>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleSend} disabled={!draft.trim()}
            style={{ background: draft.trim() ? G : 'rgba(201,168,76,0.3)', color: draft.trim() ? '#0D0B14' : V.mut, border: 'none', borderRadius: 8, padding: '10px 18px', fontFamily: cinzel, fontSize: 13, cursor: draft.trim() ? 'pointer' : 'default', fontWeight: 700, whiteSpace: 'nowrap' }}>
            🙏 Post
          </button>
        </div>
      </div>
    </div>
  )
}

// ── WAR ROOM CHAT VIEW ─────────────────────────────────────
interface WarRoomChatViewProps {
  streamToken: string
  apiKey: string
  userId: string
  userName: string
  userImageUrl: string
  isDark: boolean
  isMobile: boolean
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>
}

function WarRoomChatView({ streamToken, apiKey, userId, isDark, isMobile, setSidebarOpen }: WarRoomChatViewProps) {
  const [messages, setMessages] = useState<StreamMsg[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const warRoomFileRef = useRef<HTMLInputElement>(null)

  const V = {
    bg:   isDark ? '#0D0B14' : '#f5f0e8',
    surf: isDark ? '#1a1714' : '#f0ebe3',
    bdr:  isDark ? 'rgba(201,168,76,0.15)' : 'rgba(160,120,48,0.25)',
    txt:  isDark ? '#f0e8d8' : '#1a1410',
    mut:  isDark ? '#9a8c74' : '#5c4a3a',
    s2:   isDark ? '#1c1814' : '#e8e0d4',
  }

  const fetchMessages = useCallback(async () => {
    if (!streamToken || !apiKey) return
    try {
      const d = await streamFetch(
        '/channels/messaging/war-room-general/query',
        'POST', streamToken, apiKey,
        { state: true, messages: { limit: 50 } }
      )
      if (d.messages) {
        setMessages(d.messages)
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    } catch {}
  }, [streamToken, apiKey])

  useEffect(() => {
    fetchMessages()
    const t = setInterval(fetchMessages, 5000)
    return () => clearInterval(t)
  }, [fetchMessages])

  async function handleSend() {
    if (!draft.trim() || sending) return
    const text = draft.trim()
    setSending(true)
    setDraft('')
    try {
      await streamFetch(
        '/channels/messaging/war-room-general/message',
        'POST', streamToken, apiKey,
        { message: { text, user_id: userId } }
      )
      await fetchMessages()
    } catch { setDraft(text) } finally { setSending(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: V.bg }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${V.bdr}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: V.surf }}>
        {isMobile && (
          <button onClick={() => setSidebarOpen(o => !o)} style={{ background: 'none', border: 'none', color: '#C9A84C', fontSize: 20, cursor: 'pointer' }}>☰</button>
        )}
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: '#C9A84C', letterSpacing: '0.1em', flex: 1 }}>⚔ War Room Chat</span>
        <span style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontSize: 12, color: V.mut, fontStyle: 'italic' }}>All members</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: V.mut, fontStyle: 'italic', fontFamily: "'Crimson Pro', Georgia, serif", fontSize: 14, marginTop: 60 }}>
            No messages yet. Be the first to speak.
          </div>
        )}
        {messages.filter(msg => msg.type !== 'deleted' && !msg.deleted_at).map((msg, i) => {
          const isOwn = msg.user?.id === userId
          const prevMsg = messages[i - 1]
          const sameAuthor = prevMsg && prevMsg.user?.id === msg.user?.id
          const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          return (
            <div key={msg.id} className="msg-row" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: sameAuthor ? 2 : 12 }}
              onMouseEnter={() => setHoveredMsg(msg.id)}
              onMouseLeave={() => setHoveredMsg(null)}
            >
              <div style={{ width: 32, flexShrink: 0 }}>
                {!sameAuthor && (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel', serif", fontSize: 12, color: '#C9A84C', overflow: 'hidden' }}>
                    {msg.user?.image
                      ? <img src={msg.user.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (msg.user?.name || '?')[0].toUpperCase()
                    }
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {!sameAuthor && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: isOwn ? '#C9A84C' : V.txt, fontWeight: 600, letterSpacing: '0.04em' }}>
                      {msg.user?.name || 'Warrior'}
                    </span>
                    <span style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontSize: 11, color: V.mut }}>{time}</span>
                  </div>
                )}
                {editingId === msg.id ? (
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'flex-end' }}>
                    <textarea
                      autoFocus
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          streamFetch(`/messages/${msg.id}`, 'PUT', streamToken, apiKey, { message: { text: editText } })
                            .then(() => { setEditingId(null); fetchMessages() })
                        }
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      rows={2}
                      style={{ flex: 1, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 6, padding: '6px 10px', color: V.txt, fontFamily: "'Crimson Pro', Georgia, serif", fontSize: 14, outline: 'none', resize: 'none' as const }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 3 }}>
                      <button
                        onClick={() => streamFetch(`/messages/${msg.id}`, 'PUT', streamToken, apiKey, { message: { text: editText } }).then(() => { setEditingId(null); fetchMessages() })}
                        style={{ padding: '4px 10px', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 4, color: '#C9A84C', fontFamily: cinzel, fontSize: 9, cursor: 'pointer' }}
                      >Save</button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{ padding: '4px 10px', background: 'none', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 4, color: V.mut, fontFamily: cinzel, fontSize: 9, cursor: 'pointer' }}
                      >Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{
                      fontFamily: "'Crimson Pro', Georgia, serif",
                      fontSize: 15, color: V.txt, lineHeight: 1.5,
                      wordBreak: 'break-word',
                      background: isOwn ? 'rgba(201,168,76,0.06)' : 'transparent',
                      borderRadius: isOwn ? 6 : 0,
                      padding: isOwn ? '4px 8px' : '0',
                      display: 'inline-block', maxWidth: '100%',
                    }}>
                      {msg.text}
                      {(msg as any).attachments?.map((att: any, i: number) => (
                        att.type === 'image' || att.image_url || att.thumb_url ? (
                          <img key={i} src={att.asset_url || att.image_url || att.thumb_url} alt={att.title || 'image'}
                            style={{ display: 'block', maxWidth: '100%', maxHeight: 300, borderRadius: 8, marginTop: msg.text ? 6 : 0, cursor: 'pointer' }}
                            onClick={() => window.open(att.asset_url || att.image_url, '_blank')}
                          />
                        ) : att.asset_url ? (
                          <a key={i} href={att.asset_url} target="_blank" rel="noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: msg.text ? 6 : 0, color: '#C9A84C', fontSize: 13, textDecoration: 'none' }}>
                            📄 {att.title || 'File'}
                          </a>
                        ) : null
                      ))}
                      {(msg as any).attachments?.filter((att: any) => att.type === 'url' || att.og_scrape_url).map((att: any, i: number) => (
                        <a key={`url-${i}`} href={att.og_scrape_url || att.title_link} target="_blank" rel="noreferrer"
                          style={{ display: 'block', marginTop: 8, borderRadius: 8, border: '1px solid rgba(201,168,76,0.2)', overflow: 'hidden', textDecoration: 'none', background: 'rgba(201,168,76,0.05)' }}>
                          {att.image_url && <img src={att.image_url} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover' as const }} />}
                          <div style={{ padding: '8px 10px' }}>
                            {att.title && <div style={{ fontFamily: cinzel, fontSize: 12, color: '#C9A84C', marginBottom: 2 }}>{att.title}</div>}
                            {att.text && <div style={{ fontFamily: crimson, fontSize: 12, color: V.mut, lineHeight: 1.4 }}>{att.text.slice(0, 120)}{att.text.length > 120 ? '...' : ''}</div>}
                            <div style={{ fontFamily: crimson, fontSize: 11, color: V.mut, marginTop: 4, opacity: 0.7 }}>{att.og_scrape_url}</div>
                          </div>
                        </a>
                      ))}
                    </div>
                    {/* Reactions */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginTop: 2, alignItems: 'center' }}>
                      {msg.reaction_counts && Object.entries(msg.reaction_counts).map(([type, count]) => {
                        const emojiMap: Record<string, string> = { pray: '🙏', love: '❤️', fire: '🔥', cross: '✝️', sword: '⚔️' }
                        const emoji = emojiMap[type] || type
                        return (
                          <button
                            key={type}
                            onClick={() => streamFetch(`/messages/${msg.id}/reaction`, 'POST', streamToken, apiKey, { reaction: { type } }).then(() => fetchMessages())}
                            style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 12, padding: '2px 7px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, color: V.txt }}
                          >
                            {emoji} <span style={{ fontSize: 10, color: V.mut }}>{String(count)}</span>
                          </button>
                        )
                      })}
                      {hoveredMsg === msg.id && (
                        <div style={{ display: 'flex', gap: 3, background: V.surf, border: `1px solid ${V.bdr}`, borderRadius: 16, padding: '3px 8px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                          {([['pray','🙏'],['love','❤️'],['fire','🔥'],['cross','✝️'],['sword','⚔️']] as [string,string][]).map(([type, emoji]) => (
                            <button
                              key={type}
                              onClick={() => streamFetch(`/messages/${msg.id}/reaction`, 'POST', streamToken, apiKey, { reaction: { type } }).then(() => fetchMessages())}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 4px', borderRadius: 8, transition: 'transform 0.1s' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.3)'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
                            >{emoji}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {isOwn && (
                      <div className="msg-actions" style={{ display: 'flex', gap: 6, marginTop: 3, opacity: 0, transition: 'opacity 0.15s' }}>
                        <button
                          onClick={() => { setEditingId(msg.id); setEditText(msg.text || '') }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: V.mut, fontFamily: cinzel, padding: '1px 6px', borderRadius: 4 }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#C9A84C'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = V.mut}
                        >✏ Edit</button>
                        <button
                          onClick={async () => {
                            if (!confirm('Delete this message?')) return
                            try {
                              await streamFetch(`/messages/${msg.id}`, 'DELETE', streamToken, apiKey, undefined)
                              await fetchMessages()
                            } catch {}
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: V.mut, fontFamily: cinzel, padding: '1px 6px', borderRadius: 4 }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#e05c5c'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = V.mut}
                        >🗑 Delete</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, borderTop: `1px solid ${V.bdr}`, padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'flex-end', background: V.s2, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <input
          ref={warRoomFileRef}
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx"
          style={{ display: 'none' }}
          onChange={async e => {
            const file = e.target.files?.[0]
            if (!file || !streamToken || !apiKey) return
            e.target.value = ''
            const form = new FormData()
            form.append('file', file)
            form.append('user_id', userId)
            const isImage = file.type.startsWith('image/')
            const endpoint = isImage ? `/channels/messaging/war-room-general/image` : `/channels/messaging/war-room-general/file`
            const res = await fetch(`https://chat.stream-io-api.com${endpoint}?api_key=${apiKey}`, {
              method: 'POST',
              headers: { Authorization: streamToken, 'Stream-Auth-Type': 'jwt' },
              body: form,
            })
            const data = await res.json()
            const url = data.file || data.image_url || data.url
            if (url) {
              await streamFetch(`/channels/messaging/war-room-general/message`, 'POST', streamToken, apiKey, {
                message: { text: '', attachments: [{ type: isImage ? 'image' : 'file', asset_url: url, title: file.name, file_size: file.size }] }
              })
              fetchMessages()
            }
          }}
        />
        <button
          title="Attach file or image"
          onClick={() => warRoomFileRef.current?.click()}
          style={{ padding: '10px', background: 'transparent', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 8, color: V.mut, cursor: 'pointer', alignSelf: 'flex-end', flexShrink: 0, fontSize: 16 }}
        >📎</button>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Message the War Room... (Enter to send)"
          rows={2}
          style={{
            flex: 1, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8,
            padding: '10px 12px', color: V.txt,
            fontFamily: "'Crimson Pro', Georgia, serif", fontSize: 14,
            outline: 'none', resize: 'none' as const,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          style={{
            padding: '10px 16px', flexShrink: 0,
            background: draft.trim() && !sending ? '#C9A84C' : 'rgba(201,168,76,0.2)',
            border: 'none', borderRadius: 8,
            color: draft.trim() && !sending ? '#0D0B14' : '#6b6b7a',
            fontFamily: "'Cinzel', serif", fontSize: 11,
            letterSpacing: '0.08em', cursor: draft.trim() && !sending ? 'pointer' : 'not-allowed',
            fontWeight: 700, alignSelf: 'flex-end',
          }}
        >{sending ? '...' : 'Send'}</button>
      </div>
    </div>
  )
}

// ── DATABASE VIEW ──────────────────────────────────────────
// ── STRIPE UPGRADE LINKS ──────────────────────────────────────────────────────
const STRIPE_LINKS: Record<string, string> = {
  Soldier:   'https://buy.stripe.com/4gM6oA68wblRdI9b4XfrW00',
  Commander: 'https://buy.stripe.com/6oU8wI1Sg4Xt1ZrgphfrW01',
  General:   'https://buy.stripe.com/aFa00c0Oc4Xt5bD0qjfrW02',
}
const TIER_LEVEL: Record<string, number> = { free: 0, watchman: 0, soldier: 1, commander: 2, general: 3 }
const tierNum = (t: string) => TIER_LEVEL[t?.toLowerCase()] ?? 0

// ── WEEKLY INTEL VIEW ────────────────────────────────────────────────────────
function WeeklyIntelView({ theme, userTier, isMobile, setSidebarOpen, setActiveSection }: {
  theme: string; userTier: string; isMobile: boolean; setSidebarOpen: (v: boolean) => void; setActiveSection: (s: string) => void
}) {
  const { user }     = useUser()
  const { getToken } = useAuth()
  const isMinister   = (user?.publicMetadata?.role as string) === 'minister'
  const isDark       = theme !== 'light'
  const GG           = '#C9A84C'
  const bg           = isDark ? '#0D0B14' : '#faf8f4'
  const surf         = isDark ? 'rgba(201,168,76,0.04)' : '#f0ebe3'
  const bdr          = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(160,120,48,0.25)'
  const txt          = isDark ? '#E8D5B0' : '#1a1410'
  const mut          = isDark ? '#8B7355' : '#5c4a3a'
  const dm           = isDark ? '#5a4f3a' : '#7a6555'
  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: isDark ? 'rgba(13,11,20,0.8)' : '#f5f0e8',
    border: `1px solid ${bdr}`, borderRadius: 6, padding: '8px 12px',
    color: txt, fontSize: 13, fontFamily: "'Crimson Pro', serif", outline: 'none',
  }

  const [posts, setPosts]         = useState<any[]>([])
  const [links, setLinks]         = useState<any[]>([])
  const [reports, setReports]     = useState<any[]>([])
  const [resources, setResources] = useState<any[]>([])
  const [demons, setDemons]       = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [recentResources, setRecentResources] = useState<any[]>([])

  const [showReportForm, setShowReportForm] = useState(false)
  const [reportForm, setReportForm]         = useState({ spirit_names: '', manifestations: '', entry_points: '', outcome: '', notes: '', location_city: '', location_state: '' })
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportSuccess, setReportSuccess]       = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetchAll() {
      const token = await getToken()
      const auth  = { 'Authorization': `Bearer ${token}` }
      const [postsRes, linksRes, reportsRes, resourcesRes, demonsRes] = await Promise.allSettled([
        fetch('/api/intel-posts').then(r => r.json()),
        fetch('/api/intel-links').then(r => r.json()),
        fetch('/api/field-reports', { headers: auth }).then(r => r.json()),
        fetch('/api/arsenal-resources', { headers: auth }).then(r => r.json()),
        fetch('/api/demons').then(r => r.json()),
      ])
      if (cancelled) return
      if (postsRes.status     === 'fulfilled') setPosts(postsRes.value.posts || [])
      if (linksRes.status     === 'fulfilled') setLinks(linksRes.value.links || [])
      if (reportsRes.status   === 'fulfilled') setReports(reportsRes.value.reports || [])
      if (resourcesRes.status === 'fulfilled') setResources((resourcesRes.value.resources || []).slice(0, 4))
      if (demonsRes.status    === 'fulfilled') setDemons((demonsRes.value.demons || []).slice(0, 5))
      setLoading(false)
    }
    fetchAll()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    async function load() {
      const token = await getToken()
      const res = await fetch('/api/arsenal-resources?limit=3&sort=newest', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const d = await res.json()
        setRecentResources(d.resources?.slice(0, 3) || [])
      }
    }
    load()
  }, [])

  async function submitReport() {
    if (!reportForm.spirit_names || !reportForm.manifestations) return
    setReportSubmitting(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/field-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(reportForm),
      })
      if (res.ok) {
        setReportSuccess(true)
        setShowReportForm(false)
        setReportForm({ spirit_names: '', manifestations: '', entry_points: '', outcome: '', notes: '', location_city: '', location_state: '' })
      }
    } finally { setReportSubmitting(false) }
  }

  const sectionHead = (title: string, subtitle?: string) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{ flex: 1, height: 1, background: `${GG}30` }} />
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.2em', color: GG, textTransform: 'uppercase' as const }}>{title}</div>
        <div style={{ flex: 1, height: 1, background: `${GG}30` }} />
      </div>
      {subtitle && <div style={{ textAlign: 'center', fontSize: 12, color: mut, fontStyle: 'italic' }}>{subtitle}</div>}
    </div>
  )

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
      <div style={{ fontFamily: "'Cinzel', serif", color: GG, fontSize: 13, letterSpacing: '0.1em' }}>Loading Intel...</div>
    </div>
  )

  const recentDemons = [...demons]
    .sort((a, b) => (b.createdTime || '').localeCompare(a.createdTime || ''))
    .slice(0, 3)

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: bg }}>

    <div style={{ padding: isMobile ? '16px' : '24px 28px', maxWidth: 1100 }}>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        {isMobile && (
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: GG, fontSize: 20, cursor: 'pointer', padding: '0 0 8px', display: 'block' }}>☰</button>
        )}
        <h2 style={{ fontFamily: cinzel, color: GG, fontSize: 20, marginBottom: 4, margin: 0 }}>⚡ Weekly Intel</h2>
        <p style={{ color: mut, fontSize: 13, margin: '4px 0 0' }}>Latest briefings, field reports, and intelligence drops</p>
      </div>

      {/* FULL WIDTH — Intel Briefing */}
      <div style={{ marginBottom: 32 }}>

      {/* ── BRIEFINGS ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 36 }}>
        {sectionHead('Intel Briefing', 'Latest operational updates from leadership')}
        {posts.length === 0 ? (
          <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>📡</div>
            <div style={{ fontFamily: "'Cinzel', serif", color: GG, fontSize: 14, marginBottom: 8 }}>No Briefings Yet</div>
            <div style={{ color: mut, fontSize: 14 }}>Leadership will post operational intel here. Check back soon.</div>
          </div>
        ) : posts.slice(0, 3).map(post => (
          <div key={post.id} style={{ background: surf, border: `1px solid ${bdr}`, borderLeft: `3px solid ${GG}`, borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: GG, fontWeight: 600, marginBottom: 4 }}>{post.title}</div>
                <div style={{ fontSize: 11, color: dm }}>{post.author_name} · {new Date(post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
              </div>
              {post.post_type && (() => {
                const PT: Record<string, { label: string; color: string }> = {
                  'briefing':       { label: '⚔ Briefing',     color: GG      },
                  'watch-report':   { label: '👁 Watch Report', color: '#38bdf8' },
                  'external-alert': { label: '⚡ Alert',        color: '#f87171' },
                }
                const pt = PT[post.post_type] || { label: post.post_type, color: GG }
                return (
                  <span style={{ fontSize: 9, fontFamily: "'Cinzel', serif", letterSpacing: '0.1em', padding: '3px 10px', borderRadius: 999, background: `${pt.color}15`, color: pt.color, border: `1px solid ${pt.color}40` }}>
                    {pt.label}
                  </span>
                )
              })()}
            </div>
            <div style={{ fontSize: 15, color: txt, lineHeight: 1.75, fontFamily: "'Crimson Pro', serif", whiteSpace: 'pre-wrap' as const }}>{post.body}</div>
            {post.scripture && (
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(0,30,10,0.4)', border: '1px solid rgba(134,239,172,0.2)', borderRadius: 6, fontSize: 13, color: '#86efac', fontFamily: "'Crimson Pro', serif", fontStyle: 'italic' }}>
                📖 {post.scripture}
              </div>
            )}
          </div>
        ))}
      </div>
      </div>{/* end Intel Briefing full-width */}

      {/* TWO COLUMNS */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' as const }}>

      {/* LEFT — Field Reports */}
      <div style={{ flex: 2, minWidth: 0 }}>

      {/* ── FIELD REPORTS ─────────────────────────────────────── */}
      <div style={{ marginBottom: 36 }}>
        {sectionHead('Field Reports', 'Intelligence submitted by active ministers in the field')}

        {tierNum(userTier) >= 2 ? (
          <div style={{ marginBottom: 16 }}>
            {!showReportForm && !reportSuccess && (
              <button onClick={() => setShowReportForm(true)} style={{ background: 'transparent', border: `1px solid ${GG}`, borderRadius: 6, padding: '8px 20px', fontFamily: "'Cinzel', serif", fontSize: 11, color: GG, letterSpacing: '0.08em', cursor: 'pointer' }}>
                + Submit Field Report
              </button>
            )}
            {reportSuccess && (
              <div style={{ background: 'rgba(0,30,10,0.4)', border: '1px solid rgba(134,239,172,0.2)', borderRadius: 6, padding: '12px 16px', color: '#86efac', fontSize: 13 }}>
                ✅ Report submitted for review. Thank you for your field intelligence.
              </div>
            )}
            {showReportForm && (
              <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
                <div style={{ fontFamily: "'Cinzel', serif", color: GG, fontSize: 13, letterSpacing: '0.1em', marginBottom: 16 }}>SUBMIT FIELD REPORT</div>
                {([
                  { label: 'Spirits Encountered *', key: 'spirit_names', placeholder: 'e.g. Leviathan, Python, Fear of Rejection' },
                  { label: 'Manifestations Observed *', key: 'manifestations', placeholder: 'What did you see, hear, or discern?' },
                  { label: 'Entry Points Identified', key: 'entry_points', placeholder: 'Trauma, occult, generational...' },
                  { label: 'Outcome', key: 'outcome', placeholder: 'Full deliverance, partial, ongoing...' },
                  { label: 'Additional Notes', key: 'notes', placeholder: 'Anything else ministers should know' },
                ] as const).map(field => (
                  <div key={field.key} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: mut, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }}>{field.label}</div>
                    <textarea value={reportForm[field.key]} onChange={e => setReportForm(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder} rows={2} style={{ ...inp, resize: 'vertical' as const }} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {([{ label: 'City', key: 'location_city' }, { label: 'State', key: 'location_state' }] as const).map(f => (
                    <div key={f.key} style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: mut, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }}>{f.label}</div>
                      <input value={reportForm[f.key]} onChange={e => setReportForm(r => ({ ...r, [f.key]: e.target.value }))} style={inp} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={submitReport} disabled={reportSubmitting || !reportForm.spirit_names || !reportForm.manifestations}
                    style={{ background: GG, color: '#0D0B14', border: 'none', borderRadius: 6, padding: '10px 24px', fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer' }}>
                    {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                  <button onClick={() => setShowReportForm(false)} style={{ background: 'transparent', border: `1px solid ${bdr}`, borderRadius: 6, padding: '10px 20px', color: mut, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 8, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🔒</span>
            <div>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: GG, letterSpacing: '0.06em', marginBottom: 3 }}>Commander Tier Required</div>
              <div style={{ fontSize: 12, color: mut }}>Submit field intelligence reports from your sessions.</div>
            </div>
            <a href={STRIPE_LINKS.Commander} style={{ marginLeft: 'auto', background: GG, color: '#0D0B14', padding: '7px 16px', borderRadius: 5, fontSize: 11, fontFamily: "'Cinzel', serif", fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' as const }}>Upgrade</a>
          </div>
        )}

        {reports.filter(r => r.status === 'approved').length === 0 ? (
          <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 8, padding: '20px 24px', textAlign: 'center', color: mut, fontSize: 13 }}>
            No approved field reports yet. Ministers — submit what you're encountering in sessions.
          </div>
        ) : reports.filter(r => r.status === 'approved').map(report => (
          <div key={report.id} style={{ background: surf, border: `1px solid ${bdr}`, borderLeft: '3px solid #7c3aed', borderRadius: 8, padding: '16px 20px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: GG }}>{report.spirit_names}</div>
              <div style={{ fontSize: 11, color: dm }}>{report.submitted_by_name}{report.location_city ? ` · ${report.location_city}${report.location_state ? ', ' + report.location_state : ''}` : ''}</div>
            </div>
            <div style={{ fontSize: 13, color: txt, lineHeight: 1.6, fontFamily: "'Crimson Pro', serif" }}>{report.manifestations}</div>
            {report.entry_points && <div style={{ fontSize: 12, color: mut, marginTop: 6 }}>Entry points: {report.entry_points}</div>}
            {report.outcome && <div style={{ fontSize: 12, color: '#86efac', marginTop: 4 }}>Outcome: {report.outcome}</div>}
          </div>
        ))}

        {isMinister && reports.filter(r => r.status === 'pending').length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, color: '#f87171', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 8 }}>⚠ Pending Review ({reports.filter(r => r.status === 'pending').length})</div>
            {reports.filter(r => r.status === 'pending').map(report => (
              <div key={report.id} style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '14px 18px', marginBottom: 10 }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: '#f87171', marginBottom: 6 }}>{report.spirit_names}</div>
                <div style={{ fontSize: 13, color: txt, marginBottom: 10 }}>{report.manifestations}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['approved', 'rejected'] as const).map(status => (
                    <button key={status} onClick={async () => {
                      const token = await getToken()
                      await fetch('/api/field-reports', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ id: report.id, status }) })
                      setReports(prev => prev.map(r => r.id === report.id ? { ...r, status } : r))
                    }} style={{
                      background: status === 'approved' ? '#15803d' : 'transparent',
                      border: `1px solid ${status === 'approved' ? '#15803d' : 'rgba(220,38,38,0.4)'}`,
                      color: status === 'approved' ? '#fff' : '#f87171',
                      borderRadius: 5, padding: '6px 14px', fontSize: 11, cursor: 'pointer', fontFamily: "'Cinzel', serif",
                    }}>
                      {status === 'approved' ? '✓ Approve' : '✗ Reject'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      </div>{/* end left column */}

      {/* RIGHT — compact intel sidebar */}
      <div style={{ flex: 1, minWidth: isMobile ? '100%' : 260, maxWidth: 320 }}>

        {recentResources.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontFamily: cinzel, color: GG, letterSpacing: '0.1em', marginBottom: 10, textTransform: 'uppercase' as const }}>
              Latest Arsenal Drops
            </div>
            {recentResources.map(r => (
              <div key={r.id} style={{
                padding: '10px 12px',
                borderBottom: `1px solid ${bdr}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
              }}>
                <div>
                  <div style={{ fontSize: 12, fontFamily: cinzel, color: txt, letterSpacing: '0.04em' }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: mut, marginTop: 2 }}>{r.category} · {r.tier}</div>
                </div>
                <button
                  onClick={() => setActiveSection('arsenal')}
                  style={{ fontSize: 10, color: GG, background: 'transparent', border: `1px solid ${GG}`, borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontFamily: cinzel, letterSpacing: '0.04em', whiteSpace: 'nowrap' as const }}
                >VIEW</button>
              </div>
            ))}
          </div>
        )}

        {recentDemons.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontFamily: cinzel, color: GG, letterSpacing: '0.1em', marginBottom: 10, textTransform: 'uppercase' as const }}>
              New to Intel Archive
            </div>
            {recentDemons.map(d => (
              <div
                key={d.id}
                style={{ padding: '8px 12px', borderBottom: `1px solid ${bdr}`, cursor: 'pointer' }}
                onClick={() => setActiveSection('database')}
              >
                <div style={{ fontSize: 12, fontFamily: cinzel, color: txt }}>{d.name}</div>
                <div style={{ fontSize: 11, color: mut, marginTop: 2 }}>{d.hierarchyCategory || d.type || ''}</div>
              </div>
            ))}
          </div>
        )}

        {links.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.15em', color: mut, textTransform: 'uppercase' as const, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${bdr}` }}>External Intel</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {links.slice(0, 3).map(link => (
                <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', background: surf, border: `1px solid ${bdr}`, borderRadius: 6, padding: '10px 12px', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = GG)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = bdr)}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: GG, marginBottom: 2 }}>{link.title}</div>
                  {link.source && <div style={{ fontSize: 10, color: mut }}>{link.source} →</div>}
                </a>
              ))}
            </div>
          </div>
        )}

      </div>{/* end right column */}

      </div>{/* end two-column wrapper */}
    </div>
    </div>
  )
}

const HIERARCHY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Fear / Rejection':    { bg: '#1a0f2e', text: '#c084fc', border: '#7c3aed' },
  'Marine Kingdom':      { bg: '#0a1628', text: '#38bdf8', border: '#0284c7' },
  'Occult / Witchcraft': { bg: '#1a0a0a', text: '#f87171', border: '#dc2626' },
  'Freemasonry':         { bg: '#0d1117', text: '#d4a017', border: '#92400e' },
  'Perversion':          { bg: '#1a0a1a', text: '#f472b6', border: '#9d174d' },
  'Death / Destruction': { bg: '#0a0a0a', text: '#9ca3af', border: '#374151' },
  'Religious':           { bg: '#0f1a0a', text: '#86efac', border: '#15803d' },
  'General Oppression':  { bg: '#0f0f1a', text: '#a5b4fc', border: '#4338ca' },
}

const BATTLEFIELD_ICONS: Record<string, string> = {
  'Identity and emotions':                 '🪞',
  'Mind and will':                         '🧠',
  'Mind, sexuality, spiritual oppression': '⚡',
  'Control and spiritual authority':       '👑',
  'Sexual purity and soul ties':           '🔗',
}

const HIERARCHY_CATEGORIES = [
  'All', 'Fear / Rejection', 'Marine Kingdom', 'Occult / Witchcraft',
  'Freemasonry', 'Perversion', 'Death / Destruction', 'Religious', 'General Oppression',
]

function DatabaseView({ theme, isMobile, setSidebarOpen, userTier }: {
  theme: string
  isMobile: boolean
  setSidebarOpen: (open: boolean) => void
  userTier: string
}) {
  const [query, setQuery]         = useState('')
  const [entries, setEntries]     = useState<any[]>([])
  const [dbLoading, setDbLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/demons')
      .then(r => r.json())
      .then(d => { setEntries(d.demons || d.records || []) })
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

  const tierLevel = (t: string) => ({ free: 0, soldier: 1, commander: 2, general: 3 }[t?.toLowerCase()] ?? 0)
  const atLeast = (required: string) => tierLevel(userTier) >= tierLevel(required)
  const TierLock = ({ tierName }: { tierName: string }) => (
    <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 6, padding: '10px 14px', textAlign: 'center' as const, color: 'rgba(201,168,76,0.7)', fontSize: 13 }}>
      🔒 {tierName} tier — <a href="/membership" style={{ color: '#C9A84C' }}>Upgrade to unlock</a>
    </div>
  )

  const filtered = entries.filter(e => {
    const matchesSearch = !query || [
      e.name, e.aka, e.description, e.manifestation, e.symptoms,
      e.entryPoints, e.legalRights, e.wriNotes, e.personalityPresentation,
      e.hierarchyCategory, e.deliveranceSequence, e.counterScriptures, e.operationalNotes,
    ].some(s => s && String(s).toLowerCase().includes(query.toLowerCase()))
    const matchesCat = !categoryFilter || e.hierarchyCategory === categoryFilter
    return matchesSearch && matchesCat
  })

  const dbIsDark = theme !== 'light'
  const dbBg     = dbIsDark ? '#0D0B14' : '#f5f0e8'
  const dbSurf   = dbIsDark ? '#1a1714' : '#f0ebe3'
  const dbBorder = dbIsDark ? 'rgba(201,168,76,0.15)' : 'rgba(160,120,48,0.25)'
  const dbText   = dbIsDark ? '#f0e8d8' : '#1a1410'
  const dbDim    = dbIsDark ? '#c8b99a' : '#7a6555'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: dbBg, overflow: 'hidden' }}>

      {/* Header + search */}
      <div style={{ padding: '14px 20px 12px', borderBottom: `1px solid ${dbBorder}`, background: dbSurf, flexShrink: 0, overflow: 'visible' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', color: G, fontSize: '20px', flexShrink: 0 }}
              aria-label="Open navigation"
            >☰</button>
          )}
          <span style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.2em', color: G }}>⚔ INTEL DATABASE</span>
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search spirits, symptoms, manifestations, entry points..."
          style={{
            width: '100%', padding: '10px 14px',
            background: dbBg, border: `1px solid ${query ? G : dbBorder}`,
            borderRadius: 8, fontFamily: crimson, fontSize: 15,
            color: dbText, outline: 'none', boxSizing: 'border-box',
            marginBottom: 4, transition: 'border-color 0.2s',
          }}
        />
        <p style={{ fontSize: 11, color: dbDim, marginTop: 4, marginBottom: 8 }}>
          Search by name, symptom, manifestation, entry point, or emotional pattern
        </p>
        {/* Hierarchy category filter pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, paddingBottom: 12 }}>
          {HIERARCHY_CATEGORIES.map(cat => {
            const isAll = cat === 'All'
            const active = isAll ? !categoryFilter : categoryFilter === cat
            const colors = isAll
              ? { bg: '#1a1625', text: '#C9A84C', border: '#C9A84C' }
              : (HIERARCHY_COLORS[cat] || HIERARCHY_COLORS['General Oppression'])
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(isAll ? null : cat)}
                style={{
                  padding: '4px 12px', borderRadius: 999, fontSize: 11,
                  cursor: 'pointer', fontFamily: cinzel, letterSpacing: '0.04em',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: active ? colors.border : 'transparent',
                  color: active ? '#0D0B14' : colors.text,
                  transition: 'all 0.15s ease',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* Count bar */}
      <div style={{ padding: '8px 20px', flexShrink: 0, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: dbDim }}>
        {dbLoading ? 'Loading archive...' : query ? `${filtered.length} entries matching "${query}"` : `${filtered.length} entries in archive`}
      </div>

      {/* Cards grid */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 16px 16px',
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
          const id             = entry.id || String(i)
          const name           = entry.name || 'Unknown'
          const cls            = entry.type || entry.rank || ''
          const aliases        = entry.aka || ''
          const description    = entry.description || ''
          const manifestations = entry.manifestation || ''
          const companions     = entry.companionSpirits || ''
          const scriptures     = entry.scripture || ''
          const protocol       = entry.protocol || ''
          const wriNotes       = entry.wriNotes || ''
          const entryPoints    = entry.entryPoints || ''
          const legalRights    = entry.legalRights || ''
          const symptoms       = entry.symptoms || ''
          const color          = getColor(cls)
          const hierCat        = entry.hierarchyCategory || ''
          const hierColors     = HIERARCHY_COLORS[hierCat] || null
          const companionList  = companions ? companions.split(',').map((c: string) => c.trim()).filter(Boolean) : []

          return (
            <div key={id} onClick={() => setSelectedEntry(entry)} style={{
              background: dbSurf, border: `1px solid ${color}40`,
              borderLeft: `3px solid ${hierColors ? hierColors.border : color}`, borderRadius: 8,
              padding: 14, cursor: 'pointer', transition: 'box-shadow 0.2s',
            }}>
              {/* Name + classification badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ fontFamily: cinzel, fontSize: 14, color, fontWeight: 600 }}>{name}</div>
                {cls && (
                  <div style={{ fontFamily: cinzel, fontSize: 7, letterSpacing: '0.08em', background: color + '20', color, padding: '2px 7px', borderRadius: 3, flexShrink: 0, marginLeft: 8 }}>
                    {cls.toUpperCase()}
                  </div>
                )}
              </div>
              {/* Hierarchy category badge */}
              {hierCat && hierColors && (
                <span style={{
                  fontSize: 9, padding: '2px 8px', borderRadius: 999, display: 'inline-block', marginBottom: 6,
                  backgroundColor: hierColors.bg, color: hierColors.text, border: `1px solid ${hierColors.border}`,
                  fontFamily: cinzel, letterSpacing: '0.05em',
                }}>
                  {hierCat}
                </span>
              )}

              {/* Aliases */}
              {aliases && (
                <div style={{ fontFamily: crimson, fontSize: 11, color: dbDim, fontStyle: 'italic', marginBottom: 6 }}>
                  aka {aliases}
                </div>
              )}

              {/* Description — clamped preview */}
              <div style={{ fontFamily: crimson, fontSize: 13, color: dbText, lineHeight: 1.55, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>
                {description}
              </div>

              {/* Companion chips preview — Commander+ */}
              {companionList.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 7, letterSpacing: '0.15em', color: color + 'BB', marginBottom: 4 }}>COMPANIONS</div>
                  {atLeast('Commander') ? (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {companionList.slice(0, 3).map((c: string, ci: number) => (
                        <span key={ci}
                          onClick={e => { e.stopPropagation(); setQuery(c) }}
                          style={{ fontFamily: cinzel, fontSize: 8, color, border: `1px solid ${color}44`, padding: '2px 7px', borderRadius: 3, cursor: 'pointer' }}
                          title={`Search for ${c}`}>
                          {c}
                        </span>
                      ))}
                      {companionList.length > 3 && <span style={{ fontFamily: cinzel, fontSize: 8, color: dbDim }}>+{companionList.length - 3} more</span>}
                    </div>
                  ) : (
                    <div style={{ fontFamily: cinzel, fontSize: 8, color: dbDim, fontStyle: 'italic' }}>Commander+ to view</div>
                  )}
                </div>
              )}

              <div style={{ textAlign: 'center', marginTop: 8, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', color: color + '66' }}>
                ▼ VIEW FULL INTEL
              </div>
            </div>
          )
        })}
      </div>

      {/* Intel Dossier Modal */}
      {selectedEntry && (() => {
        const entry = selectedEntry
        const name           = entry.name || 'Unknown'
        const cls            = entry.type || entry.rank || ''
        const aliases        = entry.aka || ''
        const description    = entry.description || ''
        const manifestations = entry.manifestation || ''
        const companions     = entry.companionSpirits || ''
        const scriptures     = entry.scripture || ''
        const protocol       = entry.protocol || ''
        const wriNotes       = entry.wriNotes || ''
        const entryPoints    = entry.entryPoints || ''
        const legalRights    = entry.legalRights || ''
        const symptoms       = entry.symptoms || ''
        const color          = getColor(cls)
        const companionList  = companions ? companions.split(',').map((c: string) => c.trim()).filter(Boolean) : []

        return (
          <div
            onClick={() => setSelectedEntry(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.75)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20,
              backdropFilter: 'blur(4px)',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: dbSurf,
                border: `1px solid ${color}55`,
                borderLeft: `4px solid ${color}`,
                borderRadius: 12,
                width: '100%',
                maxWidth: 640,
                maxHeight: '85vh',
                overflowY: 'auto',
                padding: 28,
                position: 'relative',
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedEntry(null)}
                style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: dbDim, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
              >✕</button>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 22, color, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>{name}</div>
                  {cls && <div style={{ display: 'inline-block', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', background: color + '22', color, padding: '3px 10px', borderRadius: 4 }}>{cls.toUpperCase()}</div>}
                </div>
              </div>

              {aliases && (
                <div style={{ fontFamily: crimson, fontSize: 13, color: dbDim, fontStyle: 'italic', marginBottom: 14 }}>aka {aliases}</div>
              )}

              {/* Description */}
              {description && (
                <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${dbBorder}` }}>
                  <div style={{ fontFamily: crimson, fontSize: 16, color: dbText, lineHeight: 1.7 }}>{description}</div>
                </div>
              )}

              {/* Tier-gated fields */}
              {[
                { label: 'ENTRY POINTS',        value: entryPoints,    tierName: 'Commander' },
                { label: 'LEGAL RIGHTS',         value: legalRights,    tierName: 'Commander' },
                { label: 'MANIFESTATIONS',       value: manifestations, tierName: 'Soldier'   },
                { label: 'SYMPTOMS',             value: symptoms,       tierName: 'General'   },
                { label: 'DELIVERANCE PROTOCOL', value: protocol || entry.deliveranceSequence, tierName: 'General' },
                { label: 'WRI EXORCIST NOTES',   value: wriNotes,       tierName: 'General'   },
              ].map(({ label, value, tierName }) => (
                (value || atLeast('General')) && (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.15em', color: color + 'BB', marginBottom: 6 }}>{label}</div>
                    {atLeast(tierName)
                      ? <div style={{ fontFamily: crimson, fontSize: 14, color: value ? dbText : dbDim, lineHeight: 1.65, fontStyle: value ? 'normal' : 'italic' }}>{value || 'No data on file'}</div>
                      : <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 6, padding: '8px 12px', textAlign: 'center' as const, color: 'rgba(201,168,76,0.7)', fontSize: 13 }}>🔒 {tierName} tier — <a href="/membership" style={{ color: '#C9A84C' }}>Upgrade to unlock</a></div>
                    }
                  </div>
                )
              ))}

              {/* Key Scriptures */}
              {(scriptures || atLeast('General')) && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.15em', color: G + 'BB', marginBottom: 6 }}>KEY SCRIPTURES</div>
                  {atLeast('Commander')
                    ? <div style={{ fontFamily: crimson, fontSize: 14, color: scriptures ? G : dbDim, lineHeight: 1.65, fontStyle: 'italic' }}>{scriptures || 'No data on file'}</div>
                    : <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 6, padding: '8px 12px', textAlign: 'center' as const, color: 'rgba(201,168,76,0.7)', fontSize: 13 }}>🔒 Commander tier — <a href="/membership" style={{ color: '#C9A84C' }}>Upgrade to unlock</a></div>
                  }
                </div>
              )}

              {/* Companions */}
              {companionList.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${dbBorder}` }}>
                  <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.15em', color: color + 'BB', marginBottom: 8 }}>COMPANION SPIRITS</div>
                  {atLeast('Commander')
                    ? <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {companionList.map((c: string, ci: number) => (
                          <span key={ci}
                            onClick={() => { setSelectedEntry(null); setQuery(c) }}
                            style={{ fontFamily: cinzel, fontSize: 9, color, border: `1px solid ${color}44`, padding: '3px 10px', borderRadius: 4, cursor: 'pointer' }}
                            title={`Search for ${c}`}>{c}</span>
                        ))}
                      </div>
                    : <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 6, padding: '8px 12px', textAlign: 'center' as const, color: 'rgba(201,168,76,0.7)', fontSize: 13 }}>🔒 Commander tier — <a href="/membership" style={{ color: '#C9A84C' }}>Upgrade to unlock</a></div>
                  }
                </div>
              )}

              {/* ── Operational Intelligence ── */}
              {(entry.hierarchyCategory || entry.primaryBattlefield || entry.personalityPresentation || entry.deliveranceSequence || entry.counterScriptures || entry.operationalNotes || entry.parentStrongman) && (
                <div style={{ marginTop: 24, borderTop: `1px solid rgba(201,168,76,0.2)`, paddingTop: 20 }}>
                  <div style={{ color: '#C9A84C', fontFamily: cinzel, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 16 }}>
                    ⚔ Operational Intelligence
                  </div>

                  {entry.hierarchyCategory && (() => {
                    const cat = entry.hierarchyCategory
                    const colors = HIERARCHY_COLORS[cat] || HIERARCHY_COLORS['General Oppression']
                    return (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 10, color: '#8B7355', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 6 }}>Kingdom Category</div>
                        <span style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontFamily: cinzel, backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, letterSpacing: '0.05em', display: 'inline-block' }}>
                          {cat}
                        </span>
                      </div>
                    )
                  })()}

                  {entry.primaryBattlefield && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: '#8B7355', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }}>Primary Battlefield</div>
                      <div style={{ color: '#E8D5B0', fontSize: 14 }}>
                        {BATTLEFIELD_ICONS[entry.primaryBattlefield] || '⚔'} {entry.primaryBattlefield}
                      </div>
                    </div>
                  )}

                  {entry.personalityPresentation && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: '#8B7355', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }}>Typical Personality Presentation</div>
                      <div style={{ color: '#E8D5B0', fontSize: 14 }}>{entry.personalityPresentation}</div>
                    </div>
                  )}

                  {entry.deliveranceSequence && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: '#8B7355', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 6 }}>Deliverance Sequence</div>
                      <div style={{ background: 'rgba(13,11,20,0.8)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 6, padding: '10px 14px', fontSize: 13, lineHeight: 1.6 }}>
                        {entry.deliveranceSequence.split('→').map((step: string, i: number, arr: string[]) => (
                          <span key={i}>
                            <span style={{ color: '#E8D5B0' }}>{step.trim()}</span>
                            {i < arr.length - 1 && <span style={{ color: '#C9A84C', margin: '0 6px' }}>→</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.counterScriptures && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: '#8B7355', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 6 }}>Counter Scriptures</div>
                      <div style={{ background: 'rgba(0,30,10,0.5)', border: '1px solid rgba(134,239,172,0.2)', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#86efac', fontFamily: crimson }}>
                        📖 {entry.counterScriptures}
                      </div>
                    </div>
                  )}

                  {entry.operationalNotes && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: '#8B7355', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }}>Operational Notes</div>
                      <div style={{ color: '#B8A882', fontSize: 13, lineHeight: 1.6, fontStyle: 'italic' }}>{entry.operationalNotes}</div>
                    </div>
                  )}

                  {entry.parentStrongman && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: '#8B7355', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }}>Parent Strongman</div>
                      <div style={{ color: '#E8D5B0', fontSize: 14 }}>👑 {entry.parentStrongman}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ── ARSENAL VIEW ──────────────────────────────────────────
function ArsenalView({ theme, userTier, isMobile, setSidebarOpen }: {
  theme: string; userTier: string; isMobile: boolean; setSidebarOpen: (v: boolean) => void
}) {
  const { getToken } = useAuth()
  const isDark = theme !== 'light'
  const bg      = isDark ? '#0D0B14' : '#faf8f4'
  const surface = isDark ? 'rgba(201,168,76,0.04)' : '#f0ebe3'
  const border  = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(160,120,48,0.25)'
  const text    = isDark ? '#E8D5B0' : '#1a1410'
  const muted   = isDark ? '#8B7355' : '#5c4a3a'

  const [resources, setResources]   = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [query, setQuery]           = useState('')
  const [tierFilter, setTierFilter] = useState('All')
  const [catFilter, setCatFilter]   = useState('All')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError]           = useState('')

  const tierLvl = (t: string) => ({ free: 0, soldier: 1, commander: 2, general: 3 }[t?.toLowerCase()] ?? 0)

  const STRIPE_LINKS: Record<string, string> = {
    Soldier:   'https://buy.stripe.com/4gM6oA68wblRdI9b4XfrW00',
    Commander: 'https://buy.stripe.com/6oU8wI1Sg4Xt1ZrgphfrW01',
    General:   'https://buy.stripe.com/aFa00c0Oc4Xt5bD0qjfrW02',
  }

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken()
        const res = await fetch('/api/arsenal-resources', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        setResources(data.resources || [])
      } catch {
        setError('Could not load resources')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleDownload(resource: any) {
    try {
      const token = await getToken()
      const res = await fetch(`/api/arsenal-resources?id=${resource.id}&action=download`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Download failed')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = resource.title || 'resource'
      a.click()
      URL.revokeObjectURL(url)
    } catch(e) {
      alert('Download failed. Please try again.')
    }
  }

  const FILE_ICONS: Record<string, string> = {
    'application/pdf': '📄',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
    'audio/mpeg': '🎵',
    'image/png': '🖼️',
    'image/jpeg': '🖼️',
  }

  const CATEGORIES = ['All', 'Session Tools', 'Teaching', 'Protocol', 'Reference', 'Renunciation', 'Worksheet']
  const TIERS      = ['All', 'Free', 'Soldier', 'Commander', 'General']

  const TIER_COLORS: Record<string, string> = {
    Free: '#4ade80', Soldier: '#C9A84C', Commander: '#38bdf8', General: '#f87171',
  }

  const filtered = resources.filter(r => {
    const matchQ = !query ||
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(query.toLowerCase()) ||
      (r.tags || []).some((t: string) => t.toLowerCase().includes(query.toLowerCase()))
    const matchT = tierFilter === 'All' || r.tier === tierFilter
    const matchC = catFilter === 'All'  || r.category === catFilter
    return matchQ && matchT && matchC
  })

  const recent = [...resources]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4)

  const ResourceCard = ({ resource }: { resource: any }) => {
    const hasAccess  = tierLvl(userTier) >= tierLvl(resource.tier)
    const upgradeLink = STRIPE_LINKS[resource.tier]
    const icon   = FILE_ICONS[resource.file_type] || '📄'
    const sizeMB = resource.file_size ? (resource.file_size / 1024 / 1024).toFixed(1) : null
    const tc     = TIER_COLORS[resource.tier] || G

    return (
      <div style={{ background: surface, border: `1px solid ${hasAccess ? border : 'rgba(201,168,76,0.25)'}`, borderLeft: `3px solid ${tc}`, borderRadius: 8, padding: '16px 18px', opacity: hasAccess ? 1 : 0.9 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span style={{ fontFamily: cinzel, fontSize: 13, color: hasAccess ? G : muted, fontWeight: 600 }}>{resource.title}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, alignItems: 'center' }}>
              <span style={{ fontSize: 9, fontFamily: cinzel, padding: '2px 8px', borderRadius: 999, background: `${tc}20`, color: tc, border: `1px solid ${tc}40`, letterSpacing: '0.06em' }}>{resource.tier}</span>
              <span style={{ fontSize: 11, color: muted }}>{resource.category}</span>
              {sizeMB && <span style={{ fontSize: 11, color: muted }}>· {sizeMB} MB</span>}
            </div>
          </div>
          {hasAccess ? (
            <button
              onClick={() => handleDownload(resource)}
              disabled={downloading === resource.id}
              style={{ background: downloading === resource.id ? 'rgba(201,168,76,0.2)' : G, color: downloading === resource.id ? muted : '#0D0B14', border: 'none', borderRadius: 5, padding: '7px 14px', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em', cursor: downloading === resource.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0 }}
            >
              {downloading === resource.id ? '...' : '↓ Download'}
            </button>
          ) : (
            <a href={upgradeLink} style={{ background: 'transparent', border: `1px solid ${G}`, color: G, borderRadius: 5, padding: '7px 14px', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em', textDecoration: 'none', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
              🔒 Upgrade
            </a>
          )}
        </div>
        {resource.description && (
          <div style={{ fontSize: 12, color: muted, lineHeight: 1.5, marginBottom: resource.tags?.length > 0 ? 8 : 0 }}>{resource.description}</div>
        )}
        {resource.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
            {resource.tags.map((tag: string, i: number) => (
              <span key={i} style={{ fontSize: 9, padding: '1px 7px', borderRadius: 999, background: 'rgba(201,168,76,0.08)', color: G, border: '1px solid rgba(201,168,76,0.2)', fontFamily: cinzel, letterSpacing: '0.04em' }}>{tag}</span>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: bg, padding: isMobile ? '16px' : '24px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        {isMobile && (
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: G, fontSize: 20, cursor: 'pointer', padding: 0 }}>☰</button>
        )}
        <div>
          <div style={{ fontFamily: cinzel, fontSize: isMobile ? 18 : 22, color: G, fontWeight: 700 }}>✦ Arsenal</div>
          <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>Ministry resources, protocols, and teaching documents</div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search resources, tags, descriptions..."
          style={{ width: '100%', boxSizing: 'border-box' as const, background: isDark ? 'rgba(13,11,20,0.8)' : '#fff', border: `1px solid ${border}`, borderRadius: 8, padding: '12px 16px', color: text, fontSize: 14, fontFamily: crimson, outline: 'none' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 8 }}>
        {TIERS.map(t => (
          <button key={t} onClick={() => setTierFilter(t)} style={{ padding: '4px 12px', borderRadius: 999, fontSize: 11, cursor: 'pointer', fontFamily: cinzel, letterSpacing: '0.04em', border: `1px solid ${tierFilter === t ? G : border}`, background: tierFilter === t ? G : 'transparent', color: tierFilter === t ? '#0D0B14' : muted }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 24 }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCatFilter(c)} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 10, cursor: 'pointer', fontFamily: cinzel, letterSpacing: '0.04em', border: `1px solid ${catFilter === c ? G : border}`, background: catFilter === c ? `${G}20` : 'transparent', color: catFilter === c ? G : muted }}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: muted, fontFamily: cinzel, fontSize: 13 }}>Loading arsenal...</div>
      ) : error ? (
        <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6, padding: '12px 16px', color: '#f87171', marginBottom: 24, fontFamily: crimson }}>{error}</div>
      ) : (
        <>
          {!query && tierFilter === 'All' && catFilter === 'All' && recent.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase' as const, marginBottom: 12 }}>Recently Added</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                {recent.map(r => <ResourceCard key={r.id} resource={r} />)}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase' as const, marginBottom: 12 }}>
              {query || tierFilter !== 'All' || catFilter !== 'All' ? `${filtered.length} Results` : `All Resources (${resources.length})`}
            </div>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: muted, fontFamily: crimson, fontSize: 15, fontStyle: 'italic' }}>
                No resources found. Try different search terms or filters.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                {filtered.map(r => <ResourceCard key={r.id} resource={r} />)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── INVESTIGATOR TYPES & CONSTANTS ────────────────────────
interface InvestigationResult {
  summary: string
  probableSpirits: Array<{ name: string; confidence: 'High' | 'Medium' | 'Low'; reason: string; category: string }>
  entryPoints: string[]
  deliveranceSequence: string[]
  counterScriptures: string[]
  warningFlags: string[]
}

const CONFIDENCE_COLORS = {
  High:   { bg: 'rgba(220,38,38,0.15)', text: '#f87171', border: 'rgba(220,38,38,0.3)' },
  Medium: { bg: 'rgba(201,168,76,0.1)',  text: '#C9A84C', border: 'rgba(201,168,76,0.25)' },
  Low:    { bg: 'rgba(99,102,241,0.1)',  text: '#a5b4fc', border: 'rgba(99,102,241,0.25)' },
}

// ── INVESTIGATOR VIEW ──────────────────────────────────────
function InvestigatorView({ userTier, isMobile, setSidebarOpen }: {
  theme: string; userTier: string; isMobile: boolean; setSidebarOpen: (v: boolean) => void
}) {
  const { getToken } = useAuth()
  const [invInput, setInvInput]   = useState('')
  const [invLoading, setInvLoading] = useState(false)
  const [invResult, setInvResult] = useState<InvestigationResult | null>(null)
  const [invError, setInvError]   = useState('')

  const tierLvl = (t: string) => ({ free: 0, soldier: 1, commander: 2, general: 3 }[t?.toLowerCase()] ?? 0)
  const hasAccess = tierLvl(userTier) >= tierLvl('commander')

  if (!hasAccess) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: '#0D0B14' }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🔒</div>
          <h2 style={{ fontFamily: cinzel, color: G, fontSize: 20, marginBottom: 12 }}>Commander Tier Required</h2>
          <p style={{ color: '#8B7355', fontSize: 15, lineHeight: 1.7, marginBottom: 28, fontFamily: crimson }}>
            The Symptom Investigator is an AI-powered operational intelligence tool available to Commander and General members.
            Upgrade to access real-time spirit analysis, deliverance sequencing, and session support.
          </p>
          <a href="https://buy.stripe.com/6oU8wI1Sg4Xt1ZrgphfrW01" style={{ display: 'inline-block', background: G, color: '#0D0B14', fontFamily: cinzel, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', padding: '10px 28px', borderRadius: 6, textDecoration: 'none' }}>
            Upgrade to Commander — $39/mo
          </a>
        </div>
      </div>
    )
  }

  async function handleInvestigate() {
    if (!invInput.trim()) return
    setInvLoading(true); setInvError(''); setInvResult(null)
    try {
      const token = await getToken()
      console.log('token:', token ? 'present' : 'null')
      const res = await fetch('/api/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ symptoms: invInput }),
      })
      if (!res.ok) {
        const errBody = await res.text()
        console.error('Investigate failed:', res.status, errBody)
        throw new Error(`Investigation failed: ${res.status}`)
      }
      const data = await res.json()
      setInvResult(data)
    } catch (err: any) {
      setInvError(err?.message || 'Investigation failed. Check connection.')
    } finally {
      setInvLoading(false)
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px' : '32px 40px', background: '#12101e' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: G, fontSize: 20, cursor: 'pointer', padding: 0 }}>☰</button>
            <span style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.1em' }}>Symptom Investigator</span>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 11, color: G, letterSpacing: '0.2em', textTransform: 'uppercase' as const, marginBottom: 12, fontFamily: cinzel }}>⚔ War Room Intel</div>
          <h1 style={{ fontFamily: cinzel, color: '#E8D5B0', fontSize: isMobile ? 22 : 28, fontWeight: 700, marginBottom: 8 }}>Symptom Investigator</h1>
          <p style={{ color: '#8B7355', fontSize: 15, lineHeight: 1.6, fontFamily: crimson }}>
            Describe what you are observing — symptoms, manifestations, dreams, emotional patterns, physical reactions.
            The system will identify probable spirits and suggest a deliverance sequence.
          </p>
        </div>

        <div style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, padding: 24, marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 11, color: '#8B7355', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 10, fontFamily: cinzel }}>
            Observed Symptoms / Manifestations
          </label>
          <textarea
            value={invInput}
            onChange={e => setInvInput(e.target.value)}
            placeholder="Example: Recurring nightmares, pressure on chest, irrational fear of abandonment, history of sexual abuse, difficulty feeling God's presence, chronic migraines..."
            rows={6}
            style={{ width: '100%', background: 'rgba(13,11,20,0.8)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 6, color: '#E8D5B0', fontSize: 15, padding: 14, fontFamily: crimson, lineHeight: 1.6, resize: 'vertical' as const, outline: 'none', boxSizing: 'border-box' as const }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap' as const, gap: 10 }}>
            <span style={{ fontSize: 12, color: '#5a4f3a', fontFamily: crimson }}>Be specific — the more detail, the more accurate the intelligence.</span>
            <button
              onClick={handleInvestigate}
              disabled={invLoading || !invInput.trim()}
              style={{ background: invLoading ? 'rgba(201,168,76,0.3)' : G, color: invLoading ? '#8B7355' : '#0D0B14', border: 'none', borderRadius: 6, padding: '10px 28px', fontSize: 13, fontFamily: cinzel, fontWeight: 700, letterSpacing: '0.08em', cursor: invLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease' }}
            >
              {invLoading ? '⚔ Analyzing...' : '⚔ Investigate'}
            </button>
          </div>
        </div>

        {invError && (
          <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6, padding: '12px 16px', color: '#f87171', marginBottom: 24, fontFamily: crimson }}>
            {invError}
          </div>
        )}

        {invLoading && (
          <div style={{ textAlign: 'center', padding: 40, color: '#8B7355' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚔</div>
            <div style={{ fontFamily: cinzel, fontSize: 14, letterSpacing: '0.1em' }}>Running intelligence analysis...</div>
          </div>
        )}

        {invResult && !invLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* AI Disclaimer */}
            <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠</span>
              <div style={{ fontSize: 12, color: '#8B7355', lineHeight: 1.6, fontFamily: crimson }}>
                <strong style={{ color: G, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em' }}>AI-GENERATED ANALYSIS</strong>
                {' '}— This report is generated using our spirit database and AI. Results are a starting point for discernment, not a definitive diagnosis. Always follow the Holy Spirit's leading. Deliverance ministry requires trained ministers, prayer, and pastoral oversight.
              </div>
            </div>

            <section style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, padding: '20px 24px' }}>
              <div style={{ fontSize: 10, color: '#8B7355', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 10, fontFamily: cinzel }}>Intelligence Summary</div>
              <p style={{ color: '#E8D5B0', fontSize: 16, lineHeight: 1.7, margin: 0, fontFamily: crimson }}>{invResult.summary}</p>
            </section>

            {invResult.probableSpirits?.length > 0 && (
              <section>
                <div style={{ fontSize: 10, color: '#8B7355', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 12, fontFamily: cinzel }}>
                  Probable Entities ({invResult.probableSpirits.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {invResult.probableSpirits.map((spirit, i) => {
                    const conf = CONFIDENCE_COLORS[spirit.confidence] || CONFIDENCE_COLORS.Low
                    const cat  = HIERARCHY_COLORS[spirit.category]  || HIERARCHY_COLORS['General Oppression']
                    return (
                      <div key={i} style={{ background: 'rgba(13,11,20,0.8)', border: `1px solid ${conf.border}`, borderLeft: `3px solid ${conf.border}`, borderRadius: 8, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' as const }}>
                            <span style={{ fontFamily: cinzel, color: '#E8D5B0', fontSize: 15, fontWeight: 600 }}>{spirit.name}</span>
                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, backgroundColor: cat.bg, color: cat.text, border: `1px solid ${cat.border}`, fontFamily: cinzel, letterSpacing: '0.04em' }}>{spirit.category}</span>
                          </div>
                          <p style={{ color: '#8B7355', fontSize: 13, margin: 0, lineHeight: 1.5, fontFamily: crimson }}>{spirit.reason}</p>
                        </div>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap' as const, backgroundColor: conf.bg, color: conf.text, border: `1px solid ${conf.border}`, fontFamily: cinzel }}>{spirit.confidence}</span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {invResult.entryPoints?.length > 0 && (
              <section style={{ background: 'rgba(13,11,20,0.6)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 10, padding: '20px 24px' }}>
                <div style={{ fontSize: 10, color: '#8B7355', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 12, fontFamily: cinzel }}>Likely Entry Points</div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                  {invResult.entryPoints.map((ep, i) => (
                    <span key={i} style={{ fontSize: 13, padding: '4px 12px', borderRadius: 999, background: 'rgba(201,168,76,0.08)', color: G, border: '1px solid rgba(201,168,76,0.2)', fontFamily: crimson }}>{ep}</span>
                  ))}
                </div>
              </section>
            )}

            {invResult.deliveranceSequence?.length > 0 && (
              <section style={{ background: 'rgba(13,11,20,0.6)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 10, padding: '20px 24px' }}>
                <div style={{ fontSize: 10, color: '#8B7355', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 14, fontFamily: cinzel }}>Suggested Deliverance Sequence</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {invResult.deliveranceSequence.map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{ minWidth: 24, height: 24, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', color: G, fontSize: 11, fontFamily: cinzel, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ color: '#E8D5B0', fontSize: 14, lineHeight: 1.6, paddingTop: 2, fontFamily: crimson }}>{step}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {invResult.counterScriptures?.length > 0 && (
              <section style={{ background: 'rgba(0,30,10,0.4)', border: '1px solid rgba(134,239,172,0.2)', borderRadius: 10, padding: '20px 24px' }}>
                <div style={{ fontSize: 10, color: '#86efac', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 12, fontFamily: cinzel }}>📖 Counter Scriptures</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {invResult.counterScriptures.map((s, i) => (
                    <div key={i} style={{ color: '#86efac', fontSize: 14, fontFamily: crimson, lineHeight: 1.5 }}>{s}</div>
                  ))}
                </div>
              </section>
            )}

            {invResult.warningFlags?.length > 0 && (
              <section style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '20px 24px' }}>
                <div style={{ fontSize: 10, color: '#f87171', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 12, fontFamily: cinzel }}>⚠ Warning Flags</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {invResult.warningFlags.map((w, i) => (
                    <div key={i} style={{ color: '#f87171', fontSize: 14, lineHeight: 1.5, fontFamily: crimson }}>• {w}</div>
                  ))}
                </div>
              </section>
            )}

            <p style={{ fontSize: 12, color: '#3a3228', textAlign: 'center' as const, lineHeight: 1.6, marginTop: 8, fontFamily: crimson }}>
              This analysis is an intelligence aid for trained ministers. Always lead with prayer, discernment, and the Holy Spirit. This tool does not replace ministerial judgment.
            </p>
            <div style={{ fontSize: 11, color: '#5a4f3a', textAlign: 'center' as const, fontStyle: 'italic', fontFamily: crimson }}>
              📋 Feature coming: Export this report as a PDF — submit a field report to track this session
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── FRINGE INTEL VIEW ─────────────────────────────────────
function FringeIntelView({ theme, isMobile, setSidebarOpen }: {
  theme: string; isMobile: boolean; setSidebarOpen: (v: boolean) => void
}) {
  const isDark = theme !== 'light'
  const bg      = isDark ? '#0D0B14' : '#faf8f4'
  const surface = isDark ? 'rgba(201,168,76,0.03)' : '#f0ebe3'
  const border  = isDark ? 'rgba(201,168,76,0.12)' : 'rgba(160,120,48,0.2)'
  const muted   = isDark ? '#8B7355' : '#5c4a3a'
  const dim     = isDark ? '#5a4f3a' : '#7a6555'
  const gold    = isDark ? G : '#a07830'

  const TOPICS = [
    { icon: '👽', label: 'UFO Disclosure',      desc: 'Craft sightings, government programs, interdimensional origins' },
    { icon: '📖', label: 'Genesis 6',           desc: 'The Nephilim, sons of God, ancient giants and their bloodlines' },
    { icon: '🧬', label: 'Bloodline Warfare',   desc: 'Generational corruption, hybrid entities, seed war' },
    { icon: '👁',  label: 'Nephilim',            desc: 'Pre-flood entities, giant clans, post-flood remnants' },
    { icon: '🛸', label: 'Gov. Programming',    desc: 'MK Ultra, monarch programming, demonic tech interfaces' },
    { icon: '🔬', label: 'Fringe Science',      desc: 'Quantum, frequency, AI consciousness — the demonic angle' },
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: bg, padding: isMobile ? '16px' : '24px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        {isMobile && <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: gold, fontSize: 20, cursor: 'pointer', padding: 0 }}>☰</button>}
        <div>
          <div style={{ fontSize: 10, color: gold, letterSpacing: '0.2em', fontFamily: cinzel, marginBottom: 6, textTransform: 'uppercase' as const }}>⚠ CLASSIFIED — LEVEL 5 CLEARANCE</div>
          <div style={{ fontFamily: cinzel, fontSize: isMobile ? 18 : 24, color: gold, fontWeight: 700, marginBottom: 4 }}>👁 Fringe Intelligence</div>
          <div style={{ fontSize: 13, color: muted, lineHeight: 1.6, fontFamily: crimson }}>
            Where the strange things get explained. Aliens are demons in meat suits. Giants were real. The cover-up is spiritual.
          </div>
        </div>
      </div>

      <div style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(13,11,20,0.8) 100%)', border: `1px solid ${border}`, borderLeft: `3px solid ${gold}`, borderRadius: 10, padding: '24px 28px', marginBottom: 32, textAlign: 'center' as const }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🛸</div>
        <div style={{ fontFamily: cinzel, fontSize: 16, color: gold, marginBottom: 8 }}>Fringe Intelligence — Coming July 2026</div>
        <div style={{ fontFamily: crimson, fontSize: 15, color: muted, lineHeight: 1.7, maxWidth: 500, margin: '0 auto 16px' }}>
          Launching alongside the Close Encounters of Some Kind event. Genesis 6, Nephilim, UFO Disclosure, Government Programming — all explained through the lens of spiritual warfare.
        </div>
        <div style={{ display: 'inline-block', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 5, padding: '6px 16px', fontFamily: cinzel, fontSize: 10, color: gold, letterSpacing: '0.1em' }}>
          JULY 18, 2026 · STAFFORDTOWN CHURCH
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.18em', color: dim, textTransform: 'uppercase' as const, marginBottom: 14 }}>Intelligence Categories</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
          {TOPICS.map(({ icon, label, desc }) => (
            <div key={label} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 8, padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontFamily: cinzel, fontSize: 12, color: isDark ? G : '#1a1410', marginBottom: 4, letterSpacing: '0.06em' }}>{label}</div>
                <div style={{ fontFamily: crimson, fontSize: 13, color: muted, lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── EVENTS VIEW ────────────────────────────────────────────
function EventsView({ theme, isMobile, setSidebarOpen }: {
  theme: string; isMobile: boolean; setSidebarOpen: (v: boolean) => void
}) {
  const isDark = theme !== 'light'
  const bg      = isDark ? '#0D0B14' : '#faf8f4'
  const surface = isDark ? 'rgba(201,168,76,0.04)' : '#f0ebe3'
  const border  = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(160,120,48,0.25)'
  const text    = isDark ? '#E8D5B0' : '#1a1410'
  const muted   = isDark ? '#8B7355' : '#5c4a3a'

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: bg, padding: isMobile ? '16px' : '24px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        {isMobile && <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: G, fontSize: 20, cursor: 'pointer', padding: 0 }}>☰</button>}
        <div>
          <div style={{ fontFamily: cinzel, fontSize: isMobile ? 18 : 22, color: G, fontWeight: 700 }}>📅 Events</div>
          <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>War Room Intel events, conferences, and special sessions</div>
        </div>
      </div>

      {/* FEATURED EVENT */}
      <div style={{ background: 'linear-gradient(135deg, rgba(13,11,20,0.95) 0%, rgba(26,15,30,0.95) 100%)', border: `1px solid ${G}40`, borderRadius: 12, overflow: 'hidden', marginBottom: 28, boxShadow: `0 0 40px rgba(201,168,76,0.08)` }}>
        <div style={{ background: `linear-gradient(90deg, rgba(201,168,76,0.15) 0%, transparent 100%)`, padding: '10px 24px', borderBottom: `1px solid ${G}30` }}>
          <span style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.2em', color: G, textTransform: 'uppercase' as const }}>⚔ War Room Intel Special Event · Featured</span>
        </div>
        <div style={{ padding: '28px 28px 24px' }}>
          <div style={{ textAlign: 'center' as const, marginBottom: 24 }}>
            <div style={{ fontFamily: cinzel, fontSize: 11, color: muted, letterSpacing: '0.2em', marginBottom: 8, textTransform: 'uppercase' as const }}>Save the Date</div>
            <div style={{ fontFamily: cinzel, fontSize: isMobile ? 22 : 30, color: G, fontWeight: 700, lineHeight: 1.1, marginBottom: 4 }}>Close Encounters</div>
            <div style={{ fontFamily: cinzel, fontSize: isMobile ? 18 : 24, color: text, marginBottom: 8 }}>of Some Kind</div>
            <div style={{ fontFamily: crimson, fontSize: 13, color: muted, letterSpacing: '0.1em' }}>A War Room Intel Special Event</div>
          </div>

          <div style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid ${G}30`, borderRadius: 8, padding: '16px 20px', marginBottom: 20, display: 'flex', flexDirection: isMobile ? 'column' : 'row' as const, gap: 16, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>📅</span>
              <div>
                <div style={{ fontFamily: cinzel, fontSize: 14, color: G, fontWeight: 700 }}>July 18, 2026</div>
                <div style={{ fontFamily: crimson, fontSize: 12, color: muted }}>11:00 AM – 3:00 PM</div>
              </div>
            </div>
            <div style={{ width: 1, height: 36, background: `${G}30`, display: isMobile ? 'none' : 'block' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>📍</span>
              <div>
                <div style={{ fontFamily: cinzel, fontSize: 14, color: G, fontWeight: 700 }}>Staffordtown Church</div>
                <div style={{ fontFamily: crimson, fontSize: 12, color: muted }}>Copperhill, Tennessee</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' as const }}>
            {[
              { icon: '👥', price: '$25', label: 'In-Person', sub: 'Lunch + Book + Recording' },
              { icon: '▶',  price: '$10', label: 'Recording Only', sub: 'Digital access' },
              { icon: '📚', price: '$15', label: 'Recording + Book', sub: 'Digital + book' },
            ].map(({ icon, price, label, sub }) => (
              <div key={label} style={{ flex: 1, minWidth: 100, background: 'rgba(201,168,76,0.05)', border: `1px solid ${G}25`, borderRadius: 8, padding: '12px 14px', textAlign: 'center' as const }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontFamily: cinzel, fontSize: 16, color: G, fontWeight: 700 }}>{price}</div>
                <div style={{ fontFamily: cinzel, fontSize: 9, color: text, letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                <div style={{ fontFamily: crimson, fontSize: 11, color: muted }}>{sub}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase' as const, marginBottom: 10, textAlign: 'center' as const }}>Topics Include</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, justifyContent: 'center' as const }}>
              {['Genesis 6', 'UFO Disclosure', 'Bloodline Warfare', 'Nephilim', 'Fringe Intelligence'].map(topic => (
                <span key={topic} style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em', padding: '4px 12px', borderRadius: 999, background: 'rgba(201,168,76,0.08)', color: G, border: '1px solid rgba(201,168,76,0.25)' }}>{topic}</span>
              ))}
            </div>
          </div>

          <div style={{ background: 'rgba(134,239,172,0.06)', border: '1px solid rgba(134,239,172,0.2)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, textAlign: 'center' as const }}>
            <div style={{ fontFamily: cinzel, fontSize: 10, color: '#86efac', letterSpacing: '0.1em', marginBottom: 4 }}>🔒 BONUS FOR ATTENDEES</div>
            <div style={{ fontFamily: crimson, fontSize: 14, color: text }}>All attendees receive <strong style={{ color: '#86efac' }}>3 FREE months</strong> of War Room Intel access</div>
          </div>

          <div style={{ textAlign: 'center' as const, marginBottom: 16 }}>
            <div style={{ fontFamily: crimson, fontSize: 13, color: muted, fontStyle: 'italic' }}>All proceeds benefit the New Church Building Fund</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 16, borderTop: `1px solid ${G}20`, marginBottom: 20 }}>
            <div style={{ textAlign: 'center' as const }}>
              <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.08em' }}>Presented by</div>
              <div style={{ fontFamily: cinzel, fontSize: 13, color: text, marginTop: 2 }}>CIO Justin Payne</div>
              <div style={{ fontFamily: crimson, fontSize: 11, color: muted, fontStyle: 'italic' }}>Chief Investigation Officer</div>
            </div>
          </div>

          <div style={{ textAlign: 'center' as const }}>
            <div style={{ fontFamily: cinzel, fontSize: 10, color: muted, letterSpacing: '0.1em', marginBottom: 12 }}>THIS IS A SAVE THE DATE · MORE WILL FOLLOW</div>
            <a href="mailto:exorcist@warroomintel.com?subject=Close Encounters Registration Interest" style={{ display: 'inline-block', background: G, color: '#0D0B14', fontFamily: cinzel, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', padding: '12px 32px', borderRadius: 6, textDecoration: 'none' }}>
              Register Interest →
            </a>
          </div>
        </div>
      </div>

      <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 8, padding: '20px 24px', textAlign: 'center' as const }}>
        <div style={{ fontFamily: cinzel, fontSize: 13, color: muted, marginBottom: 6 }}>More Events Coming</div>
        <div style={{ fontFamily: crimson, fontSize: 14, color: muted }}>Group Warfare Prayer · General's Table · Regional Events</div>
      </div>
    </div>
  )
}

// ── FEEDBACK VIEW ──────────────────────────────────────────
function FeedbackView({ theme, userTier, isMobile, setSidebarOpen, userId, userName }: {
  theme: string; userTier: string; isMobile: boolean; setSidebarOpen: (v: boolean) => void; userId: string; userName: string
}) {
  const { getToken } = useAuth()
  const isDark = theme !== 'light'
  const bg      = isDark ? '#0D0B14' : '#faf8f4'
  const surface = isDark ? 'rgba(201,168,76,0.04)' : '#f0ebe3'
  const border  = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(160,120,48,0.25)'
  const text    = isDark ? '#E8D5B0' : '#1a1410'
  const muted   = isDark ? '#8B7355' : '#5c4a3a'

  const [type, setType]               = useState<'bug' | 'feature'>('feature')
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority]       = useState('medium')
  const [saving, setSaving]           = useState(false)
  const [success, setSuccess]         = useState(false)
  const [error, setError]             = useState('')
  const [allFeedback, setAllFeedback] = useState<any[]>([])
  const [loadingFeed, setLoadingFeed] = useState(true)

  useEffect(() => {
    async function loadFeedback() {
      try {
        const token = await getToken()
        const res = await fetch('/api/feedback', { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) { const data = await res.json(); setAllFeedback(data.feedback || []) }
      } catch { } finally { setLoadingFeed(false) }
    }
    loadFeedback()
  }, [success])

  async function handleSubmit() {
    if (!title.trim() || !description.trim()) return
    setSaving(true); setError('')
    try {
      const token = await getToken()
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, title, description, priority, submitted_by_name: userName, submitted_by_tier: userTier }),
      })
      if (!res.ok) throw new Error('Submit failed')
      setSuccess(true); setTitle(''); setDescription('')
      setTimeout(() => setSuccess(false), 4000)
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box' as const, background: isDark ? 'rgba(13,11,20,0.8)' : '#fff', border: `1px solid ${border}`, borderRadius: 6, padding: '10px 14px', color: text, fontSize: 14, fontFamily: crimson, outline: 'none' }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: bg, padding: isMobile ? '16px' : '24px 32px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          {isMobile && <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: G, fontSize: 20, cursor: 'pointer', padding: 0 }}>☰</button>}
          <div>
            <div style={{ fontFamily: cinzel, fontSize: isMobile ? 18 : 22, color: G, fontWeight: 700 }}>? Submit Feedback</div>
            <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>Report bugs or request new features — all tiers can submit and view</div>
          </div>
        </div>

        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: 24, marginBottom: 28 }}>
          <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.12em', color: G, marginBottom: 20 }}>Submit Report</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['bug', 'feature'] as const).map(t => (
              <button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: '8px', borderRadius: 6, cursor: 'pointer', fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', border: `1px solid ${type === t ? (t === 'bug' ? '#f87171' : G) : border}`, background: type === t ? (t === 'bug' ? 'rgba(248,113,113,0.1)' : 'rgba(201,168,76,0.1)') : 'transparent', color: type === t ? (t === 'bug' ? '#f87171' : G) : muted }}>
                {t === 'bug' ? '🐛 Bug Report' : '✦ Feature Request'}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: muted, textTransform: 'uppercase' as const, marginBottom: 6 }}>Priority</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['low', 'medium', 'high'].map(p => (
                <button key={p} onClick={() => setPriority(p)} style={{ padding: '4px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em', border: `1px solid ${priority === p ? G : border}`, background: priority === p ? `${G}15` : 'transparent', color: priority === p ? G : muted }}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: muted, textTransform: 'uppercase' as const, marginBottom: 6 }}>Title *</div>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={type === 'bug' ? 'Brief description of the bug...' : 'What feature would help you?'} style={inp} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: muted, textTransform: '  uppercase' as const, marginBottom: 6 }}>Details *</div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder={type === 'bug' ? 'Steps to reproduce, what you expected vs what happened...' : 'Describe how this would work and why it would help ministers...'} style={{ ...inp, resize: 'vertical' as const }} />
          </div>
          {success && <div style={{ color: '#4ade80', fontSize: 13, marginBottom: 12, fontFamily: cinzel }}>✓ Submitted — thank you for your feedback!</div>}
          {error   && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>⚠ {error}</div>}
          <button onClick={handleSubmit} disabled={saving || !title.trim() || !description.trim()} style={{ background: saving || !title.trim() || !description.trim() ? 'rgba(201,168,76,0.3)' : G, color: saving || !title.trim() || !description.trim() ? muted : '#0D0B14', border: 'none', borderRadius: 6, padding: '10px 28px', fontFamily: cinzel, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>

        <div>
          <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase' as const, marginBottom: 14 }}>Community Reports ({allFeedback.length})</div>
          {loadingFeed ? (
            <div style={{ color: muted, fontSize: 13, fontStyle: 'italic' }}>Loading...</div>
          ) : allFeedback.length === 0 ? (
            <div style={{ color: muted, fontSize: 13, fontStyle: 'italic', textAlign: 'center' as const, padding: 20 }}>No reports yet. Be the first to submit.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {allFeedback.map((fb: any) => (
                <div key={fb.id} style={{ background: surface, border: `1px solid ${border}`, borderLeft: `3px solid ${fb.type === 'bug' ? '#f87171' : G}`, borderRadius: 8, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, flexWrap: 'wrap' as const, gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12 }}>{fb.type === 'bug' ? '🐛' : '✦'}</span>
                      <span style={{ fontFamily: cinzel, fontSize: 12, color: fb.type === 'bug' ? '#f87171' : G }}>{fb.title}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 9, fontFamily: cinzel, padding: '2px 8px', borderRadius: 999, background: 'rgba(201,168,76,0.08)', color: muted, border: `1px solid ${border}` }}>{fb.priority}</span>
                      <span style={{ fontSize: 11, color: muted }}>{fb.submitted_by_name}</span>
                    </div>
                  </div>
                  <div style={{ fontFamily: crimson, fontSize: 13, color: muted, lineHeight: 1.5 }}>{fb.description}</div>
                </div>
              ))}
            </div>
          )}
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
  const [activeSection, setActiveSection] = useState('intel')
  const [trainingExpanded, setTrainingExpanded] = useState(false)
  const [fringeExpanded, setFringeExpanded]     = useState(false)
  const [tooltipVisible, setTooltipVisible]     = useState<string | null>(null)

  const [streamToken, setStreamToken] = useState<string>('')
  const [apiKey, setApiKey]           = useState<string>('')
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  const [posts, setPosts]             = useState<StreamMsg[]>([])
  const [draft, setDraft]             = useState('')
  const [sending, setSending]         = useState(false)
  const [prayers, setPrayers]         = useState<StreamMsg[]>([])
  const [unreadDMs, setUnreadDMs]         = useState(0)
  const [unreadWarRoom, setUnreadWarRoom] = useState(0)
  const [hoveredPrayer, setHoveredPrayer] = useState<any>(null)
  const [hoverY, setHoverY]               = useState(0)
  const [members, setMembers]             = useState<any[]>([])
  const [viewingProfile, setViewingProfile] = useState<any>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [pendingDMWith, setPendingDMWith]   = useState<string | null>(null)
  const [hoveredWarrior, setHoveredWarrior] = useState<string | null>(null)
  const [hoveredWarriorY, setHoveredWarriorY] = useState(0)
  const warriorHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [recentMessages, setRecentMessages] = useState<Array<{
    id: string; senderName: string; text: string; timeAgo: string
  }>>([])

  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const tier     = (user?.publicMetadata?.tier as string) || 'Watchman'
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
        userName:  user.fullName || user.firstName || user.username || 'Warrior',
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

  // Refresh Stream token every 25 minutes (tokens expire at 1hr, refresh well before that)
  useEffect(() => {
    if (!user?.id) return
    const interval = setInterval(() => {
      fetch('/api/stream-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:    user.id,
          userName:  user.fullName || user.firstName || user.username || 'Warrior',
          userImage: user.imageUrl || '',
        }),
      })
        .then(r => r.json())
        .then(data => { if (data.token) { setStreamToken(data.token); setApiKey(data.apiKey) } })
        .catch(err => console.error('stream-token refresh error:', err))
    }, 25 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user?.id])

  const fetchPosts = useCallback(async () => {
    if (!streamToken || !apiKey) return
    try {
      const d = await streamFetch('/channels/messaging/war-room-general/query', 'POST', streamToken, apiKey, { state: true, messages: { limit: 50 } })
      if (d.messages) setPosts(d.messages)
      if (typeof d.channel?.unread_count === 'number') setUnreadWarRoom(d.channel.unread_count)
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
    fetch('/api/get-members')
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
          const otherMember = (ch.members || []).find((m: any) => m.user_id !== uid)
          const clerkMatch = members?.find((m: any) => m.id === otherMember?.user_id)
          const senderName = (clerkMatch ? `${clerkMatch.firstName||''} ${clerkMatch.lastName||''}`.trim() : '')
            || (otherMember?.user?.name && !otherMember.user.name.startsWith('user_') ? otherMember.user.name : '')
            || 'Warrior'
          msgs.push({ id: msg.id, senderName, text: msg.text || '', timeAgo })
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
      await streamFetch('/channels/messaging/war-room-general/message', 'POST', streamToken, apiKey, { message: { text: draft.trim(), user_id: user?.id } })
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
  const V = {
    bg:   isDark ? '#0D0B14' : '#f5f0e8',
    surf: isDark ? '#1a1714' : '#e8e0d4',
    card: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    bdr:  isDark ? 'rgba(201,168,76,0.15)' : 'rgba(160,120,48,0.25)',
    txt:  isDark ? '#f0e8d8' : '#1a1410',
    mut:  isDark ? '#9a8c74' : '#5c4a3a',
    dim:  isDark ? '#c8b99a' : '#7a6555',
    s2:   isDark ? '#1c1814' : '#e8e0d4',
    gold: isDark ? '#C9A84C' : '#a07830',
  }

  // ── NAV HELPERS ────────────────────────────────────────────
  const sectionLabel = (label: string) => (
    <div style={{ padding: '12px 16px 4px 16px', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.18em', color: isDark ? '#7a6d58' : '#7a6555' }}>
      {label}
    </div>
  )

  const NAV_DEFAULT = isDark ? '#b8a98a' : '#3d2e1e'
  const navGold    = isDark ? G : '#a07830'

  const navItem = (label: string, section: string, icon?: string) => {
    const active = activeSection === section
    return (
      <button
        onClick={() => { setActiveSection(section); if (isMobile) setSidebarOpen(false) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '8px 16px',
          background: active ? 'rgba(201,168,76,0.1)' : 'transparent',
          border: 'none', borderLeft: `2px solid ${active ? navGold : 'transparent'}`,
          textAlign: 'left', cursor: 'pointer',
          fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em',
          color: active ? navGold : NAV_DEFAULT,
          fontWeight: active ? 600 : 400,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(201,168,76,0.05)'; e.currentTarget.style.color = navGold } }}
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
      {icon && <span style={{ fontSize: 14, width: 20, opacity: 0.6 }}>{icon}</span>}
      <span style={{ fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em', color: NAV_DEFAULT, flex: 1 }}>{label}</span>
      <span style={{ fontFamily: cinzel, fontSize: 8, color: '#8a7a5a', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', padding: '1px 5px', borderRadius: 8 }}>SOON</span>
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
    const [editingId,    setEditingId]    = useState<string | null>(null)
    const [editText,     setEditText]     = useState('')
    const [showComposer, setShowComposer] = useState(false)
    const [hoveredPostId, setHoveredPostId] = useState<string | null>(null)

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
          <span style={{ fontFamily: cinzel, fontSize: 14, color: G, letterSpacing: '0.1em', flex: 1 }}>⚔ War Room Community</span>
          <button onClick={() => setShowComposer(true)} style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: '#0e0c09', background: G, border: 'none', borderRadius: 3, padding: '5px 12px', cursor: 'pointer' }}>+ New Post</button>
        </div>

        {/* Composer modal */}
        {showComposer && (
          <div onClick={() => setShowComposer(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: V.surf, border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 12, width: '100%', maxWidth: 480, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.85)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: `1px solid ${V.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 11, color: G, flexShrink: 0, overflow: 'hidden' }}>
                  {user?.imageUrl ? <img src={user.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : initials}
                </div>
                <span style={{ fontFamily: cinzel, fontSize: 12, color: G, letterSpacing: '0.08em' }}>New Post</span>
                <button onClick={() => setShowComposer(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: V.mut, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>
              <textarea
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) { sendPost(); setShowComposer(false) } }}
                placeholder="Share something with the War Room..."
                rows={5}
                style={{ width: '100%', boxSizing: 'border-box', background: V.bg, border: `1px solid ${V.bdr}`, borderRadius: 8, padding: '12px 14px', color: V.txt, fontFamily: crimson, fontSize: 15, outline: 'none', resize: 'none' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button onClick={() => setShowComposer(false)} style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: V.mut, background: 'transparent', border: `1px solid ${V.bdr}`, borderRadius: 3, padding: '6px 14px', cursor: 'pointer' }}>Cancel</button>
                <button
                  onClick={() => { sendPost(); setShowComposer(false) }}
                  disabled={sending || !draft.trim()}
                  style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: '#0e0c09', background: sending || !draft.trim() ? 'rgba(201,168,76,0.3)' : G, border: 'none', borderRadius: 3, padding: '6px 16px', cursor: sending || !draft.trim() ? 'default' : 'pointer' }}>
                  {sending ? '...' : 'Post ⚔'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px 16px' : '16px 20px' }}>
          <PostCard msg={PINNED} pinned isDark={isDark} streamToken={streamToken} apiKey={apiKey} onReaction={fetchPosts} hoveredId={hoveredPostId} onHover={setHoveredPostId} />
          {posts.filter(msg => msg.type !== 'deleted' && !msg.deleted_at).map(msg => (
            <PostCard key={msg.id} msg={msg} isDark={isDark}
              streamToken={streamToken} apiKey={apiKey} onReaction={fetchPosts}
              hoveredId={hoveredPostId} onHover={setHoveredPostId}
              actions={msg.user?.id === user?.id || user?.publicMetadata?.role === 'minister' ? (
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
              <div style={{ fontFamily: cinzel, fontSize: 7, letterSpacing: '0.2em', color: isDark ? '#6b5e45' : '#7a6555' }}>INTELLIGENCE CENTER</div>
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
            <div style={{ fontFamily: cinzel, fontSize: 13, color: isDark ? '#e8dcc8' : '#1C1407', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.firstName || user?.fullName || 'Warrior'}
            </div>
            <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 1 }}>
              {tier}
            </div>
          </div>
          <SignOutButton>
            <button style={{ background: 'none', border: `1px solid rgba(201,168,76,0.2)`, borderRadius: 4, color: isDark ? '#8a7a5a' : '#6B5520', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px', cursor: 'pointer', flexShrink: 0, transition: 'color 0.15s, border-color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = G; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.color = isDark ? '#8a7a5a' : '#6B5520'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)' }}
            >
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>

        {/* ── QUICK ACCESS ICON STRIP ── */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '10px 8px', borderBottom: 'rgba(201,168,76,0.12) 1px solid', marginBottom: 4 }} onMouseLeave={() => setTooltipVisible(null)}>
          {[
            { icon: '💬', label: 'War Room Chat', section: 'war-room-chat' },
            { icon: '🙏', label: 'Prayer Wall',   section: 'prayer-wall'   },
            { icon: '👥', label: 'Members',        section: 'members'       },
            { icon: '?',  label: 'Feedback',       section: 'feedback'      },
          ].map(({ icon, label, section }, idx) => (
            <div key={section} style={{ position: 'relative' as const }}>
              <button
                onClick={() => { setActiveSection(section); if (isMobile) setSidebarOpen(false) }}
                onMouseEnter={() => setTooltipVisible(section)}
                onMouseLeave={() => setTooltipVisible(null)}
                style={{ background: activeSection === section ? 'rgba(201,168,76,0.15)' : 'transparent', border: activeSection === section ? '1px solid rgba(201,168,76,0.3)' : '1px solid transparent', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', fontSize: section === 'feedback' ? 13 : 16, fontFamily: section === 'feedback' ? cinzel : 'inherit', color: activeSection === section ? G : '#8B7355', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease', position: 'relative' as const, fontWeight: section === 'feedback' ? 700 : 400 }}
              >
                {icon}
                {section === 'war-room-chat' && unreadWarRoom > 0 && (
                  <span style={{ position: 'absolute' as const, top: -4, right: -4, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontFamily: cinzel, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{unreadWarRoom > 9 ? '9+' : unreadWarRoom}</span>
                )}
              </button>
              {tooltipVisible === section && (
                <div style={{ position: 'absolute' as const, top: 42, left: idx === 0 ? 0 : idx === 3 ? 'auto' : '50%', right: idx === 3 ? 0 : 'auto', transform: idx > 0 && idx < 3 ? 'translateX(-50%)' : 'none', background: '#1a1625', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 5, padding: '4px 10px', fontSize: 10, color: G, fontFamily: cinzel, letterSpacing: '0.06em', whiteSpace: 'nowrap' as const, zIndex: 1000, pointerEvents: 'none' as const }}>{label}</div>
              )}
            </div>
          ))}
        </div>

        {/* ── COMMUNITY ── */}
        {sectionLabel('Community')}
        {navItem('Weekly Intel', 'intel', '📡')}
        {navItem('Prayer Wall', 'prayer-wall', '🙏')}
        {navItem('War Room Chat', 'war-room-chat', '✕')}

        {/* ── INTELLIGENCE ── */}
        {sectionLabel('Intelligence')}
        {navItem('Intel Archive', 'database', '📚')}
        <div style={{ paddingLeft: 16 }}>
          <button onClick={() => { setActiveSection('investigate'); if (isMobile) setSidebarOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 16px', background: activeSection === 'investigate' ? 'rgba(201,168,76,0.06)' : 'transparent', border: 'none', borderLeft: activeSection === 'investigate' ? '2px solid rgba(201,168,76,0.5)' : '2px solid rgba(201,168,76,0.1)', cursor: 'pointer', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', color: activeSection === 'investigate' ? navGold : (isDark ? '#6b5e45' : '#7a6555'), textAlign: 'left' as const, boxSizing: 'border-box' as const }}>
            <span style={{ fontSize: 11 }}>🔍</span>
            <span>Symptom Investigator</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 16px', opacity: 0.4 }}>
            <span style={{ fontSize: 11 }}>🗺</span>
            <span style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', color: isDark ? '#6b5e45' : '#7a6555' }}>Body Map</span>
            <span style={{ marginLeft: 'auto', fontSize: 8, fontFamily: cinzel, background: 'rgba(201,168,76,0.1)', color: '#8B7355', padding: '1px 6px', borderRadius: 3, letterSpacing: '0.06em' }}>SOON</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 16px', opacity: 0.4 }}>
            <span style={{ fontSize: 11 }}>🕸</span>
            <span style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', color: isDark ? '#6b5e45' : '#7a6555' }}>Spirit Network</span>
            <span style={{ marginLeft: 'auto', fontSize: 8, fontFamily: cinzel, background: 'rgba(201,168,76,0.1)', color: '#8B7355', padding: '1px 6px', borderRadius: 3, letterSpacing: '0.06em' }}>SOON</span>
          </div>
        </div>

        <button onClick={() => setFringeExpanded(e => !e)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em', color: activeSection === 'fringe-feed' ? navGold : NAV_DEFAULT, textAlign: 'left' as const, boxSizing: 'border-box' as const }}>
          <span style={{ fontSize: 14, width: 20, flexShrink: 0 }}>👁</span>
          <span style={{ flex: 1 }}>Fringe Intelligence</span>
          <span style={{ fontSize: 10, color: isDark ? '#6b5e45' : '#7a6555', display: 'inline-block', transform: fringeExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
        </button>
        {fringeExpanded && (
          <div style={{ paddingLeft: 16, borderLeft: '1px solid rgba(201,168,76,0.1)', marginLeft: 16 }}>
            {navItem('The Feed', 'fringe-feed', '📡')}
            {[{ label: 'The Archive', icon: '🗂' }, { label: 'Fringe Chat', icon: '💬' }, { label: 'Courses', icon: '🎓' }].map(({ label, icon }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', opacity: 0.45 }}>
                <span style={{ fontSize: 13, width: 20 }}>{icon}</span>
                <span style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', color: isDark ? '#6b5e45' : '#7a6555', flex: 1 }}>{label}</span>
                <span style={{ fontSize: 8, fontFamily: cinzel, background: 'rgba(201,168,76,0.1)', color: '#8B7355', padding: '1px 6px', borderRadius: 3 }}>SOON</span>
              </div>
            ))}
          </div>
        )}

        {/* ── FIELD OPERATIONS ── */}
        {sectionLabel('Field Operations')}
        {navItem('Arsenal', 'arsenal', '✦')}
        {navItem('Assessment', 'assessment', '📋')}

        {/* ── TRAINING (collapsible) ── */}
        <button onClick={() => setTrainingExpanded(e => !e)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 16px 6px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.18em', color: isDark ? '#6b5e45' : '#7a6555', textTransform: 'uppercase' as const, textAlign: 'left' as const, boxSizing: 'border-box' as const }}>
          <span style={{ flex: 1 }}>Training</span>
          <span style={{ fontSize: 10, display: 'inline-block', transform: trainingExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
        </button>
        {trainingExpanded && (
          <>
            {[{ label: 'Courses', icon: '🎓' }, { label: "General's Table", icon: '✦' }, { label: 'Protocols', icon: '⚔' }].map(({ label, icon }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', opacity: 0.45 }}>
                <span style={{ fontSize: 13, width: 20 }}>{icon}</span>
                <span style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', color: isDark ? '#6b5e45' : '#7a6555', flex: 1 }}>{label}</span>
                <span style={{ fontSize: 8, fontFamily: cinzel, background: 'rgba(201,168,76,0.1)', color: '#8B7355', padding: '1px 6px', borderRadius: 3 }}>SOON</span>
              </div>
            ))}
          </>
        )}

        {/* ── EVENTS ── */}
        {navItem('Events', 'events', '📅')}

        {/* ── ADMIN (minister only) ── */}
        {(user?.publicMetadata?.role as string) === 'minister' && (
          <>
            <div style={{ height: 1, background: 'rgba(201,168,76,0.15)', margin: '12px 16px 8px' }} />
            <a href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 16px', background: 'rgba(201,168,76,0.06)', borderLeft: '2px solid rgba(201,168,76,0.4)', textDecoration: 'none', fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em', color: G, transition: 'background 0.15s', boxSizing: 'border-box' as const }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(201,168,76,0.12)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(201,168,76,0.06)' }}
            >
              <span style={{ fontSize: 14, width: 20, flexShrink: 0 }}>🛡</span>
              Admin Panel
            </a>
          </>
        )}
      </div>

      {/* ── SIDEBAR FOOTER — pinned outside scroll ── */}
      <div style={{ flexShrink: 0, borderTop: '1px solid rgba(201,168,76,0.1)', padding: '4px 0' }}>
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
      overflowX: 'hidden',
      width: '100%',
      maxWidth: '100vw',
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
        background: V.surf, borderRight: `1px solid ${isDark ? 'rgba(201,168,76,0.2)' : V.bdr}`,
        overflowY: 'auto' as const, WebkitOverflowScrolling: 'touch' as any,
        paddingBottom: 'env(safe-area-inset-bottom)',
      } : {
        display: 'flex', flexDirection: 'column',
        background: V.surf, borderRight: `1px solid ${isDark ? 'rgba(201,168,76,0.2)' : V.bdr}`, overflow: 'hidden',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <SidebarContent />
      </div>

      {/* ── CENTER ── */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', overflowX: 'hidden', minWidth: 0, background: V.bg, height: isMobile ? '100vh' : undefined, width: isMobile ? '100%' : undefined, maxWidth: isMobile ? '100vw' : undefined }}>
        {activeSection === 'intel'         && <WeeklyIntelView theme={theme} userTier={tier} isMobile={isMobile} setSidebarOpen={setSidebarOpen} setActiveSection={setActiveSection} />}
        {activeSection === 'war-room'      && <WarRoomView />}
        {activeSection === 'war-room-chat' && (
          <WarRoomChatView
            streamToken={streamToken}
            apiKey={apiKey}
            userId={user?.id || ''}
            userName={user?.fullName || user?.firstName || 'Warrior'}
            userImageUrl={user?.imageUrl || ''}
            isDark={isDark}
            isMobile={isMobile}
            setSidebarOpen={setSidebarOpen}
          />
        )}
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
        {activeSection === 'dms'         && <MessagesView isMobile={isMobile} setSidebarOpen={setSidebarOpen} streamToken={streamToken} apiKey={apiKey} user={user} userId={user?.id || ''} userName={user?.fullName || user?.firstName || 'Warrior'} pendingDMWith={pendingDMWith} onDMStarted={() => setPendingDMWith(null)} isDark={isDark} dmMembers={members} onStartDM={(memberId) => setPendingDMWith(memberId)} onUnreadChange={setUnreadDMs} />}
        {activeSection === 'members'     && (
          <MembersView
            members={members}
            currentUserId={user?.id || ''}
            currentUserTier={(user?.publicMetadata?.tier as string) || 'Watchman'}
            currentUserRole={(user?.publicMetadata?.role as string) || 'member'}
            onViewProfile={setViewingProfile}
            onStartDM={(memberId, memberName) => {
              setPendingDMWith(memberId)
              setActiveSection('dms')
            }}
            setActiveSection={setActiveSection}
            isDark={theme !== 'light'}
            isMobile={isMobile}
          />
        )}
        {activeSection === 'database'    && <DatabaseView theme={theme} isMobile={isMobile} setSidebarOpen={setSidebarOpen} userTier={tier} />}
        {activeSection === 'investigate' && <InvestigatorView theme={theme} userTier={tier} isMobile={isMobile} setSidebarOpen={setSidebarOpen} />}
        {activeSection === 'arsenal'     && <ArsenalView theme={theme} userTier={tier} isMobile={isMobile} setSidebarOpen={setSidebarOpen} />}

        {activeSection === 'assessment'  && <LauncherView title="Assessment"        icon="📋" href="/assessment" />}
        {activeSection === 'help'        && <LauncherView title="Request Help"      icon="🙏" href="/help" />}
        {activeSection === 'fringe-feed' && <FringeIntelView theme={theme} isMobile={isMobile} setSidebarOpen={setSidebarOpen} />}
        {activeSection === 'events'      && <EventsView theme={theme} isMobile={isMobile} setSidebarOpen={setSidebarOpen} />}
        {activeSection === 'feedback'    && <FeedbackView theme={theme} userTier={tier} isMobile={isMobile} setSidebarOpen={setSidebarOpen} userId={user?.id || ''} userName={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Warrior'} />}
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
            setActiveSection('dms')
            setPendingDMWith(memberId)
          }}
        />
      )}
      {editingProfile && (
        <EditProfileModal
          userId={user?.id || ''}
          firstName={user?.firstName || ''}
          lastName={user?.lastName || ''}
          imageUrl={user?.imageUrl || ''}
          existingBio={(user?.publicMetadata?.bio as string) || ''}
          existingCity={(user?.publicMetadata?.city as string) || ''}
          existingState={(user?.publicMetadata?.state as string) || ''}
          isDark={theme !== 'light'}
          onClose={() => setEditingProfile(false)}
        />
      )}

      {/* ── RIGHT SIDEBAR — desktop only ── */}
      {!isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', background: isDark ? V.surf : '#ede6db', borderLeft: `1px solid ${V.bdr}`, overflow: 'visible', position: 'relative' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 16px' }}>

            {/* Prayer Wall widget */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${V.bdr}` }}>
                <span style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.14em', color: G, textTransform: 'uppercase' }}>🙏 Prayer Wall</span>
                <button
                  onClick={() => setActiveSection('prayer-wall')}
                  style={{ padding: '3px 10px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: '20px', color: '#C9A84C', fontFamily: cinzel, fontSize: '8px', letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase' as const }}
                >+ Add</button>
              </div>
              <div style={{ padding: '10px 14px 0' }}>
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
              </div>
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
                  recentMessages.filter((msg: any) => msg.type !== 'deleted' && !msg.deleted_at).slice(0, 5).map((msg: any) => (
                    <div
                      key={msg.id}
                      onClick={() => setActiveSection('dms')}
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
            <div style={{ padding: '14px 16px', position: 'relative', overflow: 'visible' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <span style={{ color: '#4caf50', fontSize: 8 }}>●</span>
                <span style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.2em', color: G }}>ACTIVE WARRIORS</span>
              </div>
              {/* Current user always shown first */}
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
              {/* Other members */}
              {members.filter(m => m.id !== user?.id).slice(0, 6).map(member => {
                const memberTier = member.publicMetadata?.tier || 'Watchman'
                const tierColors: Record<string, string> = { General: '#C9A84C', Commander: '#8B9DCA', Soldier: '#7a9e7e', Watchman: '#6b6b7a' }
                const tierColor = tierColors[memberTier] || '#6b6b7a'
                const currentUserId = user?.id || ''
                const displayName = (() => {
                  const full = [member.firstName, member.lastName].filter(Boolean).join(' ').trim()
                  if (full) return full
                  if (member.username && !member.username.startsWith('user_')) return member.username
                  return 'Warrior'
                })()
                return (
                  <div
                    key={member.id}
                    style={{ position: 'relative', overflow: 'visible' }}
                    onMouseEnter={e => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      const y = rect.top
                      clearTimeout(warriorHoverTimer.current)
                      warriorHoverTimer.current = setTimeout(() => {
                        setHoveredWarriorY(y)
                        setHoveredWarrior(member.id)
                      }, 350)
                    }}
                    onMouseLeave={() => {
                      clearTimeout(warriorHoverTimer.current)
                      warriorHoverTimer.current = setTimeout(() => setHoveredWarrior(null), 300)
                    }}
                  >
                    <button
                      onClick={() => setViewingProfile(member)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' as const }}
                    >
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: `1px solid ${tierColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontFamily: cinzel, color: '#C9A84C', overflow: 'hidden' }}>
                          {member.imageUrl ? <img src={member.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : displayName[0]?.toUpperCase()}
                        </div>
                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: '#4ade80', border: `2px solid ${V.surf}` }} />
                      </div>
                      <div>
                        <div style={{ fontFamily: cinzel, fontSize: 11, color: V.txt, letterSpacing: '0.03em' }}>{displayName}</div>
                        <TierBadge tier={memberTier} />
                      </div>
                    </button>
                    {hoveredWarrior === member.id && member.id !== currentUserId && (
                      <div
                        onMouseEnter={() => { if (warriorHoverTimer.current) clearTimeout(warriorHoverTimer.current) }}
                        onMouseLeave={() => { warriorHoverTimer.current = setTimeout(() => setHoveredWarrior(null), 150) }}
                        style={{ position: 'fixed', right: 288, top: hoveredWarriorY, background: V.surf, border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 8, padding: '10px 12px', zIndex: 9999, minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', pointerEvents: 'auto' }}
                      >
                        <div style={{ fontFamily: cinzel, fontSize: 10, color: '#C9A84C', letterSpacing: '0.06em', marginBottom: 8 }}>{displayName}</div>
                        <button
                          onClick={() => setViewingProfile(member)}
                          style={{ width: '100%', padding: '5px 10px', background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 6, color: V.mut, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const, marginBottom: 6 }}
                        >👤 Profile</button>
                        <button
                          onClick={() => { setPendingDMWith(member.id); setActiveSection('dms') }}
                          style={{ width: '100%', padding: '5px 10px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 6, color: '#C9A84C', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const }}
                        >💬 Message</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
