import { createFileRoute } from '@tanstack/react-router'
import { useAuth, useUser, SignOutButton } from '@clerk/tanstack-start'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { SpiritNetwork } from '@/components/SpiritNetwork'
import { SessionCommandCenter } from '@/components/SessionCommandCenter'
import { BottomNav, TacticalCard, ClassBadge, HUDChip, MonoTime, ThreatBar, SectionLabel, StatusDot } from '@/components/primitives'
import { FlagButton } from '@/components/FlagButton'
import { Home, FileText, Crosshair, User, Plus, BookOpen, MessageSquare, Inbox, Heart, Cross, Users, HelpCircle, FolderOpen, Antenna, Radio, Archive, Sword, Library, Search, Map, Network, Moon, Eye, Clapperboard, MapPin, ClipboardList, Calendar, Shield, Settings, GraduationCap, FolderArchive, Star, DoorOpen } from 'lucide-react'

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
@keyframes pulse { 0%,100% { opacity: 0.4 } 50% { opacity: 0.8 } }
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
  --wri-bg: #F8F6F2;
  --wri-surface: #FFFFFF;
  --wri-surface2: #F5F2EE;
  --wri-border: rgba(212,196,176,0.85);
  --wri-text: #1C1410;
  --wri-dim: #4A3728;
  --wri-muted: #7A6555;
  --wri-card: #FFFFFF;
  --wri-gold: #C9A84C;
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

function FoundingBadge() {
  return (
    <span style={{ background: 'rgba(201,168,76,0.13)', border: `1px solid ${G}`, borderRadius: 10, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: G, padding: '1px 6px', whiteSpace: 'nowrap' as const }}>
      ⚜ Founding
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
  const text = isDark ? '#f0ece0' : '#2D2924'
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
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' as const }}>
            <div style={{ display: 'inline-block', padding: '2px 10px', border: `1px solid ${tierColor}`, borderRadius: '20px', fontSize: '10px', fontFamily: mc, letterSpacing: '0.1em', color: tierColor, textTransform: 'uppercase' as const }}>{tier}</div>
            {member.publicMetadata?.foundingMember && <FoundingBadge />}
          </div>
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
  const surf = isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF'
  const text = isDark ? '#f0ece0' : '#2D2924'
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
    bg: isDark ? '#0D0B14' : '#FAF8F5', surf: isDark ? '#1a1714' : '#FFFFFF',
    card: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
    bdr: isDark ? 'rgba(201,168,76,0.15)' : 'rgba(139,105,20,0.25)',
    txt: isDark ? '#f0e8d8' : '#2D2924', mut: isDark ? '#9a8c74' : '#5C5248',
    dim: isDark ? '#c8b99a' : '#5C5248', s2: isDark ? '#1c1814' : '#FFFFFF', gold: isDark ? '#C9A84C' : '#8B6914',
    shadow: isDark ? 'none' : '0 2px 12px rgba(45,41,36,0.06), 0 1px 3px rgba(45,41,36,0.04)',
  }
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null)
  const [selectedDMUserId, setSelectedDMUserId] = useState<string | null>(null)
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
  const [selectedName, setSelectedName] = useState('')
  const [connecting, setConnecting] = useState(false)

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

  useEffect(() => {
    if (pendingDMWith) setSelectedDMUserId(pendingDMWith)
  }, [pendingDMWith])

  async function selectMember(id: string, name: string) {
    setSelectedDMUserId(id)
    setSelectedName(name)
    setSelectedConvo(null)
    setConnecting(true)
    onStartDM?.(id, name)
  }

  useEffect(() => { if (selectedConvo) setConnecting(false) }, [selectedConvo])

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
    <div style={{ flex: 1, display: 'flex', minHeight: 0, background: V.bg }}>
      {/* Contacts panel */}
      {(!isMobile || !selectedDMUserId) && (
        <div style={{ width: isMobile ? '100%' : 280, flexShrink: 0, borderRight: isMobile ? 'none' : `1px solid ${V.bdr}`, display: 'flex', flexDirection: 'column', height: '100%', background: V.surf }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${V.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ fontFamily: cinzel, color: G, fontSize: 13, letterSpacing: '0.08em' }}>💬 Direct Messages</div>
            <button
              onClick={() => setShowNewDM(true)}
              style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(201,168,76,0.1)', border: `1px solid ${V.bdr}`, color: G, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
            >+</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' as const }}>
            {dmMembers.filter(m => m.id !== userId).map(member => {
              const displayName = member.firstName ? `${member.firstName} ${member.lastName || ''}`.trim() : member.username || 'Warrior'
              const isSelected = member.id === selectedDMUserId
              return (
                <div key={member.id}
                  onClick={() => selectMember(member.id, displayName)}
                  style={{ padding: '12px 16px', borderBottom: `1px solid ${V.bdr}`, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'background 0.15s', background: isSelected ? 'rgba(201,168,76,0.08)' : 'transparent' }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.04)' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 14, color: G, flexShrink: 0, overflow: 'hidden' }}>
                    {member.imageUrl ? <img src={member.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : displayName[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 12, color: V.txt, letterSpacing: '0.04em' }}>{displayName}</div>
                    <div style={{ fontSize: 10, color: V.mut, marginTop: 2 }}>{member.publicMetadata?.tier || 'Watchman'}</div>
                  </div>
                </div>
              )
            })}
            {dmMembers.filter(m => m.id !== userId).length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center' as const, color: V.mut, fontFamily: crimson, fontStyle: 'italic', fontSize: 14 }}>
                No other members yet
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conversation panel */}
      {(!isMobile || selectedDMUserId) && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {selectedDMUserId ? (
            <>
              <div style={{ padding: '10px 16px', borderBottom: `1px solid ${V.bdr}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: V.surf }}>
                {isMobile && (
                  <button onClick={() => { setSelectedDMUserId(null); setSelectedConvo(null); setSelectedName('') }} style={{ background: 'none', border: 'none', color: G, cursor: 'pointer', fontSize: 18, padding: 0, lineHeight: 1 }}>←</button>
                )}
                <div style={{ fontFamily: cinzel, fontSize: 12, color: V.txt, letterSpacing: '0.04em' }}>
                  {selectedName || dmMembers.find((m: any) => m.id === selectedDMUserId)?.firstName || 'Direct Message'}
                </div>
              </div>
              {(connecting || !selectedConvo) ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: V.mut }}>
                  <span style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em' }}>Connecting...</span>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
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
                  style={{ flex: 1, background: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, padding: '10px 12px', color: V.txt, fontFamily: crimson, fontSize: 14, outline: 'none', resize: 'none' as const }}
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
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: V.mut }}>
              <div style={{ fontSize: 32, opacity: 0.4 }}>💬</div>
              <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em', opacity: 0.6 }}>Select a conversation</div>
            </div>
          )}
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
              style={{ width: '100%', boxSizing: 'border-box', background: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 6, padding: '8px 12px', color: isDark ? '#f0e8d8' : '#2D2924', fontFamily: crimson, fontSize: 14, outline: 'none', marginBottom: 12 }}
            />
            <div style={{ maxHeight: 240, overflowY: 'auto' as const }}>
              {dmMembers.filter(m => m.id !== userId && `${m.firstName || ''} ${m.lastName || ''} ${m.username || ''}`.toLowerCase().includes(newDMSearch.toLowerCase())).map(m => {
                const name = m.firstName ? `${m.firstName} ${m.lastName || ''}`.trim() : m.username || 'Member'
                return (
                  <div
                    key={m.id}
                    onClick={() => { selectMember(m.id, name); setShowNewDM(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.08)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 13, color: G, overflow: 'hidden', flexShrink: 0 }}>
                      {m.imageUrl ? <img src={m.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontFamily: cinzel, fontSize: 11, color: isDark ? '#f0e8d8' : '#2D2924', letterSpacing: '0.04em' }}>{name}</div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginTop: 2 }}>
                        <TierBadge tier={m.publicMetadata?.tier || 'Watchman'} />
                        {m.publicMetadata?.foundingMember && <FoundingBadge />}
                      </div>
                    </div>
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

  const bg   = isDark ? '#0D0B14' : '#FAF8F5'
  const s1   = isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF'
  const s2   = isDark ? 'rgba(255,255,255,0.06)' : '#ffffff'
  const bdr  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const txt  = isDark ? '#e8e0d0' : '#2D2924'
  const muted = isDark ? 'rgba(232,224,208,0.45)' : 'rgba(45,41,36,0.45)'
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

  const TIER_TO_CLASS: Record<string, import('@/components/primitives').ClassLevel> = {
    General: 'I', Commander: 'II', Soldier: 'III', Watchman: 'IV',
  }

  function MemberCard({ member, large = false }: { member: any, large?: boolean }) {
    const tier        = member.publicMetadata?.tier || 'Watchman'
    const tierColor   = TIER_COLORS[tier] || '#6b6b7a'
    const tierGlow    = TIER_GLOW[tier] || 'transparent'
    const isOwn       = member.id === currentUserId
    const displayName = member.fullName || (member.firstName ? `${member.firstName} ${member.lastName||''}`.trim() : member.username || 'Warrior')
    const avatarSize  = large ? 72 : 48
    const initials    = ((member.firstName?.[0]||'') + (member.lastName?.[0]||'')).toUpperCase() || displayName[0]?.toUpperCase() || 'W'

    return (
      <TacticalCard
        brackets={large}
        glow={large}
        padding={large ? '24px 20px' : '16px 14px'}
        onClick={() => onViewProfile(member)}
        style={{
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          gap: large ? 10 : 8,
          cursor: 'pointer',
          transition: 'transform 0.15s, box-shadow 0.15s',
          ...(large ? { background: `linear-gradient(135deg, var(--bg-2), ${tierGlow})` } : {}),
        }}
      >
        {isOwn && (
          <HUDChip style={{ position: 'absolute', top: 8, right: 8, fontSize: 9 }}>YOU</HUDChip>
        )}
        <div style={{ width:avatarSize, height:avatarSize, borderRadius:'50%', border:`2px solid ${tierColor}`, overflow:'hidden', flexShrink:0, background:`rgba(201,168,76,0.1)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:large?24:16, fontFamily:mc, color:'#C9A84C', boxShadow: large ? `0 0 16px ${tierGlow}` : 'none' }}>
          {member.imageUrl ? <img src={member.imageUrl} alt={displayName} style={{ width:'100%', height:'100%', objectFit:'cover' as const }} /> : initials}
        </div>
        <div style={{ textAlign:'center' as const, width:'100%' }}>
          <div style={{ fontFamily: cinzel, fontSize: large ? 13 : 11, color: txt, letterSpacing:'0.05em', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom: 6 }}>{displayName}</div>
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:4, flexWrap:'wrap' as const }}>
            <ClassBadge level={TIER_TO_CLASS[tier] || 'IV'} label={tier.toUpperCase()} />
            {member.publicMetadata?.foundingMember && <FoundingBadge />}
          </div>
        </div>
        {!isOwn && (
          <button
            onClick={e => { e.stopPropagation(); canDM ? onStartDM(member.id, displayName) : onViewProfile(member) }}
            style={{ marginTop:2, padding: large ? '6px 18px' : '4px 12px', background: canDM ? 'rgba(201,168,76,0.1)' : 'transparent', border:`1px solid ${canDM ? 'rgba(201,168,76,0.4)' : bdr}`, borderRadius:6, color: canDM ? '#C9A84C' : muted, fontFamily:mc, fontSize:9, letterSpacing:'0.08em', cursor:'pointer', textTransform:'uppercase' as const }}
          >{canDM ? '💬 Message' : '🔒 Soldier+'}</button>
        )}
      </TacticalCard>
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
    bg: isDark ? '#0D0B14' : '#FAF8F5', surf: isDark ? '#1a1714' : '#FFFFFF',
    card: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
    bdr: isDark ? 'rgba(201,168,76,0.15)' : 'rgba(139,105,20,0.25)',
    txt: isDark ? '#f0e8d8' : '#2D2924', mut: isDark ? '#9a8c74' : '#5C5248',
    dim: isDark ? '#c8b99a' : '#5C5248', s2: isDark ? '#1c1814' : '#FFFFFF', gold: isDark ? '#C9A84C' : '#8B6914',
    shadow: isDark ? 'none' : '0 2px 12px rgba(45,41,36,0.06), 0 1px 3px rgba(45,41,36,0.04)',
  }
  const emojiMap: Record<string, string> = { pray: '🙏', love: '❤️', fire: '🔥', cross: '✝️', sword: '⚔️' }
  const initial = (msg.user?.name || msg.user?.id || '?')[0].toUpperCase()
  const time    = new Date(msg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
  const isNew = Date.now() - new Date(msg.created_at).getTime() < 86400000
  return (
    <div
      onMouseEnter={() => onHover?.(msg.id)}
      onMouseLeave={() => onHover?.(null)}
      style={{ position: 'relative', background: 'var(--bg-2)', border: `1px solid var(--gold-line)`, padding: 20, marginBottom: 12, overflow: 'visible' }}
    >
      {/* Bracket corners */}
      <div style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTop: '1px solid var(--gold)', borderLeft: '1px solid var(--gold)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderTop: '1px solid var(--gold)', borderRight: '1px solid var(--gold)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -1, left: -1, width: 10, height: 10, borderBottom: '1px solid var(--gold)', borderLeft: '1px solid var(--gold)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottom: '1px solid var(--gold)', borderRight: '1px solid var(--gold)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: `1px solid var(--gold-line)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 13, color: G, flexShrink: 0, overflow: 'hidden' }}>
          {msg.user?.image ? <img src={msg.user.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <MonoTime size={13}>{msg.user?.name || msg.user?.id || 'Warrior'}</MonoTime>
            {pinned && <HUDChip>HOST</HUDChip>}
            {isNew && <StatusDot kind="ok" label="New" size={5} />}
            <MonoTime color="var(--t-3)" size={11}>{time}</MonoTime>
          </div>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: V.txt, lineHeight: 1.75, margin: 0, wordBreak: 'break-word' }}>{msg.text}</p>
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
    bg: isDark ? '#0D0B14' : '#FAF8F5', surf: isDark ? '#1a1714' : '#FFFFFF',
    card: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
    bdr: isDark ? 'rgba(201,168,76,0.15)' : 'rgba(139,105,20,0.25)',
    txt: isDark ? '#f0e8d8' : '#2D2924', mut: isDark ? '#9a8c74' : '#5C5248',
    dim: isDark ? '#c8b99a' : '#5C5248', s2: isDark ? '#1c1814' : '#FFFFFF', gold: isDark ? '#C9A84C' : '#8B6914',
    shadow: isDark ? 'none' : '0 2px 12px rgba(45,41,36,0.06), 0 1px 3px rgba(45,41,36,0.04)',
  }
  const [draft,           setDraft]           = useState('')
  const [prayers,         setPrayers]         = useState<StreamMsg[]>([])
  const [hoveredPrayerId, setHoveredPrayerId] = useState<string | null>(null)
  const [editingPostId,   setEditingPostId]   = useState<string | null>(null)
  const [editDraft,       setEditDraft]       = useState('')
  const [showPrayerEmoji, setShowPrayerEmoji] = useState(false)
  const [prayerJoined,    setPrayerJoined]    = useState<boolean>(() => {
    try { return localStorage.getItem('wri_prayer_joined') === 'true' } catch { return false }
  })
  const [warriorCount, setWarriorCount]       = useState<number>(() => {
    try { return parseInt(localStorage.getItem('wri_warrior_count') || '0', 10) || 0 } catch { return 0 }
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const PRAYER_EMOJIS = ['🙏','❤️','🔥','✝️','⚔️','💪','🕊️','👑','🌿','💧','🗡️','📖','🏔️','⭐','🌟','💛','🤍','🫶','🙌','✨']

  function joinPrayerChain() {
    if (prayerJoined) return
    const next = warriorCount + 1
    setPrayerJoined(true)
    setWarriorCount(next)
    try {
      localStorage.setItem('wri_prayer_joined', 'true')
      localStorage.setItem('wri_warrior_count', String(next))
    } catch {}
  }

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
              style={{ background: 'none', border: 'none', color: G, fontSize: 22, cursor: 'pointer', padding: '4px 8px', marginRight: 4, lineHeight: 1 }}>
              ☰
            </button>
          )}
          <div>
            <span style={{ fontFamily: cinzel, fontSize: 18, color: G }}>🙏 Prayer Wall</span>
            {warriorCount > 0 && (
              <div style={{ fontFamily: cinzel, fontSize: 9, color: V.mut, letterSpacing: '0.08em', marginTop: 2 }}>
                ⚔ {warriorCount} warrior{warriorCount !== 1 ? 's' : ''} in the chain
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={joinPrayerChain}
            disabled={prayerJoined}
            style={{ padding: '6px 14px', background: prayerJoined ? 'rgba(201,168,76,0.06)' : 'rgba(201,168,76,0.15)', border: `1px solid ${prayerJoined ? 'rgba(201,168,76,0.2)' : 'rgba(201,168,76,0.5)'}`, borderRadius: '6px', color: prayerJoined ? V.mut : G, fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.08em', cursor: prayerJoined ? 'default' : 'pointer', textTransform: 'uppercase' as const }}
          >{prayerJoined ? '✓ In the Chain' : '🙏 Join Prayer Chain'}</button>
          <button
            onClick={() => inputRef.current?.focus()}
            style={{ padding: '6px 14px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '6px', color: G, fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const }}
          >+ Add Prayer</button>
        </div>
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

// ── TESTIMONY WALL VIEW ────────────────────────────────────
function TestimonyWallView({ theme, isMobile, setSidebarOpen, userId, userName, userTier, userImage }: any) {
  const isDark = theme !== 'light'
  const { getToken } = useAuth()
  const bg     = isDark ? '#0D0B14' : '#FAF8F5'
  const surf   = isDark ? 'rgba(201,168,76,0.04)' : '#FFFFFF'
  const bdr    = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(139,105,20,0.25)'
  const txt    = isDark ? '#f0e8d8' : '#2D2924'
  const mut    = isDark ? '#9a8c74' : '#5C5248'
  const GG     = isDark ? '#C9A84C' : '#8B6914'
  const shadow = isDark ? 'none' : '0 2px 12px rgba(45,41,36,0.06), 0 1px 3px rgba(45,41,36,0.04)'

  const [testimonies, setTestimonies]   = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [title, setTitle]               = useState('')
  const [body, setBody]                 = useState('')
  const [category, setCategory]         = useState('personal')
  const [isAnonymous, setIsAnonymous]   = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [submitted, setSubmitted]       = useState(false)
  const [expandedId, setExpandedId]     = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [reactions, setReactions]       = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('wri_reactions') || '{}') } catch { return {} }
  })
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    async function load() {
      const token = await getToken()
      const res = await fetch('/api/testimonies', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const d = await res.json()
        const ts = d.testimonies || []
        setTestimonies(ts)
        const counts: Record<string, number> = {}
        ts.forEach((t: any) => { counts[t.id] = t.reaction_count || 0 })
        setReactionCounts(counts)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function submitTestimony() {
    if (!title.trim() || !body.trim()) return
    setSubmitting(true)
    const token = await getToken()
    const res = await fetch('/api/testimonies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, body, category, isAnonymous }),
    })
    setSubmitting(false)
    if (res.ok) { setSubmitted(true); setShowForm(false); setTitle(''); setBody('') }
  }

  async function handleReaction(testimonyId: string) {
    if (reactions[testimonyId]) return
    const newReactions = { ...reactions, [testimonyId]: true }
    setReactions(newReactions)
    setReactionCounts(prev => ({ ...prev, [testimonyId]: (prev[testimonyId] || 0) + 1 }))
    try {
      localStorage.setItem('wri_reactions', JSON.stringify(newReactions))
      const token = await getToken()
      await fetch(`/api/testimonies?id=${testimonyId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {}
  }

  const TESTIMONY_CATEGORIES = ['all', 'personal', 'healing', 'deliverance', 'restoration', 'ministry', 'freedom', 'breakthrough']
  const categoryLabels: Record<string, string> = {
    all: 'All', personal: '✝ Personal', healing: '🙏 Healing', deliverance: '⚔ Deliverance',
    restoration: '💛 Restoration', ministry: '📡 Ministry', freedom: '🕊 Freedom', breakthrough: '⚡ Breakthrough',
  }
  const categories = ['personal', 'healing', 'deliverance', 'restoration', 'ministry', 'freedom', 'breakthrough']

  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, background: bg, padding: isMobile ? '16px' : '24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        {isMobile && <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: GG, fontSize: 22, cursor: 'pointer', padding: '4px 8px', marginRight: 4, lineHeight: 1 }}>☰</button>}
        <div>
          <h2 style={{ fontFamily: cinzel, color: GG, fontSize: isMobile ? 18 : 22, margin: 0, letterSpacing: '0.08em' }}>✝ Testimony Wall</h2>
          <p style={{ color: mut, fontSize: 13, margin: '4px 0 0', fontFamily: crimson }}>What God has done — shared for His glory</p>
        </div>
        <button
          onClick={() => { setShowForm(f => !f); setSubmitted(false) }}
          style={{ marginLeft: 'auto', padding: '8px 18px', background: showForm ? 'transparent' : 'rgba(201,168,76,0.15)', border: `1px solid ${GG}`, borderRadius: 8, color: GG, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const, flexShrink: 0 }}
        >
          {showForm ? 'Cancel' : '+ Share Testimony'}
        </button>
      </div>

      {/* Submission success */}
      {submitted && (
        <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 10, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>✓</span>
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 12, color: '#4ade80', letterSpacing: '0.06em', marginBottom: 2 }}>Testimony Submitted</div>
            <div style={{ fontFamily: crimson, fontSize: 13, color: mut }}>Your testimony is pending review and will appear here once approved by leadership.</div>
          </div>
        </div>
      )}

      {/* Submit form */}
      {showForm && (
        <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: '20px 24px', marginBottom: 28 }}>
          <div style={{ fontFamily: cinzel, fontSize: 12, color: GG, letterSpacing: '0.1em', marginBottom: 16 }}>Share What God Did</div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title — e.g. 'Freedom from 20 years of fear'"
            style={{ width: '100%', boxSizing: 'border-box' as const, background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', border: `1px solid ${bdr}`, borderRadius: 8, padding: '10px 14px', color: txt, fontFamily: cinzel, fontSize: 12, letterSpacing: '0.04em', outline: 'none', marginBottom: 10 }}
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Share what happened in your own words. How did God move? What changed?"
            rows={5}
            style={{ width: '100%', boxSizing: 'border-box' as const, background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', border: `1px solid ${bdr}`, borderRadius: 8, padding: '10px 14px', color: txt, fontFamily: crimson, fontSize: 14, outline: 'none', resize: 'vertical' as const, lineHeight: 1.6, marginBottom: 10 }}
          />
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' as const }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                style={{ padding: '4px 12px', background: category === cat ? 'rgba(201,168,76,0.2)' : 'transparent', border: `1px solid ${category === cat ? GG : bdr}`, borderRadius: 20, color: category === cat ? GG : mut, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const }}>
                {categoryLabels[cat]}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <input type="checkbox" id="anon-check" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} style={{ accentColor: GG, width: 14, height: 14 }} />
            <label htmlFor="anon-check" style={{ fontFamily: crimson, fontSize: 13, color: mut, cursor: 'pointer' }}>Post anonymously</label>
          </div>
          <button
            onClick={submitTestimony}
            disabled={submitting || !title.trim() || !body.trim()}
            style={{ padding: '10px 24px', background: GG, border: 'none', borderRadius: 8, color: '#0D0B14', fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const, fontWeight: 700, opacity: (!title.trim() || !body.trim()) ? 0.5 : 1 }}
          >
            {submitting ? 'Submitting...' : '✝ Submit Testimony'}
          </button>
        </div>
      )}

      {/* Category filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' as const }}>
        {TESTIMONY_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveFilter(cat)}
            style={{ padding: '4px 12px', background: activeFilter === cat ? 'rgba(201,168,76,0.2)' : 'transparent', border: `1px solid ${activeFilter === cat ? GG : bdr}`, borderRadius: 20, color: activeFilter === cat ? GG : mut, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const }}>
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* Testimonies list */}
      {loading ? (
        <div style={{ textAlign: 'center' as const, color: mut, fontFamily: crimson, fontStyle: 'italic', padding: 40 }}>Loading testimonies...</div>
      ) : testimonies.filter(t => activeFilter === 'all' || t.category === activeFilter).length === 0 ? (
        <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: '40px 24px', textAlign: 'center' as const }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✝</div>
          <div style={{ fontFamily: cinzel, fontSize: 13, color: GG, letterSpacing: '0.08em', marginBottom: 8 }}>No Testimonies Yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
          {testimonies.filter(t => activeFilter === 'all' || t.category === activeFilter).map(t => {
            const isExpanded = expandedId === t.id
            const preview = t.body.length > 200 ? t.body.slice(0, 200) + '...' : t.body
            const initial = (t.user_name || 'A')[0].toUpperCase()
            const hasReacted = reactions[t.id]
            const count = reactionCounts[t.id] || 0
            return (
              <div key={t.id} style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: '20px 22px', borderLeft: `3px solid ${GG}`, boxShadow: shadow }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 12, color: GG, flexShrink: 0, overflow: 'hidden' }}>
                    {t.user_image ? <img src={t.user_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' as const }} /> : initial}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 11, color: txt, letterSpacing: '0.04em' }}>{t.user_name}</div>
                    <div style={{ fontSize: 10, color: mut, marginTop: 1 }}>
                      {categoryLabels[t.category] || t.category} · {new Date(t.approved_at || t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div style={{ fontFamily: cinzel, fontSize: 14, color: GG, letterSpacing: '0.04em', marginBottom: 10 }}>{t.title}</div>
                <div style={{ fontFamily: crimson, fontSize: 15, color: txt, lineHeight: 1.7, marginBottom: 12 }}>
                  {isExpanded ? t.body : preview}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {t.body.length > 200 && (
                    <button onClick={() => setExpandedId(isExpanded ? null : t.id)}
                      style={{ background: 'none', border: 'none', color: GG, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em', cursor: 'pointer', padding: 0, textTransform: 'uppercase' as const }}>
                      {isExpanded ? '▲ Show Less' : '▼ Read More'}
                    </button>
                  )}
                  <button
                    onClick={() => handleReaction(t.id)}
                    style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', background: hasReacted ? 'rgba(201,168,76,0.15)' : 'transparent', border: `1px solid ${hasReacted ? GG : bdr}`, borderRadius: 20, color: hasReacted ? GG : mut, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', cursor: hasReacted ? 'default' : 'pointer', textTransform: 'uppercase' as const }}>
                    <span>⚔</span>
                    <span>Standing with You</span>
                    {count > 0 && <span style={{ color: GG, fontWeight: 700 }}>{count}</span>}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── TRAINING VIEW ──────────────────────────────────────────
function TrainingView({ theme, isMobile, setSidebarOpen, userId, userTier, getToken, setActiveSection }: any) {
  const isDark = theme !== 'light'
  const bg   = isDark ? '#0D0B14' : '#FAF8F5'
  const surf = isDark ? 'rgba(201,168,76,0.04)' : '#FFFFFF'
  const bdr  = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(139,105,20,0.25)'
  const txt  = isDark ? '#f0e8d8' : '#2D2924'
  const mut  = isDark ? '#9a8c74' : '#5C5248'
  const dim  = isDark ? '#5a4f3a' : '#5C5248'
  const G    = isDark ? '#C9A84C' : '#8B6914'

  const [view, setView]                     = useState<'list' | 'course' | 'episode'>('list')
  const [courses, setCourses]               = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<any>(null)
  const [episodes, setEpisodes]             = useState<any[]>([])
  const [selectedEpisode, setSelectedEpisode] = useState<any>(null)
  const [progress, setProgress]             = useState<any[]>([])
  const [attachments, setAttachments]       = useState<any[]>([])
  const [comments, setComments]             = useState<any[]>([])
  const [activeTab, setActiveTab]           = useState<'notes' | 'resources' | 'discussion'>('notes')
  const [commentBody, setCommentBody]       = useState('')
  const [replyTo, setReplyTo]               = useState<any>(null)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [loading, setLoading]               = useState(true)

  function extractYouTubeId(url: string): string | null {
    if (!url) return null
    const patterns = [/youtu\.be\/([^?&]+)/, /youtube\.com\/watch\?v=([^&]+)/, /youtube\.com\/embed\/([^?&]+)/]
    for (const p of patterns) { const m = url.match(p); if (m) return m[1] }
    return null
  }

  useEffect(() => { loadCourses() }, [])

  async function loadCourses() {
    setLoading(true)
    const token = await getToken()
    const res = await fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { const d = await res.json(); setCourses(d.courses || []) }
    setLoading(false)
  }

  async function openCourse(course: any) {
    const token = await getToken()
    const res = await fetch(`/api/courses?id=${course.id}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { const d = await res.json(); setEpisodes(d.episodes || []); setProgress(d.progress || []) }
    setSelectedCourse(course); setSelectedEpisode(null); setView('course')
  }

  async function openEpisode(ep: any) {
    const token = await getToken()
    const res = await fetch(`/api/episodes?id=${ep.id}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { const d = await res.json(); setAttachments(d.attachments || []) }
    const cRes = await fetch(`/api/episode-comments?episodeId=${ep.id}`, { headers: { Authorization: `Bearer ${token}` } })
    if (cRes.ok) { const d = await cRes.json(); setComments(d.comments || []) }
    setSelectedEpisode(ep); setActiveTab('notes'); setView('episode')
  }

  async function markWatched(episodeId: string, watched: boolean) {
    const token = await getToken()
    await fetch('/api/episode-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ episodeId, watched }),
    })
    setProgress(prev => {
      const existing = prev.find(p => p.episode_id === episodeId)
      if (existing) return prev.map(p => p.episode_id === episodeId ? { ...p, watched } : p)
      return [...prev, { episode_id: episodeId, watched }]
    })
  }

  async function submitComment() {
    if (!commentBody.trim() || !selectedEpisode) return
    setSubmittingComment(true)
    const token = await getToken()
    const res = await fetch('/api/episode-comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ episodeId: selectedEpisode.id, body: commentBody.trim(), parentId: replyTo?.id || null }),
    })
    if (res.ok) { const d = await res.json(); setComments(prev => [...prev, d.comment]); setCommentBody(''); setReplyTo(null) }
    setSubmittingComment(false)
  }

  const isWatched = (epId: string) => progress.find(p => p.episode_id === epId)?.watched === true
  const watchedCount = episodes.filter(ep => isWatched(ep.id)).length
  const tierColors: Record<string, string> = { free: '#9a8c74', soldier: '#7a9e7e', commander: '#8B9DCA', general: '#C9A84C' }

  // ── COURSE LIST VIEW ──
  if (view === 'list') return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, background: bg, padding: isMobile ? '16px' : '24px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        {isMobile && <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: G, fontSize: 22, cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>☰</button>}
        <div>
          <h2 style={{ fontFamily: cinzel, color: G, fontSize: isMobile ? 18 : 22, margin: 0, letterSpacing: '0.08em' }}>🎬 Training</h2>
          <p style={{ color: mut, fontSize: 13, margin: '4px 0 0', fontFamily: crimson }}>Courses, protocols, and quick-hit teachings</p>
        </div>
      </div>
      {loading ? (
        <div style={{ color: mut, fontFamily: crimson, fontStyle: 'italic', textAlign: 'center' as const, padding: 40 }}>Loading training...</div>
      ) : courses.length === 0 ? (
        <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: '48px 24px', textAlign: 'center' as const }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🎬</div>
          <div style={{ fontFamily: cinzel, fontSize: 14, color: G, letterSpacing: '0.08em', marginBottom: 8 }}>Training Coming Soon</div>
          <div style={{ fontFamily: crimson, fontSize: 14, color: mut, fontStyle: 'italic' }}>Courses and protocols are being prepared. Check back soon.</div>
        </div>
      ) : (
        <div>
          {courses.filter(c => c.course_type === 'course' || !c.course_type).length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 10, fontFamily: cinzel, color: G, letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: 14 }}>📚 Courses</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {courses.filter(c => c.course_type === 'course' || !c.course_type).map(course => {
                  const hasAccess = course.hasAccess !== false
                  return (
                    <div key={course.id} onClick={() => hasAccess && openCourse(course)}
                      style={{ background: surf, border: `1px solid ${hasAccess ? bdr : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, overflow: 'hidden', cursor: hasAccess ? 'pointer' : 'default', opacity: hasAccess ? 1 : 0.75, position: 'relative' as const }}
                      onMouseEnter={e => hasAccess && ((e.currentTarget as HTMLElement).style.borderColor = G)}
                      onMouseLeave={e => hasAccess && ((e.currentTarget as HTMLElement).style.borderColor = bdr)}>
                      <div style={{ height: 120, background: 'linear-gradient(135deg, rgba(201,168,76,0.15) 0%, rgba(13,11,20,0.8) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, borderBottom: `1px solid ${bdr}` }}>
                        {course.thumbnail_url ? <img src={course.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' as const }} /> : '📚'}
                      </div>
                      <div style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                          <div style={{ fontFamily: cinzel, fontSize: 13, color: txt, letterSpacing: '0.04em', flex: 1 }}>{course.title}</div>
                          {!hasAccess && <span style={{ fontSize: 14, flexShrink: 0 }}>🔒</span>}
                        </div>
                        {course.description && <div style={{ fontFamily: crimson, fontSize: 13, color: mut, lineHeight: 1.5, marginBottom: 10 }}>{course.description}</div>}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const }}>
                          <span style={{ fontSize: 9, color: tierColors[course.tier] || mut, fontFamily: cinzel, letterSpacing: '0.06em', textTransform: 'uppercase' as const, border: `1px solid ${tierColors[course.tier] || mut}`, borderRadius: 10, padding: '1px 7px' }}>{course.tier}</span>
                          <span style={{ fontSize: 11, color: mut, fontFamily: crimson }}>{course.episodeCount || 0} episodes</span>
                          {hasAccess && course.watchedCount > 0 && <span style={{ fontSize: 11, color: '#4ade80', fontFamily: crimson }}>{course.watchedCount}/{course.episodeCount} watched</span>}
                        </div>
                        {!hasAccess && <button onClick={e => { e.stopPropagation(); window.open(STRIPE_LINKS[course.tier] || '/membership', '_blank') }} style={{ marginTop: 10, width: '100%', padding: '7px', background: 'rgba(201,168,76,0.1)', border: `1px solid ${G}`, borderRadius: 6, color: G, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const }}>Upgrade to {course.tier} to unlock</button>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {courses.filter(c => c.course_type === 'protocol').length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 10, fontFamily: cinzel, color: G, letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: 14 }}>📋 Protocols</div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                {courses.filter(c => c.course_type === 'protocol').map(course => {
                  const hasAccess = course.hasAccess !== false
                  return (
                    <div key={course.id} onClick={() => hasAccess && openCourse(course)}
                      style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: '14px 18px', cursor: hasAccess ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 14, opacity: hasAccess ? 1 : 0.75 }}
                      onMouseEnter={e => hasAccess && ((e.currentTarget as HTMLElement).style.borderColor = G)}
                      onMouseLeave={e => hasAccess && ((e.currentTarget as HTMLElement).style.borderColor = bdr)}>
                      <span style={{ fontSize: 24, flexShrink: 0 }}>📋</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: cinzel, fontSize: 12, color: txt, letterSpacing: '0.04em', marginBottom: 3 }}>{course.title}</div>
                        {course.description && <div style={{ fontFamily: crimson, fontSize: 12, color: mut }}>{course.description}</div>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <span style={{ fontSize: 9, color: tierColors[course.tier] || mut, fontFamily: cinzel, letterSpacing: '0.06em', textTransform: 'uppercase' as const, border: `1px solid ${tierColors[course.tier] || mut}`, borderRadius: 10, padding: '1px 7px' }}>{course.tier}</span>
                        {!hasAccess ? <span style={{ fontSize: 14 }}>🔒</span> : <span style={{ fontSize: 12, color: G }}>›</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {courses.filter(c => c.course_type === 'quick-hit').length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 10, fontFamily: cinzel, color: G, letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: 14 }}>⚡ Quick Hits</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {courses.filter(c => c.course_type === 'quick-hit').map(course => {
                  const hasAccess = course.hasAccess !== false
                  return (
                    <div key={course.id} onClick={() => hasAccess && openCourse(course)}
                      style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: '14px 16px', cursor: hasAccess ? 'pointer' : 'default', opacity: hasAccess ? 1 : 0.75 }}
                      onMouseEnter={e => hasAccess && ((e.currentTarget as HTMLElement).style.borderColor = G)}
                      onMouseLeave={e => hasAccess && ((e.currentTarget as HTMLElement).style.borderColor = bdr)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 18 }}>⚡</span>
                        <div style={{ fontFamily: cinzel, fontSize: 11, color: txt, letterSpacing: '0.04em', flex: 1 }}>{course.title}</div>
                        {!hasAccess && <span style={{ fontSize: 12 }}>🔒</span>}
                      </div>
                      {course.description && <div style={{ fontFamily: crimson, fontSize: 12, color: mut }}>{course.description}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  // ── COURSE VIEW (episode list) ──
  if (view === 'course' && selectedCourse) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row' as const, minHeight: 0, background: bg }}>
      <div style={{ width: isMobile ? '100%' : 280, flexShrink: 0, borderRight: isMobile ? 'none' : `1px solid ${bdr}`, borderBottom: isMobile ? `1px solid ${bdr}` : 'none', background: isDark ? '#13111e' : '#ede6db', display: 'flex', flexDirection: 'column' as const, maxHeight: isMobile ? 280 : undefined }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${bdr}`, flexShrink: 0 }}>
          <button onClick={() => { setView('list'); setSelectedCourse(null) }} style={{ background: 'none', border: 'none', color: G, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', padding: 0, marginBottom: 8 }}>← Back to Training</button>
          <div style={{ fontFamily: cinzel, fontSize: 13, color: txt, letterSpacing: '0.04em', marginBottom: 4 }}>{selectedCourse.title}</div>
          {episodes.length > 0 && (
            <div style={{ fontSize: 11, color: mut, fontFamily: crimson }}>
              {watchedCount}/{episodes.length} complete
              <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 6 }}>
                <div style={{ height: '100%', width: `${episodes.length ? (watchedCount / episodes.length) * 100 : 0}%`, background: G, borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {episodes.map((ep, idx) => {
            const watched = isWatched(ep.id)
            const isActive = selectedEpisode?.id === ep.id
            return (
              <button key={ep.id} onClick={() => openEpisode(ep)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', background: isActive ? 'rgba(201,168,76,0.1)' : 'transparent', border: 'none', borderBottom: `1px solid ${bdr}`, borderLeft: `3px solid ${isActive ? G : 'transparent'}`, cursor: 'pointer', textAlign: 'left' as const }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', border: `1px solid ${watched ? G : bdr}`, background: watched ? 'rgba(201,168,76,0.2)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: watched ? G : mut, flexShrink: 0 }}>
                  {watched ? '✓' : idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 11, color: isActive ? G : txt, letterSpacing: '0.03em', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{ep.title}</div>
                </div>
              </button>
            )
          })}
          {episodes.length === 0 && <div style={{ padding: '24px 16px', textAlign: 'center' as const, color: mut, fontFamily: crimson, fontStyle: 'italic', fontSize: 13 }}>No episodes yet</div>}
        </div>
      </div>
      {!selectedEpisode && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' as const, gap: 12, color: mut, padding: 32 }}>
          <div style={{ fontSize: 40 }}>▶</div>
          <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.06em' }}>Select an episode to begin</div>
          <div style={{ fontFamily: crimson, fontSize: 13, color: mut, fontStyle: 'italic' }}>{selectedCourse.description}</div>
        </div>
      )}
      {selectedEpisode && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, minHeight: 0, overflowY: 'auto' }}>
          {isMobile && <button onClick={() => setSelectedEpisode(null)} style={{ background: 'none', border: 'none', color: G, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', padding: '12px 16px', textAlign: 'left' as const, borderBottom: `1px solid ${bdr}` }}>← Episode List</button>}
          <div style={{ background: '#000', width: '100%', aspectRatio: '16/9' as any, position: 'relative' as const }}>
            {extractYouTubeId(selectedEpisode.youtube_url) ? (
              <iframe src={`https://www.youtube-nocookie.com/embed/${extractYouTubeId(selectedEpisode.youtube_url)}?rel=0&modestbranding=1`} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' as const, gap: 12, color: mut }}>
                <div style={{ fontSize: 48 }}>🎬</div>
                <div style={{ fontFamily: cinzel, fontSize: 12, color: G, letterSpacing: '0.08em' }}>Video Coming Soon</div>
              </div>
            )}
          </div>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${bdr}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontFamily: cinzel, fontSize: 15, color: txt, letterSpacing: '0.04em', marginBottom: 4 }}>{selectedEpisode.title}</div>
              {selectedEpisode.description && <div style={{ fontFamily: crimson, fontSize: 13, color: mut }}>{selectedEpisode.description}</div>}
            </div>
            <button onClick={() => markWatched(selectedEpisode.id, !isWatched(selectedEpisode.id))}
              style={{ flexShrink: 0, padding: '7px 14px', background: isWatched(selectedEpisode.id) ? 'rgba(74,222,128,0.15)' : 'rgba(201,168,76,0.1)', border: `1px solid ${isWatched(selectedEpisode.id) ? '#4ade80' : G}`, borderRadius: 6, color: isWatched(selectedEpisode.id) ? '#4ade80' : G, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const }}>
              {isWatched(selectedEpisode.id) ? '✓ Watched' : 'Mark Watched'}
            </button>
          </div>
          <div style={{ display: 'flex', borderBottom: `1px solid ${bdr}`, padding: '0 20px' }}>
            {(['notes', 'resources', 'discussion'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding: '10px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === tab ? `2px solid ${G}` : '2px solid transparent', color: activeTab === tab ? G : mut, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'capitalize' as const, marginBottom: -1 }}>
                {tab === 'notes' ? '📝 Notes' : tab === 'resources' ? '📎 Resources' : '💬 Discussion'}
                {tab === 'discussion' && comments.length > 0 && <span style={{ marginLeft: 4, fontSize: 9, background: 'rgba(201,168,76,0.2)', borderRadius: 10, padding: '1px 6px', color: G }}>{comments.length}</span>}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            {activeTab === 'notes' && (
              selectedEpisode.notes
                ? <div style={{ fontFamily: crimson, fontSize: 15, color: txt, lineHeight: 1.8, whiteSpace: 'pre-wrap' as const }}>{selectedEpisode.notes}</div>
                : <div style={{ color: mut, fontFamily: crimson, fontStyle: 'italic', fontSize: 14 }}>No notes for this episode yet.</div>
            )}
            {activeTab === 'resources' && (
              attachments.length === 0
                ? <div style={{ color: mut, fontFamily: crimson, fontStyle: 'italic', fontSize: 14 }}>No resources attached to this episode.</div>
                : <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                    {attachments.map(att => (
                      <div key={att.id} style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>📄</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: cinzel, fontSize: 12, color: txt, letterSpacing: '0.04em' }}>{att.title}</div>
                          {att.file_size && <div style={{ fontSize: 11, color: mut, marginTop: 2 }}>{att.file_size}</div>}
                        </div>
                        <button onClick={async () => {
                          const token = await getToken()
                          const res = await fetch(`/api/arsenal-resources?id=${att.resource_id || att.id}&action=download`, { headers: { Authorization: `Bearer ${token}` } })
                          if (res.ok) { const d = await res.json(); if (d.url) window.open(d.url, '_blank') }
                        }} style={{ padding: '6px 12px', background: 'rgba(201,168,76,0.1)', border: `1px solid ${G}`, borderRadius: 5, color: G, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', cursor: 'pointer', textTransform: 'uppercase' as const, flexShrink: 0 }}>↗ View</button>
                      </div>
                    ))}
                  </div>
            )}
            {activeTab === 'discussion' && (
              <div>
                <div style={{ marginBottom: 24 }}>
                  {replyTo && <div style={{ fontSize: 11, color: mut, fontFamily: crimson, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>Replying to {replyTo.user_name} <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: mut, cursor: 'pointer', fontSize: 12 }}>×</button></div>}
                  <textarea value={commentBody} onChange={e => setCommentBody(e.target.value)} placeholder="Share a thought, question, or insight from this teaching..." rows={3}
                    style={{ width: '100%', boxSizing: 'border-box' as const, background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', border: `1px solid ${bdr}`, borderRadius: 8, padding: '10px 14px', color: txt, fontFamily: crimson, fontSize: 14, outline: 'none', resize: 'vertical' as const, lineHeight: 1.6, marginBottom: 8 }} />
                  <button onClick={submitComment} disabled={submittingComment || !commentBody.trim()}
                    style={{ padding: '8px 20px', background: G, border: 'none', borderRadius: 6, color: '#0D0B14', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const, fontWeight: 700, opacity: !commentBody.trim() ? 0.5 : 1 }}>
                    {submittingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
                {comments.length === 0
                  ? <div style={{ color: mut, fontFamily: crimson, fontStyle: 'italic', fontSize: 14 }}>No discussion yet — be the first to comment.</div>
                  : <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
                      {comments.filter(c => !c.parent_id).map(comment => (
                        <div key={comment.id}>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 12, color: G, flexShrink: 0, overflow: 'hidden' }}>
                              {comment.user_image ? <img src={comment.user_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' as const }} /> : (comment.user_name?.[0] || '?').toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontFamily: cinzel, fontSize: 11, color: txt, letterSpacing: '0.04em' }}>{comment.user_name}</span>
                                <span style={{ fontSize: 10, color: dim, fontFamily: crimson }}>{new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              </div>
                              <div style={{ fontFamily: crimson, fontSize: 14, color: txt, lineHeight: 1.6, marginBottom: 6 }}>{comment.body}</div>
                              <button onClick={() => setReplyTo(comment)} style={{ background: 'none', border: 'none', color: mut, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', cursor: 'pointer', padding: 0, textTransform: 'uppercase' as const }}>↩ Reply</button>
                            </div>
                          </div>
                          {comments.filter(c => c.parent_id === comment.id).map(reply => (
                            <div key={reply.id} style={{ display: 'flex', gap: 10, marginLeft: 42, marginTop: 10 }}>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(201,168,76,0.1)', border: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 10, color: G, flexShrink: 0 }}>
                                {(reply.user_name?.[0] || '?').toUpperCase()}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                  <span style={{ fontFamily: cinzel, fontSize: 10, color: txt, letterSpacing: '0.04em' }}>{reply.user_name}</span>
                                  <span style={{ fontSize: 10, color: dim, fontFamily: crimson }}>{new Date(reply.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                </div>
                                <div style={{ fontFamily: crimson, fontSize: 13, color: txt, lineHeight: 1.6 }}>{reply.body}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                }
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  return null
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
    bg:   isDark ? '#0D0B14' : '#FAF8F5',
    surf: isDark ? '#1a1714' : '#FFFFFF',
    bdr:  isDark ? 'rgba(201,168,76,0.15)' : 'rgba(139,105,20,0.25)',
    txt:  isDark ? '#f0e8d8' : '#2D2924',
    mut:  isDark ? '#9a8c74' : '#5C5248',
    s2:   isDark ? '#1c1814' : '#FFFFFF',
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
          <button onClick={() => setSidebarOpen(o => !o)} style={{ background: 'none', border: 'none', color: '#C9A84C', fontSize: 22, cursor: 'pointer', padding: '4px 8px', marginRight: 4, lineHeight: 1 }}>☰</button>
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
            flex: 1, background: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
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
  soldier:   'https://buy.stripe.com/4gM6oA68wblRdI9b4XfrW00',
  commander: 'https://buy.stripe.com/6oU8wI1Sg4Xt1ZrgphfrW01',
  general:   'https://buy.stripe.com/aFa00c0Oc4Xt5bD0qjfrW02',
}
const TIER_LEVEL: Record<string, number> = { free: 0, watchman: 0, soldier: 1, commander: 2, general: 3 }
const tierNum = (t: string) => TIER_LEVEL[t?.toLowerCase()] ?? 0

// ── MARKDOWN → HTML ─────────────────────────────────────────────────────────
function markdownToHtml(md: string): string {
  if (!md) return ''
  return md
    .replace(/^### (.+)$/gm, '<h3 style="font-family:Cinzel,serif;color:#C9A84C;font-size:14px;letter-spacing:0.08em;margin:20px 0 8px">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-family:Cinzel,serif;color:#C9A84C;font-size:18px;letter-spacing:0.06em;margin:24px 0 10px">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-family:Cinzel,serif;color:#C9A84C;font-size:22px;margin:28px 0 12px">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid #C9A84C;padding:8px 16px;margin:16px 0;color:#8B7355;font-style:italic">$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li style="margin:4px 0">$1</li>')
    .replace(/(<li[^>]*>.*?<\/li>\n?)+/g, '<ul style="padding-left:20px;margin:12px 0">$&</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li style="margin:4px 0">$1</li>')
    .replace(/\n\n/g, '</p><p style="margin:0 0 16px">')
    .replace(/^(?!<[hbuol])(.+)$/gm, '<p style="margin:0 0 16px">$1</p>')
    .replace(/<p style="margin:0 0 16px"><\/p>/g, '')
}

function getYouTubeId(url: string): string {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&\n?#]+)/)
  return match?.[1] || ''
}

// ── FIELD MINISTRY VIEW ──────────────────────────────────────────────────────
function FieldMinistryView({ theme, userTier, isMobile, setSidebarOpen }: {
  theme: string; userTier: string; isMobile: boolean; setSidebarOpen: (v: boolean) => void
}) {
  const { getToken } = useAuth()
  const isDark = theme !== 'light'
  const GG  = isDark ? '#C9A84C' : '#8B6914'
  const bg  = isDark ? '#0D0B14' : '#FAF8F5'
  const bdr = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(139,105,20,0.25)'
  const txt = isDark ? '#E8D5B0' : '#2D2924'
  const mut = isDark ? '#8B7355' : '#5C5248'
  const navBg   = isDark ? 'rgba(13,11,20,0.95)' : '#FFFFFF'
  const navBdr  = isDark ? 'rgba(201,168,76,0.12)' : 'rgba(160,120,48,0.2)'
  const artBg   = isDark ? 'rgba(201,168,76,0.04)' : '#ffffff'

  const TIER_NUM: Record<string, number> = { free: 0, watchman: 0, soldier: 1, commander: 2, general: 3, minister: 4 }
  const userTierNum = TIER_NUM[userTier?.toLowerCase()] ?? 0

  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [openCats, setOpenCats]     = useState<Set<string>>(new Set(['understanding-deliverance']))
  const [activeArticle, setActiveArticle] = useState<any>(null)
  const [showPanel, setShowPanel]   = useState(false) // mobile: show article panel

  useEffect(() => {
    async function load() {
      const token = await getToken()
      const res = await fetch('/api/field-manual', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const d = await res.json()
        setCategories(d.categories || [])
        // Auto-open first category
        if (d.categories?.[0]) {
          setOpenCats(new Set([d.categories[0].category_slug]))
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  function toggleCat(slug: string) {
    setOpenCats(prev => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  function selectArticle(article: any) {
    if (article.locked) return
    setActiveArticle(article)
    if (isMobile) setShowPanel(true)
  }

  const TIER_COLORS: Record<string, string> = {
    soldier: '#60a5fa', commander: '#a78bfa', general: '#f59e0b', minister: '#C9A84C',
  }

  // ── NAV PANEL ──
  const navPanel = (
    <div style={{
      width: isMobile ? '100%' : 240, flexShrink: 0,
      background: navBg, borderRight: isMobile ? 'none' : `1px solid ${navBdr}`,
      overflowY: 'auto', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 10px', borderBottom: `1px solid ${navBdr}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        {isMobile && (
          <button onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', color: GG, fontSize: 20, cursor: 'pointer', padding: '2px 6px', lineHeight: 1 }}>☰</button>
        )}
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, letterSpacing: '0.14em', color: GG, fontWeight: 700 }}>📖 FIELD MINISTRY</div>
      </div>

      {loading ? (
        <div style={{ padding: 24, fontFamily: "'Crimson Pro', serif", color: mut, fontSize: 13, textAlign: 'center' }}>Loading…</div>
      ) : categories.length === 0 ? (
        <div style={{ padding: 24, fontFamily: "'Crimson Pro', serif", color: mut, fontSize: 13, textAlign: 'center', fontStyle: 'italic' }}>No articles published yet.</div>
      ) : categories.map(cat => (
        <div key={cat.category_slug}>
          {/* Category header */}
          <div
            onClick={() => toggleCat(cat.category_slug)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '9px 16px', cursor: 'pointer',
              background: 'rgba(201,168,76,0.06)', borderBottom: `1px solid ${navBdr}`,
              fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.1em', color: GG,
              userSelect: 'none',
            }}
          >
            <span>{cat.category_icon} {cat.category.toUpperCase()}</span>
            <span style={{ fontSize: 9, display: 'inline-block', transition: 'transform 0.2s', transform: openCats.has(cat.category_slug) ? 'rotate(180deg)' : 'none' }}>▼</span>
          </div>

          {/* Articles */}
          {openCats.has(cat.category_slug) && cat.articles.map((article: any) => (
            <div
              key={article.id}
              onClick={() => selectArticle(article)}
              style={{
                padding: '8px 16px 8px 24px', cursor: article.locked ? 'default' : 'pointer',
                background: activeArticle?.id === article.id ? 'rgba(201,168,76,0.12)' : 'transparent',
                borderLeft: activeArticle?.id === article.id ? `2px solid ${GG}` : '2px solid transparent',
                borderBottom: `1px solid ${navBdr}20`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                fontFamily: "'Crimson Pro', serif", fontSize: 13,
                color: article.locked ? (isDark ? '#4a4032' : '#aaa') : activeArticle?.id === article.id ? GG : (isDark ? '#a09888' : '#5C5248'),
                transition: 'background 0.15s',
              }}
            >
              <span style={{ flex: 1, lineHeight: 1.3 }}>{article.locked ? '🔒 ' : ''}{article.title}</span>
              {article.locked && (
                <span style={{
                  fontSize: 8, fontFamily: "'Cinzel', serif", letterSpacing: '0.06em',
                  color: TIER_COLORS[article.min_tier] || mut,
                  background: 'rgba(255,255,255,0.04)', padding: '2px 5px', borderRadius: 3,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {article.min_tier.toUpperCase()}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )

  // ── ARTICLE PANEL ──
  const articlePanel = (
    <div style={{ flex: 1, overflowY: 'auto', background: bg, padding: isMobile ? '16px' : '32px 40px', minHeight: 0 }}>
      {isMobile && showPanel && (
        <button onClick={() => setShowPanel(false)}
          style={{ background: 'none', border: 'none', color: GG, fontSize: 13, cursor: 'pointer', fontFamily: "'Cinzel', serif", letterSpacing: '0.08em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Back
        </button>
      )}

      {!activeArticle ? (
        <div style={{ textAlign: 'center', padding: isMobile ? '40px 20px' : '80px 40px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, color: GG, marginBottom: 10, letterSpacing: '0.06em' }}>Field Ministry</div>
          <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 16, color: mut, lineHeight: 1.8, maxWidth: 420, margin: '0 auto' }}>
            Your guide to understanding and walking in deliverance ministry.
            Select a topic from the menu to begin.
          </div>
        </div>
      ) : activeArticle.locked ? (
        <div style={{ textAlign: 'center', padding: isMobile ? '40px 20px' : '80px 40px' }}>
          <div style={{ display: 'inline-block', padding: '40px', background: 'rgba(201,168,76,0.04)', borderRadius: 12, border: `1px solid ${bdr}` }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>🔒</div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: GG, letterSpacing: '0.1em', marginBottom: 10 }}>
              {activeArticle.min_tier.toUpperCase()} ACCESS REQUIRED
            </div>
            <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 15, color: mut, marginBottom: 24, lineHeight: 1.7 }}>
              This content is available to {activeArticle.min_tier} members and above.
            </div>
            <a href="/membership" style={{
              display: 'inline-block', padding: '10px 28px',
              background: GG, color: '#0D0B14', borderRadius: 4,
              fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700,
              letterSpacing: '0.08em', textDecoration: 'none',
            }}>Upgrade Now</a>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 720 }}>
          {/* Breadcrumb */}
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.12em', color: mut, marginBottom: 10 }}>
            {categories.find(c => c.articles.some((a: any) => a.id === activeArticle.id))?.category_icon}{' '}
            {categories.find(c => c.articles.some((a: any) => a.id === activeArticle.id))?.category}
          </div>

          {/* Title */}
          <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: isMobile ? 20 : 26, color: GG, margin: '0 0 8px', letterSpacing: '0.04em', lineHeight: 1.3 }}>
            {activeArticle.title}
          </h1>

          {/* Tier badge */}
          {activeArticle.min_tier !== 'free' && (
            <span style={{
              display: 'inline-block', marginBottom: 20,
              fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.08em',
              color: TIER_COLORS[activeArticle.min_tier] || GG,
              background: 'rgba(201,168,76,0.08)', border: `1px solid ${bdr}`,
              padding: '3px 10px', borderRadius: 4,
            }}>
              {activeArticle.min_tier.toUpperCase()} CONTENT
            </span>
          )}

          {/* YouTube embed */}
          {activeArticle.youtube_url && getYouTubeId(activeArticle.youtube_url) && (
            <div style={{ marginBottom: 28, borderRadius: 8, overflow: 'hidden', border: `1px solid rgba(201,168,76,0.2)` }}>
              <iframe
                src={`https://www.youtube.com/embed/${getYouTubeId(activeArticle.youtube_url)}?rel=0`}
                style={{ width: '100%', height: isMobile ? 220 : 360, border: 'none', display: 'block' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* Content */}
          <div
            style={{ fontFamily: "'Crimson Pro', serif", fontSize: 16, lineHeight: 1.85, color: txt }}
            dangerouslySetInnerHTML={{ __html: markdownToHtml(activeArticle.content || '') }}
          />
        </div>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: bg, minHeight: 0 }}>
        {!showPanel ? navPanel : articlePanel}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: bg, minHeight: 0 }}>
      {navPanel}
      {articlePanel}
    </div>
  )
}

// ── WEEKLY INTEL VIEW ────────────────────────────────────────────────────────
function WeeklyIntelView({ theme, userTier, isMobile, setSidebarOpen, setActiveSection, demons: demonsProp = [] }: {
  theme: string; userTier: string; isMobile: boolean; setSidebarOpen: (v: boolean) => void; setActiveSection: (s: string) => void; demons?: any[]
}) {
  const { user }     = useUser()
  const { getToken } = useAuth()
  const isMinister   = (user?.publicMetadata?.role as string) === 'minister'
  const isDark       = theme !== 'light'
  const GG           = isDark ? '#C9A84C' : '#8B6914'
  const bg           = isDark ? '#0D0B14' : '#FAF8F5'
  const surf         = isDark ? 'rgba(201,168,76,0.04)' : '#FFFFFF'
  const bdr          = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(139,105,20,0.25)'
  const txt          = isDark ? '#E8D5B0' : '#2D2924'
  const mut          = isDark ? '#8B7355' : '#5C5248'
  const dm           = isDark ? '#5a4f3a' : '#5C5248'
  const shadow       = isDark ? 'none' : '0 2px 12px rgba(45,41,36,0.06), 0 1px 3px rgba(45,41,36,0.04)'
  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: isDark ? 'rgba(13,11,20,0.8)' : '#FAF8F5',
    border: `1px solid ${bdr}`, borderRadius: 6, padding: '8px 12px',
    color: txt, fontSize: 13, fontFamily: "'Crimson Pro', serif", outline: 'none',
  }

  const [posts, setPosts]         = useState<any[]>([])
  const [links, setLinks]         = useState<any[]>([])
  const [reports, setReports]     = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [recentResources, setRecentResources] = useState<any[]>([])
  const [sotw, setSotw]           = useState<any>(null)

  const [showReportForm, setShowReportForm] = useState(false)
  const [reportForm, setReportForm]         = useState({ spirit_names: '', manifestations: '', entry_points: '', outcome: '', notes: '', location_city: '', location_state: '' })
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportSuccess, setReportSuccess]       = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetchAll() {
      const token = await getToken()
      const auth  = { 'Authorization': `Bearer ${token}` }
      const [postsRes, linksRes, reportsRes, sotwRes] = await Promise.allSettled([
        fetch('/api/intel-posts').then(r => r.json()),
        fetch('/api/intel-links').then(r => r.json()),
        fetch('/api/field-reports', { headers: auth }).then(r => r.json()),
        fetch('/api/spirit-of-week').then(r => r.json()),
      ])
      if (cancelled) return
      if (postsRes.status   === 'fulfilled') setPosts(postsRes.value.posts || [])
      if (linksRes.status   === 'fulfilled') setLinks(linksRes.value.links || [])
      if (reportsRes.status === 'fulfilled') setReports(reportsRes.value.reports || [])
      if (sotwRes.status    === 'fulfilled') setSotw(sotwRes.value.sotw || null)
      setLoading(false)
    }
    fetchAll()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const t = setTimeout(async () => {
      const token = await getToken()
      const res = await fetch('/api/arsenal-resources?limit=3&sort=newest', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const d = await res.json()
        setRecentResources(d.resources?.slice(0, 3) || [])
      }
    }, 2500)
    return () => clearTimeout(t)
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

  if (loading) return (
    <div style={{ flex: 1, overflowY: 'auto', background: bg, padding: isMobile ? '16px' : '24px 32px' }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ height: 120, background: surf, borderRadius: 8, marginBottom: 16, border: `1px solid ${bdr}`, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  )

  // Use passed-in demons, sorted newest-first
  const recentDemons = [...demonsProp].sort((a: any, b: any) => {
    const ta = a.createdTime ? new Date(a.createdTime).getTime() : 0
    const tb = b.createdTime ? new Date(b.createdTime).getTime() : 0
    return tb - ta
  }).slice(0, 6)

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: bg, padding: isMobile ? '16px' : '24px 32px', minHeight: 0 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          {isMobile && <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: GG, fontSize: 22, cursor: 'pointer', padding: '4px 8px', marginRight: 4, lineHeight: 1 }}>☰</button>}
          <h2 style={{ fontFamily: cinzel, color: GG, fontSize: isMobile ? 18 : 22, margin: 0, letterSpacing: '0.08em' }}>⚡ Weekly Intel</h2>
        </div>
        <p style={{ color: mut, fontSize: 13, margin: 0, fontFamily: crimson }}>Operational briefings, field intelligence, and ministry resources</p>
      </div>

      {/* Spirit of the Week */}
      {sotw && (
        <div style={{ marginBottom: 28, background: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(201,168,76,0.03))', border: `2px solid ${GG}`, borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 9, fontFamily: cinzel, color: GG, letterSpacing: '0.2em', textTransform: 'uppercase' as const, marginBottom: 8 }}>🎯 Spirit of the Week</div>
          <div style={{ fontFamily: cinzel, fontSize: isMobile ? 18 : 22, color: txt, marginBottom: sotw.minister_note ? 10 : 0 }}>{sotw.spirit_name}</div>
          {sotw.minister_note && (
            <p style={{ fontFamily: crimson, fontSize: 14, color: mut, lineHeight: 1.7, margin: '0 0 12px' }}>{sotw.minister_note}</p>
          )}
          {sotw.deliverance_tip && (
            <div style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid ${bdr}`, borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
              <div style={{ fontFamily: cinzel, fontSize: 9, color: GG, letterSpacing: '0.12em', marginBottom: 4 }}>TACTICAL TIP</div>
              <p style={{ fontFamily: crimson, fontSize: 13, color: mut, lineHeight: 1.6, margin: 0 }}>{sotw.deliverance_tip}</p>
            </div>
          )}
          <button
            onClick={() => setActiveSection('database')}
            style={{ padding: '6px 16px', background: 'rgba(201,168,76,0.12)', border: `1px solid rgba(201,168,76,0.4)`, borderRadius: 6, color: GG, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase' as const }}
          >View in Spirit Network</button>
        </div>
      )}

      {/* FULL WIDTH — Intel Briefing */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, fontFamily: cinzel, color: GG, letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: 12 }}>
          ⚡ Intel Briefing
        </div>
        <style>{`@keyframes wri-pulse{0%,100%{opacity:0.4}50%{opacity:0.8}}`}</style>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 110, background: 'rgba(201,168,76,0.04)', borderRadius: 10, border: '1px solid rgba(201,168,76,0.1)', animation: 'wri-pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: '40px 24px', textAlign: 'center' as const }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
            <div style={{ fontFamily: cinzel, color: GG, fontSize: 16, marginBottom: 8 }}>No Briefings Yet</div>
            <div style={{ fontFamily: crimson, color: mut, fontSize: 14, marginBottom: userTier === 'minister' ? 20 : 0 }}>
              Operational briefings and field intelligence from War Room Intel leadership.
            </div>
            {userTier === 'minister' && (
              <button
                onClick={() => { window.location.href = '/admin' }}
                style={{ padding: '8px 20px', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 4, fontFamily: cinzel, fontSize: 10, color: GG, cursor: 'pointer', letterSpacing: '0.08em' }}>
                + POST FIRST BRIEFING
              </button>
            )}
          </div>
        ) : posts.slice(0, 3).map(post => {
          const classBadgeLevel = post.post_type === 'external-alert' ? 'I' : post.post_type === 'watch-report' ? 'III' : 'II'
          const classBadgeLabel = post.post_type === 'external-alert' ? 'ALERT' : post.post_type === 'watch-report' ? 'WATCH REPORT' : 'BRIEFING'
          return (
            <TacticalCard key={post.id} brackets style={{ marginBottom: 16, minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap' as const, gap: 8 }}>
                <div>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: GG, fontWeight: 600, marginBottom: 4 }}>{post.title}</div>
                  <div style={{ fontSize: 11, color: dm, fontFamily: "'JetBrains Mono', monospace" }}>
                    {post.author_name} · <MonoTime size={11} color={dm}>{new Date(post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</MonoTime>
                  </div>
                </div>
                <ClassBadge level={classBadgeLevel as any} label={classBadgeLabel} />
              </div>
              <div style={{ fontSize: 15, color: txt, lineHeight: 1.75, fontFamily: "'Crimson Pro', serif", whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word', overflowWrap: 'break-word', minWidth: 0 }}>{post.body}</div>
              {post.scripture && (
                <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(0,30,10,0.4)', border: '1px solid rgba(134,239,172,0.2)', borderRadius: 6, fontSize: 13, color: '#86efac', fontFamily: "'Crimson Pro', serif", fontStyle: 'italic' }}>
                  📖 {post.scripture}
                </div>
              )}
            </TacticalCard>
          )
        })}
      </div>

      {/* TWO COLUMNS */}
      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' as const }}>

        {/* LEFT — Field Reports (2/3) */}
        <div style={{ flex: 2, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontFamily: cinzel, color: GG, letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: 12 }}>
            📡 Field Reports
          </div>

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
            Field reports from active ministers will appear here.
          </div>
        ) : reports.filter(r => r.status === 'approved').map(report => (
          <TacticalCard key={report.id} brackets style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap' as const, gap: 4 }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: GG }}>{report.spirit_names}</div>
              <ClassBadge level="I" label="FIELD REPORT" />
            </div>
            <div style={{ fontSize: 11, color: dm, fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
              {report.submitted_by_name}{report.location_city ? ` · ${report.location_city}${report.location_state ? ', ' + report.location_state : ''}` : ''}
            </div>
            <div style={{ fontSize: 13, color: txt, lineHeight: 1.6, fontFamily: "'Crimson Pro', serif" }}>{report.manifestations}</div>
            {report.entry_points && <div style={{ fontSize: 12, color: mut, marginTop: 6 }}>Entry points: {report.entry_points}</div>}
            {report.outcome && <div style={{ fontSize: 12, color: '#86efac', marginTop: 4 }}>Outcome: {report.outcome}</div>}
          </TacticalCard>
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

        </div>{/* end left column */}

        {/* RIGHT — Intel Sidebar (1/3) */}
        <div style={{ flexShrink: 0, width: isMobile ? '100%' : 280 }}>

          {/* Latest Arsenal Drops */}
          {recentResources.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontFamily: cinzel, color: GG, letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: 10 }}>
                ✦ Latest Arsenal Drops
              </div>
              <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 8, overflow: 'hidden' }}>
                {recentResources.map((r, i) => (
                  <div key={r.id} style={{
                    padding: '10px 14px',
                    borderBottom: i < recentResources.length - 1 ? `1px solid ${bdr}` : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontFamily: cinzel, color: txt, letterSpacing: '0.04em', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                      <div style={{ fontSize: 10, color: mut, marginTop: 2 }}>{r.category} · {r.tier}</div>
                    </div>
                    <button
                      onClick={() => setActiveSection('arsenal')}
                      style={{ fontSize: 9, color: GG, background: 'transparent', border: `1px solid ${GG}`, borderRadius: 4, padding: '2px 7px', cursor: 'pointer', fontFamily: cinzel, letterSpacing: '0.04em', whiteSpace: 'nowrap' as const, flexShrink: 0 }}
                    >VIEW</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New to Intel Archive */}
          {recentDemons.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontFamily: cinzel, color: GG, letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: 10 }}>
                📚 New to Intel Archive
              </div>
              <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 8, overflow: 'hidden' }}>
                {recentDemons.map((d, i) => (
                  <div
                    key={d.id}
                    style={{
                      padding: '10px 14px',
                      borderBottom: i < recentDemons.length - 1 ? `1px solid ${bdr}` : 'none',
                      cursor: 'pointer',
                    }}
                    onClick={() => setActiveSection('database')}
                  >
                    <div style={{ fontSize: 11, fontFamily: cinzel, color: txt, letterSpacing: '0.04em' }}>{d.name}</div>
                    <div style={{ fontSize: 10, color: mut, marginTop: 2 }}>{d.hierarchyCategory || d.biblicalRank || ''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* External Intel Links */}
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

        </div>{/* end right sidebar */}

      </div>{/* end two-column wrapper */}
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

function DatabaseView({ theme, isMobile, isTablet, setSidebarOpen, userTier, demons: demonsProp = [] }: {
  theme: string
  isMobile: boolean
  isTablet: boolean
  setSidebarOpen: (open: boolean) => void
  userTier: string
  demons?: any[]
}) {
  const { getToken } = useAuth()
  const [query, setQuery]         = useState('')
  const [dbLoading, setDbLoading] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [spiritResources, setSpiritResources] = useState<any[]>([])
  const [loadingResources, setLoadingResources] = useState(false)
  const [modalTab, setModalTab] = useState<'overview' | 'intelligence' | 'warfare' | 'scholarly'>('overview')
  const [rankFilter, setRankFilter] = useState('')
  const [generationalFilter, setGenerationalFilter] = useState(false)
  const [territorialFilter, setTerritorialFilter] = useState(false)
  const [showLegend, setShowLegend] = useState(false)

  useEffect(() => {
    if (!selectedEntry) { setSpiritResources([]); return }
    async function load() {
      setLoadingResources(true)
      try {
        const token = await getToken()
        // Use spirit-resources endpoint for tag-based matching; fall back to arsenal-resources
        const params = new URLSearchParams({ spirit: selectedEntry.name })
        if (selectedEntry.hierarchyCategory) params.set('category', selectedEntry.hierarchyCategory)
        const res = await fetch(`/api/spirit-resources?${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          const d = await res.json()
          setSpiritResources(d.resources?.slice(0, 5) || [])
        }
      } catch(e) {}
      setLoadingResources(false)
    }
    load()
  }, [selectedEntry?.id])

  // demons come from parent — no separate fetch needed

  useEffect(() => {
    const seen = localStorage.getItem('wri-archive-legend-seen')
    if (!seen) {
      setShowLegend(true)
      localStorage.setItem('wri-archive-legend-seen', 'true')
    }
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
      🔒 {tierName} tier. <a href="/membership" style={{ color: '#C9A84C' }}>Upgrade to access.</a>
    </div>
  )

  const filtered = demonsProp.filter((e: any) => {
    const matchesSearch = !query || [
      e.name, e.aka, e.description, e.manifestation, e.symptoms,
      e.entryPoints, e.legalRights, e.wriNotes, e.personalityPresentation,
      e.hierarchyCategory, e.deliveranceSequence, e.counterScriptures, e.operationalNotes,
    ].some(s => s && String(s).toLowerCase().includes(query.toLowerCase()))
    const matchesCat = !categoryFilter || e.hierarchyCategory === categoryFilter
    const matchesRank = !rankFilter || (e.biblicalRank || '').toLowerCase().includes(rankFilter.toLowerCase())
    const matchesGen = !generationalFilter || e.isGenerational === true
    const matchesTerr = !territorialFilter || e.isTerritorial === true
    return matchesSearch && matchesCat && matchesRank && matchesGen && matchesTerr
  })

  const dbIsDark = theme !== 'light'
  const dbBg     = dbIsDark ? '#0D0B14' : '#F8F6F2'
  const dbSurf   = dbIsDark ? '#1a1714' : '#FFFFFF'
  const dbBorder = dbIsDark ? 'rgba(201,168,76,0.15)' : '#D4C4B0'
  const dbText   = dbIsDark ? '#f0e8d8' : '#1C1410'
  const dbDim    = dbIsDark ? '#c8b99a' : '#4A3728'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: dbBg, overflow: 'hidden', minHeight: 0 }}>

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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search spirits, symptoms, manifestations, entry points..."
            style={{
              flex: 1, padding: '10px 14px',
              background: dbBg, border: `1px solid ${query ? G : dbBorder}`,
              borderRadius: 8, fontFamily: crimson, fontSize: 15,
              color: dbText, outline: 'none', boxSizing: 'border-box' as const,
              marginBottom: 4, transition: 'border-color 0.2s',
            }}
          />
          <button
            onClick={() => setShowLegend(true)}
            style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', background: 'rgba(201,168,76,0.1)', border: `1px solid rgba(201,168,76,0.3)`, color: G, fontFamily: cinzel, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="How to use the Intel Archive"
          >?</button>
        </div>
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
        {/* Biblical rank filter */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginTop: 8 }}>
          {['All', 'Principality', 'Power', 'Ruler of Darkness', 'Spiritual Wickedness in High Places', 'Fallen Angel', 'Demon', 'Familiar Spirit', 'Spirit of Infirmity'].map(rank => (
            <button key={rank} onClick={() => setRankFilter(rank === 'All' ? '' : rank)}
              style={{ flexShrink: 0, padding: '3px 10px', borderRadius: 20, fontSize: 9, cursor: 'pointer', fontFamily: cinzel, letterSpacing: '0.04em', border: `1px solid ${rankFilter === rank || (rank === 'All' && !rankFilter) ? G : dbBorder}`, background: rankFilter === rank || (rank === 'All' && !rankFilter) ? 'rgba(201,168,76,0.15)' : 'transparent', color: rankFilter === rank || (rank === 'All' && !rankFilter) ? G : dbDim, whiteSpace: 'nowrap' as const }}>
              {rank}
            </button>
          ))}
        </div>
        {/* Generational / Territorial badges */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginTop: 6 }}>
          <button onClick={() => setGenerationalFilter(f => !f)}
            style={{ padding: '3px 10px', borderRadius: 20, fontSize: 9, cursor: 'pointer', fontFamily: cinzel, letterSpacing: '0.04em', border: `1px solid ${generationalFilter ? '#7a9e7e' : dbBorder}`, background: generationalFilter ? 'rgba(122,158,126,0.15)' : 'transparent', color: generationalFilter ? '#7a9e7e' : dbDim }}>
            🧬 Generational
          </button>
          <button onClick={() => setTerritorialFilter(f => !f)}
            style={{ padding: '3px 10px', borderRadius: 20, fontSize: 9, cursor: 'pointer', fontFamily: cinzel, letterSpacing: '0.04em', border: `1px solid ${territorialFilter ? '#8B9DCA' : dbBorder}`, background: territorialFilter ? 'rgba(139,157,202,0.15)' : 'transparent', color: territorialFilter ? '#8B9DCA' : dbDim }}>
            🗺 Territorial
          </button>
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
          const cls            = entry.biblicalRank || ''
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
            <TacticalCard key={id} brackets onClick={() => setSelectedEntry(entry)} style={{ marginBottom: 12, cursor: 'pointer' }}>
              {/* Name row */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontFamily: cinzel, fontSize: 18, color: 'var(--t-0)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{name}</div>
              </div>

              {/* Threat level */}
              <div style={{ marginBottom: 8 }}>
                <ThreatBar level={entry.threatLevel ?? 3} />
              </div>

              {/* Hierarchy category + rank as HUDChips */}
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginBottom: 8 }}>
                {hierCat && (
                  <HUDChip active style={{ fontSize: 9 }}>{hierCat}</HUDChip>
                )}
                {entry.biblicalRank && (
                  <HUDChip style={{ fontSize: 9, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {entry.biblicalRank.length > 40 ? entry.biblicalRank.slice(0, 40) + '…' : entry.biblicalRank}
                  </HUDChip>
                )}
                {entry.isGenerational && <HUDChip style={{ fontSize: 9 }}>GEN.</HUDChip>}
                {entry.isTerritorial && <HUDChip style={{ fontSize: 9 }}>TERR.</HUDChip>}
              </div>

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
            </TacticalCard>
          )
        })}
      </div>

      {/* Intel Dossier Modal */}
      {selectedEntry && (() => {
        const entry = selectedEntry
        const name  = entry.name || 'Unknown'
        const cls   = entry.biblicalRank || ''
        const color = getColor(cls)
        const bdr   = dbBorder
        const surf  = dbSurf
        const txt   = dbText
        const mut   = dbDim
        const MODAL_STRIPE: Record<string, string> = {
          soldier: STRIPE_LINKS.soldier, commander: STRIPE_LINKS.commander, general: STRIPE_LINKS.general,
        }

        const TierGate = ({ tierName, children }: { tierName: string; children: React.ReactNode }) => {
          if (atLeast(tierName)) return <>{children}</>
          return (
            <div style={{ position: 'relative', minHeight: 180 }}>
              <div style={{ filter: 'blur(4px)', userSelect: 'none' as const, pointerEvents: 'none' as const }}>
                {children}
              </div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', background: 'rgba(13,11,20,0.75)', borderRadius: 8 }}>
                <div style={{ fontFamily: cinzel, fontSize: 12, color: G, letterSpacing: '0.1em', marginBottom: 8 }}>⚔ {tierName.toUpperCase()} INTEL</div>
                <div style={{ fontFamily: crimson, fontSize: 14, color: '#e8e0d0', marginBottom: 16, textAlign: 'center' as const, padding: '0 20px', lineHeight: 1.5 }}>
                  Upgrade to {tierName} to unlock this intelligence.
                </div>
                <a href="/membership" style={{ padding: '8px 20px', background: G, color: '#0D0B14', borderRadius: 4, fontFamily: cinzel, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textDecoration: 'none' }}>Upgrade Now</a>
              </div>
            </div>
          )
        }

        const FieldBlock = ({ label, value, color: c }: { label: string; value: string | null | undefined; color?: string }) => {
          if (!value) return null
          return (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: (c || color) + 'BB', marginBottom: 6, textTransform: 'uppercase' as const }}>{label}</div>
              <div style={{ fontFamily: crimson, fontSize: 14, color: txt, lineHeight: 1.65 }}>{value}</div>
            </div>
          )
        }

        // Render text with demon names as clickable links
        const linkifySpirits = (text: string): React.ReactNode => {
          if (!text || !demonsProp.length) return text
          const matchList: { start: number; end: number; name: string }[] = []
          for (const d of demonsProp as any[]) {
            if (!d.name) continue
            const lower = text.toLowerCase()
            const nameLower = d.name.toLowerCase()
            let idx = 0
            while (idx < lower.length) {
              const found = lower.indexOf(nameLower, idx)
              if (found === -1) break
              matchList.push({ start: found, end: found + d.name.length, name: d.name })
              idx = found + d.name.length
            }
          }
          if (!matchList.length) return text
          matchList.sort((a, b) => a.start - b.start || b.end - a.end)
          const filtered: typeof matchList = []
          let lastEnd = 0
          for (const m of matchList) {
            if (m.start >= lastEnd) { filtered.push(m); lastEnd = m.end }
          }
          const parts: React.ReactNode[] = []
          let pos = 0
          for (const m of filtered) {
            if (m.start > pos) parts.push(text.slice(pos, m.start))
            parts.push(
              <span key={`${m.name}-${m.start}`}
                onClick={() => { const d = (demonsProp as any[]).find(e => e.name?.toLowerCase() === m.name.toLowerCase()); if (d) setSelectedEntry(d) }}
                style={{ color: G, cursor: 'pointer', textDecoration: 'underline dotted', fontWeight: 600 }}>
                {text.slice(m.start, m.end)}
              </span>
            )
            pos = m.end
          }
          if (pos < text.length) parts.push(text.slice(pos))
          return <>{parts}</>
        }

        return (
          <div onClick={() => setSelectedEntry(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'center', padding: isMobile ? 8 : 20, paddingTop: isMobile ? 20 : undefined, backdropFilter: 'blur(4px)' }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: surf, border: `1px solid ${color}55`, borderLeft: `4px solid ${color}`, borderRadius: 12, width: isMobile ? '95vw' : '100%', maxWidth: isMobile ? '95vw' : isTablet ? '80vw' : 700, margin: isMobile ? '10px' : undefined, maxHeight: isMobile ? '90vh' : '85vh', overflowY: 'auto' as const, padding: 28, position: 'relative' }}>

              <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FlagButton contentType="intel-archive" contentId={String(entry.id || entry.name)} contentTitle={name} />
                <button onClick={() => setSelectedEntry(null)}
                  style={{ background: 'transparent', border: 'none', color: mut, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
              </div>

              {/* Name + badges header */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: cinzel, fontSize: 22, color: dbIsDark ? color : '#2D2924', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>{name}</div>
                {entry.phonetic && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontFamily: crimson, fontSize: 14, color: mut, fontStyle: 'italic' }}>/{entry.phonetic}/</span>
                    <button onClick={() => { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(entry.phonetic); u.rate = 0.75; u.pitch = 0.9; window.speechSynthesis.speak(u) } }}
                      style={{ background: 'rgba(201,168,76,0.1)', border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 20, padding: '2px 10px', color: G, fontFamily: cinzel, fontSize: 9, cursor: 'pointer' }}>
                      🔊 Hear
                    </button>
                  </div>
                )}
                {/* Classification badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                  {entry.biblicalRank && <span style={{ fontFamily: cinzel, fontSize: 8, background: 'rgba(201,168,76,0.15)', color: dbIsDark ? G : '#7a5c10', border: `1px solid rgba(201,168,76,0.35)`, padding: '3px 10px', borderRadius: 4 }}>⚔ {entry.biblicalRank}</span>}
                  {entry.caseType && <span style={{ fontFamily: cinzel, fontSize: 8, background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', padding: '3px 10px', borderRadius: 4 }}>{entry.caseType}</span>}
                  {entry.isGenerational && <span style={{ fontFamily: cinzel, fontSize: 8, background: 'rgba(122,158,126,0.12)', color: '#7a9e7e', border: '1px solid rgba(122,158,126,0.3)', padding: '3px 10px', borderRadius: 4 }}>🧬 Generational</span>}
                  {entry.isTerritorial && <span style={{ fontFamily: cinzel, fontSize: 8, background: 'rgba(139,157,202,0.12)', color: '#8B9DCA', border: '1px solid rgba(139,157,202,0.3)', padding: '3px 10px', borderRadius: 4 }}>🗺 Territorial</span>}
                </div>
              </div>

              {/* Tab bar */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${bdr}`, marginBottom: 20, overflowX: 'auto' as const, scrollbarWidth: 'none' as any, msOverflowStyle: 'none' as any }}>
                {([
                  { key: 'overview', label: '📖 Overview' },
                  { key: 'intelligence', label: '🔍 Intel' },
                  { key: 'warfare', label: '⚔ Warfare' },
                  { key: 'scholarly', label: '📚 Research' },
                ] as const).map(t => (
                  <button key={t.key} onClick={() => setModalTab(t.key)}
                    style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: modalTab === t.key ? `2px solid ${G}` : '2px solid transparent', color: modalTab === t.key ? G : mut, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', whiteSpace: 'nowrap' as const, marginBottom: -1 }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: OVERVIEW */}
              {modalTab === 'overview' && (
                <div>
                  {/* Image display */}
                  {(() => {
                    const imgArr = Array.isArray(entry.images) ? entry.images : String(entry.images || '').split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
                    const url = imgArr[0]
                    if (!url || !url.startsWith('http')) return null
                    return (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontFamily: cinzel, fontSize: 10, color: color + 'BB', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 8 }}>Historical Depiction</div>
                        <img src={url} alt={entry.name}
                          style={{ maxWidth: '100%', maxHeight: 250, borderRadius: 8, border: `1px solid rgba(201,168,76,0.15)`, objectFit: 'contain' as const, display: 'block', margin: '0 auto', cursor: 'pointer' }}
                          onClick={() => window.open(url, '_blank')}
                          onError={e => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = 'none' }}
                        />
                      </div>
                    )
                  })()}
                  {entry.aka && <div style={{ fontFamily: crimson, fontSize: 13, color: mut, fontStyle: 'italic', marginBottom: 14 }}>aka {entry.aka}</div>}
                  <FieldBlock label="Description" value={entry.description} />
                  <FieldBlock label="Kingdom" value={entry.kingdom} />
                  {entry.subKingdom && entry.subKingdom !== 'None' && (
                    <div style={{ marginBottom: 14, marginTop: -8 }}>
                      <span style={{
                        display: 'inline-block',
                        fontFamily: cinzel,
                        fontSize: 8,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase' as const,
                        background: 'rgba(201,168,76,0.08)',
                        color: dbIsDark ? 'rgba(201,168,76,0.65)' : '#7a5c10',
                        border: '1px solid rgba(201,168,76,0.22)',
                        borderRadius: 3,
                        padding: '3px 9px',
                      }}>
                        ◈ {entry.subKingdom}
                      </span>
                    </div>
                  )}
                  {entry.isTerritorial && entry.region && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: color + 'BB', marginBottom: 6, textTransform: 'uppercase' as const }}>🗺 Territorial Region</div>
                      <div style={{ fontFamily: crimson, fontSize: 14, color: txt }}>{entry.region}</div>
                    </div>
                  )}
                  {/* Related Resources — visible to all tiers */}
                  {spiritResources.length > 0 && (
                    <div style={{ marginTop: 20, borderTop: `1px solid rgba(201,168,76,0.15)`, paddingTop: 16 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 9, color: color + 'BB', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 10 }}>Related Resources</div>
                      {spiritResources.map((r: any) => (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid rgba(201,168,76,0.08)`, cursor: 'pointer' }}
                          onClick={() => window.open('/community#arsenal', '_blank')}>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>📄</span>
                          <div>
                            <div style={{ fontFamily: cinzel, fontSize: 11, color: G }}>{r.title}</div>
                            <div style={{ fontFamily: crimson, fontSize: 12, color: mut }}>{r.topic}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: INTELLIGENCE — Soldier+ */}
              {modalTab === 'intelligence' && (
                <TierGate tierName="Soldier">
                  <FieldBlock label="Manifestations & Symptoms" value={entry.manifestation || entry.symptoms} />
                  <FieldBlock label="Entry Points" value={entry.entryPoints} />
                  <FieldBlock label="Scripture Reference" value={entry.scripture} color={G} />
                  <FieldBlock label="Source & Origin" value={entry.sourceOrigin} />
                  {entry.strongman ? (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: color + 'BB', marginBottom: 6, textTransform: 'uppercase' as const }}>Strongman</div>
                      {(() => { const linked = demonsProp.find((d: any) => d.name?.toLowerCase() === entry.strongman?.toLowerCase()); return linked ? (
                        <span onClick={() => setSelectedEntry(linked)} style={{ color: G, cursor: 'pointer', textDecoration: 'underline dotted', fontFamily: crimson, fontSize: 14, fontWeight: 600 }} title={`View ${entry.strongman} dossier`}>{entry.strongman}</span>
                      ) : <span style={{ fontFamily: crimson, fontSize: 14, color: txt }}>{entry.strongman}</span> })()}
                    </div>
                  ) : null}
                  {entry.parentStrongman && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: color + 'BB', marginBottom: 8, textTransform: 'uppercase' as const }}>Parent Strongman</div>
                      <button onClick={() => { const p = demonsProp.find((d: any) => d.name?.toLowerCase() === entry.parentStrongman?.toLowerCase()); if (p) setSelectedEntry(p) }}
                        style={{ background: 'none', border: 'none', color: G, fontFamily: crimson, fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                        {entry.parentStrongman}
                      </button>
                    </div>
                  )}
                  {entry.companionSpirits && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: color + 'BB', marginBottom: 8, textTransform: 'uppercase' as const }}>Companion Spirits</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                        {String(entry.companionSpirits).split(',').map((s: string) => s.trim()).filter(Boolean).map((n: string) => {
                          const linked = demonsProp.find((d: any) => d.name?.toLowerCase() === n.toLowerCase())
                          return (
                            <button key={n} onClick={() => linked && setSelectedEntry(linked)}
                              style={{ padding: '3px 12px', background: 'rgba(201,168,76,0.08)', border: `1px solid rgba(201,168,76,0.25)`, borderRadius: 20, color: linked ? G : mut, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', cursor: linked ? 'pointer' : 'default', textTransform: 'uppercase' as const }}>
                              {n}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  <FieldBlock label="Counter Scriptures" value={entry.counterScriptures} color={G} />
                  {entry.deliveranceSequence && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: color + 'BB', marginBottom: 8, textTransform: 'uppercase' as const }}>Deliverance Sequence</div>
                      <div style={{ background: 'rgba(13,11,20,0.8)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 6, padding: '10px 14px', fontSize: 13, lineHeight: 1.6 }}>
                        {entry.deliveranceSequence.split('→').map((step: string, i: number, arr: string[]) => (
                          <span key={i}><span style={{ color: txt }}>{step.trim()}</span>{i < arr.length - 1 && <span style={{ color: G, margin: '0 6px' }}>→</span>}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {entry.hierarchyCategory && (() => {
                    const cat = entry.hierarchyCategory
                    const colors = HIERARCHY_COLORS[cat] || HIERARCHY_COLORS['General Oppression']
                    return (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: color + 'BB', marginBottom: 6, textTransform: 'uppercase' as const }}>Kingdom Category</div>
                        <span style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontFamily: cinzel, backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, letterSpacing: '0.05em', display: 'inline-block' }}>{cat}</span>
                      </div>
                    )
                  })()}
                </TierGate>
              )}

              {/* TAB 3: WARFARE — Commander+ */}
              {modalTab === 'warfare' && (
                <TierGate tierName="Commander">
                  <FieldBlock label="Session Indicators" value={entry.sessionIndicators} />
                  <FieldBlock label="Resistance Signature" value={entry.resistanceSignature} />
                  {entry.clusterSpirits && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: color + 'BB', marginBottom: 8, textTransform: 'uppercase' as const }}>Cluster Spirits</div>
                      <div style={{ fontFamily: crimson, fontSize: 14, color: txt, lineHeight: 1.7 }}>
                        {linkifySpirits(String(entry.clusterSpirits))}
                      </div>
                    </div>
                  )}
                  <FieldBlock label="Transmission Vectors" value={entry.transmissionVectors} />
                  <FieldBlock label="Legal Rights" value={entry.legalRights} />
                  <FieldBlock label="Legal Rights Framework" value={entry.legalRightsFramework} />
                  <FieldBlock label="Demonic Agreements & Lies" value={entry.demonicAgreements} />
                  <FieldBlock label="Assignment" value={entry.assignment} />
                  <FieldBlock label="WRI Exorcist Notes" value={entry.wriNotes} />
                  <FieldBlock label="Operational Notes" value={entry.operationalNotes} />
                  {entry.prayerPoints && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: color + 'BB', marginBottom: 8, textTransform: 'uppercase' as const }}>Prayer Points</div>
                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                        {String(entry.prayerPoints).split(/\n|\d+\./).filter((s: string) => s.trim()).map((p: string, i: number) => (
                          <div key={i} style={{ background: 'rgba(201,168,76,0.05)', border: `1px solid rgba(201,168,76,0.15)`, borderRadius: 8, padding: '10px 14px', fontFamily: crimson, fontSize: 13, color: txt, lineHeight: 1.6 }}>
                            {p.trim()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <FieldBlock label="Aftercare Notes" value={entry.aftercareNotes} />

                  {/* ── Session Intel: Cultural Presence + Trigger Questions ── */}
                  {((Array.isArray(entry.culturalPresence) && entry.culturalPresence.length > 0) || entry.sessionTriggerQuestions) && (
                    <div style={{ marginTop: 8, marginBottom: 18, paddingTop: 16, borderTop: `1px solid rgba(201,168,76,0.12)` }}>
                      <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.1em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>⚡</span><span>Session Intel</span>
                      </div>
                      {Array.isArray(entry.culturalPresence) && entry.culturalPresence.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: color + 'BB', marginBottom: 8, textTransform: 'uppercase' as const }}>Cultural Presence</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                            {entry.culturalPresence.map((cat: string) => (
                              <span key={cat} style={{ fontFamily: cinzel, fontSize: 9, color: G, border: `1px solid rgba(201,168,76,0.4)`, borderRadius: 4, padding: '4px 10px', letterSpacing: '0.06em', background: 'rgba(201,168,76,0.05)' }}>
                                {cat}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {entry.sessionTriggerQuestions && (
                        <div>
                          <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: color + 'BB', marginBottom: 8, textTransform: 'uppercase' as const }}>Session Trigger Questions</div>
                          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                            {String(entry.sessionTriggerQuestions).split('\n').filter((l: string) => l.trim()).map((line: string, i: number) => (
                              <div key={i} style={{ fontFamily: crimson, fontSize: 13, color: txt, lineHeight: 1.65, fontStyle: 'italic', paddingLeft: 10, borderLeft: `2px solid rgba(201,168,76,0.2)` }}>
                                {line.replace(/^\d+\.\s*/, '')}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Related Arsenal resources */}
                  {spiritResources.length > 0 && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: color + 'BB', marginBottom: 8, textTransform: 'uppercase' as const }}>📎 Related Resources</div>
                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                        {spiritResources.map((r: any) => (
                          <div key={r.id} style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 16 }}>📄</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: cinzel, fontSize: 11, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{r.title}</div>
                              <div style={{ fontSize: 10, color: mut }}>{r.topic || r.category}</div>
                            </div>
                            {r.file_url
                              ? <a href={r.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: G, background: 'transparent', border: `1px solid ${G}`, borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontFamily: cinzel, textDecoration: 'none' }}>↗ View</a>
                              : <button onClick={async () => { const token = await getToken(); const res = await fetch(`/api/arsenal-resources?id=${r.id}&action=download`, { headers: { Authorization: `Bearer ${token}` } }); if (res.ok) { const d = await res.json(); if (d.url) window.open(d.url, '_blank') } }} style={{ fontSize: 9, color: G, background: 'transparent', border: `1px solid ${G}`, borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontFamily: cinzel }}>↗ View</button>
                            }
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TierGate>
              )}

              {/* TAB 4: RESEARCH — General+ */}
              {modalTab === 'scholarly' && (
                <TierGate tierName="General">
                  <FieldBlock label="Etymology & Name Analysis" value={entry.etymologyNotes} />
                  <FieldBlock label="Archaeological & ANE Context" value={entry.archaeologyNotes} />
                  <FieldBlock label="Scripture Context" value={entry.scriptureContext} />
                  <FieldBlock label="Institutional Expression" value={entry.institutionalExpression} />
                  <FieldBlock label="Primary Battlefield" value={entry.primaryBattlefield} />
                  <FieldBlock label="Personality Presentation" value={entry.personalityPresentation} />
                  <FieldBlock label="Case Type" value={entry.caseType} />
                  <FieldBlock label="Biblical Rank" value={entry.biblicalRank} />
                  <FieldBlock label="Sub-Kingdom" value={entry.subKingdom && entry.subKingdom !== 'None' ? entry.subKingdom : undefined} />
                  {entry.relatedSpirits && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: color + 'BB', marginBottom: 8, textTransform: 'uppercase' as const }}>Related Spirits</div>
                      <div style={{ fontFamily: crimson, fontSize: 14, color: txt, lineHeight: 1.7 }}>
                        {linkifySpirits(String(entry.relatedSpirits))}
                      </div>
                    </div>
                  )}
                  <FieldBlock label="WRI Exorcist Notes" value={entry.wriNotes} />
                </TierGate>
              )}

            </div>
          </div>
        )
      })()}

      {/* Intel Archive Legend */}
      {showLegend && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setShowLegend(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: dbIsDark ? '#0D0B14' : '#FAF8F5', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 14, width: '100%', maxWidth: 640, maxHeight: '85vh', overflowY: 'auto', padding: '28px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div style={{ fontFamily: cinzel, fontSize: 18, color: G, letterSpacing: '0.08em', marginBottom: 4 }}>📚 Intel Archive Guide</div>
                <div style={{ fontFamily: crimson, fontSize: 13, color: dbDim, fontStyle: 'italic' }}>Understanding your intelligence database</div>
              </div>
              <button onClick={() => setShowLegend(false)} style={{ background: 'none', border: 'none', color: dbDim, fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 10 }}>What Is This?</div>
              <div style={{ fontFamily: crimson, fontSize: 14, color: dbText, lineHeight: 1.7 }}>
                The Intel Archive is a spiritual warfare database containing intelligence on demonic entities, principalities, and spiritual forces. Each entry is a complete dossier drawing from Scripture, biblical archaeology, etymology, and decades of deliverance ministry research. This is not a casual reference. It is a minister's field manual.
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 12 }}>Biblical Hierarchy (Ephesians 6:12)</div>
              {[
                { rank: 'Principality', color: '#ef4444', desc: 'Ruling spirits over nations and regions. Highest rank. Require territorial-level authority to displace.', ref: 'Dan. 10:13 — "Prince of Persia"' },
                { rank: 'Power', color: '#f97316', desc: 'Delegated authority — enforce the will of principalities. Assigned to cities, institutions, and families.', ref: 'Eph. 1:21, Col. 2:15' },
                { rank: 'Ruler of Darkness', color: '#8b5cf6', desc: 'Control world systems — media, government, education, finance, false religion.', ref: 'John 12:31 — "prince of this world"' },
                { rank: 'Spiritual Wickedness', color: '#6366f1', desc: 'Atmospheric spirits in the heavenly realms. Affect thoughts and spiritual climate.', ref: 'Eph. 2:2 — "prince of the power of the air"' },
                { rank: 'Demon / Familiar Spirit', color: '#9a8c74', desc: 'Ground-level spirits. Personal assignment, generational access, operate in individuals.', ref: 'Luke 13:11, Mark 5:9' },
              ].map(item => (
                <div key={item.rank} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: `${item.color}10`, border: `1px solid ${item.color}30`, borderLeft: `3px solid ${item.color}`, borderRadius: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 11, color: item.color, letterSpacing: '0.06em', marginBottom: 3 }}>{item.rank}</div>
                    <div style={{ fontFamily: crimson, fontSize: 13, color: dbText, lineHeight: 1.5, marginBottom: 4 }}>{item.desc}</div>
                    <div style={{ fontFamily: cinzel, fontSize: 9, color: dbDim, letterSpacing: '0.04em' }}>{item.ref}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 12 }}>What Each Tab Contains</div>
              {[
                { tab: '📖 Overview', tier: 'All members', desc: 'Identity, classification, biblical rank, manifestations, primary battlefield.' },
                { tab: '🔍 Intel', tier: 'Commander+', desc: 'Session indicators, resistance signature, demonic agreements, entry points, transmission vectors, cluster spirits, legal rights.' },
                { tab: '⚔ Warfare', tier: 'Soldier+', desc: 'Counter scriptures, deliverance sequence, prayer points, aftercare notes, linked resources.' },
                { tab: '📚 Research', tier: 'General+', desc: 'Etymology, archaeological context, comprehensive scripture study, historical sources.' },
              ].map(item => (
                <div key={item.tab} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: 'rgba(201,168,76,0.04)', border: `1px solid rgba(201,168,76,0.15)`, borderRadius: 8, marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.04em' }}>{item.tab}</span>
                      <span style={{ fontSize: 9, color: dbDim, fontFamily: cinzel, letterSpacing: '0.06em', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, padding: '1px 7px' }}>{item.tier}</span>
                    </div>
                    <div style={{ fontFamily: crimson, fontSize: 13, color: dbDim, lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setShowLegend(false)}
              style={{ width: '100%', padding: '12px', background: G, border: 'none', borderRadius: 8, color: '#0D0B14', fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase' as const }}>
              Enter the Archive ⚔
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ARSENAL VIEW ──────────────────────────────────────────
function ArsenalView({ theme, userTier, isMobile, setSidebarOpen }: {
  theme: string; userTier: string; isMobile: boolean; setSidebarOpen: (v: boolean) => void
}) {
  const { getToken } = useAuth()
  const isDark = theme !== 'light'
  const bg      = isDark ? '#0D0B14' : '#FAF8F5'
  const surface = isDark ? 'rgba(201,168,76,0.04)' : '#FFFFFF'
  const border  = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(139,105,20,0.25)'
  const text    = isDark ? '#E8D5B0' : '#2D2924'
  const muted   = isDark ? '#8B7355' : '#5C5248'

  const [resources, setResources]   = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [query, setQuery]           = useState('')
  const [tierFilter, setTierFilter] = useState('All')
  const [topicFilter, setTopicFilter] = useState('')
  const [tagFilter, setTagFilter]   = useState('')
  const [error, setError]           = useState('')

  const ARSENAL_TOPICS = [
    'Soul Ties', 'Generational Curses', 'Forgiveness', 'Ungodly Vows',
    'Freemasonry & Secret Societies', 'Sexual Bondage', 'Fear & Rejection',
    'Identity & Sonship', 'Inner Healing', 'Witchcraft & Occult',
    'Marine Kingdom', 'Mind Control', 'Leviathan & Pride', 'Jezebel & Control',
    'Python & Constriction', 'Deliverance Foundations', 'Aftercare',
    'Prayer & Intercession', 'Scripture Reference', 'General Ministry',
  ]
  const ARSENAL_TAGS = [
    'Renunciation Prayer', 'Worksheet', 'Teaching', 'Protocol', 'Session Tool',
    'Scripture Reference', 'Aftercare', 'Assessment Tool', 'Quick Reference',
    'Leader Guide', 'Self-Deliverance', 'Group Exercise',
  ]

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

  const FILE_ICONS: Record<string, string> = {
    'application/pdf': '📄',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
    'audio/mpeg': '🎵',
    'image/png': '🖼️',
    'image/jpeg': '🖼️',
  }

  const TIERS      = ['All', 'Free', 'Soldier', 'Commander', 'General']

  const TIER_COLORS: Record<string, string> = {
    Free: '#4ade80', Soldier: '#C9A84C', Commander: '#38bdf8', General: '#f87171',
  }

  const filtered = resources.filter(r => {
    const matchSearch = !query ||
      r.title?.toLowerCase().includes(query.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(query.toLowerCase()) ||
      (Array.isArray(r.tags) ? r.tags.some((t: string) => t.toLowerCase().includes(query.toLowerCase())) : false)
    const matchTier  = tierFilter === 'All' || r.tier === tierFilter
    const matchTopic = !topicFilter || r.topic === topicFilter || r.category === topicFilter
    const matchTag   = !tagFilter || (Array.isArray(r.tags) ? r.tags.includes(tagFilter) : String(r.tags || '').includes(tagFilter))
    return matchSearch && matchTier && matchTopic && matchTag
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
              <span style={{ fontSize: 10, color: muted, fontFamily: crimson }}>{resource.topic || resource.category}</span>
              {sizeMB && <span style={{ fontSize: 11, color: muted }}>· {sizeMB} MB</span>}
            </div>
          </div>
          {hasAccess ? (
            resource.file_url
              ? <a href={resource.file_url} target="_blank" rel="noopener noreferrer" style={{ background: G, color: '#0D0B14', border: 'none', borderRadius: 5, padding: '7px 14px', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em', cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0, textDecoration: 'none', display: 'inline-block' }}>↗ View</a>
              : <span style={{ fontSize: 10, color: muted, fontFamily: cinzel }}>No file</span>
          ) : (
            <a href={upgradeLink} style={{ background: 'transparent', border: `1px solid ${G}`, color: G, borderRadius: 5, padding: '7px 14px', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em', textDecoration: 'none', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
              🔒 Upgrade
            </a>
          )}
        </div>
        {resource.description && (
          <div style={{ fontSize: 12, color: muted, lineHeight: 1.5, marginBottom: 6 }}>{resource.description}</div>
        )}
        {Array.isArray(resource.tags) && resource.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginTop: 4 }}>
            {resource.tags.slice(0, 3).map((tag: string) => (
              <span key={tag} style={{ fontSize: 8, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, padding: '1px 7px', color: muted, fontFamily: cinzel, letterSpacing: '0.04em' }}>{tag}</span>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: bg, padding: isMobile ? '16px' : '24px 32px', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        {isMobile && (
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: G, fontSize: 22, cursor: 'pointer', padding: '4px 8px', marginRight: 4, lineHeight: 1 }}>☰</button>
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

      {/* Tier filter */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any, scrollbarWidth: 'none' as any, marginBottom: 10, paddingBottom: 2 }}>
        {TIERS.map(t => (
          <button key={t} onClick={() => setTierFilter(t)} style={{ flexShrink: 0, padding: '4px 12px', borderRadius: 999, fontSize: 11, cursor: 'pointer', fontFamily: cinzel, letterSpacing: '0.04em', whiteSpace: 'nowrap' as const, border: `1px solid ${tierFilter === t ? G : border}`, background: tierFilter === t ? G : 'transparent', color: tierFilter === t ? '#0D0B14' : muted }}>
            {t}
          </button>
        ))}
      </div>

      {/* Topic filter */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 9, fontFamily: cinzel, color: muted, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 6 }}>Topic</div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any, scrollbarWidth: 'none' as any, msOverflowStyle: 'none' as any, flexWrap: 'nowrap' as const, paddingBottom: 4 }}>
          {['All', ...ARSENAL_TOPICS].map(t => (
            <button key={t} onClick={() => setTopicFilter(t === 'All' ? '' : t)}
              style={{ flexShrink: 0, padding: '4px 12px', background: (topicFilter === t || (t === 'All' && !topicFilter)) ? 'rgba(201,168,76,0.2)' : 'transparent', border: `1px solid ${(topicFilter === t || (t === 'All' && !topicFilter)) ? G : border}`, borderRadius: 20, color: (topicFilter === t || (t === 'All' && !topicFilter)) ? G : muted, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Function tag filter */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 9, fontFamily: cinzel, color: muted, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 6 }}>Function</div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any, scrollbarWidth: 'none' as any, msOverflowStyle: 'none' as any, flexWrap: 'nowrap' as const, paddingBottom: 4 }}>
          {['All', ...ARSENAL_TAGS].map(t => (
            <button key={t} onClick={() => setTagFilter(t === 'All' ? '' : t)}
              style={{ flexShrink: 0, padding: '4px 12px', background: (tagFilter === t || (t === 'All' && !tagFilter)) ? 'rgba(201,168,76,0.15)' : 'transparent', border: `1px solid ${(tagFilter === t || (t === 'All' && !tagFilter)) ? G : border}`, borderRadius: 20, color: (tagFilter === t || (t === 'All' && !tagFilter)) ? G : muted, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: muted, fontFamily: cinzel, fontSize: 13 }}>Loading arsenal...</div>
      ) : error ? (
        <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6, padding: '12px 16px', color: '#f87171', marginBottom: 24, fontFamily: crimson }}>{error}</div>
      ) : (
        <>
          {!query && tierFilter === 'All' && !topicFilter && !tagFilter && recent.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase' as const, marginBottom: 12 }}>Recently Added</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                {recent.map(r => <ResourceCard key={r.id} resource={r} />)}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase' as const, marginBottom: 12 }}>
              {query || tierFilter !== 'All' || topicFilter || tagFilter ? `${filtered.length} Results` : `All Resources (${resources.length})`}
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
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px' : '32px 40px', background: '#12101e', minHeight: 0 }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: G, fontSize: 22, cursor: 'pointer', padding: '4px 8px', marginRight: 4, lineHeight: 1 }}>☰</button>
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

// ── GATEWAY INVESTIGATOR VIEW ──────────────────────────────
function GatewayInvestigatorView({ theme, userTier, isMobile, setSidebarOpen }: any) {
  const { getToken } = useAuth()
  const isDark = theme !== 'light'
  const bg    = isDark ? '#0D0B14' : '#FAF8F5'
  const surf  = isDark ? 'rgba(201,168,76,0.04)' : '#FFFFFF'
  const bdr   = isDark ? 'rgba(201,168,76,0.18)' : 'rgba(139,105,20,0.25)'
  const txt   = isDark ? '#f0e8d8' : '#2D2924'
  const mut   = isDark ? '#8B7355' : '#5C5248'
  const dim   = isDark ? '#5a4f3a' : '#5C5248'

  const [spiritName, setSpiritName]       = useState('')
  const [personContext, setPersonContext] = useState('')
  const [loading, setLoading]             = useState(false)
  const [report, setReport]               = useState<any>(null)
  const [error, setError]                 = useState('')

  const tierLvl = (t: string) => ({ free: 0, soldier: 1, commander: 2, general: 3 }[t?.toLowerCase()] ?? 0)
  const hasAccess = tierLvl(userTier) >= tierLvl('soldier')

  if (!hasAccess) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: bg }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🔒</div>
          <h2 style={{ fontFamily: cinzel, color: G, fontSize: 20, marginBottom: 12 }}>Soldier Tier Required</h2>
          <p style={{ color: mut, fontSize: 15, lineHeight: 1.7, marginBottom: 28, fontFamily: "'Crimson Pro', serif" }}>
            The Gateway Investigator is an AI-powered intake research tool that identifies cultural entry points for any spirit.
            Available to Soldier, Commander, and General members.
          </p>
        </div>
      </div>
    )
  }

  const canSubmit = spiritName.trim().length > 0 || personContext.trim().length > 0

  async function handleInvestigate() {
    if (!canSubmit) return
    setLoading(true); setError(''); setReport(null)
    try {
      const token = await getToken()
      const res = await fetch('/api/gateway-investigator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ spiritName: spiritName.trim(), personContext: personContext.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Investigation failed')
      setReport(data)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px' : '32px 40px', background: bg, minHeight: 0 }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: G, fontSize: 22, cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>☰</button>
          </div>
        )}

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: cinzel, color: isDark ? '#E8D5B0' : '#2D2924', fontSize: isMobile ? 20 : 26, fontWeight: 700, marginBottom: 6, letterSpacing: '0.06em' }}>
            🚪 Gateway Investigator
          </h1>
          <p style={{ fontFamily: "'Crimson Pro', serif", color: mut, fontSize: 14, fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>
            Enter a spirit name, a cultural exposure, or both. Get a full intelligence report on gateways, entry points, and session questions.
          </p>
        </div>

        {/* Input form */}
        <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: isMobile ? '20px 16px' : '24px 28px', marginBottom: 28 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: cinzel, fontSize: 9, color: mut, letterSpacing: '0.12em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 8 }}>Spirit Name <span style={{ opacity: 0.55, fontFamily: "'Crimson Pro', serif", letterSpacing: 0, fontSize: 10, textTransform: 'none' as const }}>(optional)</span></label>
            <input
              value={spiritName}
              onChange={e => setSpiritName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleInvestigate()}
              placeholder="e.g. Leviathan, Jezebel, Baal, Python..."
              style={{ width: '100%', boxSizing: 'border-box' as const, background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', border: `1px solid ${bdr}`, borderRadius: 8, padding: '12px 16px', color: txt, fontFamily: "'Crimson Pro', serif", fontSize: 15, outline: 'none' }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontFamily: cinzel, fontSize: 9, color: mut, letterSpacing: '0.12em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 8 }}>
              Cultural Exposure or Session Context <span style={{ opacity: 0.55, fontFamily: "'Crimson Pro', serif", letterSpacing: 0, fontSize: 10, textTransform: 'none' as const }}>(optional)</span>
            </label>
            <textarea
              value={personContext}
              onChange={e => setPersonContext(e.target.value)}
              placeholder="e.g. Watched the movie Chucky, heavily into D&D, listens to a lot of death metal, was in a fraternity..."
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box' as const, background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', border: `1px solid ${bdr}`, borderRadius: 8, padding: '10px 14px', color: txt, fontFamily: "'Crimson Pro', serif", fontSize: 14, outline: 'none', resize: 'vertical' as const, lineHeight: 1.6 }}
            />
          </div>
          <button
            onClick={handleInvestigate}
            disabled={loading || !canSubmit}
            style={{ background: loading ? 'rgba(201,168,76,0.4)' : G, color: '#0D0B14', fontFamily: cinzel, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', border: 'none', borderRadius: 6, padding: '11px 28px', cursor: loading || !canSubmit ? 'wait' : 'pointer', opacity: !canSubmit ? 0.5 : 1 }}
          >
            {loading ? '🔍 Investigating…' : '🚪 Run Gateway Report'}
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 8, padding: '12px 16px', color: '#f87171', fontFamily: "'Crimson Pro', serif", fontSize: 14, marginBottom: 20 }}>
            ⚠ {error}
          </div>
        )}

        {report && (
          <div style={{ marginTop: 24 }}>
            {/* Header */}
            <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.08em', marginBottom: 20 }}>
              GATEWAY INTELLIGENCE REPORT: {(report.spirit || spiritName || personContext.slice(0, 50)).toUpperCase()}
            </div>

            {/* Summary */}
            {report.summary && (
              <div style={{ padding: '16px 20px', marginBottom: 24, background: 'rgba(201,168,76,0.06)', border: '1px solid #3a3020', borderLeft: '3px solid #C9A84C', borderRadius: 6 }}>
                <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.12em', marginBottom: 8 }}>INTELLIGENCE SUMMARY</div>
                <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 16, color: isDark ? '#a89878' : '#4a3a2a', lineHeight: 1.7 }}>
                  {report.summary}
                </div>
              </div>
            )}

            {/* Sections grid */}
            {Array.isArray(report.sections) && report.sections.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 24 }}>
                {report.sections.map((section: any, i: number) => {
                  const items: string[] = Array.isArray(section.items) ? section.items : (section.content ? [section.content] : [])
                  if (!items.length) return null
                  const isSessionQ = section.title?.toLowerCase().includes('session')
                  return (
                    <div key={i} style={{ padding: '16px 20px', background: isDark ? '#0a0807' : '#FAF8F5', border: `1px solid ${isSessionQ ? 'rgba(201,168,76,0.3)' : (isDark ? '#2a2218' : 'rgba(160,120,48,0.2)')}`, borderLeft: isSessionQ ? `3px solid ${G}` : undefined, borderRadius: 6 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 10, color: isSessionQ ? G : mut, letterSpacing: '0.1em', marginBottom: 12, textTransform: 'uppercase' as const }}>
                        {isSessionQ ? '⚡ ' : ''}{section.title}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                        {items.map((item: string, j: number) => (
                          <div key={j} style={{ fontFamily: "'Crimson Pro', serif", fontSize: 15, color: isSessionQ ? txt : (isDark ? '#8a7a60' : '#5a4a3a'), lineHeight: 1.65, paddingLeft: 12, borderLeft: `1px solid ${isDark ? '#2a2218' : 'rgba(160,120,48,0.15)'}`, fontStyle: isSessionQ ? 'italic' : 'normal' }}>
                            {isSessionQ && <span style={{ color: G, marginRight: 6, fontStyle: 'normal' }}>{j + 1}.</span>}
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <p style={{ fontSize: 12, color: dim, textAlign: 'center' as const, lineHeight: 1.6, marginTop: 16, fontFamily: "'Crimson Pro', serif", fontStyle: 'italic' }}>
              This report is an AI-generated intelligence aid for trained ministers. Always lead with prayer and Holy Spirit discernment.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── FRINGE INTEL VIEW ─────────────────────────────────────
function FringeIntelView({ theme, isMobile, setSidebarOpen }: any) {
  const isDark = theme !== 'light'
  const bg = isDark ? '#0D0B14' : '#FAF8F5'
  const surf = isDark ? '#FFFFFF' : '#FFFFFF'
  const border = isDark ? 'rgba(201,168,76,0.12)' : 'rgba(160,120,48,0.2)'
  const muted = isDark ? '#8B7355' : '#5C5248'
  const txt = isDark ? '#f0e8d8' : '#2D2924'
  const gold = isDark ? G : '#8B6914'
  const { getToken } = useAuth()

  const TOPICS = [
    { key: 'ufo-disclosure',   icon: '👽', label: 'UFO Disclosure',    desc: 'Craft sightings, government programs, interdimensional origins', tier: 'free' },
    { key: 'genesis-6',        icon: '📖', label: 'Genesis 6',         desc: 'The Nephilim, sons of God, ancient giants and their bloodlines', tier: 'free' },
    { key: 'bloodline-warfare',icon: '🧬', label: 'Bloodline Warfare',  desc: 'Generational corruption, hybrid entities, seed war', tier: 'soldier' },
    { key: 'nephilim',         icon: '👁', label: 'Nephilim',           desc: 'Pre-flood entities, giant clans, post-flood remnants', tier: 'soldier' },
    { key: 'gov-programming',  icon: '🖥', label: 'Gov. Programming',   desc: 'MK Ultra, monarch programming, demonic tech interfaces', tier: 'commander' },
    { key: 'fringe-science',   icon: '⚗️', label: 'Fringe Science',     desc: 'Quantum, frequency, AI consciousness — the demonic angle', tier: 'commander' },
  ]

  const [selectedTopic, setSelectedTopic] = useState<any>(null)
  const [selectedArticle, setSelectedArticle] = useState<any>(null)
  const [articles, setArticles] = useState<any[]>([])
  const [articleBody, setArticleBody] = useState<string>('')
  const [loadingArticles, setLoadingArticles] = useState(false)
  const [loadingBody, setLoadingBody] = useState(false)

  async function openTopic(topic: any) {
    setSelectedTopic(topic)
    setSelectedArticle(null)
    setArticleBody('')
    setLoadingArticles(true)
    try {
      const token = await getToken()
      const res = await fetch(`/api/fringe-articles?topic=${topic.key}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const d = await res.json()
        setArticles(d.articles || [])
      }
    } catch(e) {}
    setLoadingArticles(false)
  }

  async function openArticle(article: any) {
    if (!article.hasAccess) return
    setSelectedArticle(article)
    setLoadingBody(true)
    try {
      const token = await getToken()
      const res = await fetch(`/api/fringe-articles?id=${article.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const d = await res.json()
        setArticleBody(d.article?.body || '')
      }
    } catch(e) {}
    setLoadingBody(false)
  }

  const tierColors: Record<string, string> = { free: '#9a8c74', soldier: '#7a9e7e', commander: '#8B9DCA', general: '#C9A84C' }

  if (selectedArticle) return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, background: bg, padding: isMobile ? '16px' : '24px 32px' }}>
      <button onClick={() => { setSelectedArticle(null); setArticleBody('') }}
        style={{ background: 'none', border: 'none', color: gold, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
        ← Back to {selectedTopic?.label}
      </button>
      <div style={{ maxWidth: 720 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <div style={{ fontFamily: cinzel, fontSize: isMobile ? 18 : 24, color: gold, letterSpacing: '0.04em' }}>{selectedArticle.title}</div>
          <FlagButton contentType="fringe-intelligence" contentId={String(selectedArticle.id)} contentTitle={selectedArticle.title} />
        </div>
        <div style={{ fontSize: 11, color: muted, fontFamily: crimson, marginBottom: 24 }}>
          {selectedArticle.author_name} · {new Date(selectedArticle.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
        {loadingBody ? (
          <div style={{ color: muted, fontFamily: crimson, fontStyle: 'italic' }}>Loading...</div>
        ) : (
          <div style={{ fontFamily: crimson, fontSize: 16, color: txt, lineHeight: 1.8, whiteSpace: 'pre-wrap' as const }}>{articleBody}</div>
        )}
      </div>
    </div>
  )

  if (selectedTopic) return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, background: bg, padding: isMobile ? '16px' : '24px 32px' }}>
      <button onClick={() => { setSelectedTopic(null); setArticles([]) }}
        style={{ background: 'none', border: 'none', color: gold, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
        ← Fringe Intelligence
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span style={{ fontSize: 28 }}>{selectedTopic.icon}</span>
        <div>
          <div style={{ fontFamily: cinzel, fontSize: isMobile ? 16 : 20, color: gold, letterSpacing: '0.06em' }}>{selectedTopic.label}</div>
          <div style={{ fontFamily: crimson, fontSize: 13, color: muted, marginTop: 2 }}>{selectedTopic.desc}</div>
        </div>
      </div>
      {loadingArticles ? (
        <div style={{ color: muted, fontFamily: crimson, fontStyle: 'italic' }}>Loading intelligence...</div>
      ) : articles.length === 0 ? (
        <div style={{ background: surf, border: `1px solid ${border}`, borderRadius: 12, padding: '40px 24px', textAlign: 'center' as const }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
          <div style={{ fontFamily: cinzel, fontSize: 13, color: gold, letterSpacing: '0.08em', marginBottom: 8 }}>Intelligence Incoming</div>
          <div style={{ fontFamily: crimson, fontSize: 14, color: muted, fontStyle: 'italic' }}>Articles for this topic are being prepared. Check back soon.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
          {articles.map((article: any) => (
            <div
              key={article.id}
              onClick={() => openArticle(article)}
              style={{
                background: surf, border: `1px solid ${article.hasAccess ? border : 'rgba(255,255,255,0.05)'}`,
                borderLeft: `3px solid ${article.hasAccess ? gold : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 10, padding: '16px 18px',
                cursor: article.hasAccess ? 'pointer' : 'default', opacity: article.hasAccess ? 1 : 0.6,
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => article.hasAccess && ((e.currentTarget as HTMLElement).style.borderColor = gold)}
              onMouseLeave={e => article.hasAccess && ((e.currentTarget as HTMLElement).style.borderColor = border)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 13, color: article.hasAccess ? txt : muted, letterSpacing: '0.04em', marginBottom: 4 }}>
                    {!article.hasAccess && '🔒 '}{article.title}
                  </div>
                  {article.summary && <div style={{ fontFamily: crimson, fontSize: 13, color: muted, lineHeight: 1.5 }}>{article.summary}</div>}
                </div>
                <span style={{ fontSize: 9, color: tierColors[article.tier] || muted, fontFamily: cinzel, letterSpacing: '0.06em', textTransform: 'uppercase' as const, border: `1px solid ${tierColors[article.tier] || muted}`, borderRadius: 10, padding: '2px 8px', flexShrink: 0 }}>
                  {article.tier}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, background: bg, padding: isMobile ? '16px' : '24px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        {isMobile && <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: gold, fontSize: 22, cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>☰</button>}
        <div>
          <div style={{ fontSize: 10, color: gold, letterSpacing: '0.2em', fontFamily: cinzel, marginBottom: 6, textTransform: 'uppercase' as const }}>⚠ CLASSIFIED — LEVEL 5 CLEARANCE</div>
          <div style={{ fontFamily: cinzel, fontSize: isMobile ? 18 : 24, color: gold, fontWeight: 700, marginBottom: 4 }}>👁 Fringe Intelligence</div>
          <div style={{ fontFamily: crimson, fontSize: 13, color: muted, lineHeight: 1.6 }}>
            Where the strange things get explained. Aliens are demons in meat suits. Giants were real. The cover-up is spiritual.
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
        {TOPICS.map(({ key, icon, label, desc, tier }) => (
          <div
            key={key}
            onClick={() => openTopic({ key, icon, label, desc, tier })}
            style={{ background: surf, border: `1px solid ${border}`, borderRadius: 10, padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer', transition: 'border-color 0.15s' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = gold)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = border)}
          >
            <span style={{ fontSize: 24, flexShrink: 0 }}>{icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: cinzel, fontSize: 13, color: txt, marginBottom: 4, letterSpacing: '0.06em' }}>{label}</div>
              <div style={{ fontFamily: crimson, fontSize: 13, color: muted, lineHeight: 1.5, marginBottom: 8 }}>{desc}</div>
              <span style={{ fontSize: 9, color: tierColors[tier] || muted, fontFamily: cinzel, letterSpacing: '0.06em', textTransform: 'uppercase' as const, border: `1px solid ${tierColors[tier] || muted}`, borderRadius: 10, padding: '1px 7px' }}>{tier}</span>
            </div>
            <span style={{ fontSize: 16, color: gold, flexShrink: 0 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── EVENTS VIEW ────────────────────────────────────────────
const EVENT_TYPE_LABELS: Record<string, string> = {
  live_training: '🎬 Live Training',
  prayer_call: '🙏 Prayer Call',
  q_and_a: '❓ Q&A Session',
  deliverance_workshop: '⚔ Deliverance Workshop',
}
const EVENT_TYPE_COLORS: Record<string, string> = {
  live_training: '#C9A84C', prayer_call: '#7a9e7e', q_and_a: '#8B9DCA', deliverance_workshop: '#b87333',
}
const TIER_LEVEL_MAP: Record<string, number> = { free: 0, watchman: 0, soldier: 1, commander: 2, general: 3, minister: 4 }

function generateICS(event: any): string {
  const start = new Date(event.event_date)
  const end = new Date(start.getTime() + (event.duration_minutes || 60) * 60000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//War Room Intel//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${(event.title || '').replace(/,/g, '\\,')}`,
    `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n').replace(/,/g, '\\,')}`,
    event.zoom_link ? `URL:${event.zoom_link}` : '',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean)
  return lines.join('\r\n')
}

function downloadICS(event: any) {
  const ics = generateICS(event)
  const blob = new Blob([ics], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(event.title || 'event').replace(/\s+/g, '-')}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

function EventsView({ theme, isMobile, setSidebarOpen, userTier, getToken }: {
  theme: string; isMobile: boolean; setSidebarOpen: (v: boolean) => void; userTier: string; getToken: any
}) {
  const isDark = theme !== 'light'
  const bg      = isDark ? '#0D0B14' : '#FAF8F5'
  const surf    = isDark ? 'rgba(201,168,76,0.04)' : '#FFFFFF'
  const bdr     = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(139,105,20,0.25)'
  const txt     = isDark ? '#E8D5B0' : '#2D2924'
  const muted   = isDark ? '#8B7355' : '#5C5248'

  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken()
        const res = await fetch('/api/events', token ? { headers: { Authorization: `Bearer ${token}` } } : {})
        if (res.ok) { const d = await res.json(); setEvents(d.events || []) }
      } catch { /* ignore */ } finally { setLoading(false) }
    }
    load()
  }, [])

  const now = new Date()
  const upcoming = events.filter(e => new Date(e.event_date) >= now)
  const past = events.filter(e => new Date(e.event_date) < now)
  const userLevel = TIER_LEVEL_MAP[userTier?.toLowerCase() || 'free'] ?? 0

  function EventCard({ event }: { event: any }) {
    const eventDate = new Date(event.event_date)
    const typeColor = EVENT_TYPE_COLORS[event.event_type] || G
    const typeLabel = EVENT_TYPE_LABELS[event.event_type] || event.event_type
    const requiredLevel = TIER_LEVEL_MAP[event.zoom_link_tier?.toLowerCase() || 'free'] ?? 0
    const canSeeZoom = userLevel >= requiredLevel
    return (
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ background: `${typeColor}12`, borderBottom: `1px solid ${typeColor}30`, padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', color: typeColor }}>{typeLabel}</span>
          <span style={{ fontFamily: cinzel, fontSize: 9, color: muted }}>
            {eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}
          </span>
        </div>
        <div style={{ padding: '16px 18px' }}>
          <div style={{ fontFamily: cinzel, fontSize: 15, color: G, fontWeight: 700, marginBottom: 6 }}>{event.title}</div>
          {event.description && <div style={{ fontFamily: crimson, fontSize: 14, color: txt, lineHeight: 1.65, marginBottom: 12 }}>{event.description}</div>}
          {event.duration_minutes && <div style={{ fontFamily: crimson, fontSize: 12, color: muted, marginBottom: 12 }}>⏱ {event.duration_minutes} minutes{event.max_attendees ? ` · max ${event.max_attendees} attendees` : ''}</div>}
          {/* Zoom link or gate */}
          {event.zoom_link && canSeeZoom ? (
            <a href={event.zoom_link} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', padding: '8px 18px', background: 'rgba(201,168,76,0.15)', border: `1px solid ${G}`, borderRadius: 6, color: G, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', textDecoration: 'none', marginRight: 8 }}>
              🔗 Join Zoom
            </a>
          ) : event.zoom_link_blocked ? (
            <div style={{ display: 'inline-block', padding: '8px 16px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${bdr}`, borderRadius: 6, fontFamily: cinzel, fontSize: 9, color: muted, letterSpacing: '0.06em', marginRight: 8 }}>
              🔒 Zoom link · Upgrade to {(event.zoom_link_required_tier || 'soldier').toUpperCase()} to access
            </div>
          ) : null}
          <button onClick={() => downloadICS(event)}
            style={{ display: 'inline-block', padding: '8px 16px', background: 'transparent', border: `1px solid ${bdr}`, borderRadius: 6, color: muted, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', cursor: 'pointer' }}>
            📅 Add to Calendar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' as const, background: bg, padding: isMobile ? '16px' : '24px 32px', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        {isMobile && <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: G, fontSize: 22, cursor: 'pointer', padding: '4px 8px', marginRight: 4, lineHeight: 1 }}>☰</button>}
        <div>
          <div style={{ fontFamily: cinzel, fontSize: isMobile ? 18 : 22, color: G, fontWeight: 700 }}>📅 Events</div>
          <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>War Room Intel live sessions, training calls, and special events</div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center' as const, padding: '40px', fontFamily: cinzel, fontSize: 11, color: muted, letterSpacing: '0.1em' }}>Loading events...</div>
      )}

      {!loading && upcoming.length === 0 && (
        <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: '32px 24px', textAlign: 'center' as const, marginBottom: 16 }}>
          <div style={{ fontFamily: cinzel, fontSize: 14, color: G, marginBottom: 8 }}>📅 No upcoming events scheduled</div>
          <div style={{ fontFamily: crimson, fontSize: 14, color: muted }}>Check back soon — Group Warfare Prayer · Training Sessions · Q&A Calls</div>
        </div>
      )}

      {!loading && upcoming.length > 0 && (
        <div>
          <div style={{ fontFamily: cinzel, fontSize: 10, color: muted, letterSpacing: '0.15em', marginBottom: 14, textTransform: 'uppercase' as const }}>Upcoming Events</div>
          {upcoming.map(e => <EventCard key={e.id} event={e} />)}
        </div>
      )}

      {!loading && past.length > 0 && (
        <details style={{ marginTop: 24 }}>
          <summary style={{ fontFamily: cinzel, fontSize: 10, color: muted, letterSpacing: '0.15em', cursor: 'pointer', marginBottom: 12, textTransform: 'uppercase' as const }}>Past Events ({past.length})</summary>
          {past.map(e => <EventCard key={e.id} event={e} />)}
        </details>
      )}
    </div>
  )
}

// ── FEEDBACK VIEW ──────────────────────────────────────────
function FeedbackView({ theme, userTier, isMobile, setSidebarOpen, userId, userName }: {
  theme: string; userTier: string; isMobile: boolean; setSidebarOpen: (v: boolean) => void; userId: string; userName: string
}) {
  const { getToken } = useAuth()
  const isDark = theme !== 'light'
  const bg      = isDark ? '#0D0B14' : '#FAF8F5'
  const surface = isDark ? 'rgba(201,168,76,0.04)' : '#FFFFFF'
  const border  = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(139,105,20,0.25)'
  const text    = isDark ? '#E8D5B0' : '#2D2924'
  const muted   = isDark ? '#8B7355' : '#5C5248'

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
    <div style={{ flex: 1, overflowY: 'auto', background: bg, padding: isMobile ? '16px' : '24px 32px', minHeight: 0 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          {isMobile && <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: G, fontSize: 22, cursor: 'pointer', padding: '4px 8px', marginRight: 4, lineHeight: 1 }}>☰</button>}
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

// ── BODY MAP VIEW ──────────────────────────────────────────

const BODY_REGIONS = [
  { id: 'head_mind',    label: 'Head & Mind',    icon: '🧠',
    keywords: ['head','mind','thoughts','confusion','memory','mental','migraine','dreams','nightmare','brain','cognitive','psychic','telepathy','clairvoyance','voices','hallucination'] },
  { id: 'eyes_vision',  label: 'Eyes & Vision',  icon: '👁️',
    keywords: ['eyes','vision','sight','blindness','discernment','images','seeing','third eye','divination','visions','occult sight'] },
  { id: 'throat_voice', label: 'Throat & Voice', icon: '🗣️',
    keywords: ['throat','voice','choking','coughing','gagging','speech','tongue','words','curse','speaking','mute','silence'] },
  { id: 'heart_chest',  label: 'Heart & Chest',  icon: '❤️',
    keywords: ['heart','chest','grief','fear','anxiety','rejection','sorrow','heaviness','burden','love','hate','bitterness','unforgiveness','despair','hopeless','depression'] },
  { id: 'stomach_gut',  label: 'Stomach & Gut',  icon: '🫁',
    keywords: ['stomach','gut','belly','nausea','vomiting','appetite','hunger','eating','gluttony','food','digestive','bowel','anger','nervous'] },
  { id: 'reproductive', label: 'Reproductive',   icon: '⚕️',
    keywords: ['sexual','lust','perversion','reproductive','womb','fertility','barrenness','incubus','succubus','fornication','adultery','pornography','soul tie','intimacy'] },
  { id: 'hands_arms',   label: 'Hands & Arms',   icon: '🙌',
    keywords: ['hands','arms','violence','control','work','touch','witchcraft','self-harm','cutting','hitting','compulsion'] },
  { id: 'legs_feet',    label: 'Legs & Feet',    icon: '🦶',
    keywords: ['legs','feet','walking','running','restless','path','direction','grounded','earthbound','territorial','wandering'] },
  { id: 'back_spine',   label: 'Back & Spine',   icon: '🦴',
    keywords: ['back','spine','backbone','burden','weight','oppression','leviathan','python','twisting','pressure','crushed'] },
  { id: 'skin_body',    label: 'Skin & Body',    icon: '🫀',
    keywords: ['skin','rash','burning','cold','heat','shaking','trembling','infirmity','sickness','disease','pain','affliction'] },
]

const BM_SVG: Record<string, {x:number;y:number;w:number;h:number;e?:boolean}> = {
  head_mind:    {x:41,y:1, w:18,h:16,e:true},
  eyes_vision:  {x:41,y:11,w:18,h:6},
  throat_voice: {x:44,y:17,w:12,h:6},
  heart_chest:  {x:35,y:22,w:30,h:18},
  stomach_gut:  {x:35,y:40,w:30,h:12},
  reproductive: {x:33,y:52,w:34,h:12},
  hands_arms:   {x:20,y:22,w:13,h:26},
  legs_feet:    {x:33,y:64,w:34,h:28},
  back_spine:   {x:47,y:22,w:6, h:30},
  skin_body:    {x:35,y:22,w:30,h:42},
}

type BRegion = typeof BODY_REGIONS[0]

function bmMatch(region: BRegion | null, demons: any[]) {
  if (!region || !demons?.length) return []
  return demons.map(demon => {
    let score = 0
    const matched: string[] = []
    region.keywords.forEach(kw => {
      const k = kw.toLowerCase()
      const chk = (v: any, w: number) => {
        if (!v) return
        if (String(v).toLowerCase().includes(k)) { score += w; if (!matched.includes(kw)) matched.push(kw) }
      }
      chk(demon.battlefield || demon.primaryBattlefield, 5)
      chk(demon.sessionIndicators, 4)
      chk(demon.symptoms, 3)
      chk(demon.manifestation || demon.manifestations, 2)
      chk(demon.description, 1)
      chk(demon.legalRights || demon.legalGrounds, 1)
      chk(demon.entryPoints, 1)
      chk(demon.name, 1)
    })
    const confidence: 'Strong Match' | 'Moderate Match' | 'Light Match' =
      score >= 8 ? 'Strong Match' : score >= 4 ? 'Moderate Match' : 'Light Match'
    return { ...demon, searchScore: score, matchedKeywords: matched, confidence }
  })
  .filter(d => d.searchScore > 0)
  .sort((a, b) => b.searchScore - a.searchScore)
  .slice(0, 10)
}

function BodyMapView({ isMobile, setSidebarOpen, demons, setActiveSection }: any) {
  const GC = '#C9A84C'

  const [selectedRegion, setSelectedRegion] = useState<BRegion | null>(null)
  const [hoveredRegion,  setHoveredRegion]  = useState<string | null>(null)
  const [showPrayer,     setShowPrayer]     = useState(false)
  const [regionPrayer,   setRegionPrayer]   = useState('')
  const [prayerLoading,  setPrayerLoading]  = useState(false)
  const [addedToSession, setAddedToSession] = useState<string[]>([])

  const regionResults = useMemo(() => bmMatch(selectedRegion, demons), [selectedRegion, demons])
  const crossRegionMap = useMemo(() => {
    const map = new Map<string, string[]>()
    BODY_REGIONS.forEach(r => bmMatch(r, demons).forEach((s: any) => {
      if (!map.has(s.name)) map.set(s.name, [])
      map.get(s.name)!.push(r.label)
    }))
    return map
  }, [demons])

  useEffect(() => { setShowPrayer(false); setRegionPrayer('') }, [selectedRegion])

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' as const,
      height: '100%', overflow: 'hidden' }}>
      {/* LEFT: Body panel */}
      <div style={{ width: isMobile ? '100%' : '38%', flexShrink: 0,
        borderRight: isMobile ? 'none' : '1px solid #1e1a0e',
        display: 'flex', flexDirection: 'column' as const, background: '#09070F' }}>
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid #1e1a0e',
          display: 'flex', alignItems: 'center', gap: 10 }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(true)}
              style={{ background: 'none', border: 'none', color: GC, fontSize: 22,
                cursor: 'pointer', padding: '4px 8px', lineHeight: 1, flexShrink: 0 }}>☰</button>
          )}
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 13, color: GC, letterSpacing: '0.15em', marginBottom: 4 }}>SPIRIT BODY MAP</div>
            <div style={{ fontFamily: crimson, fontSize: 13, color: '#4a3f2f', fontStyle: 'italic' }}>Select where manifestations are occurring</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' as const,
          padding: '12px 16px', borderBottom: '1px solid #1e1a0e', scrollbarWidth: 'none' as const }}>
          {BODY_REGIONS.map(region => (
            <button key={region.id} onClick={() => setSelectedRegion(region)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20,
                flexShrink: 0, cursor: 'pointer', whiteSpace: 'nowrap' as const,
                border: `1px solid ${selectedRegion?.id === region.id ? GC : '#2a2218'}`,
                background: selectedRegion?.id === region.id ? 'rgba(201,168,76,0.1)' : 'transparent',
                color: selectedRegion?.id === region.id ? GC : '#6b5e45',
                fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em' }}>
              <span>{region.icon}</span><span>{region.label}</span>
            </button>
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 20, position: 'relative' }}>
          <svg viewBox="0 0 100 100" style={{ width: '100%', maxWidth: 280, height: 'auto' }}>
            <ellipse cx="50" cy="9"  rx="9"  ry="9"  fill="#0a0807" stroke="#2a2218" strokeWidth="0.5"/>
            <rect x="46" y="17" width="8"  height="5"  fill="#0a0807" stroke="#2a2218" strokeWidth="0.5"/>
            <rect x="35" y="22" width="30" height="30" rx="3" fill="#0a0807" stroke="#2a2218" strokeWidth="0.5"/>
            <rect x="20" y="22" width="13" height="26" rx="4" fill="#0a0807" stroke="#2a2218" strokeWidth="0.5"/>
            <rect x="67" y="22" width="13" height="26" rx="4" fill="#0a0807" stroke="#2a2218" strokeWidth="0.5"/>
            <rect x="33" y="52" width="34" height="12" rx="3" fill="#0a0807" stroke="#2a2218" strokeWidth="0.5"/>
            <rect x="33" y="64" width="14" height="28" rx="4" fill="#0a0807" stroke="#2a2218" strokeWidth="0.5"/>
            <rect x="53" y="64" width="14" height="28" rx="4" fill="#0a0807" stroke="#2a2218" strokeWidth="0.5"/>
            {BODY_REGIONS.map(region => {
              const pos  = BM_SVG[region.id]
              if (!pos) return null
              const isSel = selectedRegion?.id === region.id
              const isHov = hoveredRegion === region.id
              const fill  = isSel ? 'rgba(201,168,76,0.25)' : isHov ? 'rgba(201,168,76,0.12)' : 'transparent'
              const stroke = isSel ? GC : isHov ? 'rgba(201,168,76,0.5)' : 'transparent'
              const evts  = {
                fill, stroke, strokeWidth: '0.8',
                style: { cursor: 'pointer' as const, transition: 'all 0.2s' },
                onClick: () => setSelectedRegion(region),
                onMouseEnter: () => setHoveredRegion(region.id),
                onMouseLeave: () => setHoveredRegion(null),
              }
              return pos.e
                ? <ellipse key={region.id} cx={pos.x+pos.w/2} cy={pos.y+pos.h/2} rx={pos.w/2} ry={pos.h/2} {...evts}/>
                : <rect    key={region.id} x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx="2" {...evts}/>
            })}
          </svg>
          {hoveredRegion && (
            <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
              fontFamily: cinzel, fontSize: 9, color: GC, letterSpacing: '0.1em',
              background: '#09070F', border: '1px solid #3a3020', borderRadius: 4,
              padding: '4px 10px', pointerEvents: 'none' as const }}>
              {BODY_REGIONS.find(r => r.id === hoveredRegion)?.icon}{' '}
              {BODY_REGIONS.find(r => r.id === hoveredRegion)?.label}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Results panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const,
        overflowY: 'auto', background: '#0a0807' }}>
        {!selectedRegion ? (
          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
            justifyContent: 'center', flex: 1, padding: 40, textAlign: 'center' as const }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🗺️</div>
            <div style={{ fontFamily: cinzel, fontSize: 16, color: GC, letterSpacing: '0.1em', marginBottom: 12 }}>SELECT A BODY REGION</div>
            <div style={{ fontFamily: crimson, fontSize: 15, color: '#6b5e45', lineHeight: 1.7, maxWidth: 360, marginBottom: 24 }}>
              Choose where the issue manifests physically, emotionally, or spiritually. The map searches 285+ spirits by keyword weight, ranking by battlefield, symptoms, and manifestations.
            </div>
            {['1. Click a body region or select from the tabs above',
              '2. Engine scans all spirits by keyword weight',
              '3. Results ranked: battlefield +5, symptoms +3, manifestations +2',
              '4. Click VIEW DOSSIER to open the full spirit profile',
              '5. ADD TO SESSION stores the spirit in your case files'].map((step, i) => (
              <div key={i} style={{ fontFamily: crimson, fontSize: 14, color: '#4a3f2f',
                marginBottom: 6, textAlign: 'left' as const, width: '100%', maxWidth: 360 }}>
                {step}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '20px 24px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #1e1a0e' }}>
              <div>
                <div style={{ fontFamily: cinzel, fontSize: 18, color: GC, letterSpacing: '0.08em', marginBottom: 4 }}>
                  {selectedRegion.icon} {selectedRegion.label}
                </div>
                <div style={{ fontFamily: cinzel, fontSize: 9, color: '#4a3f2f', letterSpacing: '0.08em' }}>
                  KEYWORDS: {selectedRegion.keywords.slice(0,6).join(', ')}{selectedRegion.keywords.length > 6 ? ` +${selectedRegion.keywords.length - 6} more` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: cinzel, fontSize: 9,
                  color: regionResults.length > 0 ? GC : '#4a3f2f', letterSpacing: '0.08em',
                  background: 'rgba(201,168,76,0.06)', border: '1px solid #3a3020',
                  padding: '4px 10px', borderRadius: 10 }}>
                  {regionResults.length} MATCHES
                </span>
                <button onClick={() => setSelectedRegion(null)}
                  style={{ background: 'none', border: 'none', color: '#4a3f2f', cursor: 'pointer', fontSize: 18 }}>×</button>
              </div>
            </div>

            <button disabled={prayerLoading}
              onClick={async () => {
                setPrayerLoading(true); setShowPrayer(true); setRegionPrayer('')
                const names = regionResults.slice(0,5).map((r: any) => r.name).join(', ')
                try {
                  const res = await fetch('/api/ai-assistant', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      message: `Generate a comprehensive deliverance prayer for manifestations in the ${selectedRegion.label} region.\n\nSpirits most commonly associated: ${names}\n\nWrite a prayer that:\n1. Covers all spiritual entry points for this region\n2. Addresses each spirit by name with authority\n3. Commands them to leave and breaks their legal grounds\n4. Invites healing and Holy Spirit to fill this area\n5. Includes relevant scripture declarations\n\nWrite in first person, authoritative, 4-5 paragraphs.`,
                      history: []
                    })
                  })
                  const d = await res.json()
                  setRegionPrayer(d.response || '')
                } catch { setRegionPrayer('Unable to generate prayer at this time.') }
                setPrayerLoading(false)
              }}
              style={{ width: '100%', padding: '10px', background: 'rgba(201,168,76,0.06)',
                border: '1px solid #3a3020', borderRadius: 6, color: GC, fontFamily: cinzel,
                fontSize: 10, letterSpacing: '0.1em', cursor: prayerLoading ? 'default' : 'pointer',
                marginBottom: 20, opacity: prayerLoading ? 0.6 : 1 }}>
              🙏 GENERATE {selectedRegion.label.toUpperCase()} DELIVERANCE PRAYER
            </button>

            {showPrayer && (
              <div style={{ marginBottom: 20, padding: '16px 20px', background: '#09070F',
                border: '1px solid #2a2218', borderTop: `2px solid ${GC}`, borderRadius: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 9, color: GC, letterSpacing: '0.12em' }}>REGION PRAYER</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {regionPrayer && (
                      <button onClick={() => navigator.clipboard.writeText(regionPrayer)}
                        style={{ padding: '3px 8px', background: 'transparent', border: '1px solid #2a2218',
                          borderRadius: 3, color: '#6b5e45', fontFamily: cinzel, fontSize: 8, cursor: 'pointer' }}>
                        COPY
                      </button>
                    )}
                    <button onClick={() => setShowPrayer(false)}
                      style={{ background: 'none', border: 'none', color: '#4a3f2f', cursor: 'pointer', fontSize: 14 }}>×</button>
                  </div>
                </div>
                {prayerLoading ? (
                  <div style={{ fontFamily: cinzel, fontSize: 9, color: '#6b5e45', letterSpacing: '0.1em' }}>GENERATING PRAYER...</div>
                ) : (
                  <div style={{ fontFamily: crimson, fontSize: 15, color: '#c8b99a', lineHeight: 1.9 }}
                    dangerouslySetInnerHTML={{ __html: regionPrayer
                      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#C9A84C">$1</strong>')
                      .replace(/\n/g, '<br/>') }} />
                )}
              </div>
            )}

            {regionResults.length === 0 && (
              <div style={{ textAlign: 'center' as const, padding: '40px 20px',
                color: '#4a3f2f', fontFamily: crimson, fontSize: 15, fontStyle: 'italic' }}>
                No spirits matched {selectedRegion.label} keywords.
                Try an adjacent region or check the Intel Archive.
              </div>
            )}

            {regionResults.map((spirit: any) => {
              const crossRegions = (crossRegionMap.get(spirit.name) || []).filter((r: string) => r !== selectedRegion.label)
              const cc = spirit.confidence === 'Strong Match' ? '#4a7a4a'
                : spirit.confidence === 'Moderate Match' ? '#8B6914' : '#4a3f2f'
              return (
                <div key={spirit.id || spirit.name} style={{
                  padding: '16px 20px', marginBottom: 10, background: '#09070F',
                  border: `1px solid ${spirit.confidence === 'Strong Match' ? '#2a3a2a' : '#1e1a0e'}`,
                  borderLeft: `3px solid ${cc}`, borderRadius: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 13, color: GC, letterSpacing: '0.06em' }}>{spirit.name}</div>
                    <span style={{ fontFamily: cinzel, fontSize: 8, color: cc, letterSpacing: '0.08em',
                      padding: '2px 8px', border: `1px solid ${cc}`, borderRadius: 10, flexShrink: 0, marginLeft: 8 }}>
                      {spirit.confidence.toUpperCase()}
                    </span>
                  </div>
                  {spirit.description && (
                    <div style={{ fontFamily: crimson, fontSize: 14, color: '#6b5e45', lineHeight: 1.6, marginBottom: 8 }}>
                      {(spirit.description || '').slice(0, 140)}{(spirit.description || '').length > 140 ? '...' : ''}
                    </div>
                  )}
                  {spirit.matchedKeywords?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginBottom: 8, alignItems: 'center' }}>
                      <span style={{ fontFamily: cinzel, fontSize: 8, color: '#4a3f2f', letterSpacing: '0.06em' }}>MATCHED:</span>
                      {spirit.matchedKeywords.map((kw: string) => (
                        <span key={kw} style={{ fontFamily: cinzel, fontSize: 8, color: '#6b5e45',
                          background: '#0f0c07', border: '1px solid #2a2218', borderRadius: 3, padding: '1px 6px' }}>{kw}</span>
                      ))}
                    </div>
                  )}
                  {crossRegions.length > 0 && (
                    <div style={{ fontFamily: cinzel, fontSize: 8, color: '#3a3020', letterSpacing: '0.06em', marginBottom: 8 }}>
                      ALSO IN: {crossRegions.slice(0,3).join(' · ')}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid #1e1a0e' }}>
                    <button
                      onClick={() => {
                        try { localStorage.setItem('wri_prefill_spirit', spirit.name) } catch {}
                        setActiveSection('spirit-network')
                      }}
                      style={{ padding: '5px 12px', background: 'transparent', border: '1px solid #2a2218',
                        borderRadius: 3, color: '#6b5e45', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', cursor: 'pointer' }}>
                      VIEW DOSSIER
                    </button>
                    <button
                      onClick={() => {
                        try {
                          const ex = JSON.parse(localStorage.getItem('wri_session_spirits') || '[]')
                          if (!ex.includes(spirit.name)) localStorage.setItem('wri_session_spirits', JSON.stringify([...ex, spirit.name]))
                          setAddedToSession((prev: string[]) => [...prev, spirit.name])
                        } catch {}
                      }}
                      style={{ padding: '5px 12px', borderRadius: 3, fontFamily: cinzel, fontSize: 8,
                        letterSpacing: '0.08em', cursor: 'pointer',
                        background: addedToSession.includes(spirit.name) ? 'rgba(74,122,74,0.1)' : 'transparent',
                        border: `1px solid ${addedToSession.includes(spirit.name) ? '#4a7a4a' : '#2a2218'}`,
                        color: addedToSession.includes(spirit.name) ? '#4a7a4a' : '#6b5e45' }}>
                      {addedToSession.includes(spirit.name) ? '✓ ADDED TO SESSION' : '+ ADD TO SESSION'}
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(`Father God, in the Name of Jesus Christ, I take authority over the spirit of ${spirit.name}. I break every legal ground, entry point, and generational tie. I command ${spirit.name} to loose and leave now in Jesus' Name. Holy Spirit, come and fill every place this spirit occupied. Amen.`)}
                      style={{ padding: '5px 12px', background: 'transparent', border: '1px solid #2a2218',
                        borderRadius: 3, color: '#6b5e45', fontFamily: cinzel, fontSize: 8,
                        letterSpacing: '0.08em', cursor: 'pointer', marginLeft: 'auto' }}>
                      🙏 COPY PRAYER
                    </button>
                  </div>
                </div>
              )
            })}

            <div style={{ marginTop: 24, padding: '12px 16px', background: 'rgba(139,50,50,0.04)',
              border: '1px solid #2a1a1a', borderRadius: 6 }}>
              <div style={{ fontFamily: cinzel, fontSize: 8, color: '#4a2a2a', letterSpacing: '0.1em', marginBottom: 4 }}>MINISTRY DISCLAIMER</div>
              <div style={{ fontFamily: crimson, fontSize: 12, color: '#4a3030', lineHeight: 1.6, fontStyle: 'italic' }}>
                This map is designed for pastoral ministry assessment, spiritual discernment, and prayer preparation only.
                Physical pain, chronic symptoms, or mental health struggles should always be evaluated by a qualified
                medical professional or licensed counselor. Spiritual and medical care are not mutually exclusive.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── STREAM TIME AGO (uses last_active from Stream API) ─────
function streamTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

// ── TIME AGO HELPER ────────────────────────────────────────
function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

// ── FORUM VIEW ─────────────────────────────────────────────────────────────────

const F_SURF  = 'rgba(255,255,255,0.03)'
const F_SURF2 = 'rgba(255,255,255,0.06)'
const F_BDR   = 'rgba(201,168,76,0.15)'
const F_TXT   = '#f0e8d8'
const F_DIM   = '#8B7355'
const F_MUT   = '#6b5e45'

const FORUM_TIER_LEVELS: Record<string, number> = {
  free: 0, watchman: 0, soldier: 1, commander: 2, general: 3, minister: 99,
}

const FORUM_POST_TYPES: Record<string, { label: string; color: string; bg: string; placeholder: string }> = {
  discussion:   { label: 'Discussion',   color: '#C9A84C', bg: 'rgba(201,168,76,0.12)',   placeholder: 'Share your thoughts with the community…'    },
  question:     { label: 'Question',     color: '#4A9EE8', bg: 'rgba(74,158,232,0.12)',   placeholder: "What's your question for the community?"    },
  revelation:   { label: 'Revelation',   color: '#9B7FD4', bg: 'rgba(155,127,212,0.12)', placeholder: 'What has God shown you?'                     },
  field_report: { label: 'Field Report', color: '#D4524A', bg: 'rgba(212,82,74,0.12)',   placeholder: 'What happened in the field?'                 },
  prayer:       { label: 'Prayer',       color: '#4CAF7D', bg: 'rgba(76,175,125,0.12)',  placeholder: 'How can we pray with you?'                   },
  resource:     { label: 'Resource',     color: '#4AB8C9', bg: 'rgba(74,184,201,0.12)',  placeholder: 'Tell us about this resource…'                },
}

const FORUM_TIER_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  minister:  { label: 'Minister',  color: '#C9A84C', bg: 'rgba(201,168,76,0.15)'  },
  general:   { label: 'General',   color: '#e2c96e', bg: 'rgba(226,201,110,0.12)' },
  commander: { label: 'Commander', color: '#a0c4e8', bg: 'rgba(160,196,232,0.12)' },
  soldier:   { label: 'Soldier',   color: '#9de0ad', bg: 'rgba(157,224,173,0.12)' },
  free:      { label: 'Watchman',  color: '#8B7355', bg: 'rgba(139,115,85,0.1)'   },
}

function ForumTierPill({ tier }: { tier: string }) {
  const s = FORUM_TIER_STYLES[tier] || FORUM_TIER_STYLES.free
  return (
    <span style={{ background: s.bg, color: s.color, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', padding: '1px 7px', borderRadius: 10, border: `1px solid ${s.color}44`, flexShrink: 0 }}>
      {s.label}
    </span>
  )
}

function ForumTagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('')
  function add(val: string) {
    const tag = val.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 40)
    if (tag && !tags.includes(tag) && tags.length < 10) onChange([...tags, tag])
    setInput('')
  }
  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input) }
    if (e.key === 'Backspace' && !input && tags.length) onChange(tags.slice(0, -1))
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, padding: '6px 10px', background: F_SURF2, border: `1px solid ${F_BDR}`, borderRadius: 6, cursor: 'text', minHeight: 38, alignItems: 'center' }}
      onClick={e => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}>
      {tags.map(t => (
        <span key={t} style={{ background: 'rgba(74,158,232,0.12)', color: '#4A9EE8', fontFamily: cinzel, fontSize: 9, padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(74,158,232,0.3)', display: 'flex', alignItems: 'center', gap: 4 }}>
          {t}
          <button type="button" onClick={() => onChange(tags.filter(x => x !== t))} style={{ background: 'transparent', border: 'none', color: '#4A9EE8', cursor: 'pointer', padding: 0, fontSize: 10, lineHeight: 1 }}>×</button>
        </span>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey} onBlur={() => input.trim() && add(input)}
        placeholder={tags.length === 0 ? 'Add tags (Enter to add)…' : ''}
        style={{ border: 'none', background: 'transparent', outline: 'none', color: F_TXT, fontFamily: crimson, fontSize: 13, flex: 1, minWidth: 120 }} />
    </div>
  )
}

function ForumResourceCard({ url, title, thumbnail, description, domain }: any) {
  if (!url) return null
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      style={{ display: 'flex', gap: 12, background: F_SURF2, border: `1px solid ${F_BDR}`, borderRadius: 8, padding: '10px 12px', textDecoration: 'none', alignItems: 'flex-start', marginTop: 8 }}>
      {thumbnail && <img src={thumbnail} alt="" style={{ width: 80, height: 56, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontFamily: cinzel, fontSize: 11, color: F_TXT, letterSpacing: '0.04em', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{title}</div>}
        {description && <div style={{ fontFamily: crimson, fontSize: 12, color: F_DIM, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{description}</div>}
        {domain && <div style={{ fontFamily: cinzel, fontSize: 8, color: F_MUT, marginTop: 4, letterSpacing: '0.08em' }}>{domain}</div>}
      </div>
    </a>
  )
}

function ForumPostComposer({ onPost, onCancel, canPost }: { onPost: (p: any) => void; onCancel: () => void; canPost: boolean }) {
  const { getToken } = useAuth()
  const [postType,    setPostType]    = useState('discussion')
  const [title,       setTitle]       = useState('')
  const [body,        setBody]        = useState('')
  const [tags,        setTags]        = useState<string[]>([])
  const [resourceUrl, setResourceUrl] = useState('')
  const [ogData,      setOgData]      = useState<any>(null)
  const [ogLoading,   setOgLoading]   = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')
  const tc = FORUM_POST_TYPES[postType]
  const inputSt: React.CSSProperties = { width: '100%', background: F_SURF2, border: `1px solid ${F_BDR}`, borderRadius: 6, padding: '9px 12px', color: F_TXT, fontFamily: crimson, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }

  async function fetchOg(url: string) {
    if (!url.trim()) return
    setOgLoading(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/forum-og', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
      if (res.ok) { const d = await res.json(); setOgData(d) }
    } catch {}
    setOgLoading(false)
  }

  async function submit() {
    if (!title.trim()) { setError('Title is required'); return }
    if (postType !== 'resource' && !body.trim()) { setError('Body is required'); return }
    if (postType === 'resource' && !resourceUrl.trim()) { setError('URL is required for Resource Share'); return }
    setSubmitting(true); setError('')
    try {
      const token = await getToken()
      const payload: any = { title: title.trim(), post_type: postType, tags }
      if (body.trim())         payload.body                 = body.trim()
      if (resourceUrl.trim())  payload.resource_url         = resourceUrl.trim()
      if (ogData?.title)       payload.resource_title       = ogData.title
      if (ogData?.thumbnail)   payload.resource_thumbnail   = ogData.thumbnail
      if (ogData?.description) payload.resource_description = ogData.description
      const res = await fetch('/api/forum-posts', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.ok) {
        const d = await res.json()
        onPost(d.post)
        setTitle(''); setBody(''); setTags([]); setResourceUrl(''); setOgData(null); setPostType('discussion')
      } else { const d = await res.json(); setError(d.error || 'Failed to post') }
    } catch { setError('Network error') }
    setSubmitting(false)
  }

  return (
    <div style={{ background: F_SURF, border: `1px solid ${F_BDR}`, borderRadius: 12, padding: '20px 22px', marginBottom: 16 }}>
      <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.1em', marginBottom: 16 }}>⚔ New Post</div>
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 14 }}>
        {Object.entries(FORUM_POST_TYPES).map(([k, v]) => (
          <button key={k} type="button" onClick={() => setPostType(k)}
            style={{ background: postType === k ? v.bg : 'transparent', border: `1px solid ${postType === k ? v.color : F_BDR}`, borderRadius: 20, padding: '4px 14px', cursor: 'pointer', fontFamily: cinzel, fontSize: 9, color: postType === k ? v.color : F_DIM, letterSpacing: '0.08em' }}>
            {v.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
        <input placeholder="Title (required)" value={title} onChange={e => setTitle(e.target.value)} maxLength={200} style={inputSt} />
        {postType !== 'resource' && (
          <textarea placeholder={tc.placeholder} value={body} onChange={e => setBody(e.target.value)} rows={5} maxLength={20000} style={{ ...inputSt, resize: 'vertical' as const }} />
        )}
        {postType === 'resource' && (
          <>
            <textarea placeholder={tc.placeholder} value={body} onChange={e => setBody(e.target.value)} rows={3} maxLength={2000} style={{ ...inputSt, resize: 'vertical' as const }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Resource URL" value={resourceUrl} onChange={e => setResourceUrl(e.target.value)}
                onBlur={() => resourceUrl.trim() && fetchOg(resourceUrl)}
                onPaste={e => { setTimeout(() => { const v = (e.target as HTMLInputElement).value; if (v.startsWith('http')) fetchOg(v) }, 100) }}
                style={{ ...inputSt, flex: 1 }} />
              {ogLoading && <span style={{ color: F_DIM, fontFamily: cinzel, fontSize: 10, alignSelf: 'center' }}>Fetching…</span>}
            </div>
            {ogData && <ForumResourceCard {...ogData} url={resourceUrl} />}
          </>
        )}
        <ForumTagInput tags={tags} onChange={setTags} />
        {error && <div style={{ color: '#f87171', fontFamily: crimson, fontSize: 12 }}>{error}</div>}
        {!canPost && <div style={{ color: F_DIM, fontFamily: crimson, fontSize: 12, fontStyle: 'italic' }}>Soldier+ tier required to post. You can still comment on existing posts.</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} style={{ background: 'transparent', border: `1px solid ${F_BDR}`, borderRadius: 6, color: F_DIM, fontFamily: cinzel, fontSize: 9, padding: '8px 18px', cursor: 'pointer', letterSpacing: '0.08em' }}>Cancel</button>
          <button type="button" onClick={submit} disabled={submitting || !canPost}
            style={{ background: canPost ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${canPost ? 'rgba(201,168,76,0.4)' : F_BDR}`, borderRadius: 6, color: canPost ? G : F_MUT, fontFamily: cinzel, fontSize: 9, padding: '8px 20px', cursor: canPost ? 'pointer' : 'not-allowed', letterSpacing: '0.08em', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ForumPostEditForm({ post, onSave, onCancel }: any) {
  const { getToken } = useAuth()
  const [title,  setTitle]  = useState(post.title || '')
  const [body,   setBody]   = useState(post.body || '')
  const [tags,   setTags]   = useState<string[]>(post.tags || [])
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const inputSt: React.CSSProperties = { width: '100%', background: F_SURF2, border: `1px solid ${F_BDR}`, borderRadius: 6, padding: '8px 12px', color: F_TXT, fontFamily: crimson, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }

  async function save() {
    if (!title.trim()) { setError('Title required'); return }
    setSaving(true)
    const token = await getToken()
    const res = await fetch('/api/forum-posts', { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: post.id, title: title.trim(), body: body.trim(), tags }) })
    if (res.ok) { const d = await res.json(); onSave(d.post) }
    else { const d = await res.json(); setError(d.error || 'Failed to save') }
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
      <input value={title} onChange={e => setTitle(e.target.value)} style={inputSt} placeholder="Title" />
      <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} style={{ ...inputSt, resize: 'vertical' as const }} />
      <ForumTagInput tags={tags} onChange={setTags} />
      {error && <div style={{ color: '#f87171', fontFamily: crimson, fontSize: 12 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} disabled={saving} style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 5, color: G, fontFamily: cinzel, fontSize: 9, padding: '6px 16px', cursor: 'pointer' }}>{saving ? '…' : 'Save'}</button>
        <button onClick={onCancel} style={{ background: 'transparent', border: `1px solid ${F_BDR}`, borderRadius: 5, color: F_DIM, fontFamily: cinzel, fontSize: 9, padding: '6px 12px', cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}

function ForumCommentsSection({ postId, commentCount: _commentCount, userId, isMinister, getToken }: any) {
  const [comments,   setComments]   = useState<any[]>([])
  const [loaded,     setLoaded]     = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [draft,      setDraft]      = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (loaded) return
    setLoading(true)
    const load = async () => {
      try {
        const token = await getToken()
        const res = await fetch(`/api/forum-comments?postId=${postId}`, { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) { const d = await res.json(); setComments(d.comments || []) }
      } catch {}
      setLoading(false); setLoaded(true)
    }
    load()
  }, [])

  async function submit() {
    if (!draft.trim()) return
    setSubmitting(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/forum-comments', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ postId, body: draft.trim() }) })
      if (res.ok) { const d = await res.json(); setComments(c => [...c, d.comment]); setDraft('') }
    } catch {}
    setSubmitting(false)
  }

  async function del(id: string) {
    const token = await getToken()
    await fetch(`/api/forum-comments?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setComments(c => c.filter(x => x.id !== id))
  }

  return (
    <div style={{ borderTop: `1px solid ${F_BDR}`, padding: '14px 16px 16px' }}>
      <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.1em', marginBottom: 12 }}>
        {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
      </div>
      {loading && <div style={{ color: F_DIM, fontFamily: cinzel, fontSize: 9, padding: '8px 0' }}>Loading…</div>}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 14 }}>
        {comments.map(c => (
          <div key={c.id} style={{ background: F_SURF2, borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' as const }}>
              <span style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.05em' }}>{c.author_name}</span>
              <ForumTierPill tier={c.author_tier} />
              <span style={{ fontFamily: cinzel, fontSize: 8, color: F_MUT }}>{timeAgo(c.created_at)}</span>
              {(c.user_id === userId || isMinister) && (
                <button onClick={() => del(c.id)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: F_MUT, cursor: 'pointer', fontSize: 11, padding: '0 2px', opacity: 0.6 }} title="Delete">✕</button>
              )}
            </div>
            <div style={{ fontFamily: crimson, fontSize: 13, color: F_TXT, lineHeight: 1.6, whiteSpace: 'pre-wrap' as const }}>{c.body}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea placeholder="Write a comment… (Cmd+Enter to submit)" value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
          rows={2} style={{ flex: 1, background: F_SURF2, border: `1px solid ${F_BDR}`, borderRadius: 6, padding: '8px 10px', color: F_TXT, fontFamily: crimson, fontSize: 13, outline: 'none', resize: 'none' as const }} />
        <button onClick={submit} disabled={submitting || !draft.trim()}
          style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: 6, color: G, fontFamily: cinzel, fontSize: 9, padding: '9px 14px', cursor: 'pointer', opacity: (!draft.trim() || submitting) ? 0.4 : 1, whiteSpace: 'nowrap' as const, letterSpacing: '0.08em' }}>
          {submitting ? '…' : 'Reply'}
        </button>
      </div>
    </div>
  )
}

function ForumPostCard({ post, userId, isMinister, getToken, onUpdate, onDelete }: any) {
  const [expanded, setExpanded] = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [voting,   setVoting]   = useState(false)
  const tc = FORUM_POST_TYPES[post.post_type] || FORUM_POST_TYPES.discussion

  async function vote(e: React.MouseEvent) {
    e.stopPropagation()
    if (voting) return
    setVoting(true)
    const token = await getToken()
    const res = await fetch('/api/forum-vote', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: post.id }) })
    if (res.ok) { const d = await res.json(); onUpdate({ ...post, upvotes: d.upvotes, voted: d.voted }) }
    setVoting(false)
  }

  async function togglePin(e: React.MouseEvent) {
    e.stopPropagation()
    const token = await getToken()
    const res = await fetch('/api/forum-posts', { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: post.id, pinned: !post.pinned }) })
    if (res.ok) { const d = await res.json(); onUpdate(d.post) }
  }

  async function del(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Delete this post?')) return
    const token = await getToken()
    await fetch(`/api/forum-posts?id=${post.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    onDelete(post.id)
  }

  const isOwn = post.user_id === userId

  const postTypeToClass: Record<string, import('@/components/primitives').ClassLevel> = {
    discussion: 'III', question: 'III', revelation: 'II',
    field_report: 'I', prayer: 'IV', resource: 'II',
  }

  return (
    <div style={{ position: 'relative', background: 'var(--bg-2)', border: `1px solid ${post.pinned ? 'var(--gold-line-hi)' : 'var(--gold-line)'}`, borderLeft: post.pinned ? `3px solid var(--gold)` : '3px solid transparent', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: '16px 10px', gap: 2, borderRight: `1px solid var(--gold-line)`, flexShrink: 0, width: 52 }}>
          <button onClick={vote} title={post.voted ? 'Remove vote' : 'Upvote'}
            style={{ background: post.voted ? 'rgba(201,168,76,0.15)' : 'transparent', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2, transition: 'background 0.15s' }}>
            <span style={{ fontSize: 14, color: post.voted ? G : F_MUT }}>▲</span>
            <span style={{ fontFamily: cinzel, fontSize: 11, color: post.voted ? G : F_DIM, letterSpacing: '0.04em' }}>{post.upvotes || 0}</span>
          </button>
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' as const }}>
            <ClassBadge level={postTypeToClass[post.post_type] || 'III'} label={tc.label} />
            {post.pinned && <HUDChip>📌 Pinned</HUDChip>}
            {(post.tags || []).map((tag: string) => (
              <span key={tag} style={{ background: 'rgba(74,158,232,0.08)', color: '#4A9EE8', fontFamily: cinzel, fontSize: 7, padding: '1px 7px', borderRadius: 10, border: '1px solid rgba(74,158,232,0.25)' }}>{tag}</span>
            ))}
          </div>
          {editing ? (
            <ForumPostEditForm post={post} onSave={(updated: any) => { onUpdate(updated); setEditing(false) }} onCancel={() => setEditing(false)} />
          ) : (
            <>
              <div onClick={() => setExpanded(e => !e)} style={{ fontFamily: cinzel, fontSize: 14, color: F_TXT, letterSpacing: '0.04em', marginBottom: 6, lineHeight: 1.4, cursor: 'pointer' }}>{post.title}</div>
              {post.body && (
                <div onClick={() => setExpanded(e => !e)} style={{ fontFamily: crimson, fontSize: 13, color: F_DIM, lineHeight: 1.6, cursor: 'pointer',
                  ...(expanded ? {} : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }) }}>
                  {post.body}
                </div>
              )}
              {post.resource_url && (
                <ForumResourceCard url={post.resource_url} title={post.resource_title} thumbnail={post.resource_thumbnail} description={post.resource_description}
                  domain={(() => { try { return new URL(post.resource_url).hostname.replace('www.','') } catch { return '' } })()} />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' as const }}>
                <span style={{ fontFamily: cinzel, fontSize: 9, color: F_DIM, letterSpacing: '0.04em' }}>{post.author_name}</span>
                <ForumTierPill tier={post.author_tier} />
                <MonoTime color="var(--t-4)" size={9}>{timeAgo(post.created_at)}</MonoTime>
                <button onClick={() => setExpanded(e => !e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 4, color: F_DIM }}>
                  <span style={{ fontSize: 11 }}>💬</span>
                  <span style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.04em' }}>{post.comment_count || 0}</span>
                </button>
                <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                  {isOwn && !isMinister && (
                    <button onClick={() => setEditing(true)} style={{ background: 'transparent', border: `1px solid ${F_BDR}`, borderRadius: 4, color: F_DIM, fontFamily: cinzel, fontSize: 8, padding: '2px 8px', cursor: 'pointer' }}>✎ Edit</button>
                  )}
                  {isMinister && (
                    <>
                      <button onClick={() => setEditing(true)} style={{ background: 'transparent', border: `1px solid ${F_BDR}`, borderRadius: 4, color: F_DIM, fontFamily: cinzel, fontSize: 8, padding: '2px 8px', cursor: 'pointer' }}>✎</button>
                      <button onClick={togglePin} style={{ background: post.pinned ? 'rgba(201,168,76,0.1)' : 'transparent', border: `1px solid ${F_BDR}`, borderRadius: 4, color: post.pinned ? G : F_DIM, fontFamily: cinzel, fontSize: 8, padding: '2px 8px', cursor: 'pointer' }}>📌</button>
                    </>
                  )}
                  {(isOwn || isMinister) && (
                    <button onClick={del} style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 4, color: '#f87171', fontFamily: cinzel, fontSize: 8, padding: '2px 8px', cursor: 'pointer' }}>🗑</button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {expanded && !editing && (
        <ForumCommentsSection postId={post.id} commentCount={post.comment_count} userId={userId} isMinister={isMinister} getToken={getToken} />
      )}
    </div>
  )
}

function ForumView({ isMobile, userId, userTier }: { isDark: boolean; isMobile: boolean; userId: string; userTier: string }) {
  const { getToken } = useAuth()
  const { user }     = useUser()
  const userRole     = (user?.publicMetadata?.role as string) || ''
  const isMinister   = userRole === 'minister'
  const canPost      = FORUM_TIER_LEVELS[userTier] >= 1 || isMinister

  const [posts,       setPosts]       = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [sort,        setSort]        = useState('hot')
  const [typeFilter,  setTypeFilter]  = useState('all')
  const [tagFilter,   setTagFilter]   = useState('')
  const [search,      setSearch]      = useState('')
  const [composing,   setComposing]   = useState(false)
  const [page,        setPage]        = useState(0)
  const [hasMore,     setHasMore]     = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  async function load(p = 0, appendMode = false) {
    if (p === 0) setLoading(true); else setLoadingMore(true)
    try {
      const token = await getToken()
      const params = new URLSearchParams({ sort, page: String(p), limit: '20' })
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (tagFilter)            params.set('tag', tagFilter)
      const res = await fetch(`/api/forum-posts?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const d = await res.json()
        setPosts(prev => appendMode ? [...prev, ...(d.posts || [])] : (d.posts || []))
        setHasMore(d.hasMore)
      }
    } catch {}
    if (p === 0) setLoading(false); else setLoadingMore(false)
  }

  useEffect(() => { setPage(0); load(0) }, [sort, typeFilter, tagFilter])

  function loadMore() { const next = page + 1; setPage(next); load(next, true) }
  function onPost(newPost: any) { setPosts(prev => [newPost, ...prev]); setComposing(false) }
  function onUpdate(updated: any) { setPosts(prev => prev.map(p => p.id === updated.id ? updated : p)) }
  function onDelete(id: string) { setPosts(prev => prev.filter(p => p.id !== id)) }

  const displayed = search.trim()
    ? posts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || (p.tags || []).some((t: string) => t.toLowerCase().includes(search.toLowerCase())))
    : posts

  const tagCounts: Record<string, number> = {}
  posts.forEach(p => (p.tags || []).forEach((t: string) => { tagCounts[t] = (tagCounts[t] || 0) + 1 }))
  const trendingTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const pinnedPosts  = posts.filter(p => p.pinned)

  const sortBtnSt = (s: string): React.CSSProperties => ({
    background: sort === s ? 'rgba(201,168,76,0.12)' : 'transparent',
    border: `1px solid ${sort === s ? 'rgba(201,168,76,0.4)' : 'transparent'}`,
    borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontFamily: cinzel, fontSize: 10,
    color: sort === s ? G : F_DIM, letterSpacing: '0.08em',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, height: '100%', overflow: 'hidden', background: '#0D0B14' }}>
      {/* Sticky header */}
      <div style={{ borderBottom: `1px solid ${F_BDR}`, padding: '16px 24px 0', background: '#0D0B14', flexShrink: 0 }}>
        <div style={{ fontFamily: cinzel, fontSize: 18, color: G, letterSpacing: '0.1em', marginBottom: 6 }}>⚔ The Ops Board</div>
        <div style={{ fontFamily: crimson, fontSize: 13, color: F_DIM, fontStyle: 'italic', marginBottom: 14 }}>Open discussion for the War Room Intel community</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, paddingBottom: 12 }}>
          <button onClick={() => setSort('hot')} style={sortBtnSt('hot')}>🔥 Hot</button>
          <button onClick={() => setSort('new')} style={sortBtnSt('new')}>✨ New</button>
          <button onClick={() => setSort('top')} style={sortBtnSt('top')}>⬆ Top</button>
          <div style={{ flex: 1, maxWidth: 280 }}>
            <input placeholder="Search posts…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', background: F_SURF2, border: `1px solid ${F_BDR}`, borderRadius: 6, padding: '6px 12px', color: F_TXT, fontFamily: crimson, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
          </div>
          {!isMobile && (
            <button onClick={() => setComposing(c => !c)}
              style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 6, color: G, fontFamily: cinzel, fontSize: 10, padding: '7px 20px', cursor: 'pointer', letterSpacing: '0.08em', marginLeft: 'auto' }}>
              ＋ New Post
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, paddingBottom: 12 }}>
          <button onClick={() => setTypeFilter('all')}
            style={{ background: typeFilter === 'all' ? 'rgba(201,168,76,0.12)' : 'transparent', border: `1px solid ${typeFilter === 'all' ? 'rgba(201,168,76,0.4)' : F_BDR}`, borderRadius: 20, padding: '3px 12px', cursor: 'pointer', fontFamily: cinzel, fontSize: 8, color: typeFilter === 'all' ? G : F_DIM, letterSpacing: '0.08em' }}>
            All
          </button>
          {Object.entries(FORUM_POST_TYPES).map(([k, v]) => (
            <button key={k} onClick={() => setTypeFilter(typeFilter === k ? 'all' : k)}
              style={{ background: typeFilter === k ? v.bg : 'transparent', border: `1px solid ${typeFilter === k ? v.color : F_BDR}`, borderRadius: 20, padding: '3px 12px', cursor: 'pointer', fontFamily: cinzel, fontSize: 8, color: typeFilter === k ? v.color : F_DIM, letterSpacing: '0.08em' }}>
              {v.label}
            </button>
          ))}
          {tagFilter && (
            <button onClick={() => setTagFilter('')}
              style={{ background: 'rgba(74,158,232,0.1)', border: '1px solid rgba(74,158,232,0.35)', borderRadius: 20, padding: '3px 12px', cursor: 'pointer', fontFamily: cinzel, fontSize: 8, color: '#4A9EE8', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
              #{tagFilter} ×
            </button>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto' as const }}>
        <div style={{ display: 'flex', gap: 24, padding: '20px 24px', maxWidth: 1200, margin: '0 auto' }}>
          {/* Main feed */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {isMobile && (
              <button onClick={() => setComposing(c => !c)}
                style={{ width: '100%', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8, color: G, fontFamily: cinzel, fontSize: 11, padding: '12px', cursor: 'pointer', letterSpacing: '0.08em', marginBottom: 14 }}>
                ＋ New Post
              </button>
            )}
            {composing && <ForumPostComposer onPost={onPost} onCancel={() => setComposing(false)} canPost={canPost} />}
            {loading ? (
              <div style={{ padding: '60px 0', textAlign: 'center' as const, color: F_DIM, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em' }}>Loading…</div>
            ) : displayed.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center' as const, color: F_DIM, fontFamily: crimson, fontStyle: 'italic', fontSize: 14 }}>
                {posts.length === 0 ? 'No posts yet. Start the conversation.' : 'No posts match this filter.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                {displayed.map(post => (
                  <ForumPostCard key={post.id} post={post} userId={userId} isMinister={isMinister} getToken={getToken} onUpdate={onUpdate} onDelete={onDelete} />
                ))}
              </div>
            )}
            {hasMore && !search && (
              <div style={{ textAlign: 'center' as const, marginTop: 24 }}>
                <button onClick={loadMore} disabled={loadingMore}
                  style={{ background: 'transparent', border: `1px solid ${F_BDR}`, borderRadius: 6, color: F_DIM, fontFamily: cinzel, fontSize: 10, padding: '8px 24px', cursor: 'pointer', letterSpacing: '0.08em' }}>
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </div>
          {/* Right sidebar */}
          {!isMobile && (
            <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
              <button onClick={() => setComposing(true)}
                style={{ width: '100%', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: 10, color: G, fontFamily: cinzel, fontSize: 12, padding: '14px', cursor: 'pointer', letterSpacing: '0.1em' }}>
                ＋ New Post
              </button>
              {trendingTags.length > 0 && (
                <div style={{ background: F_SURF, border: `1px solid ${F_BDR}`, borderRadius: 10, padding: '16px 16px' }}>
                  <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.1em', marginBottom: 12 }}>🔥 Trending Tags</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                    {trendingTags.map(([tag, count]) => (
                      <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
                        style={{ background: tagFilter === tag ? 'rgba(74,158,232,0.12)' : F_SURF, border: `1px solid ${tagFilter === tag ? 'rgba(74,158,232,0.35)' : F_BDR}`, borderRadius: 20, padding: '3px 10px', cursor: 'pointer', fontFamily: cinzel, fontSize: 8, color: tagFilter === tag ? '#4A9EE8' : F_DIM, letterSpacing: '0.06em' }}>
                        #{tag} <span style={{ opacity: 0.6 }}>{count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {pinnedPosts.length > 0 && (
                <div style={{ background: F_SURF, border: `1px solid ${F_BDR}`, borderRadius: 10, padding: '16px 16px' }}>
                  <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.1em', marginBottom: 12 }}>📌 Pinned</div>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                    {pinnedPosts.map(p => (
                      <div key={p.id} style={{ borderLeft: `2px solid rgba(201,168,76,0.3)`, paddingLeft: 10 }}>
                        <div style={{ fontFamily: cinzel, fontSize: 10, color: F_TXT, lineHeight: 1.4, letterSpacing: '0.03em' }}>{p.title}</div>
                        <div style={{ fontFamily: cinzel, fontSize: 8, color: F_MUT, marginTop: 3 }}>{p.author_name} · {timeAgo(p.created_at)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ background: F_SURF, border: `1px solid ${F_BDR}`, borderRadius: 10, padding: '16px 16px' }}>
                <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.1em', marginBottom: 12 }}>Community Stats</div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: crimson, fontSize: 13, color: F_DIM }}>Total Discussions</span>
                    <span style={{ fontFamily: cinzel, fontSize: 11, color: F_TXT }}>{posts.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: crimson, fontSize: 13, color: F_DIM }}>This Week</span>
                    <span style={{ fontFamily: cinzel, fontSize: 11, color: F_TXT }}>
                      {posts.filter(p => Date.now() - new Date(p.created_at).getTime() < 7 * 86400000).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── UPCOMING CALLS — update manually here ──
const UPCOMING_CALLS = [
  { title: 'Group Warfare Prayer', date: 'Sat Jun 7 · 7pm CT', badge: 'Soldier' },
  { title: "General's Table",      date: 'Wed Jun 4 · 8pm CT', badge: 'General' },
]

// ── ONBOARDING ─────────────────────────────────────────────
function useFirstTime(key: string): [boolean, () => void] {
  const [show, setShow] = useState(() => {
    try { return !localStorage.getItem(key) } catch { return false }
  })
  const dismiss = useCallback(() => {
    setShow(false)
    try { localStorage.setItem(key, '1') } catch {}
  }, [key])
  return [show, dismiss]
}

function OnboardingOverlay({ storageKey, icon, title, points }: {
  storageKey: string; icon: string; title: string; points: string[]
}) {
  const [show, dismiss] = useFirstTime(storageKey)
  if (!show) return null
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(9,7,15,0.92)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 480, width: '100%', background: '#0f0c07', border: '1px solid rgba(201,168,76,0.25)', borderTop: '2px solid #C9A84C', borderRadius: 8, padding: '32px 28px' }}>
        <div style={{ fontSize: 32, marginBottom: 12, textAlign: 'center' as const }}>{icon}</div>
        <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.15em', textTransform: 'uppercase' as const, textAlign: 'center' as const, marginBottom: 20 }}>{title}</div>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
          {points.map((pt, i) => (
            <li key={i} style={{ display: 'flex', gap: 10, fontFamily: crimson, fontSize: 14, color: '#c8b896', lineHeight: 1.6 }}>
              <span style={{ color: G, flexShrink: 0 }}>⚔</span>
              {pt}
            </li>
          ))}
        </ul>
        <div style={{ textAlign: 'center' as const }}>
          <button
            onClick={dismiss}
            style={{ padding: '10px 32px', background: 'transparent', border: '1px solid #C9A84C', borderRadius: 4, fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.12em', cursor: 'pointer', textTransform: 'uppercase' as const }}
          >
            ENTER BRIEFING →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── SESSION CENTER VIEW ────────────────────────────────────
function SessionCenterView({ theme, isMobile, setSidebarOpen, userId, getToken, demons, onLaunch, userTier }: any) {
  const isDark = theme !== 'light'
  const isCommanderOnly = (userTier || '').toLowerCase() === 'commander'
  const bg     = isDark ? '#0D0B14' : '#FAF8F5'
  const surf   = isDark ? '#13111e' : '#FFFFFF'
  const bdr    = isDark ? 'rgba(201,168,76,0.18)' : 'rgba(139,105,20,0.25)'
  const txt    = isDark ? '#e8dcc8' : '#2D2924'
  const dim    = isDark ? '#6b5e45' : '#5C5248'
  const gold   = isDark ? '#C9A84C' : '#8B6914'

  const [sessions, setSessions]     = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [step, setStep]             = useState<'list' | 'new'>(  'list')
  const [alias, setAlias]           = useState('')
  const [sessionNum, setSessionNum] = useState(1)
  const [spiritsFromLS, setSpiritsFromLS] = useState<string[]>([])
  const [launching, setLaunching]   = useState(false)
  const [launchError, setLaunchError] = useState('')

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('wri_session_spirits') || '[]')
      if (Array.isArray(stored)) setSpiritsFromLS(stored)
    } catch {}
  }, [])

  useEffect(() => {
    if (step !== 'list') return
    getToken().then((token: string | null) => {
      fetch('/api/sessions', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { setSessions(d.sessions || []); setLoading(false) })
        .catch(() => setLoading(false))
    })
  }, [step])

  async function startNewSession() {
    if (!alias.trim() || launching) return
    setLaunching(true)
    setLaunchError('')
    try {
      const token = await getToken()
      const spiritSeq = spiritsFromLS.map(name => {
        const d = demons.find((x: any) => x.name?.toLowerCase() === name.toLowerCase())
        return { id: Math.random().toString(36).slice(2), name: d?.name || name, rank: d?.biblicalRank || 'Common Spirit', label: '', status: 'pending', reasoning: '', entryPoints: d?.entryPoints || '', companions: [], scriptures: [], breakthroughLevel: 'none' }
      })
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject_alias: alias.trim(), session_number: sessionNum, spirit_sequence: spiritSeq }),
      })
      const data = await res.json()
      if (data.session) {
        localStorage.removeItem('wri_session_spirits')
        onLaunch(data.session.id, { subjectAlias: alias.trim(), sessionNumber: sessionNum, defaultMode: isCommanderOnly ? 'offline' : undefined })
      } else {
        setLaunchError(data.error || 'Failed to create session. Try again.')
      }
    } catch {
      setLaunchError('Network error. Check your connection and try again.')
    } finally {
      setLaunching(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
    border: `1px solid ${bdr}`, borderRadius: 6, padding: '10px 14px', color: txt,
    fontFamily: "'Crimson Pro', serif", fontSize: 15, outline: 'none',
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: bg, padding: isMobile ? '16px' : '28px 32px' }}>
      {isMobile && (
        <button onClick={() => setSidebarOpen(true)} style={{ background: 'transparent', border: 'none', color: gold, fontSize: 20, cursor: 'pointer', marginBottom: 16, padding: 0 }}>☰</button>
      )}
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: gold, letterSpacing: '0.2em', marginBottom: 4 }}>FIELD OPERATIONS</div>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 22, color: txt, marginBottom: 4 }}>Session Center</div>
        <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 15, color: dim, marginBottom: isCommanderOnly ? 12 : 24 }}>Launch, manage, and resume deliverance sessions.</div>

        {/* Commander tier — offline only */}
        {isCommanderOnly && (
          <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: '#a78bfa', letterSpacing: '0.12em', marginBottom: 4 }}>COMMANDER TIER — OFFLINE SESSION MODE</div>
            <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 13, color: dim, lineHeight: 1.5 }}>Your tier includes offline session capture. Sessions will launch in Quick Capture mode. <a href="/membership" style={{ color: gold }}>Upgrade to General</a> to unlock live and guided modes.</div>
          </div>
        )}

        {step === 'list' ? (
          <>
            <button onClick={() => setStep('new')} style={{ width: '100%', padding: '14px', background: gold, border: 'none', borderRadius: 8, fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: '0.1em', color: '#060408', cursor: 'pointer', fontWeight: 700, marginBottom: 24 }}>
              ⚔ START NEW SESSION
            </button>
            {spiritsFromLS.length > 0 && (
              <div style={{ background: `${gold}11`, border: `1px solid ${bdr}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: gold, letterSpacing: '0.1em' }}>SPIRITS FROM CASE FILES:</span>
                <span style={{ fontFamily: "'Crimson Pro', serif", fontSize: 13, color: txt }}>{spiritsFromLS.join(', ')}</span>
              </div>
            )}
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: dim, letterSpacing: '0.15em', marginBottom: 12 }}>RECENT SESSIONS</div>
            {loading && <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: dim }}>Loading...</div>}
            {!loading && sessions.length === 0 && (
              <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: dim, fontStyle: 'italic' }}>No sessions yet. Start your first session above.</div>
            )}
            {sessions.map(s => {
              const isActive = s.status === 'active' || s.status === 'paused'
              const spirits  = (s.spirit_sequence || []).length
              const expelled = (s.spirit_sequence || []).filter((x: any) => x.status === 'expelled').length
              return (
                <div key={s.id} style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: '14px 18px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: txt }}>{s.subject_alias}</span>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: dim }}>#{s.session_number}</span>
                      {s.status === 'paused' && (
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8, color: '#fb923c', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 10, padding: '1px 6px' }}>IN PROGRESS</span>
                      )}
                      {s.status === 'completed' && (
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8, color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 10, padding: '1px 6px' }}>COMPLETED</span>
                      )}
                    </div>
                    <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 12, color: dim }}>
                      {new Date(s.created_at).toLocaleDateString()} · {spirits} spirits · {expelled} expelled
                    </div>
                  </div>
                  {isActive && (
                    <button onClick={() => onLaunch(s.id, { subjectAlias: s.subject_alias, sessionNumber: s.session_number })}
                      style={{ padding: '8px 14px', background: s.status === 'paused' ? 'rgba(251,146,60,0.15)' : `${gold}22`, border: `1px solid ${s.status === 'paused' ? 'rgba(251,146,60,0.4)' : bdr}`, borderRadius: 6, color: s.status === 'paused' ? '#fb923c' : gold, fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {s.status === 'paused' ? '▶ RESUME' : '▶ ENTER'}
                    </button>
                  )}
                </div>
              )
            })}
          </>
        ) : (
          /* New Session Form */
          <div>
            <button onClick={() => setStep('list')} style={{ background: 'transparent', border: 'none', color: dim, fontFamily: "'Cinzel', serif", fontSize: 9, cursor: 'pointer', letterSpacing: '0.08em', marginBottom: 20, padding: 0 }}>← BACK</button>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: txt, marginBottom: 20 }}>New Session Setup</div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.12em', color: dim, marginBottom: 5 }}>SUBJECT ALIAS</label>
              <input value={alias} onChange={e => setAlias(e.target.value)} placeholder="e.g. Jane D." style={inputStyle} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.12em', color: dim, marginBottom: 5 }}>SESSION NUMBER</label>
              <input type="number" min={1} value={sessionNum} onChange={e => setSessionNum(parseInt(e.target.value) || 1)} style={{ ...inputStyle, width: 100 }} />
            </div>
            {spiritsFromLS.length > 0 && (
              <div style={{ background: `${gold}11`, border: `1px solid ${bdr}`, borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: gold, letterSpacing: '0.1em', marginBottom: 6 }}>PRE-LOADED FROM CASE FILES</div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
                  {spiritsFromLS.map(name => (
                    <span key={name} style={{ padding: '2px 8px', borderRadius: 10, background: `${gold}11`, border: `1px solid ${bdr}`, fontFamily: "'Cinzel', serif", fontSize: 9, color: gold }}>{name}</span>
                  ))}
                </div>
              </div>
            )}
            {launchError && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6, fontFamily: "'Crimson Pro', serif", fontSize: 13, color: '#f87171' }}>
                {launchError}
              </div>
            )}
            <button type="button" onClick={startNewSession} disabled={!alias.trim() || launching}
              style={{ width: '100%', padding: '14px', background: alias.trim() && !launching ? gold : 'transparent', border: `1px solid ${alias.trim() && !launching ? gold : bdr}`, borderRadius: 8, fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: '0.1em', color: alias.trim() && !launching ? '#060408' : dim, cursor: alias.trim() && !launching ? 'pointer' : 'default', fontWeight: 700 }}>
              {launching ? 'CREATING SESSION...' : '⚔ LAUNCH SESSION'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── MAIN PAGE ──────────────────────────────────────────────
function CommunityPage() {
  const { isLoaded, isSignedIn, signOut, getToken } = useAuth()
  const { user } = useUser()

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark'
    const stored = localStorage.getItem('wri-theme')
    return (stored === 'dark' || stored === 'light') ? stored : 'dark'
  })
  const [isMobile, setIsMobile]       = useState(() => window.innerWidth < 768)
  const [isTablet, setIsTablet]       = useState(() => window.innerWidth >= 768 && window.innerWidth < 1100)
  const [railOpen, setRailOpen]       = useState(() => {
    try { return localStorage.getItem('wri-rail-open') !== 'false' } catch { return true }
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar_collapsed') === 'true' } catch { return false }
  })
  const [activeSection, setActiveSection] = useState('intel')
  const [trainingExpanded, setTrainingExpanded] = useState(false)
  const [fringeExpanded, setFringeExpanded]     = useState(false)
  const [intelligenceOpen, setIntelligenceOpen] = useState(() => {
    try { return localStorage.getItem('sidebar_intelligence_open') !== 'false' } catch { return true }
  })
  const [intelArchiveOpen, setIntelArchiveOpen] = useState(() => {
    try { return localStorage.getItem('sidebar_intel_archive_open') !== 'false' } catch { return true }
  })
  const [fieldOpsOpen, setFieldOpsOpen] = useState(() => {
    try { return localStorage.getItem('sidebar_field_ops_open') !== 'false' } catch { return true }
  })
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

  // AI Chatbot
  const [chatOpen, setChatOpen]           = useState(false)
  const [chatMessages, setChatMessages]   = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [chatInput, setChatInput]         = useState('')
  const [chatLoading, setChatLoading]     = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  async function sendChat(msg: string) {
    if (!msg.trim() || chatLoading) return
    const userMsg = { role: 'user' as const, content: msg.trim() }
    const history = [...chatMessages, userMsg]
    setChatMessages(history)
    setChatInput('')
    setChatLoading(true)
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

    // /library command — list ministry library grouped by source_type
    const isLibraryCmd = msg.trim().toLowerCase() === '/library'
      || msg.trim().toLowerCase().includes('list my books')
      || msg.trim().toLowerCase().includes('show my library')
    if (isLibraryCmd) {
      try {
        const token = await getToken()
        const res = await fetch('/api/admin-library', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        const books: any[] = data.books || []
        if (!books.length) {
          setChatMessages(prev => [...prev, { role: 'assistant', content: 'Your ministry library is empty. Upload books in the Admin → Library tab.' }])
        } else {
          const groups: Record<string, string[]> = {}
          for (const b of books) {
            const group = b.source_type === 'intelligence' ? 'Intelligence Resources' : 'Christian Ministry'
            if (!groups[group]) groups[group] = []
            groups[group].push(`• ${b.title}${b.author && b.author !== 'Unknown' ? ` — ${b.author}` : ''}`)
          }
          const lines: string[] = [`**Ministry Library** (${books.length} books)\n`]
          for (const [group, titles] of Object.entries(groups)) {
            lines.push(`### ${group}`)
            lines.push(...titles)
            lines.push('')
          }
          setChatMessages(prev => [...prev, { role: 'assistant', content: lines.join('\n') }])
        }
      } catch {
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Unable to load library. Please try again.' }])
      } finally {
        setChatLoading(false)
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
      return
    }

    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg.trim(), history: chatMessages }),
      })
      const data = await res.json()
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response || 'No response received.' }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Unable to connect. Please try again.' }])
    } finally {
      setChatLoading(false)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  function renderMarkdown(text: string): string {
    return text
      .replace(/^### (.+)$/gm, '<div style="font-family:\'Cinzel\',serif;font-size:11px;color:#C9A84C;letter-spacing:0.1em;margin:16px 0 6px">$1</div>')
      .replace(/^## (.+)$/gm, '<div style="font-family:\'Cinzel\',serif;font-size:12px;color:#C9A84C;letter-spacing:0.1em;margin:16px 0 8px">$1</div>')
      .replace(/^# (.+)$/gm, '<div style="font-family:\'Cinzel\',serif;font-size:14px;color:#C9A84C;letter-spacing:0.12em;margin:16px 0 10px">$1</div>')
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#c8b99a">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em style="color:#8a7a60">$1</em>')
      .replace(/^- (.+)$/gm, '<div style="padding-left:12px;margin:4px 0;color:#a89878">⚔ $1</div>')
      .replace(/\n\n/g, '<div style="margin:8px 0"></div>')
      .replace(/\n/g, '<br/>')
  }

  function exportToPDF(content: string) {
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const bodyHtml = content
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>')
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>War Room Intel — Intelligence Report</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet"/>
<style>
  body { margin: 0; background: #fff; color: #1a1408; font-family: 'Crimson Text', Georgia, serif; font-size: 15px; line-height: 1.7; }
  .page { max-width: 720px; margin: 0 auto; padding: 48px 48px 64px; }
  .header { border-bottom: 2px solid #C9A84C; padding-bottom: 20px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-end; }
  .brand { font-family: 'Cinzel', serif; font-size: 22px; font-weight: 700; color: #1a1408; letter-spacing: 0.08em; }
  .brand span { color: #C9A84C; }
  .classification { font-family: 'Cinzel', serif; font-size: 9px; letter-spacing: 0.25em; color: #C9A84C; text-transform: uppercase; border: 1px solid #C9A84C; padding: 3px 8px; }
  .date { font-family: 'Cinzel', serif; font-size: 10px; color: #8a7a60; letter-spacing: 0.1em; margin-top: 6px; }
  .divider { border: none; border-top: 1px solid #d4b896; margin: 24px 0; }
  h1 { font-family: 'Cinzel', serif; font-size: 16px; font-weight: 700; color: #1a1408; letter-spacing: 0.08em; margin: 24px 0 12px; }
  h2 { font-family: 'Cinzel', serif; font-size: 14px; font-weight: 600; color: #3a2a10; letter-spacing: 0.06em; margin: 20px 0 10px; }
  h3 { font-family: 'Cinzel', serif; font-size: 12px; font-weight: 600; color: #5a4a30; letter-spacing: 0.06em; margin: 16px 0 8px; }
  p { margin: 0 0 12px; }
  ul { padding-left: 0; list-style: none; margin: 8px 0 12px; }
  li::before { content: '⚔ '; color: #C9A84C; }
  li { margin: 4px 0; padding-left: 16px; text-indent: -16px; }
  strong { color: #1a1408; font-weight: 600; }
  em { color: #5a4a30; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #d4b896; display: flex; justify-content: space-between; font-family: 'Cinzel', serif; font-size: 9px; color: #8a7a60; letter-spacing: 0.1em; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="brand">WAR ROOM <span>INTEL</span></div>
      <div class="date">${date}</div>
    </div>
    <div class="classification">INTELLIGENCE REPORT</div>
  </div>
  <div>${bodyHtml}</div>
  <div class="footer">
    <span>War Room Intel · A Ministry of Staffordtown Church · Copperhill, TN</span>
    <span>warroomintel.com</span>
  </div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close() }
  }

  // Session Command Center
  const [sessionOpen, setSessionOpen]           = useState(false)
  const [activeSessionId, setActiveSessionId]   = useState<string | undefined>(undefined)
  const [activeSessionCF, setActiveSessionCF]   = useState<any>(undefined)

  const [hoveredPrayer, setHoveredPrayer] = useState<any>(null)
  const [hoverY, setHoverY]               = useState(0)
  const [members, setMembers]             = useState<any[]>([])
  const [memberPresence, setMemberPresence] = useState<Record<string, { online: boolean, lastActive: string | null }>>({})
  const [demons, setDemons]               = useState<any[]>([])
  const [viewingProfile, setViewingProfile] = useState<any>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [pendingDMWith, setPendingDMWith]   = useState<string | null>(null)
  const [hoveredWarrior, setHoveredWarrior] = useState<string | null>(null)
  const warriorHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showWarriorCard = (id: string) => { clearTimeout(warriorHoverTimer.current!); setHoveredWarrior(id) }
  const hideWarriorCard = () => { warriorHoverTimer.current = setTimeout(() => setHoveredWarrior(null), 150) }
  const [recentMessages, setRecentMessages] = useState<Array<{
    id: string; senderName: string; text: string; timeAgo: string
  }>>([])

  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const tier     = (user?.publicMetadata?.tier as string) || 'Watchman'
  const initials = ((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')).toUpperCase() || 'W'

  // Responsive breakpoint
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth
      setIsMobile(w < 768)
      setIsTablet(w >= 768 && w < 1100)
    }
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Read ?section= URL param on mount (e.g. from Launch Session redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const section = params.get('section')
    if (section) {
      setActiveSection(section)
      window.history.replaceState({}, '', window.location.pathname)
    }
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
    const t = setTimeout(() => {
      fetchPosts()
      fetchPrayers()
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(() => { fetchPosts(); fetchPrayers() }, 30000)
    }, 2000)
    return () => { clearTimeout(t); if (pollRef.current) clearInterval(pollRef.current) }
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
    const t = setTimeout(() => {
      fetch('/api/get-members')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data.members)) setMembers(data.members)
        })
        .catch(err => console.error('get-members error:', err))
    }, 3000)
    return () => clearTimeout(t)
  }, [user?.id])

  // Fetch demons for Body Map + Spirit Network — delay 2s so critical fetches go first
  useEffect(() => {
    if (!user?.id) return
    const t = setTimeout(() => {
      fetch('/api/demons')
        .then(r => r.json())
        .then(d => setDemons(d.demons || d.records || []))
        .catch(() => {})
    }, 2000)
    return () => clearTimeout(t)
  }, [user?.id])

  // Fetch Stream presence for Warriors section
  useEffect(() => {
    if (!streamToken || !apiKey) return
    async function fetchPresence() {
      try {
        const res = await fetch(
          `https://chat.stream-io-api.com/channels/messaging/war-room-general/query?api_key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: streamToken, 'stream-auth-type': 'jwt' },
            body: JSON.stringify({ state: true, presence: true, watch: false }),
          }
        )
        const data = await res.json()
        const presenceMap: Record<string, { online: boolean, lastActive: string | null }> = {}
        ;(data.members || []).forEach((m: any) => {
          if (m.user?.id) presenceMap[m.user.id] = { online: m.user.online === true, lastActive: m.user.last_active || null }
        })
        setMemberPresence(presenceMap)
      } catch(e) {
        console.log('Presence fetch failed:', e)
      }
    }
    fetchPresence()
    const interval = setInterval(fetchPresence, 60000)
    return () => clearInterval(interval)
  }, [streamToken, apiKey])

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
    bg:     isDark ? '#0D0B14' : '#FAF8F5',
    surf:   isDark ? '#1a1714' : '#FFFFFF',
    card:   isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
    bdr:    isDark ? 'rgba(201,168,76,0.15)' : 'rgba(139,105,20,0.25)',
    txt:    isDark ? '#f0e8d8' : '#2D2924',
    mut:    isDark ? '#9a8c74' : '#5C5248',
    dim:    isDark ? '#c8b99a' : '#5C5248',
    s2:     isDark ? '#1c1814' : '#FFFFFF',
    gold:   isDark ? '#C9A84C' : '#8B6914',
    shadow: isDark ? 'none' : '0 2px 12px rgba(45,41,36,0.06), 0 1px 3px rgba(45,41,36,0.04)',
  }

  // ── NAV HELPERS ────────────────────────────────────────────
  const INTELLIGENCE_SECTS = new Set(['database', 'investigate', 'body-map', 'spirit-network', 'gateway', 'fringe-feed'])
  const ARCHIVE_SECTS       = new Set(['investigate', 'body-map', 'spirit-network', 'gateway'])
  const intelOpen    = intelligenceOpen || INTELLIGENCE_SECTS.has(activeSection)
  const archiveOpen  = intelArchiveOpen || ARCHIVE_SECTS.has(activeSection)

  const chevronStyle = (open: boolean): React.CSSProperties => ({
    fontSize: 10, color: isDark ? '#6b5e45' : '#5C5248', display: 'inline-block',
    transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s',
  })

  const sectionLabel = (label: string) => sidebarCollapsed && !isMobile ? null : (
    <div style={{ padding: '12px 16px 4px 16px', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.18em', color: isDark ? '#7a6d58' : '#5C5248' }}>
      {label}
    </div>
  )

  const collapsibleSection = (label: string, open: boolean, toggle: () => void) => sidebarCollapsed && !isMobile ? null : (
    <button onClick={toggle} style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '12px 16px 4px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' as const, boxSizing: 'border-box' as const }}>
      <span style={{ flex: 1, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.18em', color: isDark ? '#7a6d58' : '#5C5248', textTransform: 'uppercase' as const }}>{label}</span>
      <span style={chevronStyle(open)}>›</span>
    </button>
  )

  const NAV_DEFAULT = isDark ? '#b8a98a' : '#3d2e1e'
  const navGold    = isDark ? G : '#8B6914'

  const navItem = (label: string, section: string, icon?: React.ReactNode) => {
    const active = activeSection === section
    const collapsed = sidebarCollapsed && !isMobile
    return (
      <button
        onClick={() => { setActiveSection(section); if (isMobile) setSidebarOpen(false) }}
        title={collapsed ? label : undefined}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: collapsed ? 0 : 8,
          width: '100%', padding: collapsed ? '10px 0' : '8px 16px',
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
        {icon && <span style={{ display: 'flex', alignItems: 'center', width: 20, flexShrink: 0 }}>{icon}</span>}
        {!collapsed && label}
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
    text: 'Welcome to War Room Intel. If you are fighting for your own freedom or walking others into theirs, you are in the right place. Start by introducing yourself below.',
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
          onClick={() => { window.location.href = href }}
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
      {/* Compact sidebar header */}
      <div style={{ padding: sidebarCollapsed && !isMobile ? '10px 4px' : '10px 14px', borderBottom: `1px solid ${V.bdr}`, display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed && !isMobile ? 'center' : undefined, gap: 10, flexShrink: 0, overflow: 'hidden' }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'rgba(201,168,76,0.15)',
          border: `1px solid ${V.bdr}`,
          flexShrink: 0, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: cinzel, fontSize: 11, color: G,
        }}>
          {user?.imageUrl
            ? <img src={user.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (user?.firstName?.[0] || 'W')
          }
        </div>
        {!(sidebarCollapsed && !isMobile) && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: cinzel, fontSize: 11, color: V.txt, letterSpacing: '0.06em', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.firstName || 'Warrior'}
              </div>
              <div style={{ fontSize: 9, color: G, fontFamily: cinzel, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                {tier}
              </div>
            </div>
            <button
              onClick={() => setTheme((t: string) => t === 'dark' ? 'light' : 'dark')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 2, flexShrink: 0 }}
              title="Toggle theme"
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => signOut()}
              style={{
                background: 'none',
                border: `1px solid ${V.bdr}`,
                borderRadius: 5,
                color: V.mut,
                fontFamily: cinzel,
                fontSize: 8,
                letterSpacing: '0.08em',
                padding: '3px 8px',
                cursor: 'pointer',
                flexShrink: 0,
                textTransform: 'uppercase' as const,
              }}
            >Out</button>
          </>
        )}
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>

        {/* ── QUICK ACCESS ICON STRIP ── */}
        {!(sidebarCollapsed && !isMobile) && <div style={{ display: 'flex', justifyContent: isMobile ? 'space-around' : 'flex-start', gap: isMobile ? 0 : 6, alignItems: 'flex-start', padding: '10px 6px', borderBottom: 'rgba(201,168,76,0.12) 1px solid', marginBottom: 4, position: 'relative' as const }} onMouseLeave={() => setTooltipVisible(null)}>
          {([
            { icon: <MessageSquare size={16} strokeWidth={1.6} />, label: 'War Room Chat',     mobileLabel: 'Chat',      section: 'war-room-chat'  },
            { icon: <Inbox size={16} strokeWidth={1.6} />,         label: 'Direct Messages',   mobileLabel: 'Messages',  section: 'dms'            },
            { icon: <Heart size={16} strokeWidth={1.6} />,         label: 'Prayer Wall',       mobileLabel: 'Prayer',    section: 'prayer-wall'    },
            { icon: <Cross size={16} strokeWidth={1.6} />,         label: 'Testimony Wall',    mobileLabel: 'Testimony', section: 'testimony-wall' },
            { icon: <Users size={16} strokeWidth={1.6} />,         label: 'Members',           mobileLabel: 'Members',   section: 'members'        },
            { icon: <HelpCircle size={16} strokeWidth={1.6} />,    label: 'Feedback',          mobileLabel: 'Feedback',  section: 'feedback'       },
          ] as { icon: React.ReactNode; label: string; mobileLabel: string; section: string }[]).map(({ icon, label, mobileLabel, section }, idx) => (
            <div key={section} style={{ position: 'relative' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2 }}>
              <button
                onClick={() => { setActiveSection(section); if (isMobile) setSidebarOpen(false) }}
                onMouseEnter={() => !isMobile ? setTooltipVisible(section) : undefined}
                onMouseLeave={() => !isMobile ? setTooltipVisible(null) : undefined}
                style={{ background: activeSection === section ? 'rgba(201,168,76,0.15)' : 'transparent', border: activeSection === section ? '1px solid rgba(201,168,76,0.3)' : '1px solid transparent', borderRadius: 8, width: isMobile ? 44 : 36, height: isMobile ? 44 : 36, cursor: 'pointer', color: activeSection === section ? G : '#8B7355', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease', position: 'relative' as const }}
              >
                {icon}
                {section === 'dms' && unreadDMs > 0 && (
                  <span style={{ position: 'absolute' as const, top: -4, right: -4, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontFamily: cinzel, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{unreadDMs > 9 ? '9+' : unreadDMs}</span>
                )}
                {section === 'war-room-chat' && unreadWarRoom > 0 && (
                  <span style={{ position: 'absolute' as const, top: -4, right: -4, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontFamily: cinzel, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{unreadWarRoom > 9 ? '9+' : unreadWarRoom}</span>
                )}
              </button>
              {isMobile && (
                <div style={{ fontFamily: cinzel, fontSize: 7, color: activeSection === section ? G : '#8B7355', letterSpacing: '0.04em', textAlign: 'center' as const, lineHeight: 1.2, maxWidth: 44, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {mobileLabel}
                </div>
              )}
              {!isMobile && tooltipVisible === section && (
                <div style={{ position: 'absolute' as const, top: 42, left: idx === 0 ? 0 : idx === 5 ? 'auto' : '50%', right: idx === 5 ? 0 : 'auto', transform: idx > 0 && idx < 5 ? 'translateX(-50%)' : 'none', background: '#1a1625', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 5, padding: '4px 10px', fontSize: 10, color: G, fontFamily: cinzel, letterSpacing: '0.06em', whiteSpace: 'nowrap' as const, zIndex: 9999, pointerEvents: 'none' as const }}>{label}</div>
              )}
            </div>
          ))}
        </div>}

        {/* ── FIELD OPS (Commander+) ── */}
        {(['commander', 'general'].includes(((user?.publicMetadata?.tier as string) || '').toLowerCase()) || (user?.publicMetadata?.role as string) === 'minister') && (
          <>
            {collapsibleSection('Field Ops', fieldOpsOpen, () => {
              const next = !fieldOpsOpen
              setFieldOpsOpen(next)
              try { localStorage.setItem('sidebar_field_ops_open', String(next)) } catch {}
            })}
            <div style={{ overflow: 'hidden', maxHeight: fieldOpsOpen ? 200 : 0, transition: 'max-height 0.2s ease' }}>
              <a href="/community/field-ops" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 16px', background: 'transparent', textDecoration: 'none', borderLeft: '2px solid transparent', fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em', color: NAV_DEFAULT, transition: 'all 0.15s', boxSizing: 'border-box' as const }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.05)'; (e.currentTarget as HTMLElement).style.color = navGold }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = NAV_DEFAULT }}>
                <span style={{ display: 'flex', alignItems: 'center', width: 20, flexShrink: 0 }}><FolderOpen size={14} strokeWidth={1.6} /></span>
                <span>Case Files</span>
              </a>
              <a href="/community/field-ops" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 16px', background: 'transparent', textDecoration: 'none', borderLeft: '2px solid transparent', fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em', color: NAV_DEFAULT, transition: 'all 0.15s', boxSizing: 'border-box' as const }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.05)'; (e.currentTarget as HTMLElement).style.color = navGold }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = NAV_DEFAULT }}>
                <span style={{ display: 'flex', alignItems: 'center', width: 20, flexShrink: 0 }}><FileText size={14} strokeWidth={1.6} /></span>
                <span>Session Notes</span>
              </a>
            </div>
          </>
        )}

        {/* ── COMMUNITY ── */}
        {sectionLabel('Community')}
        {navItem('Weekly Intel', 'intel', <Antenna size={16} strokeWidth={1.6} />)}
        {navItem('Ops Board', 'forum', <MessageSquare size={16} strokeWidth={1.6} />)}
        {navItem('Field Ministry', 'field-ministry', <BookOpen size={16} strokeWidth={1.6} />)}

        {/* ── FOUNDATION ── */}
        {sectionLabel('Foundation')}
        {navItem('Arsenal', 'arsenal', <Archive size={16} strokeWidth={1.6} />)}
        <a href="/community/field-manual" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 16px', background: 'transparent', textDecoration: 'none', borderLeft: '2px solid transparent', fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em', color: NAV_DEFAULT, transition: 'all 0.15s', boxSizing: 'border-box' as const }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.05)'; (e.currentTarget as HTMLElement).style.color = navGold }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = NAV_DEFAULT }}>
          <span style={{ display: 'flex', alignItems: 'center', width: 20, flexShrink: 0 }}><Sword size={14} strokeWidth={1.6} /></span>
          <span>Field Manual</span>
        </a>
        <a href="/community/scripture" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 16px', background: 'transparent', textDecoration: 'none', borderLeft: '2px solid transparent', fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em', color: NAV_DEFAULT, transition: 'all 0.15s', boxSizing: 'border-box' as const }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.05)'; (e.currentTarget as HTMLElement).style.color = navGold }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = NAV_DEFAULT }}>
          <span style={{ display: 'flex', alignItems: 'center', width: 20, flexShrink: 0 }}><BookOpen size={14} /></span>
          <span>Scripture</span>
        </a>

        {/* ── INTELLIGENCE ── */}
        {collapsibleSection('Intelligence', intelOpen, () => {
          const next = !intelligenceOpen
          setIntelligenceOpen(next)
          try { localStorage.setItem('sidebar_intelligence_open', String(next)) } catch {}
        })}
        <div style={{ overflow: 'hidden', maxHeight: intelOpen ? 800 : 0, transition: 'max-height 0.2s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => { setActiveSection('database'); if (isMobile) setSidebarOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, padding: '8px 8px 8px 16px', background: activeSection === 'database' ? 'rgba(201,168,76,0.1)' : 'transparent', border: 'none', borderLeft: `2px solid ${activeSection === 'database' ? navGold : 'transparent'}`, cursor: 'pointer', fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em', color: activeSection === 'database' ? navGold : NAV_DEFAULT, fontWeight: activeSection === 'database' ? 600 : 400, textAlign: 'left' as const, boxSizing: 'border-box' as const, transition: 'all 0.15s' }}
              onMouseEnter={e => { if (activeSection !== 'database') { e.currentTarget.style.background = 'rgba(201,168,76,0.05)'; e.currentTarget.style.color = navGold } }}
              onMouseLeave={e => { if (activeSection !== 'database') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = NAV_DEFAULT } }}
            >
              <span style={{ display: 'flex', alignItems: 'center', width: 20, flexShrink: 0 }}><Library size={14} strokeWidth={1.6} /></span>
              Intel Archive
            </button>
            <button
              onClick={() => {
                const next = !intelArchiveOpen
                setIntelArchiveOpen(next)
                try { localStorage.setItem('sidebar_intel_archive_open', String(next)) } catch {}
              }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px 12px 8px 4px', color: activeSection === 'database' ? navGold : (isDark ? '#6b5e45' : '#5C5248'), flexShrink: 0 }}
            >
              <span style={chevronStyle(archiveOpen)}>›</span>
            </button>
          </div>
          <div style={{ overflow: 'hidden', maxHeight: archiveOpen ? 250 : 0, transition: 'max-height 0.2s ease' }}>
            <div style={{ paddingLeft: 16 }}>
              <button onClick={() => { setActiveSection('investigate'); if (isMobile) setSidebarOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 16px', background: activeSection === 'investigate' ? 'rgba(201,168,76,0.06)' : 'transparent', border: 'none', borderLeft: activeSection === 'investigate' ? '2px solid rgba(201,168,76,0.5)' : '2px solid rgba(201,168,76,0.1)', cursor: 'pointer', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', color: activeSection === 'investigate' ? navGold : (isDark ? '#6b5e45' : '#5C5248'), textAlign: 'left' as const, boxSizing: 'border-box' as const }}>
                <Search size={11} strokeWidth={1.6} />
                <span>Symptom Investigator</span>
              </button>
              <button onClick={() => { setActiveSection('body-map'); if (isMobile) setSidebarOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 16px', background: activeSection === 'body-map' ? 'rgba(201,168,76,0.06)' : 'transparent', border: 'none', borderLeft: activeSection === 'body-map' ? '2px solid rgba(201,168,76,0.5)' : '2px solid rgba(201,168,76,0.1)', cursor: 'pointer', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', color: activeSection === 'body-map' ? navGold : (isDark ? '#6b5e45' : '#5C5248'), textAlign: 'left' as const, boxSizing: 'border-box' as const }}>
                <Map size={11} strokeWidth={1.6} />
                <span>Body Map</span>
              </button>
              <button onClick={() => { setActiveSection('spirit-network'); if (isMobile) setSidebarOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 16px', background: activeSection === 'spirit-network' ? 'rgba(201,168,76,0.06)' : 'transparent', border: 'none', borderLeft: activeSection === 'spirit-network' ? '2px solid rgba(201,168,76,0.5)' : '2px solid rgba(201,168,76,0.1)', cursor: 'pointer', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', color: activeSection === 'spirit-network' ? navGold : (isDark ? '#6b5e45' : '#5C5248'), textAlign: 'left' as const, boxSizing: 'border-box' as const }}>
                <Network size={11} strokeWidth={1.6} />
                <span>Spirit Network</span>
              </button>
              <button onClick={() => { setActiveSection('gateway'); if (isMobile) setSidebarOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 16px', background: activeSection === 'gateway' ? 'rgba(201,168,76,0.06)' : 'transparent', border: 'none', borderLeft: activeSection === 'gateway' ? '2px solid rgba(201,168,76,0.5)' : '2px solid rgba(201,168,76,0.1)', cursor: 'pointer', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', color: activeSection === 'gateway' ? navGold : (isDark ? '#6b5e45' : '#5C5248'), textAlign: 'left' as const, boxSizing: 'border-box' as const }}>
                <DoorOpen size={11} strokeWidth={1.6} />
                <span>Gateway Investigator</span>
              </button>
              <a href="/community/dream-interpreter" style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 16px', background: 'transparent', textDecoration: 'none', borderLeft: '2px solid rgba(201,168,76,0.1)', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', color: isDark ? '#6b5e45' : '#5C5248', boxSizing: 'border-box' as const }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = navGold; (e.currentTarget as HTMLElement).style.borderLeftColor = 'rgba(201,168,76,0.5)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = isDark ? '#6b5e45' : '#5C5248'; (e.currentTarget as HTMLElement).style.borderLeftColor = 'rgba(201,168,76,0.1)' }}>
                <Moon size={11} strokeWidth={1.6} />
                <span>Dream Interpreter</span>
              </a>
            </div>
          </div>

          <button onClick={() => setFringeExpanded(e => !e)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em', color: activeSection === 'fringe-feed' ? navGold : NAV_DEFAULT, textAlign: 'left' as const, boxSizing: 'border-box' as const }}>
            <span style={{ display: 'flex', alignItems: 'center', width: 20, flexShrink: 0 }}><Eye size={14} strokeWidth={1.6} /></span>
            <span style={{ flex: 1 }}>Fringe Intelligence</span>
            <span style={{ fontSize: 10, color: isDark ? '#6b5e45' : '#5C5248', display: 'inline-block', transform: fringeExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
          </button>
          {fringeExpanded && (
            <div style={{ paddingLeft: 16, borderLeft: '1px solid rgba(201,168,76,0.1)', marginLeft: 16 }}>
              {navItem('The Feed', 'fringe-feed', <Radio size={16} strokeWidth={1.6} />)}
              {([{ label: 'The Archive', icon: <FolderArchive size={13} strokeWidth={1.6} /> }, { label: 'Fringe Chat', icon: <MessageSquare size={13} strokeWidth={1.6} /> }, { label: 'Courses', icon: <GraduationCap size={13} strokeWidth={1.6} /> }] as { label: string; icon: React.ReactNode }[]).map(({ label, icon }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', opacity: 0.45 }}>
                  <span style={{ display: 'flex', alignItems: 'center', width: 20 }}>{icon}</span>
                  <span style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', color: isDark ? '#6b5e45' : '#5C5248', flex: 1 }}>{label}</span>
                  <span style={{ fontSize: 8, fontFamily: cinzel, background: 'rgba(201,168,76,0.1)', color: '#8B7355', padding: '1px 6px', borderRadius: 3 }}>SOON</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── FIELD OPERATIONS ── */}
        {sectionLabel('Field Operations')}
        {navItem('Session Center', 'session-center', <Sword size={16} strokeWidth={1.6} />)}
        <a href="/community/spiritual-mapping" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 16px', background: 'transparent', textDecoration: 'none', borderLeft: '2px solid transparent', fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em', color: NAV_DEFAULT, transition: 'all 0.15s', boxSizing: 'border-box' as const }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.05)'; (e.currentTarget as HTMLElement).style.color = navGold }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = NAV_DEFAULT }}>
          <span style={{ display: 'flex', alignItems: 'center', width: 20, flexShrink: 0 }}><MapPin size={14} strokeWidth={1.6} /></span>
          <span>Spiritual Mapping</span>
        </a>
        {navItem('Assessment', 'assessment', <ClipboardList size={16} strokeWidth={1.6} />)}

        {/* ── TRAINING (collapsible) ── */}
        <button onClick={() => setTrainingExpanded(e => !e)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 16px 6px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.18em', color: isDark ? '#6b5e45' : '#5C5248', textTransform: 'uppercase' as const, textAlign: 'left' as const, boxSizing: 'border-box' as const }}>
          <span style={{ flex: 1 }}>Training</span>
          <span style={{ fontSize: 10, display: 'inline-block', transform: trainingExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
        </button>
        {trainingExpanded && (
          <>
            {navItem('Courses', 'training', <Clapperboard size={16} strokeWidth={1.6} />)}
            {([{ label: "General's Table", icon: <Star size={13} strokeWidth={1.6} /> }, { label: 'Protocols', icon: <Sword size={13} strokeWidth={1.6} /> }] as { label: string; icon: React.ReactNode }[]).map(({ label, icon }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', opacity: 0.45 }}>
                <span style={{ display: 'flex', alignItems: 'center', width: 20 }}>{icon}</span>
                <span style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', color: isDark ? '#6b5e45' : '#5C5248', flex: 1 }}>{label}</span>
                <span style={{ fontSize: 8, fontFamily: cinzel, background: 'rgba(201,168,76,0.1)', color: '#8B7355', padding: '1px 6px', borderRadius: 3 }}>SOON</span>
              </div>
            ))}
          </>
        )}

        {/* ── EVENTS ── */}
        {navItem('Events', 'events', <Calendar size={16} strokeWidth={1.6} />)}

        {/* ── ADMIN (minister only) ── */}
        {(user?.publicMetadata?.role as string) === 'minister' && (
          <>
            <div style={{ height: 1, background: 'rgba(201,168,76,0.15)', margin: '12px 16px 8px' }} />
            <a href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 16px', background: 'rgba(201,168,76,0.06)', borderLeft: '2px solid rgba(201,168,76,0.4)', textDecoration: 'none', fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em', color: G, transition: 'background 0.15s', boxSizing: 'border-box' as const }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(201,168,76,0.12)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(201,168,76,0.06)' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', width: 20, flexShrink: 0 }}><Shield size={14} strokeWidth={1.6} /></span>
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
          <span style={{ display: 'flex', alignItems: 'center', width: 20, flexShrink: 0 }}><Settings size={14} strokeWidth={1.6} /></span>
          Settings
        </button>
        <div style={{ padding: '6px 16px 8px', display: 'flex', gap: 12 }}>
          <a href="/terms" style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: isDark ? '#3a3428' : '#9a8c74', textDecoration: 'none' }}>TERMS</a>
          <a href="/privacy" style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: isDark ? '#3a3428' : '#9a8c74', textDecoration: 'none' }}>PRIVACY</a>
        </div>
      </div>
    </>
  )

  // ── FULL LAYOUT ────────────────────────────────────────────
  return (
    <div style={{
      height: '100vh',
      display: isMobile ? 'block' : 'flex',
      background: V.bg,
      overflow: 'hidden',
      width: '100%',
      maxWidth: '100vw',
      position: 'relative',
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
        overflow: 'hidden' as const, WebkitOverflowScrolling: 'touch' as any,
        paddingBottom: 'env(safe-area-inset-bottom)',
      } : {
        display: 'flex', flexDirection: 'column', position: 'relative' as const,
        background: V.surf, borderRight: `1px solid ${isDark ? 'rgba(201,168,76,0.2)' : V.bdr}`,
        height: '100vh', overflowY: sidebarCollapsed ? 'hidden' : 'auto', flexShrink: 0,
        width: sidebarCollapsed ? '48px' : (isTablet ? '220px' : '280px'),
        transition: 'width 0.2s ease',
        overflow: 'hidden' as const,
      }}>
        <SidebarContent />
        {/* Desktop collapse toggle */}
        {!isMobile && (
          <button
            onClick={() => {
              const next = !sidebarCollapsed
              setSidebarCollapsed(next)
              try { localStorage.setItem('sidebar_collapsed', String(next)) } catch {}
            }}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              position: 'absolute' as const, bottom: 12, right: -12,
              width: 24, height: 24, borderRadius: '50%',
              background: isDark ? '#1a1714' : '#fff',
              border: `1px solid ${V.bdr}`,
              color: G, cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              transition: 'all 0.15s',
            }}
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>
        )}
      </div>

      {/* ── CENTER ── */}
      <div className="wri-bottom-nav-spacer" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, minHeight: 0, background: V.bg, height: isMobile ? '100vh' : undefined, width: isMobile ? '100%' : undefined, maxWidth: isMobile ? '100vw' : undefined }}>
        {activeSection === 'intel'         && <WeeklyIntelView theme={theme} userTier={tier} isMobile={isMobile} setSidebarOpen={setSidebarOpen} setActiveSection={setActiveSection} demons={demons} />}
        {activeSection === 'field-ministry' && <FieldMinistryView theme={theme} userTier={tier} isMobile={isMobile} setSidebarOpen={setSidebarOpen} />}
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
        {activeSection === 'database'    && (
          <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <DatabaseView theme={theme} isMobile={isMobile} isTablet={isTablet} setSidebarOpen={setSidebarOpen} userTier={tier} demons={demons} />
            <OnboardingOverlay storageKey="onboard_intel_archive" icon="📚" title="INTEL ARCHIVE" points={['Search 285+ spirits by name, kingdom, or manifestation','Click any spirit to open a full intelligence dossier with 4 tabs','Use AI Enhance to deepen any entry with ministry context','Companion spirits are clickable — explore the full demonic hierarchy']} />
          </div>
        )}
        {activeSection === 'investigate' && <InvestigatorView theme={theme} userTier={tier} isMobile={isMobile} setSidebarOpen={setSidebarOpen} />}
        {activeSection === 'arsenal'     && (
          <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <ArsenalView theme={theme} userTier={tier} isMobile={isMobile} setSidebarOpen={setSidebarOpen} />
            <OnboardingOverlay storageKey="onboard_arsenal" icon="✦" title="ARSENAL — MINISTRY RESOURCES" points={['Download protocols, worksheets, and teaching documents','Access level is based on your membership tier','Use Topic and Function filters to find what you need','Spirit Tags show which demons each document addresses']} />
          </div>
        )}
        {activeSection === 'testimony-wall' && (
          <TestimonyWallView
            theme={theme}
            isMobile={isMobile}
            setSidebarOpen={setSidebarOpen}
            userId={user?.id || ''}
            userName={user?.firstName || 'Warrior'}
            userTier={tier}
            userImage={user?.imageUrl || ''}
          />
        )}

        {activeSection === 'assessment'  && <LauncherView title="Assessment"        icon="📋" href="/assessment" />}
        {activeSection === 'help'        && <LauncherView title="Request Help"      icon="🙏" href="/help" />}
        {activeSection === 'fringe-feed' && <FringeIntelView theme={theme} isMobile={isMobile} setSidebarOpen={setSidebarOpen} />}
        {activeSection === 'body-map' && <BodyMapView isMobile={isMobile} setSidebarOpen={setSidebarOpen} demons={demons} setActiveSection={setActiveSection} />}
        {activeSection === 'spirit-network' && (
          <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <SpiritNetwork demons={demons} isDark={isDark} isMobile={isMobile} userTier={tier} userId={user?.id || ''} onNavigateTo={(section: string) => setActiveSection(section)} getToken={getToken} />
            <OnboardingOverlay storageKey="onboard_spirit_network" icon="⚔️" title="SPIRIT NETWORK COMMAND CENTER" points={['Search for any spirit to pull its full intelligence profile','The org chart shows where it sits in the demonic hierarchy','Click companion spirit chips to navigate the network','Use breadcrumbs at the top to trace back up the tree']} />
          </div>
        )}
        {activeSection === 'gateway' && (
          <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <GatewayInvestigatorView theme={theme} userTier={tier} isMobile={isMobile} setSidebarOpen={setSidebarOpen} />
            <OnboardingOverlay storageKey="onboard_gateway" icon="🧱" title="GATEWAY INVESTIGATOR" points={['Enter a spirit name to get its full entry point analysis','Add cultural exposure context for a more targeted report','The AI cross-references legal grounds, trauma patterns, and generational ties','Use this before or during a live deliverance session']} />
          </div>
        )}
        {activeSection === 'training'    && (
          <TrainingView
            theme={theme}
            isMobile={isMobile}
            setSidebarOpen={setSidebarOpen}
            userId={user?.id || ''}
            userTier={tier}
            getToken={getToken}
            setActiveSection={setActiveSection}
          />
        )}
        {activeSection === 'session-center' && (
          <SessionCenterView
            theme={theme}
            isMobile={isMobile}
            setSidebarOpen={setSidebarOpen}
            userId={user?.id || ''}
            getToken={getToken}
            demons={demons}
            userTier={tier}
            onLaunch={(sessionId?: string, caseFile?: any) => {
              setActiveSessionId(sessionId)
              setActiveSessionCF(caseFile)
              setSessionOpen(true)
            }}
          />
        )}
        {activeSection === 'events'      && <EventsView theme={theme} isMobile={isMobile} setSidebarOpen={setSidebarOpen} userTier={tier} getToken={getToken} />}
        {activeSection === 'feedback'    && <FeedbackView theme={theme} userTier={tier} isMobile={isMobile} setSidebarOpen={setSidebarOpen} userId={user?.id || ''} userName={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Warrior'} />}
        {activeSection === 'forum'       && (
          <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <ForumView isDark={isDark} isMobile={isMobile} userId={user?.id || ''} userTier={tier} />
            <OnboardingOverlay storageKey="onboard_ops_board" icon="💬" title="THE OPS BOARD" points={['Share field reports, revelations, and ministry questions with the community','Post types: Discussion, Question, Revelation, Field Report, Prayer, Resource','Soldier tier and above can create posts — all members can comment','Upvote valuable posts to surface the best intel']} />
          </div>
        )}
      </div>

      {/* ── SESSION COMMAND CENTER ── */}
      {sessionOpen && (
        <SessionCommandCenter
          sessionId={activeSessionId}
          caseFile={activeSessionCF}
          demons={demons}
          onClose={() => { setSessionOpen(false); setActiveSessionId(undefined); setActiveSessionCF(undefined) }}
        />
      )}

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
      {!isMobile && !isTablet && (
        <div style={{ display: 'flex', flexDirection: 'column', background: isDark ? V.surf : '#ede6db', borderLeft: `1px solid ${V.bdr}`, overflow: 'hidden', height: '100vh', flexShrink: 0, width: railOpen ? '280px' : '16px', position: 'relative', transition: 'width 0.2s ease' }}>
          {/* Toggle strip */}
          <button
            onClick={() => {
              const next = !railOpen
              setRailOpen(next)
              try { localStorage.setItem('wri-rail-open', String(next)) } catch {}
            }}
            style={{
              position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
              width: 16, height: 48,
              background: 'var(--bg-2)', border: `1px solid var(--gold-line)`,
              color: 'var(--t-3)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, zIndex: 10, padding: 0,
            }}
            title={railOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {railOpen ? '▶' : '◀'}
          </button>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 16px', display: railOpen ? 'block' : 'none' }}>

            {/* Prayer Wall widget */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${V.bdr}` }}>
                <SectionLabel action="+ ADD" onAction={() => setActiveSection('prayer-wall')}>
                  Prayer Wall
                </SectionLabel>
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
                    const timeAgo = (() => {
                      const diff = Date.now() - new Date(p.created_at).getTime()
                      if (diff < 60000) return 'just now'
                      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
                      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
                      return `${Math.floor(diff / 86400000)}d ago`
                    })()
                    return (
                      <div
                        key={p.id}
                        style={{ marginBottom: 8 }}
                        onMouseEnter={e => { setHoverY((e.currentTarget as HTMLElement).getBoundingClientRect().top); setHoveredPrayer(p) }}
                        onMouseLeave={() => setHoveredPrayer(null)}
                      >
                        <TacticalCard onClick={() => setActiveSection('prayer-wall')} padding={10}>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                            <div style={{ fontFamily: cinzel, fontSize: 12, color: 'var(--t-0)', letterSpacing: '0.06em' }}>{name}</div>
                            <MonoTime size={9} color="var(--t-4)">{timeAgo}</MonoTime>
                          </div>
                          <div style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: 'var(--t-1)', lineHeight: 1.6 }}>{preview}</div>
                        </TacticalCard>
                      </div>
                    )
                  })
                )}
              </div>
              </div>
            </div>

            {/* Recent Messages */}
            <div style={{ borderBottom: `1px solid ${V.bdr}`, padding: '0 0 8px' }}>
              <div style={{ padding: '10px 14px 8px' }}>
                <SectionLabel>Recent Messages</SectionLabel>
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' as const }}>
                {recentMessages.length === 0 ? (
                  <div style={{ padding: '8px 14px 12px', fontSize: '12px', color: V.mut, fontStyle: 'italic', fontFamily: crimson }}>
                    No messages yet
                  </div>
                ) : (
                  recentMessages.filter((msg: any) => msg.type !== 'deleted' && !msg.deleted_at).slice(0, 5).map((msg: any) => (
                    <div key={msg.id} style={{ padding: '4px 14px', marginBottom: 4 }}>
                      <TacticalCard onClick={() => setActiveSection('dms')} padding={10}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <StatusDot kind="info" size={5} />
                            <span style={{ fontFamily: cinzel, fontSize: 11, color: 'var(--t-0)', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: '110px' }}>
                              {msg.senderName}
                            </span>
                          </div>
                          <MonoTime size={9} color="var(--t-4)">{msg.timeAgo}</MonoTime>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--t-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                          {msg.text}
                        </div>
                      </TacticalCard>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Upcoming Calls */}
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${V.bdr}` }}>
              <div style={{ marginBottom: 12 }}>
                <SectionLabel>📅 Upcoming Calls</SectionLabel>
              </div>
              {UPCOMING_CALLS.map(ev => (
                <TacticalCard key={ev.title} padding="10px 12px" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: cinzel, fontSize: 13, letterSpacing: '0.04em', color: 'var(--t-0)' }}>{ev.title}</span>
                    <ClassBadge
                      level={ev.badge === 'General' ? 'I' : ev.badge === 'Commander' ? 'II' : ev.badge === 'Soldier' ? 'III' : 'IV'}
                      label={ev.badge.toUpperCase()}
                    />
                  </div>
                  <MonoTime color="var(--gold)" size={10}>{ev.date}</MonoTime>
                </TacticalCard>
              ))}
            </div>

            {/* Warriors */}
            <div style={{ padding: '14px 16px', position: 'relative', overflow: 'visible' }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <SectionLabel>Warriors</SectionLabel>
                  <HUDChip>{Object.values(memberPresence).filter(p => p.online).length + 1} online</HUDChip>
                </div>
              </div>
              {/* Current user always shown first */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-3)', border: `1px solid ${V.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 10, color: G, overflow: 'hidden' }}>
                  {user?.imageUrl ? <img src={user.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : initials}
                </div>
                <div>
                  <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.04em', color: 'var(--t-0)' }}>{user?.firstName || 'You'}</div>
                  <ClassBadge level={tier === 'General' ? 'I' : tier === 'Commander' ? 'II' : tier === 'Soldier' ? 'III' : 'IV'} label={tier.toUpperCase()} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                    <StatusDot kind="ok" size={4} />
                  </div>
                </div>
              </div>
              {/* Other members — sorted by last active */}
              {[...members.filter(m => m.id !== user?.id)]
                .sort((a, b) => {
                  const aTime = new Date(a.lastActiveAt || a.lastSignInAt || 0).getTime()
                  const bTime = new Date(b.lastActiveAt || b.lastSignInAt || 0).getTime()
                  return bTime - aTime
                })
                .slice(0, 6)
                .map((member, index) => {
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
                const presence = memberPresence[member.id]
                const isOnline = presence?.online === true
                const lastActive = presence?.lastActive ?? null
                return (
                  <div
                    key={member.id}
                    style={{ position: 'relative', overflow: 'visible' }}
                    onMouseEnter={() => showWarriorCard(member.id)}
                    onMouseLeave={hideWarriorCard}
                  >
                    <button
                      onClick={() => setViewingProfile(member)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' as const }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-3)', border: `1px solid ${tierColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontFamily: cinzel, color: '#C9A84C', overflow: 'hidden', flexShrink: 0 }}>
                        {member.imageUrl ? <img src={member.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : displayName[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontFamily: cinzel, fontSize: 11, color: 'var(--t-0)', letterSpacing: '0.03em' }}>{displayName}</div>
                        <ClassBadge level={memberTier === 'General' ? 'I' : memberTier === 'Commander' ? 'II' : memberTier === 'Soldier' ? 'III' : 'IV'} label={memberTier.toUpperCase()} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                          {isOnline
                            ? <StatusDot kind="ok" size={4} />
                            : lastActive ? <span style={{ fontSize: 9, color: 'var(--t-4)', fontFamily: 'var(--font-mono)' }}>{streamTimeAgo(lastActive)}</span> : null
                          }
                        </div>
                      </div>
                    </button>
                    {hoveredWarrior === member.id && member.id !== currentUserId && (
                      <div
                        onMouseEnter={() => clearTimeout(warriorHoverTimer.current!)}
                        onMouseLeave={hideWarriorCard}
                        style={{
                          position: 'absolute',
                          bottom: index > 1 ? 'calc(100% + 6px)' : 'auto',
                          top: index > 1 ? 'auto' : 'calc(100% + 6px)',
                          right: 0,
                          left: 0,
                          background: '#0f0c07',
                          border: '1px solid #3a3020',
                          borderTop: index > 1 ? '2px solid #C9A84C' : '1px solid #3a3020',
                          borderBottom: index > 1 ? '1px solid #3a3020' : '2px solid #C9A84C',
                          borderRadius: 6,
                          padding: '12px 14px',
                          zIndex: 200,
                          boxShadow: index > 1 ? '0 -8px 24px rgba(0,0,0,0.6)' : '0 8px 24px rgba(0,0,0,0.6)',
                          minWidth: 160,
                        }}
                      >
                        <div style={{ fontFamily: cinzel, fontSize: 11, color: '#C9A84C', letterSpacing: '0.1em', marginBottom: 10, borderBottom: '1px solid #1e1a0e', paddingBottom: 8 }}>
                          {displayName}
                        </div>
                        <button
                          onClick={() => setViewingProfile(member)}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = '#C9A84C')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2218')}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: 'transparent', border: '1px solid #2a2218', borderRadius: 4, color: '#8a7a60', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', marginBottom: 6, textAlign: 'left' as const }}
                        >👤 PROFILE</button>
                        <button
                          onClick={() => { setPendingDMWith(member.id); setActiveSection('dms') }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = '#C9A84C')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2218')}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: 'transparent', border: '1px solid #2a2218', borderRadius: 4, color: '#8a7a60', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', textAlign: 'left' as const }}
                        >💬 MESSAGE</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── AI CHATBOT ── */}
      {chatOpen && (
        <div style={{
          position: 'fixed',
          bottom: isMobile ? 0 : 84,
          right: isMobile ? 0 : 24,
          left: isMobile ? 0 : undefined,
          width: isMobile ? '100%' : 340,
          height: isMobile ? '70vh' : 460,
          background: '#0f0c07',
          border: '1px solid #3a3020',
          borderTop: '2px solid #C9A84C',
          borderRadius: isMobile ? '12px 12px 0 0' : 8,
          display: 'flex',
          flexDirection: 'column' as const,
          zIndex: 1001,
          boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
        }}>
          <div style={{ padding: '0 14px', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e1a0e', flexShrink: 0 }}>
            <span style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.12em' }}>⚔ WAR ROOM AI</span>
            <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: '#6b5e45', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' as const, padding: 12, display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {chatMessages.length === 0 && (
              <div style={{ textAlign: 'center' as const, padding: '32px 16px', color: '#6b5e45', fontFamily: crimson, fontSize: 13, lineHeight: 1.6 }}>
                Ask about demonic hierarchies, spiritual warfare strategy, deliverance protocols, or any ministry question.
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%',
                  padding: '8px 12px',
                  borderRadius: msg.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                  background: msg.role === 'user' ? 'rgba(201,168,76,0.1)' : '#1a1408',
                  border: msg.role === 'user' ? '1px solid rgba(201,168,76,0.3)' : '1px solid #2a2010',
                  lineHeight: 1.6,
                }}>
                  {msg.role === 'user' ? (
                    <span style={{ fontFamily: crimson, fontSize: 14, color: '#e8d9b0', whiteSpace: 'pre-wrap' as const }}>{msg.content}</span>
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} style={{ fontFamily: crimson, fontSize: 14, color: '#a89878', lineHeight: 1.7 }} />
                  )}
                </div>
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => exportToPDF(msg.content)}
                    style={{ marginTop: 4, background: 'none', border: 'none', color: '#6b5e45', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer', padding: '2px 4px' }}
                  >
                    ↓ EXPORT
                  </button>
                )}
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '8px 14px', background: '#1a1408', border: '1px solid #2a2010', borderRadius: '10px 10px 10px 2px', color: '#6b5e45', fontFamily: crimson, fontSize: 13 }}>
                  Analyzing…
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding: 12, borderTop: '1px solid #1e1a0e', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                rows={2}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(chatInput) } }}
                placeholder="Ask a question…"
                style={{ flex: 1, background: '#1a1408', border: '1px solid #2a2010', borderRadius: 6, padding: '8px 10px', color: '#c8b896', fontFamily: crimson, fontSize: 13, resize: 'none' as const, outline: 'none' }}
              />
              <button
                onClick={() => sendChat(chatInput)}
                disabled={chatLoading || !chatInput.trim()}
                style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 6, padding: '0 14px', color: G, fontFamily: cinzel, fontSize: 10, cursor: chatLoading || !chatInput.trim() ? 'not-allowed' : 'pointer', opacity: chatLoading || !chatInput.trim() ? 0.5 : 1, flexShrink: 0, letterSpacing: '0.06em' }}
              >
                SEND
              </button>
            </div>
          </div>
        </div>
      )}
      <button
        onClick={() => setChatOpen(o => !o)}
        style={{
          position: 'fixed',
          bottom: isMobile ? 24 : 24,
          right: isMobile ? 16 : 24,
          zIndex: 1000,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: chatOpen ? 'rgba(201,168,76,0.2)' : '#0f0c07',
          border: `1px solid ${chatOpen ? G : 'rgba(201,168,76,0.4)'}`,
          color: G,
          fontSize: 22,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          transition: 'all 0.15s',
        }}
        title="War Room AI"
      >
        🧠
      </button>

      <BottomNav
        tabs={[
          { id: 'home',    label: 'Home',    icon: <Home size={20} strokeWidth={1.6} /> },
          { id: 'intel',   label: 'Intel',   icon: <FileText size={20} strokeWidth={1.6} /> },
          { id: 'ops',     label: 'Ops',     icon: <Crosshair size={20} strokeWidth={1.6} /> },
          { id: 'profile', label: 'Profile', icon: <User size={20} strokeWidth={1.6} /> },
        ]}
        activeId={activeSection}
        onTab={(id) => setActiveSection(id)}
        onFAB={() => setActiveSection('session')}
        onLongPress={() => {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
        }}
        fabIcon={<Plus size={24} color="#1a1305" strokeWidth={2.2} />}
      />
    </div>
  )
}
