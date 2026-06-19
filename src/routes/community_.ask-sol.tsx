import { createFileRoute } from '@tanstack/react-router'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { useState, useRef, useEffect } from 'react'
import { CommunitySidebarShell } from '@/components/CommunitySidebarShell'
import { SolIcon } from '@/components/SolIcon'
import { useIsDark } from '@/lib/use-is-dark'

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

function renderMarkdown(text: string, isDark: boolean): string {
  const gold   = isDark ? '#C9A84C' : '#8B6914'
  const strong = isDark ? '#c8b99a' : '#1F1B12'
  const em     = isDark ? '#8a7a60' : '#574B33'
  const list   = isDark ? '#a89878' : '#574B33'
  return text
    .replace(/^### (.+)$/gm, `<div style="font-family:'Cinzel',serif;font-size:11px;color:${gold};letter-spacing:0.1em;margin:16px 0 6px">$1</div>`)
    .replace(/^## (.+)$/gm, `<div style="font-family:'Cinzel',serif;font-size:12px;color:${gold};letter-spacing:0.1em;margin:16px 0 8px">$1</div>`)
    .replace(/^# (.+)$/gm, `<div style="font-family:'Cinzel',serif;font-size:14px;color:${gold};letter-spacing:0.12em;margin:16px 0 10px">$1</div>`)
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${strong}">$1</strong>`)
    .replace(/\*(.+?)\*/g, `<em style="color:${em}">$1</em>`)
    .replace(/^- (.+)$/gm, `<div style="padding-left:12px;margin:4px 0;color:${list}">⚔ $1</div>`)
    .replace(/\n\n/g, '<div style="margin:8px 0"></div>')
    .replace(/\n/g, '<br/>')
}

function AskSolPage() {
  const { getToken } = useAuth()
  const { user, isLoaded } = useUser()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState('')
  const [bgBanner, setBgBanner] = useState(false)
  const endRef    = useRef<HTMLDivElement>(null)
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const bgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current)   clearInterval(pollRef.current)
      if (bgTimerRef.current) clearTimeout(bgTimerRef.current)
    }
  }, [])

  const isDark = useIsDark()
  const bg    = isDark ? BG    : '#EDEBE2'
  const surf2 = isDark ? SURF2 : '#FFFFFF'
  const bdr   = isDark ? BDR   : '#D8D1BE'
  const txt   = isDark ? TXT   : '#1F1B12'
  const dim   = isDark ? DIM   : '#574B33'
  const gold  = isDark ? G     : '#8B6914'

  const tier = ((user?.publicMetadata?.tier as string) || '').toLowerCase()
  const userName = user?.firstName || user?.username || ''
  const userTierLabel = tier === 'watchman' || tier === 'free' || !tier ? 'WATCHMAN' : tier.toUpperCase()

  function stageLabel(s: string): string {
    if (s === 'queued')     return 'SOL is queued…'
    if (s === 'preparing')  return 'SOL is preparing…'
    if (s === 'searching')  return 'SOL is searching WRI intelligence…'
    if (s === 'thinking')   return 'SOL is analyzing…'
    if (s === 'finalizing') return 'Finalizing response…'
    return 'SOL is working…'
  }

  async function send() {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    setStage('queued')
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

    try {
      const token = await getToken()
      const res = await fetch('/api/ask-sol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ message: msg, history: messages }),
      })
      const data = await res.json()

      if (res.status === 429) {
        setMessages(prev => [...prev, { role: 'assistant', content: `**Limit Reached** — ${data.error || 'Daily limit reached.'} [Upgrade your membership](/membership) to continue.` }])
        setLoading(false); setStage('')
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        return
      }
      if (!res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: `SOL error: ${data.error || res.status}. Please try again.` }])
        setLoading(false); setStage('')
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        return
      }

      const jobId: string = data.jobId

      if (bgTimerRef.current) clearTimeout(bgTimerRef.current)
      bgTimerRef.current = setTimeout(() => setBgBanner(true), 8000)

      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        try {
          const pollToken = await getToken()
          const pollRes = await fetch(`/api/job-status?jobId=${jobId}`, { headers: { Authorization: `Bearer ${pollToken}` } })
          if (!pollRes.ok) return
          const job = await pollRes.json()
          setStage(job.stage ?? job.status ?? '')

          if (job.status === 'complete') {
            clearInterval(pollRef.current!); pollRef.current = null
            if (bgTimerRef.current) { clearTimeout(bgTimerRef.current); bgTimerRef.current = null }
            setBgBanner(false)
            setMessages(prev => [...prev, { role: 'assistant', content: job.result_json?.response || 'No response received.' }])
            setStage(''); setLoading(false)
            setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
          } else if (job.status === 'failed') {
            clearInterval(pollRef.current!); pollRef.current = null
            if (bgTimerRef.current) { clearTimeout(bgTimerRef.current); bgTimerRef.current = null }
            setBgBanner(false)
            setMessages(prev => [...prev, { role: 'assistant', content: job.error_message || 'SOL could not complete this query. Please try again.' }])
            setStage(''); setLoading(false)
            setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
          }
        } catch { /* network hiccup — keep polling */ }
      }, 3000)

    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Unable to connect. ${err?.message || 'Please try again.'}` }])
      setStage(''); setLoading(false); setBgBanner(false)
      if (bgTimerRef.current) { clearTimeout(bgTimerRef.current); bgTimerRef.current = null }
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  if (!isLoaded) return null

  return (
    <CommunitySidebarShell activeItem="Ask SOL" userName={userName} userTierLabel={userTierLabel}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: bg, color: txt }}>
        {/* Header */}
        <div style={{ borderBottom: `1px solid ${bdr}`, padding: '16px 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/images/sol/sol-icon.png" width={22} height={22} style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(201,168,76,0.8)) brightness(1.1)', mixBlendMode: 'screen' }} alt="" />
            <div>
              <div style={{ fontFamily: cinzel, fontSize: 18, color: gold, letterSpacing: '0.1em', fontWeight: 700 }}>ASK SOL</div>
              <div style={{ fontFamily: cinzel, fontSize: 9, color: dim, letterSpacing: '0.2em', marginTop: 2 }}>SENTINEL OF LIGHT — WARFARE INTELLIGENCE</div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 16px 0', maxWidth: 480, margin: '0 auto' }}>
              <img src="/images/sol/sol-icon.png" width={40} height={40} style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 14px rgba(201,168,76,0.7)) brightness(1.1)', mixBlendMode: 'screen' }} alt="" />
              <div style={{ fontFamily: cinzel, fontSize: 12, color: dim, letterSpacing: '0.15em', marginTop: 20, marginBottom: 8 }}>SENTINEL OF LIGHT</div>
              <div style={{ fontFamily: crimson, fontSize: 16, color: dim, lineHeight: 1.7 }}>
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
                    style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid ${bdr}`, borderRadius: 20, padding: '6px 14px', fontFamily: crimson, fontSize: 13, color: dim, cursor: 'pointer' }}
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
                <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: '12px 12px 2px 12px', background: 'rgba(201,168,76,0.1)', border: `1px solid ${bdr}` }}>
                  <span style={{ fontFamily: crimson, fontSize: 15, color: isDark ? '#e8d9b0' : '#1F1B12', whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                </div>
              ) : (
                <div style={{ maxWidth: '80%', background: surf2, border: `1px solid ${bdr}`, borderLeft: `3px solid ${gold}`, borderRadius: '0 12px 12px 0', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <SolIcon size={11} />
                    <span style={{ fontFamily: cinzel, fontSize: 7, color: gold, letterSpacing: '0.2em' }}>SOL</span>
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content, isDark) }} style={{ fontFamily: crimson, fontSize: 15, color: isDark ? '#a89878' : '#574B33', lineHeight: 1.7 }} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ background: surf2, border: `1px solid ${bdr}`, borderLeft: `3px solid ${gold}`, borderRadius: '0 12px 12px 0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <SolIcon size={11} />
                <span style={{ fontFamily: crimson, fontSize: 14, color: isDark ? '#6b5e45' : '#574B33', fontStyle: 'italic' }}>{stageLabel(stage)}</span>
              </div>
            </div>
          )}
          {bgBanner && (
            <div style={{ background: 'rgba(201,168,76,0.08)', border: `1px solid ${bdr}`, borderRadius: 8, padding: '10px 14px', fontFamily: crimson, fontSize: 13, color: dim, textAlign: 'center' }}>
              SOL is still working — you can navigate away and check <strong style={{ color: gold }}>My SOL Jobs</strong> for the result.
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: `1px solid ${bdr}`, padding: '12px 24px', flexShrink: 0, paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
          <div style={{ display: 'flex', gap: 10, maxWidth: 800, margin: '0 auto' }}>
            <textarea
              rows={2}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Ask SOL a question…"
              style={{ flex: 1, background: surf2, border: `1px solid ${bdr}`, borderRadius: 8, padding: '10px 14px', color: txt, fontFamily: crimson, fontSize: 15, resize: 'none', outline: 'none' }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{ background: input.trim() && !loading ? `${gold}22` : 'transparent', border: `1px solid ${input.trim() && !loading ? gold : bdr}`, borderRadius: 8, padding: '0 18px', color: input.trim() && !loading ? gold : dim, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', flexShrink: 0 }}
            >
              SEND
            </button>
          </div>
        </div>
      </div>
    </CommunitySidebarShell>
  )
}
