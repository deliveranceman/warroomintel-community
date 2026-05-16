import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { useAuth, useUser, SignInButton, SignUpButton } from '@clerk/tanstack-start'
import { StreamChat, type Channel as StreamChannel } from 'stream-chat'
import {
  Chat,
  Channel,
  ChannelList,
  Window,
  ChannelHeader,
  MessageList,
  MessageInput,
} from 'stream-chat-react'
import 'stream-chat-react/dist/css/v2/index.css'

export const Route = createFileRoute('/community')({
  component: CommunityPage,
})

const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"
const gold    = 'var(--gold)'
const deep    = 'var(--deep)'
const surface = 'var(--surface)'
const border  = 'var(--border)'
const textDim = 'var(--text-dim)'
const muted   = 'var(--muted)'

const CHANNEL_META: Record<string, { name: string; icon: string; desc: string; minTier: string }> = {
  'war-room-general':       { name: 'War Room General',       icon: '⚔', desc: 'Open to all members',         minTier: 'Free' },
  'intelligence-briefings': { name: 'Intelligence Briefings', icon: '📋', desc: 'Soldier and above',           minTier: 'Soldier' },
  'ministry-operations':    { name: 'Ministry Operations',    icon: '🗡', desc: 'Commander and above',         minTier: 'Commander' },
  'generals-table':         { name: "General's Table",        icon: '✦', desc: 'General members only',        minTier: 'General' },
}

const TIER_ORDER: Record<string, number> = { Free: 0, Soldier: 1, Commander: 2, General: 3 }

function getAllowedChannelIds(tier: string): string[] {
  return Object.entries(CHANNEL_META)
    .filter(([, meta]) => TIER_ORDER[tier] >= TIER_ORDER[meta.minTier])
    .map(([id]) => id)
}

// ── Sign-in gate ──────────────────────────────────────────
function SignInGate() {
  return (
    <div style={{
      minHeight: 'calc(100vh - 73px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'var(--deep)',
    }}>
      <div style={{
        background: surface,
        border: `1px solid ${border}`,
        borderRadius: '8px',
        padding: '3rem 2.5rem',
        maxWidth: '420px',
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚔</div>
        <h2 style={{ fontFamily: cinzel, fontSize: '18px', color: gold, letterSpacing: '0.1em', marginBottom: '12px' }}>
          War Room Community
        </h2>
        <p style={{ fontFamily: crimson, fontSize: '16px', color: textDim, fontStyle: 'italic', lineHeight: 1.7, marginBottom: '28px' }}>
          Sign in to access the War Room community — a live space for deliverance warriors.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <SignInButton mode="modal">
            <button style={{
              width: '100%', padding: '13px',
              background: gold, color: deep,
              border: 'none', borderRadius: '4px',
              fontFamily: cinzel, fontSize: '11px',
              letterSpacing: '0.12em', cursor: 'pointer',
              fontWeight: 700, textTransform: 'uppercase',
            }}>
              Sign In ⚔
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button style={{
              width: '100%', padding: '13px',
              background: 'transparent', color: gold,
              border: `1px solid ${border}`, borderRadius: '4px',
              fontFamily: cinzel, fontSize: '11px',
              letterSpacing: '0.12em', cursor: 'pointer',
              textTransform: 'uppercase',
            }}>
              Join Free
            </button>
          </SignUpButton>
        </div>
      </div>
    </div>
  )
}

// ── Custom channel preview ────────────────────────────────
function CustomChannelPreview({ channel, active, setActiveChannel }: any) {
  const meta = CHANNEL_META[channel.id] || { name: channel.data?.name || channel.id, icon: '💬', desc: '' }
  const unread = channel.countUnread()
  return (
    <button
      onClick={() => setActiveChannel(channel)}
      style={{
        width: '100%', padding: '12px 16px',
        background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
        border: 'none',
        borderLeft: active ? `2px solid ${gold}` : '2px solid transparent',
        cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: '10px',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(201,168,76,0.06)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ fontSize: '16px', flexShrink: 0 }}>{meta.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
          <span style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.08em', color: active ? gold : textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {meta.name}
          </span>
          {unread > 0 && (
            <span style={{ background: gold, color: deep, borderRadius: '10px', fontFamily: cinzel, fontSize: '8px', padding: '1px 6px', flexShrink: 0 }}>{unread}</span>
          )}
        </div>
        <div style={{ fontFamily: crimson, fontSize: '11px', color: muted, fontStyle: 'italic' }}>{meta.desc}</div>
      </div>
    </button>
  )
}

// ── Locked channel placeholder ────────────────────────────
function LockedChannel({ channelId }: { channelId: string }) {
  const meta = CHANNEL_META[channelId]
  return (
    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.4 }}>
      <span style={{ fontSize: '16px' }}>{meta.icon}</span>
      <div>
        <div style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.08em', color: textDim }}>{meta.name}</div>
        <div style={{ fontFamily: cinzel, fontSize: '8px', color: muted, letterSpacing: '0.06em' }}>🔒 {meta.desc}</div>
      </div>
    </div>
  )
}

// ── Main community page ───────────────────────────────────
function CommunityPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()

  const [client, setClient] = useState<StreamChat | null>(null)
  const [activeChannel, setActiveChannel] = useState<StreamChannel | null>(null)
  const [tier, setTier] = useState('Free')
  const [error, setError] = useState<string | null>(null)
  const clientRef = useRef<StreamChat | null>(null)

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return

    let cancelled = false

    async function init() {
      try {
        const clerkToken = await getToken()
        if (!clerkToken) throw new Error('No Clerk token')

        // Fetch Stream token + tier
        const [tokenRes] = await Promise.all([
          fetch('/api/stream-token', {
            headers: { 'Authorization': `Bearer ${clerkToken}` },
          }),
        ])

        const { token, error: tokenError } = await tokenRes.json()
        if (tokenError || !token) throw new Error(tokenError || 'Token fetch failed')

        const userTier = (user.publicMetadata?.tier as string) || 'Free'
        if (!cancelled) setTier(userTier)

        const streamClient = StreamChat.getInstance(import.meta.env.VITE_STREAM_API_KEY)

        if (streamClient.userID) {
          // Already connected — reuse
        } else {
          await streamClient.connectUser(
            {
              id: user.id,
              name: user.fullName || user.firstName || 'Warrior',
              image: user.imageUrl,
              tier: userTier,
            },
            token,
          )
        }

        // Ensure allowed channels exist
        const allowedIds = getAllowedChannelIds(userTier)
        for (const id of allowedIds) {
          const ch = streamClient.channel('messaging', id, {
            name: CHANNEL_META[id]?.name || id,
            members: [user.id],
          })
          await ch.watch()
        }

        clientRef.current = streamClient

        if (!cancelled) {
          setClient(streamClient)
          // Default to war-room-general
          const defaultCh = streamClient.channel('messaging', 'war-room-general')
          setActiveChannel(defaultCh)
        }
      } catch (err: any) {
        console.error('[community] init error:', err.message)
        if (!cancelled) setError(err.message)
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, user])

  // Disconnect on unmount
  useEffect(() => {
    return () => {
      clientRef.current?.disconnectUser()
    }
  }, [])

  if (!isLoaded) {
    return (
      <div style={{ minHeight: 'calc(100vh - 73px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--deep)' }}>
        <span style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.12em', color: gold }}>Loading...</span>
      </div>
    )
  }

  if (!isSignedIn) {
    return <SignInGate />
  }

  if (error) {
    return (
      <div style={{ minHeight: 'calc(100vh - 73px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--deep)', padding: '2rem' }}>
        <div style={{ textAlign: 'center', color: textDim }}>
          <div style={{ fontFamily: cinzel, fontSize: '13px', color: gold, marginBottom: '8px' }}>Connection error</div>
          <p style={{ fontFamily: crimson, fontSize: '14px', fontStyle: 'italic' }}>{error}</p>
          <p style={{ fontFamily: cinzel, fontSize: '10px', color: muted, marginTop: '12px' }}>Check that VITE_STREAM_API_KEY, STREAM_API_KEY, and STREAM_API_SECRET are set.</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div style={{ minHeight: 'calc(100vh - 73px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--deep)' }}>
        <span style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.12em', color: gold }}>Connecting to War Room...</span>
      </div>
    )
  }

  const allowedChannelIds = getAllowedChannelIds(tier)
  const lockedChannelIds  = Object.keys(CHANNEL_META).filter(id => !allowedChannelIds.includes(id))
  const filters = { type: 'messaging', id: { $in: allowedChannelIds } } as const
  const sort    = [{ last_message_at: -1 as const }]

  return (
    <>
      <style>{`
        /* Override Stream's default theme to match WRI dark aesthetic */
        .str-chat {
          --str-chat__primary-color: var(--gold) !important;
          --str-chat__active-primary-color: var(--gold-light) !important;
          --str-chat__surface-color: var(--surface) !important;
          --str-chat__secondary-surface-color: var(--surface2) !important;
          --str-chat__primary-surface-color: var(--dropdown-bg) !important;
          --str-chat__text-color: var(--text) !important;
          --str-chat__secondary-text-color: var(--text-dim) !important;
          --str-chat__disabled-color: var(--muted) !important;
          --str-chat__border-radius-circle: 50% !important;
          font-family: 'Crimson Pro', serif !important;
        }
        [data-theme="light"] .str-chat {
          --str-chat__surface-color: #f8f5ee !important;
          --str-chat__secondary-surface-color: #f0ece0 !important;
          --str-chat__primary-surface-color: #ffffff !important;
        }
        .str-chat__channel-header {
          font-family: 'Cinzel', serif !important;
          font-size: 12px !important;
          letter-spacing: 0.1em !important;
        }
        .str-chat__message-input {
          border-top: 1px solid var(--border) !important;
        }
        .str-chat__send-button {
          color: var(--gold) !important;
        }
      `}</style>

      <div style={{
        height: 'calc(100vh - 73px)',
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        background: 'var(--deep)',
        overflow: 'hidden',
      }}>
        {/* Sidebar */}
        <div style={{
          borderRight: `1px solid ${border}`,
          display: 'flex',
          flexDirection: 'column',
          background: surface,
          overflow: 'hidden',
        }}>
          {/* Sidebar header */}
          <div style={{ padding: '16px', borderBottom: `1px solid ${border}` }}>
            <div style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.18em', color: gold, marginBottom: '4px' }}>WAR ROOM</div>
            <div style={{ fontFamily: cinzel, fontSize: '8px', letterSpacing: '0.2em', color: muted }}>INTEL COMMUNITY</div>
            <div style={{ marginTop: '8px', fontFamily: cinzel, fontSize: '8px', letterSpacing: '0.1em', color: muted, padding: '3px 8px', background: 'rgba(201,168,76,0.08)', border: `1px solid rgba(201,168,76,0.2)`, borderRadius: '2px', display: 'inline-block' }}>
              {tier.toUpperCase()}
            </div>
          </div>

          {/* Channel list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '10px 16px 4px', fontFamily: cinzel, fontSize: '7px', letterSpacing: '0.22em', color: muted }}>CHANNELS</div>
            <Chat client={client}>
              <ChannelList
                filters={filters}
                sort={sort}
                Preview={(props) => (
                  <CustomChannelPreview
                    {...props}
                    active={activeChannel?.id === props.channel.id}
                    setActiveChannel={setActiveChannel}
                  />
                )}
              />
            </Chat>

            {lockedChannelIds.length > 0 && (
              <>
                <div style={{ padding: '10px 16px 4px', fontFamily: cinzel, fontSize: '7px', letterSpacing: '0.22em', color: muted, marginTop: '8px' }}>LOCKED</div>
                {lockedChannelIds.map(id => <LockedChannel key={id} channelId={id} />)}
              </>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeChannel ? (
            <Chat client={client}>
              <Channel channel={activeChannel}>
                <Window>
                  <ChannelHeader />
                  <MessageList />
                  <MessageInput />
                </Window>
              </Channel>
            </Chat>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted, fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.1em' }}>
              Select a channel to begin
            </div>
          )}
        </div>
      </div>
    </>
  )
}
