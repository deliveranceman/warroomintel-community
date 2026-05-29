import { useState } from 'react'
import { Flag } from 'lucide-react'
import { useAuth } from '@clerk/tanstack-start'

interface FlagButtonProps {
  contentType: string
  contentId: string
  contentTitle?: string
}

const G   = 'rgba(201,168,76,0.9)'
const DIM = 'rgba(180,180,180,0.5)'
const BG  = '#0d0d0f'
const BD  = 'rgba(201,168,76,0.25)'
const cinzel = "'Cinzel', serif"
const mono   = "'JetBrains Mono', monospace"

const ISSUE_TYPES = [
  'Inaccurate',
  'Outdated',
  'Missing Context',
  'Theological Concern',
  'Other',
]

export function FlagButton({ contentType, contentId, contentTitle }: FlagButtonProps) {
  const { getToken } = useAuth()
  const [open, setOpen]         = useState(false)
  const [issueType, setIssueType] = useState('')
  const [description, setDescription] = useState('')
  const [suggestion, setSuggestion]   = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [done, setDone]               = useState(false)
  const [err, setErr]                 = useState('')

  async function submit() {
    if (!issueType || !description.trim()) {
      setErr('Issue type and description are required.')
      return
    }
    setSubmitting(true)
    setErr('')
    try {
      const token = await getToken()
      const res = await fetch('/api/suggested-edits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content_type: contentType, content_id: contentId, content_title: contentTitle, issue_type: issueType, description: description.trim(), suggestion: suggestion.trim() || undefined }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setErr(d.error || `Error ${res.status}`)
        setSubmitting(false)
        return
      }
      setDone(true)
      setTimeout(() => { setOpen(false); setDone(false); setIssueType(''); setDescription(''); setSuggestion('') }, 2000)
    } catch (e: any) {
      setErr(e.message || 'Network error')
    }
    setSubmitting(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Flag for review"
        style={{
          background: 'transparent',
          border: 'none',
          padding: '3px 6px',
          cursor: 'pointer',
          color: DIM,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          fontFamily: mono,
          letterSpacing: '0.05em',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = G)}
        onMouseLeave={e => (e.currentTarget.style.color = DIM)}
      >
        <Flag size={13} strokeWidth={1.5} />
        FLAG
      </button>

      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div style={{
            background: '#111114',
            border: `1px solid ${BD}`,
            borderRadius: 4,
            padding: '24px 28px',
            width: '100%',
            maxWidth: 440,
            fontFamily: mono,
          }}>
            <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.1em', marginBottom: 18 }}>
              FLAG FOR REVIEW
            </div>

            {contentTitle && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 16, letterSpacing: '0.03em' }}>
                {contentTitle}
              </div>
            )}

            {done ? (
              <div style={{ fontSize: 12, color: G, textAlign: 'center', padding: '16px 0' }}>
                Thank you — submitted for review
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>
                    ISSUE TYPE *
                  </label>
                  <select
                    value={issueType}
                    onChange={e => setIssueType(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px', background: BG,
                      border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 2,
                      color: issueType ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
                      fontFamily: mono, fontSize: 12, outline: 'none',
                    }}
                  >
                    <option value="">Select issue type…</option>
                    {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>
                    DESCRIPTION *
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe the issue…"
                    rows={3}
                    style={{
                      width: '100%', padding: '8px 10px', background: BG,
                      border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 2,
                      color: 'rgba(255,255,255,0.85)', fontFamily: mono, fontSize: 12,
                      outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>
                    SUGGESTION (optional)
                  </label>
                  <textarea
                    value={suggestion}
                    onChange={e => setSuggestion(e.target.value)}
                    placeholder="What should it say instead?"
                    rows={2}
                    style={{
                      width: '100%', padding: '8px 10px', background: BG,
                      border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 2,
                      color: 'rgba(255,255,255,0.85)', fontFamily: mono, fontSize: 12,
                      outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {err && <div style={{ fontSize: 11, color: '#e05c5c', marginBottom: 12 }}>{err}</div>}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setOpen(false)}
                    style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2, color: 'rgba(255,255,255,0.5)', fontFamily: mono, fontSize: 11, cursor: 'pointer', letterSpacing: '0.06em' }}
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={submit}
                    disabled={submitting}
                    style={{ padding: '8px 20px', background: 'transparent', border: `1px solid ${G}`, borderRadius: 2, color: G, fontFamily: cinzel, fontSize: 11, fontWeight: 600, cursor: submitting ? 'default' : 'pointer', letterSpacing: '0.08em', opacity: submitting ? 0.6 : 1 }}
                  >
                    {submitting ? 'SUBMITTING…' : 'SUBMIT'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
