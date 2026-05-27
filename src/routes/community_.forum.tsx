import { createFileRoute } from '@tanstack/react-router'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { useState, useEffect, useRef, useCallback } from 'react'

export const Route = createFileRoute('/community_/forum')({
  ssr: false,
  component: ForumPage,
})

// ── Constants ─────────────────────────────────────────────────────────────────
const G       = '#C9A84C'
const BG      = '#0D0B14'
const SURF    = 'rgba(255,255,255,0.03)'
const SURF2   = 'rgba(255,255,255,0.06)'
const BDR     = 'rgba(201,168,76,0.15)'
const TXT     = '#f0e8d8'
const DIM     = '#8B7355'
const MUT     = '#6b5e45'
const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

const TIER_LEVELS: Record<string, number> = {
  free: 0, watchman: 0, soldier: 1, commander: 2, general: 3, minister: 99,
}

const POST_TYPES: Record<string, { label: string; color: string; bg: string; placeholder: string }> = {
  discussion:  { label: 'Discussion',  color: '#C9A84C', bg: 'rgba(201,168,76,0.12)',   placeholder: 'Share your thoughts with the community…'              },
  question:    { label: 'Question',    color: '#4A9EE8', bg: 'rgba(74,158,232,0.12)',   placeholder: 'What\'s your question for the community?'             },
  revelation:  { label: 'Revelation',  color: '#9B7FD4', bg: 'rgba(155,127,212,0.12)', placeholder: 'What has God shown you?'                              },
  field_report:{ label: 'Field Report',color: '#D4524A', bg: 'rgba(212,82,74,0.12)',   placeholder: 'What happened in the field?'                          },
  prayer:      { label: 'Prayer',      color: '#4CAF7D', bg: 'rgba(76,175,125,0.12)',  placeholder: 'How can we pray with you?'                            },
  resource:    { label: 'Resource',    color: '#4AB8C9', bg: 'rgba(74,184,201,0.12)',  placeholder: 'Tell us about this resource…'                         },
}

const TIER_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  minister:  { label: 'Minister',  color: '#C9A84C', bg: 'rgba(201,168,76,0.15)'  },
  general:   { label: 'General',   color: '#e2c96e', bg: 'rgba(226,201,110,0.12)' },
  commander: { label: 'Commander', color: '#a0c4e8', bg: 'rgba(160,196,232,0.12)' },
  soldier:   { label: 'Soldier',   color: '#9de0ad', bg: 'rgba(157,224,173,0.12)' },
  free:      { label: 'Watchman',  color: '#8B7355', bg: 'rgba(139,115,85,0.1)'   },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

function TierPill({ tier }: { tier: string }) {
  const s = TIER_STYLES[tier] || TIER_STYLES.free
  return (
    <span style={{ background: s.bg, color: s.color, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', padding: '1px 7px', borderRadius: 10, border: `1px solid ${s.color}44`, flexShrink: 0 }}>
      {s.label}
    </span>
  )
}

// ── Tag Input ─────────────────────────────────────────────────────────────────
function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
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
    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, padding: '6px 10px', background: SURF2, border: `1px solid ${BDR}`, borderRadius: 6, cursor: 'text', minHeight: 38, alignItems: 'center' }}
      onClick={e => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}>
      {tags.map(t => (
        <span key={t} style={{ background: 'rgba(74,158,232,0.12)', color: '#4A9EE8', fontFamily: cinzel, fontSize: 9, padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(74,158,232,0.3)', display: 'flex', alignItems: 'center', gap: 4 }}>
          {t}
          <button type="button" onClick={() => onChange(tags.filter(x => x !== t))} style={{ background: 'transparent', border: 'none', color: '#4A9EE8', cursor: 'pointer', padding: 0, fontSize: 10, lineHeight: 1 }}>×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => input.trim() && add(input)}
        placeholder={tags.length === 0 ? 'Add tags (Enter to add)…' : ''}
        style={{ border: 'none', background: 'transparent', outline: 'none', color: TXT, fontFamily: crimson, fontSize: 13, flex: 1, minWidth: 120 }}
      />
    </div>
  )
}

// ── Resource Preview Card ─────────────────────────────────────────────────────
function ResourceCard({ url, title, thumbnail, description, domain }: any) {
  if (!url) return null
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      style={{ display: 'flex', gap: 12, background: SURF2, border: `1px solid ${BDR}`, borderRadius: 8, padding: '10px 12px', textDecoration: 'none', alignItems: 'flex-start', marginTop: 8 }}>
      {thumbnail && (
        <img src={thumbnail} alt="" style={{ width: 80, height: 56, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontFamily: cinzel, fontSize: 11, color: TXT, letterSpacing: '0.04em', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{title}</div>}
        {description && <div style={{ fontFamily: crimson, fontSize: 12, color: DIM, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{description}</div>}
        {domain && <div style={{ fontFamily: cinzel, fontSize: 8, color: MUT, marginTop: 4, letterSpacing: '0.08em' }}>{domain}</div>}
      </div>
    </a>
  )
}

// ── New Post Composer ─────────────────────────────────────────────────────────
function PostComposer({ onPost, onCancel, canPost }: { onPost: (p: any) => void; onCancel: () => void; canPost: boolean }) {
  const { getToken } = useAuth()
  const [postType, setPostType]  = useState('discussion')
  const [title, setTitle]        = useState('')
  const [body, setBody]          = useState('')
  const [tags, setTags]          = useState<string[]>([])
  const [resourceUrl, setResourceUrl] = useState('')
  const [ogData, setOgData]      = useState<any>(null)
  const [ogLoading, setOgLoading]= useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]        = useState('')

  const tc = POST_TYPES[postType]

  async function fetchOg(url: string) {
    if (!url.trim()) return
    setOgLoading(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/forum-og', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
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
      if (body.trim())              payload.body               = body.trim()
      if (resourceUrl.trim())       payload.resource_url       = resourceUrl.trim()
      if (ogData?.title)            payload.resource_title     = ogData.title
      if (ogData?.thumbnail)        payload.resource_thumbnail = ogData.thumbnail
      if (ogData?.description)      payload.resource_description = ogData.description
      const res = await fetch('/api/forum-posts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const d = await res.json()
        onPost(d.post)
        setTitle(''); setBody(''); setTags([]); setResourceUrl(''); setOgData(null); setPostType('discussion')
      } else {
        const d = await res.json()
        setError(d.error || 'Failed to post')
      }
    } catch { setError('Network error') }
    setSubmitting(false)
  }

  const inputSt: React.CSSProperties = { width: '100%', background: SURF2, border: `1px solid ${BDR}`, borderRadius: 6, padding: '9px 12px', color: TXT, fontFamily: crimson, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 12, padding: '20px 22px', marginBottom: 16 }}>
      <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.1em', marginBottom: 16 }}>⚔ New Post</div>

      {/* Type selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 14 }}>
        {Object.entries(POST_TYPES).map(([k, v]) => (
          <button key={k} type="button" onClick={() => setPostType(k)}
            style={{ background: postType === k ? v.bg : 'transparent', border: `1px solid ${postType === k ? v.color : BDR}`, borderRadius: 20, padding: '4px 14px', cursor: 'pointer', fontFamily: cinzel, fontSize: 9, color: postType === k ? v.color : DIM, letterSpacing: '0.08em' }}>
            {v.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
        <input placeholder="Title (required)" value={title} onChange={e => setTitle(e.target.value)} maxLength={200} style={inputSt} />

        {postType !== 'resource' && (
          <textarea placeholder={tc.placeholder} value={body} onChange={e => setBody(e.target.value)} rows={5} maxLength={20000}
            style={{ ...inputSt, resize: 'vertical' as const }} />
        )}

        {postType === 'resource' && (
          <>
            <textarea placeholder={tc.placeholder} value={body} onChange={e => setBody(e.target.value)} rows={3} maxLength={2000}
              style={{ ...inputSt, resize: 'vertical' as const }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Resource URL" value={resourceUrl} onChange={e => setResourceUrl(e.target.value)}
                onBlur={() => resourceUrl.trim() && fetchOg(resourceUrl)}
                onPaste={e => { setTimeout(() => { const v = (e.target as HTMLInputElement).value; if (v.startsWith('http')) fetchOg(v) }, 100) }}
                style={{ ...inputSt, flex: 1 }} />
              {ogLoading && <span style={{ color: DIM, fontFamily: cinzel, fontSize: 10, alignSelf: 'center' }}>Fetching…</span>}
            </div>
            {ogData && <ResourceCard {...ogData} url={resourceUrl} />}
          </>
        )}

        <TagInput tags={tags} onChange={setTags} />
        {error && <div style={{ color: '#f87171', fontFamily: crimson, fontSize: 12 }}>{error}</div>}
        {!canPost && <div style={{ color: DIM, fontFamily: crimson, fontSize: 12, fontStyle: 'italic' }}>Soldier+ tier required to post. You can still comment on existing posts.</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} style={{ background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 6, color: DIM, fontFamily: cinzel, fontSize: 9, padding: '8px 18px', cursor: 'pointer', letterSpacing: '0.08em' }}>Cancel</button>
          <button type="button" onClick={submit} disabled={submitting || !canPost}
            style={{ background: canPost ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${canPost ? 'rgba(201,168,76,0.4)' : BDR}`, borderRadius: 6, color: canPost ? G : MUT, fontFamily: cinzel, fontSize: 9, padding: '8px 20px', cursor: canPost ? 'pointer' : 'not-allowed', letterSpacing: '0.08em', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Post Edit Form (inline) ───────────────────────────────────────────────────
function PostEditForm({ post, onSave, onCancel }: any) {
  const { getToken } = useAuth()
  const [title, setTitle]  = useState(post.title || '')
  const [body, setBody]    = useState(post.body || '')
  const [tags, setTags]    = useState<string[]>(post.tags || [])
  const [saving, setSaving]= useState(false)
  const [error, setError]  = useState('')
  const inputSt: React.CSSProperties = { width: '100%', background: SURF2, border: `1px solid ${BDR}`, borderRadius: 6, padding: '8px 12px', color: TXT, fontFamily: crimson, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }

  async function save() {
    if (!title.trim()) { setError('Title required'); return }
    setSaving(true)
    const token = await getToken()
    const res = await fetch('/api/forum-posts', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: post.id, title: title.trim(), body: body.trim(), tags }),
    })
    if (res.ok) { const d = await res.json(); onSave(d.post) }
    else { const d = await res.json(); setError(d.error || 'Failed to save') }
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
      <input value={title} onChange={e => setTitle(e.target.value)} style={inputSt} placeholder="Title" />
      <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} style={{ ...inputSt, resize: 'vertical' as const }} />
      <TagInput tags={tags} onChange={setTags} />
      {error && <div style={{ color: '#f87171', fontFamily: crimson, fontSize: 12 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} disabled={saving} style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 5, color: G, fontFamily: cinzel, fontSize: 9, padding: '6px 16px', cursor: 'pointer' }}>{saving ? '…' : 'Save'}</button>
        <button onClick={onCancel} style={{ background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 5, color: DIM, fontFamily: cinzel, fontSize: 9, padding: '6px 12px', cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}

// ── Comments Section ──────────────────────────────────────────────────────────
function CommentsSection({ postId, commentCount, userId, isMinister, getToken }: any) {
  const [comments,  setComments]  = useState<any[]>([])
  const [loaded,    setLoaded]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [draft,     setDraft]     = useState('')
  const [submitting,setSubmitting]= useState(false)

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
      const res = await fetch('/api/forum-comments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, body: draft.trim() }),
      })
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
    <div style={{ borderTop: `1px solid ${BDR}`, padding: '14px 16px 16px' }}>
      <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.1em', marginBottom: 12 }}>
        {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
      </div>

      {loading && <div style={{ color: DIM, fontFamily: cinzel, fontSize: 9, padding: '8px 0' }}>Loading…</div>}

      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 14 }}>
        {comments.map(c => (
          <div key={c.id} style={{ background: SURF2, borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' as const }}>
              <span style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.05em' }}>{c.author_name}</span>
              <TierPill tier={c.author_tier} />
              <span style={{ fontFamily: cinzel, fontSize: 8, color: MUT }}>{timeAgo(c.created_at)}</span>
              {(c.user_id === userId || isMinister) && (
                <button onClick={() => del(c.id)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: MUT, cursor: 'pointer', fontSize: 11, padding: '0 2px', opacity: 0.6 }} title="Delete">✕</button>
              )}
            </div>
            <div style={{ fontFamily: crimson, fontSize: 13, color: TXT, lineHeight: 1.6, whiteSpace: 'pre-wrap' as const }}>{c.body}</div>
          </div>
        ))}
      </div>

      {/* Comment compose */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          placeholder="Write a comment… (Cmd+Enter to submit)"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
          rows={2}
          style={{ flex: 1, background: SURF2, border: `1px solid ${BDR}`, borderRadius: 6, padding: '8px 10px', color: TXT, fontFamily: crimson, fontSize: 13, outline: 'none', resize: 'none' as const }}
        />
        <button onClick={submit} disabled={submitting || !draft.trim()}
          style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: 6, color: G, fontFamily: cinzel, fontSize: 9, padding: '9px 14px', cursor: 'pointer', opacity: (!draft.trim() || submitting) ? 0.4 : 1, whiteSpace: 'nowrap' as const, letterSpacing: '0.08em' }}>
          {submitting ? '…' : 'Reply'}
        </button>
      </div>
    </div>
  )
}

// ── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({ post, userId, isMinister, getToken, onUpdate, onDelete }: any) {
  const [expanded,  setExpanded]  = useState(false)
  const [editing,   setEditing]   = useState(false)
  const [voting,    setVoting]    = useState(false)
  const tc = POST_TYPES[post.post_type] || POST_TYPES.discussion

  async function vote(e: React.MouseEvent) {
    e.stopPropagation()
    if (voting) return
    setVoting(true)
    const token = await getToken()
    const res = await fetch('/api/forum-vote', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post.id }),
    })
    if (res.ok) { const d = await res.json(); onUpdate({ ...post, upvotes: d.upvotes, voted: d.voted }) }
    setVoting(false)
  }

  async function togglePin(e: React.MouseEvent) {
    e.stopPropagation()
    const token = await getToken()
    const res = await fetch('/api/forum-posts', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: post.id, pinned: !post.pinned }),
    })
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

  return (
    <div style={{ background: SURF, border: `1px solid ${post.pinned ? 'rgba(201,168,76,0.4)' : BDR}`, borderLeft: post.pinned ? `3px solid ${G}` : '3px solid transparent', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 0 }}>

        {/* Upvote column */}
        <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: '16px 10px', gap: 2, borderRight: `1px solid ${BDR}`, flexShrink: 0, width: 52 }}>
          <button onClick={vote} title={post.voted ? 'Remove vote' : 'Upvote'}
            style={{ background: post.voted ? 'rgba(201,168,76,0.15)' : 'transparent', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2, transition: 'background 0.15s' }}>
            <span style={{ fontSize: 14, color: post.voted ? G : MUT }}>▲</span>
            <span style={{ fontFamily: cinzel, fontSize: 11, color: post.voted ? G : DIM, letterSpacing: '0.04em' }}>{post.upvotes || 0}</span>
          </button>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, padding: '12px 16px' }}>
          {/* Type + pinned + tags */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' as const }}>
            <span style={{ background: tc.bg, color: tc.color, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 10, border: `1px solid ${tc.color}44` }}>{tc.label}</span>
            {post.pinned && <span style={{ background: 'rgba(201,168,76,0.1)', color: G, fontFamily: cinzel, fontSize: 7, padding: '1px 6px', borderRadius: 10 }}>📌 Pinned</span>}
            {(post.tags || []).map((tag: string) => (
              <span key={tag} style={{ background: 'rgba(74,158,232,0.08)', color: '#4A9EE8', fontFamily: cinzel, fontSize: 7, padding: '1px 7px', borderRadius: 10, border: '1px solid rgba(74,158,232,0.25)' }}>{tag}</span>
            ))}
          </div>

          {/* Title */}
          {editing ? (
            <PostEditForm post={post} onSave={(updated: any) => { onUpdate(updated); setEditing(false) }} onCancel={() => setEditing(false)} />
          ) : (
            <>
              <div onClick={() => setExpanded(e => !e)} style={{ fontFamily: cinzel, fontSize: 14, color: TXT, letterSpacing: '0.04em', marginBottom: 6, lineHeight: 1.4, cursor: 'pointer' }}>{post.title}</div>

              {/* Body preview / full */}
              {post.body && (
                <div onClick={() => setExpanded(e => !e)} style={{ fontFamily: crimson, fontSize: 13, color: DIM, lineHeight: 1.6, cursor: 'pointer',
                  ...(expanded ? {} : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }) }}>
                  {post.body}
                </div>
              )}

              {/* Resource card */}
              {post.resource_url && (
                <ResourceCard url={post.resource_url} title={post.resource_title} thumbnail={post.resource_thumbnail} description={post.resource_description} domain={(() => { try { return new URL(post.resource_url).hostname.replace('www.','') } catch { return '' } })()} />
              )}

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' as const }}>
                <span style={{ fontFamily: cinzel, fontSize: 9, color: DIM, letterSpacing: '0.04em' }}>{post.author_name}</span>
                <TierPill tier={post.author_tier} />
                <span style={{ fontFamily: cinzel, fontSize: 8, color: MUT }}>{timeAgo(post.created_at)}</span>
                <button onClick={() => setExpanded(e => !e)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 4, color: DIM }}>
                  <span style={{ fontSize: 11 }}>💬</span>
                  <span style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.04em' }}>{post.comment_count || 0}</span>
                </button>
                <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                  {isOwn && !isMinister && (
                    <button onClick={() => setEditing(true)} style={{ background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 4, color: DIM, fontFamily: cinzel, fontSize: 8, padding: '2px 8px', cursor: 'pointer' }}>✎ Edit</button>
                  )}
                  {isMinister && (
                    <>
                      <button onClick={() => setEditing(true)} style={{ background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 4, color: DIM, fontFamily: cinzel, fontSize: 8, padding: '2px 8px', cursor: 'pointer' }}>✎</button>
                      <button onClick={togglePin} style={{ background: post.pinned ? 'rgba(201,168,76,0.1)' : 'transparent', border: `1px solid ${BDR}`, borderRadius: 4, color: post.pinned ? G : DIM, fontFamily: cinzel, fontSize: 8, padding: '2px 8px', cursor: 'pointer' }}>📌</button>
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

      {/* Inline comments */}
      {expanded && !editing && (
        <CommentsSection
          postId={post.id}
          commentCount={post.comment_count}
          userId={userId}
          isMinister={isMinister}
          getToken={getToken}
        />
      )}
    </div>
  )
}

// ── Main Forum Page ───────────────────────────────────────────────────────────
function ForumPage() {
  const { getToken }         = useAuth()
  const { user }             = useUser()
  const userId               = user?.id || ''
  const userTier             = (user?.publicMetadata?.tier as string) || 'free'
  const userRole             = (user?.publicMetadata?.role as string) || ''
  const isMinister           = userRole === 'minister'
  const canPost              = TIER_LEVELS[userTier] >= 1 || isMinister

  const [posts,        setPosts]        = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)
  const [sort,         setSort]         = useState('hot')
  const [typeFilter,   setTypeFilter]   = useState('all')
  const [tagFilter,    setTagFilter]    = useState('')
  const [search,       setSearch]       = useState('')
  const [composing,    setComposing]    = useState(false)
  const [page,         setPage]         = useState(0)
  const [hasMore,      setHasMore]      = useState(false)
  const [loadingMore,  setLoadingMore]  = useState(false)

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

  function loadMore() {
    const next = page + 1
    setPage(next)
    load(next, true)
  }

  function onPost(newPost: any) {
    setPosts(prev => [newPost, ...prev])
    setComposing(false)
  }

  function onUpdate(updated: any) {
    setPosts(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  function onDelete(id: string) {
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  // Client-side search filter
  const displayed = search.trim()
    ? posts.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.tags || []).some((t: string) => t.toLowerCase().includes(search.toLowerCase()))
      )
    : posts

  // Trending tags from current posts
  const tagCounts: Record<string, number> = {}
  posts.forEach(p => (p.tags || []).forEach((t: string) => { tagCounts[t] = (tagCounts[t] || 0) + 1 }))
  const trendingTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)

  const pinnedPosts = posts.filter(p => p.pinned)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  const sortBtnSt = (s: string): React.CSSProperties => ({
    background: sort === s ? 'rgba(201,168,76,0.12)' : 'transparent',
    border: `1px solid ${sort === s ? 'rgba(201,168,76,0.4)' : 'transparent'}`,
    borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontFamily: cinzel, fontSize: 10,
    color: sort === s ? G : DIM, letterSpacing: '0.08em',
  })

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TXT }}>
      {/* Top bar */}
      <div style={{ borderBottom: `1px solid ${BDR}`, padding: '16px 24px 0', position: 'sticky' as const, top: 0, background: BG, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <a href="/community" style={{ color: DIM, textDecoration: 'none', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em' }}>← Community</a>
          <span style={{ color: MUT }}>·</span>
          <span style={{ fontFamily: cinzel, fontSize: 18, color: G, letterSpacing: '0.1em' }}>⚔ The War Room Board</span>
        </div>
        <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, fontStyle: 'italic', marginBottom: 14 }}>Open discussion for the War Room Intel community</div>

        {/* Sort + search row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, paddingBottom: 12 }}>
          <button onClick={() => setSort('hot')}  style={sortBtnSt('hot')}>🔥 Hot</button>
          <button onClick={() => setSort('new')}  style={sortBtnSt('new')}>✨ New</button>
          <button onClick={() => setSort('top')}  style={sortBtnSt('top')}>⬆ Top</button>
          <div style={{ flex: 1, maxWidth: 280 }}>
            <input
              placeholder="Search posts…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', background: SURF2, border: `1px solid ${BDR}`, borderRadius: 6, padding: '6px 12px', color: TXT, fontFamily: crimson, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }}
            />
          </div>
          {!isMobile && (
            <button onClick={() => { setComposing(c => !c) }}
              style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 6, color: G, fontFamily: cinzel, fontSize: 10, padding: '7px 20px', cursor: 'pointer', letterSpacing: '0.08em', marginLeft: 'auto' }}>
              ＋ New Post
            </button>
          )}
        </div>

        {/* Type filter pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, paddingBottom: 12 }}>
          <button onClick={() => setTypeFilter('all')}
            style={{ background: typeFilter === 'all' ? 'rgba(201,168,76,0.12)' : 'transparent', border: `1px solid ${typeFilter === 'all' ? 'rgba(201,168,76,0.4)' : BDR}`, borderRadius: 20, padding: '3px 12px', cursor: 'pointer', fontFamily: cinzel, fontSize: 8, color: typeFilter === 'all' ? G : DIM, letterSpacing: '0.08em' }}>
            All
          </button>
          {Object.entries(POST_TYPES).map(([k, v]) => (
            <button key={k} onClick={() => setTypeFilter(typeFilter === k ? 'all' : k)}
              style={{ background: typeFilter === k ? v.bg : 'transparent', border: `1px solid ${typeFilter === k ? v.color : BDR}`, borderRadius: 20, padding: '3px 12px', cursor: 'pointer', fontFamily: cinzel, fontSize: 8, color: typeFilter === k ? v.color : DIM, letterSpacing: '0.08em' }}>
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

      {/* Body */}
      <div style={{ display: 'flex', gap: 24, padding: '20px 24px', maxWidth: 1200, margin: '0 auto' }}>

        {/* ── Main Feed ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Mobile new post button */}
          {isMobile && (
            <button onClick={() => setComposing(c => !c)}
              style={{ width: '100%', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8, color: G, fontFamily: cinzel, fontSize: 11, padding: '12px', cursor: 'pointer', letterSpacing: '0.08em', marginBottom: 14 }}>
              ＋ New Post
            </button>
          )}

          {/* Composer */}
          {composing && <PostComposer onPost={onPost} onCancel={() => setComposing(false)} canPost={canPost} />}

          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center' as const, color: DIM, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em' }}>Loading…</div>
          ) : displayed.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center' as const, color: DIM, fontFamily: crimson, fontStyle: 'italic', fontSize: 14 }}>
              {posts.length === 0 ? 'No posts yet. Start the conversation.' : 'No posts match this filter.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
              {displayed.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  userId={userId}
                  isMinister={isMinister}
                  getToken={getToken}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}

          {hasMore && !search && (
            <div style={{ textAlign: 'center' as const, marginTop: 24 }}>
              <button onClick={loadMore} disabled={loadingMore}
                style={{ background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 6, color: DIM, fontFamily: cinzel, fontSize: 10, padding: '8px 24px', cursor: 'pointer', letterSpacing: '0.08em' }}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        {!isMobile && (
          <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column' as const, gap: 16 }}>

            {/* New post (large) */}
            <button onClick={() => { setComposing(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              style={{ width: '100%', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: 10, color: G, fontFamily: cinzel, fontSize: 12, padding: '14px', cursor: 'pointer', letterSpacing: '0.1em' }}>
              ＋ New Post
            </button>

            {/* Trending tags */}
            {trendingTags.length > 0 && (
              <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 10, padding: '16px 16px' }}>
                <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.1em', marginBottom: 12 }}>🔥 Trending Tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                  {trendingTags.map(([tag, count]) => (
                    <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
                      style={{ background: tagFilter === tag ? 'rgba(74,158,232,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${tagFilter === tag ? 'rgba(74,158,232,0.35)' : BDR}`, borderRadius: 20, padding: '3px 10px', cursor: 'pointer', fontFamily: cinzel, fontSize: 8, color: tagFilter === tag ? '#4A9EE8' : DIM, letterSpacing: '0.06em' }}>
                      #{tag} <span style={{ opacity: 0.6 }}>{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pinned posts */}
            {pinnedPosts.length > 0 && (
              <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 10, padding: '16px 16px' }}>
                <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.1em', marginBottom: 12 }}>📌 Pinned</div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  {pinnedPosts.map(p => (
                    <div key={p.id} style={{ borderLeft: `2px solid rgba(201,168,76,0.3)`, paddingLeft: 10 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 10, color: TXT, lineHeight: 1.4, letterSpacing: '0.03em' }}>{p.title}</div>
                      <div style={{ fontFamily: cinzel, fontSize: 8, color: MUT, marginTop: 3 }}>{p.author_name} · {timeAgo(p.created_at)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Community stats */}
            <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 10, padding: '16px 16px' }}>
              <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.1em', marginBottom: 12 }}>Community Stats</div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: crimson, fontSize: 13, color: DIM }}>Total Discussions</span>
                  <span style={{ fontFamily: cinzel, fontSize: 11, color: TXT }}>{posts.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: crimson, fontSize: 13, color: DIM }}>This Week</span>
                  <span style={{ fontFamily: cinzel, fontSize: 11, color: TXT }}>
                    {posts.filter(p => Date.now() - new Date(p.created_at).getTime() < 7 * 86400000).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
