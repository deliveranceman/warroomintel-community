import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/assessment-board')({
  component: AssessmentBoard,
})

const gold = '#C9A84C'
const deep = '#0D0B14'
const surface = '#13101E'
const surface2 = '#1C1828'
const border = 'rgba(201,168,76,0.18)'
const borderBright = 'rgba(201,168,76,0.45)'
const text = '#EDE9F5'
const textDim = '#A89FC0'
const muted = '#6B6480'
const cinzel = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

interface BoardPost {
  id: string
  title: string
  response: string
  aiSummary: string
  submittedAt: string
}

function AssessmentBoard() {
  const [posts, setPosts] = useState<BoardPost[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/assessment-board')
      .then(r => r.json())
      .then(data => { setPosts(data.posts || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: deep }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>

        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.3em', color: gold, marginBottom: '12px' }}>⚔ War Room Ministry</p>
          <h1 style={{ fontFamily: cinzel, fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 700, color: text, marginBottom: '12px', lineHeight: 1.1 }}>
            Assessment<br /><em style={{ color: gold, fontStyle: 'normal' }}>Response Board</em>
          </h1>
          <p style={{ fontSize: '16px', color: textDim, fontWeight: 300, fontStyle: 'italic', maxWidth: '520px', margin: '0 auto 24px' }}>
            Real ministry responses to real cases — fully anonymized. If you see your situation described here, you are not alone.
          </p>
          <a href="/assessment" style={{ fontFamily: cinzel, fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', padding: '12px 28px', borderRadius: '3px', background: gold, color: deep, textDecoration: 'none', display: 'inline-block' }}>
            Submit Your Own Assessment ✦
          </a>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem', fontFamily: cinzel, fontSize: '12px', color: gold, letterSpacing: '0.1em' }}>
            Loading responses...
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', background: surface, border: `1px solid ${border}`, borderRadius: '8px' }}>
            <div style={{ fontFamily: cinzel, fontSize: '14px', color: gold, marginBottom: '12px' }}>No responses yet</div>
            <div style={{ fontSize: '15px', color: textDim, fontStyle: 'italic' }}>Be the first to submit an assessment. Ministry responses will appear here once published.</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '16px' }}>
          {posts.map(post => (
            <div key={post.id} style={{ background: surface, border: `1px solid ${border}`, borderRadius: '8px', overflow: 'hidden' }}>
              <button onClick={() => setExpanded(expanded === post.id ? null : post.id)}
                style={{ width: '100%', background: 'none', border: 'none', padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', textAlign: 'left' as const }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: cinzel, fontSize: '13px', fontWeight: 600, color: text, marginBottom: '6px', lineHeight: 1.4 }}>{post.title}</div>
                  <div style={{ fontSize: '12px', color: muted, fontFamily: cinzel, letterSpacing: '0.06em' }}>
                    Ministry Response · {new Date(post.submittedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <span style={{ color: gold, fontSize: '20px', opacity: 0.7, transition: 'transform 0.2s', transform: expanded === post.id ? 'rotate(45deg)' : 'rotate(0)', display: 'inline-block', flexShrink: 0 }}>+</span>
              </button>

              {expanded === post.id && (
                <div style={{ borderTop: `1px solid ${border}`, padding: '20px 24px' }}>
                  {/* AI Summary */}
                  {post.aiSummary && (
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.15em', color: textDim, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(138,80,255,0.6)', display: 'inline-block' }} />
                        About This Case
                      </div>
                      <div style={{ fontSize: '15px', color: textDim, lineHeight: 1.8, fontFamily: crimson, fontStyle: 'italic', background: 'rgba(138,80,255,0.05)', border: '1px solid rgba(138,80,255,0.15)', borderRadius: '6px', padding: '16px 18px' }}>
                        {post.aiSummary}
                      </div>
                    </div>
                  )}
                  {/* Ministry Response */}
                  <div style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.15em', color: gold, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: gold }}>⚔</span> Ministry Response
                  </div>
                  <div style={{ fontSize: '15px', color: textDim, lineHeight: 1.8, fontFamily: crimson, whiteSpace: 'pre-wrap' as const }}>{post.response}</div>
                  <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '12px' }}>
                    <div style={{ fontSize: '12px', color: muted, fontStyle: 'italic' }}>Does this describe your situation? Submit your own assessment for a personal response.</div>
                    <a href="/assessment" style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.08em', padding: '7px 16px', borderRadius: '3px', border: `1px solid ${borderBright}`, color: gold, textDecoration: 'none' }}>
                      Get Help →
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
