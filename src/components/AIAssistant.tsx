import { useState } from 'react'
import { useAuth } from '@clerk/tanstack-start'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function AIAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const { isSignedIn, isLoaded } = useAuth()

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    if (!isSignedIn) {
      const msgCount = parseInt(sessionStorage.getItem('wri-anon-msgs') || '0')
      if (msgCount >= 3) {
        setRateLimited(true)
        return
      }
      sessionStorage.setItem('wri-anon-msgs', String(msgCount + 1))
    }

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/warroom-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok || !res.body) {
        throw new Error('Failed to get response')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''

      setMessages([...newMessages, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantText += decoder.decode(value, { stream: true })
        setMessages([
          ...newMessages,
          { role: 'assistant', content: assistantText },
        ])
      }
    } catch {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'Sorry, there was an error. Please try again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          left: '1.5rem',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'var(--gold)',
          color: 'var(--deep)',
          border: 'none',
          cursor: 'pointer',
          fontSize: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          boxShadow: '0 4px 20px rgba(201,168,76,0.4)',
          transition: 'background 0.2s, transform 0.15s',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget
          el.style.background = 'var(--gold-light)'
          el.style.transform = 'scale(1.05)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget
          el.style.background = 'var(--gold)'
          el.style.transform = 'scale(1)'
        }}
        aria-label="Open AI assistant"
      >
        {open ? '✕' : '⚔'}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: '5rem',
            left: '1.5rem',
            width: '360px',
            maxWidth: 'calc(100% - 3rem)',
            maxHeight: '500px',
            background: 'var(--surface)',
            border: '1px solid var(--border-bright)',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 200,
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border)',
              background: 'var(--surface2)',
              borderRadius: '8px 8px 0 0',
            }}
          >
            <p
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: 'var(--gold)',
                margin: 0,
              }}
            >
              ⚔ WAR ROOM ASSISTANT
            </p>
            <p
              style={{
                fontSize: '12px',
                color: 'var(--text-dim)',
                margin: '2px 0 0',
              }}
            >
              Ask about membership, the database, or ministry
            </p>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            {messages.length === 0 && !rateLimited && (
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--muted)',
                  fontStyle: 'italic',
                  textAlign: 'center',
                  marginTop: '1rem',
                }}
              >
                How can I help you with your ministry today?
              </p>
            )}
            {rateLimited && (
              <div style={{
                margin: '1rem auto',
                padding: '1rem',
                background: 'var(--surface2)',
                border: '1px solid var(--border-bright)',
                borderRadius: '8px',
                textAlign: 'center',
                maxWidth: '280px',
              }}>
                <p style={{
                  fontSize: '14px',
                  color: 'var(--text-dim)',
                  lineHeight: 1.5,
                  marginBottom: '0.75rem',
                }}>
                  Sign up free to continue chatting with the War Room Assistant. No card required.
                </p>
                <a
                  href="/join"
                  style={{
                    display: 'inline-block',
                    padding: '8px 20px',
                    background: 'var(--gold)',
                    color: 'var(--deep)',
                    fontFamily: "'Cinzel', serif",
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textDecoration: 'none',
                    borderRadius: '4px',
                  }}
                >
                  Join Free
                </a>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '0.6rem 0.875rem',
                  borderRadius:
                    msg.role === 'user'
                      ? '12px 12px 2px 12px'
                      : '12px 12px 12px 2px',
                  background:
                    msg.role === 'user' ? 'var(--gold-dim)' : 'var(--surface3)',
                  border:
                    msg.role === 'user'
                      ? '1px solid var(--border-bright)'
                      : '1px solid var(--border)',
                  fontSize: '14px',
                  color: msg.role === 'user' ? 'var(--text)' : 'var(--text-dim)',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.content}
                {msg.role === 'assistant' && loading && i === messages.length - 1 && msg.content === '' && (
                  <span style={{ color: 'var(--gold)', opacity: 0.7 }}>▋</span>
                )}
              </div>
            ))}
          </div>

          {/* Input */}
          <div
            style={{
              padding: '0.75rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: '0.5rem',
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask a question..."
              disabled={loading || rateLimited}
              style={{
                flex: 1,
                background: 'var(--deep)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '8px 12px',
                fontFamily: "'Crimson Pro', serif",
                fontSize: '14px',
                color: 'var(--text)',
                outline: 'none',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || rateLimited || !input.trim()}
              style={{
                background: loading || rateLimited || !input.trim() ? 'var(--surface3)' : 'var(--gold)',
                color: loading || rateLimited || !input.trim() ? 'var(--muted)' : 'var(--deep)',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 14px',
                fontFamily: "'Cinzel', serif",
                fontSize: '11px',
                fontWeight: 600,
                cursor: loading || rateLimited || !input.trim() ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              Send
            </button>
          </div>
          {isLoaded && !isSignedIn && !rateLimited && (
            <div style={{
              padding: '0.35rem 0.75rem 0.5rem',
              textAlign: 'center',
              fontSize: '11px',
              color: 'var(--muted)',
              borderTop: '1px solid var(--border)',
            }}>
              3 free questions · Sign up for unlimited access
            </div>
          )}
        </div>
      )}
    </>
  )
}
