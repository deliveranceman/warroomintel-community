import { createFileRoute } from '@tanstack/react-router'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { useState, useRef } from 'react'
import { CommunitySidebarShell } from '@/components/CommunitySidebarShell'
import { SolIcon } from '@/components/SolIcon'

export const Route = createFileRoute('/community_/ask-sol')({
  ssr: false,
  component: AskSolPage,
})

const G      = '#C9A84C'
const BG     = '#0D0B14'
const SURF2  = '#1a1726'
const BDR    = 'rgba(201,168,76,0.22)'
const TXT    = '#e8dcc8'
const DIM    = '#a09080'
const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, `<div style="font-family:'Cinzel',serif;font-size:11px;color:#C9A84C;letter-spacing:0.1em;margin:16px 0 6px">$1</div>`)
    .replace(/^## (.+)$/gm, `<div style="font-family:'Cinzel',serif;font-size:12px;color:#C9A84C;letter-spacing:0.1em;margin:16px 0 8px">$1</div>`)
    .replace(/^# (.+)$/gm, `<div style="font-family:'Cinzel',serif;font-size:14px;color:#C9A84C;letter-spacing:0.12em;margin:16px 0 10px">$1</div>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#c8b99a">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="color:#8a7a60">$1</em>')
    .replace(/^- (.+)$/gm, '<div style="padding-left:12px;margin:4px 0;color:#a89878">⚔ $1</div>')
    .replace(/\n\n/g, '<div style="margin:8px 0"></div>')
    .replace(/\n/g, '<br/>')
}

function AskSolPage() {
  const { getToken } = useAuth()
  const { user, isLoaded } = useUser()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const tier = ((user?.publicMetadata?.tier as string) || '').toLowerCase()
  const userName = user?.firstName || user?.username || ''
  const userTierLabel = tier === 'watchman' || tier === 'free' || !tier ? 'WATCHMAN' : tier.toUpperCase()

  async function send() {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

    try {
      const token = await getToken()
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ message: msg, history: messages, feature: 'ask_dake' }),
      })
      const data = await res.json()
      if (res.status === 429) {
        setMessages(prev => [...prev, { role: 'assistant', content: `**Limit Reached** — ${data.error || 'Daily limit reached.'} [Upgrade your membership](/membership) to continue.` }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response || 'No response received.' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Unable to connect. Please try again.' }])
    } finally {
      setLoading(false)
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  if (!isLoaded) return null

  return (
    <CommunitySidebarShell activeItem="Ask SOL" userName={userName} userTierLabel={userTierLabel}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: BG, color: TXT }}>
        {/* Header */}
        <div style={{ borderBottom: `1px solid ${BDR}`, padding: '16px 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SolIcon size={22} />
            <div>
              <div style={{ fontFamily: cinzel, fontSize: 18, color: G, letterSpacing: '0.1em', fontWeight: 700 }}>ASK SOL</div>
              <div style={{ fontFamily: cinzel, fontSize: 9, color: DIM, letterSpacing: '0.2em', marginTop: 2 }}>SENTINEL OF LIGHT — WARFARE INTELLIGENCE</div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 16px 0', maxWidth: 480, margin: '0 auto' }}>
              <SolIcon size={40} color={`${G}44`} />
              <div style={{ fontFamily: cinzel, fontSize: 12, color: DIM, letterSpacing: '0.15em', marginTop: 20, marginBottom: 8 }}>SENTINEL OF LIGHT</div>
              <div style={{ fontFamily: crimson, fontSize: 16, color: DIM, lineHeight: 1.7 }}>
                Ask about demonic hierarchies, spiritual warfare strategy, deliverance protocols, legal grounds, prayer strategy, or any ministry question.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 28 }}>
                {[
                  'What is the spirit of Leviathan?',
                  'How do I break a generational curse?',
                  'What are legal grounds for demonic entry?',
                  'Deliverance sequence for spirit of rejection',
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); }}
                    style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid ${BDR}`, borderRadius: 20, padding: '6px 14px', fontFamily: crimson, fontSize: 13, color: DIM, cursor: 'pointer' }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '100%' }}>
              {msg.role === 'user' ? (
                <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: '12px 12px 2px 12px', background: 'rgba(201,168,76,0.1)', border: `1px solid ${BDR}` }}>
                  <span style={{ fontFamily: crimson, fontSize: 15, color: '#e8d9b0', whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                </div>
              ) : (
                <div style={{ maxWidth: '80%', background: SURF2, border: `1px solid ${BDR}`, borderLeft: `3px solid ${G}`, borderRadius: '0 12px 12px 0', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <SolIcon size={11} />
                    <span style={{ fontFamily: cinzel, fontSize: 7, color: G, letterSpacing: '0.2em' }}>SOL</span>
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} style={{ fontFamily: crimson, fontSize: 15, color: '#a89878', lineHeight: 1.7 }} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ background: SURF2, border: `1px solid ${BDR}`, borderLeft: `3px solid ${G}`, borderRadius: '0 12px 12px 0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <SolIcon size={11} />
                <span style={{ fontFamily: crimson, fontSize: 14, color: '#6b5e45', fontStyle: 'italic' }}>Analyzing…</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: `1px solid ${BDR}`, padding: '12px 24px', flexShrink: 0, paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
          <div style={{ display: 'flex', gap: 10, maxWidth: 800, margin: '0 auto' }}>
            <textarea
              rows={2}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Ask SOL a question…"
              style={{ flex: 1, background: SURF2, border: `1px solid ${BDR}`, borderRadius: 8, padding: '10px 14px', color: TXT, fontFamily: crimson, fontSize: 15, resize: 'none', outline: 'none' }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{ background: input.trim() && !loading ? `${G}22` : 'transparent', border: `1px solid ${input.trim() && !loading ? G : BDR}`, borderRadius: 8, padding: '0 18px', color: input.trim() && !loading ? G : DIM, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', flexShrink: 0 }}
            >
              SEND
            </button>
          </div>
        </div>
      </div>
    </CommunitySidebarShell>
  )
}
