import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { getAccessLevel } from '@/lib/access'
import { AdminNav } from '../components/admin/AdminNav'

export const Route = createFileRoute('/admin_/intel/sol-test')({
  component: SolHybridTestPage,
})

const PAGE_BG = '#EDEBE2'
const CARD_BG = '#FFFFFF'
const BORDER  = '#E5E0D5'
const GOLD    = '#8B6914'
const GOLD_DEEP = '#604408'
const TEXT    = '#1a1a1a'
const MUTED   = '#6b6b6b'

const SPEC_ACCEPTANCE_TEST = "We met a demon during a deliverance " +
  "session named Beltar (best spelling). Said he entered through " +
  "bestiality. Said not to send him back into the swine I took it " +
  "he was part of the Legion not THE legion but said he was older " +
  "than Jesus and he was married to a Zelda who was a woman who " +
  "entered through homosexuality. Anything in our database or " +
  "library that relates to any of this?"

function presetButtonStyle(): React.CSSProperties {
  return {
    padding: '8px 12px',
    fontFamily: 'Cinzel, serif',
    fontSize: 10,
    letterSpacing: '0.08em',
    background: CARD_BG,
    color: TEXT,
    border: `1px solid ${BORDER}`,
    borderRadius: 4,
    cursor: 'pointer',
    textAlign: 'left',
  }
}

function SolHybridTestPage() {
  // ALL hooks first (React hooks rule)
  const { isLoaded, isSignedIn, user } = useUser()
  const { getToken } = useAuth()
  const [question, setQuestion] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState(false)
  const [backfillRunning, setBackfillRunning] = useState(false)
  const [backfillResult, setBackfillResult] = useState<any | null>(null)
  const [backfillError, setBackfillError]   = useState<string | null>(null)

  const tier = (user?.publicMetadata as any)?.tier as string | undefined
  const role = (user?.publicMetadata as any)?.role as string | undefined
  const isAdmin = isLoaded && isSignedIn &&
    getAccessLevel({ tier, role }) >= 4

  async function run() {
    setRunning(true); setError(null); setResult(null)
    try {
      const token = await getToken()
      const resp = await fetch('/api/admin-sol-hybrid-test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      })
      if (!resp.ok) throw new Error(`Status ${resp.status}`)
      const data = await resp.json()
      setResult(data)
    } catch (err: any) {
      setError(String(err?.message ?? err))
    } finally {
      setRunning(false)
    }
  }

  async function runBackfill() {
    setBackfillRunning(true)
    setBackfillError(null)
    setBackfillResult(null)
    try {
      const token = await getToken()
      const resp = await fetch('/api/admin-backfill-spirit-embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ onlyMissing: true, batchSize: 50, maxBatches: 20 }),
      })
      if (!resp.ok) throw new Error(`Status ${resp.status}`)
      const data = await resp.json()
      setBackfillResult(data)
    } catch (err: any) {
      setBackfillError(String(err?.message ?? err))
    } finally {
      setBackfillRunning(false)
    }
  }

  function copyContext() {
    if (!result?.contextBlock) return
    navigator.clipboard.writeText(result.contextBlock).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  // Early returns — AFTER all hooks
  if (!isLoaded) {
    return (
      <div style={{
        minHeight: '100vh', background: PAGE_BG,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Crimson Pro", serif', color: MUTED, fontSize: 14,
      }}>
        Verifying access...
      </div>
    )
  }
  if (!isSignedIn || !isAdmin) {
    return (
      <div style={{
        minHeight: '100vh', background: PAGE_BG,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          maxWidth: 420, background: CARD_BG, border: `1px solid ${BORDER}`,
          borderRadius: 6, padding: 32, textAlign: 'center',
        }}>
          <div style={{
            fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 600,
            color: GOLD_DEEP, letterSpacing: '0.15em', marginBottom: 12,
          }}>
            ⚔ ACCESS DENIED
          </div>
          <p style={{
            fontFamily: '"Crimson Pro", serif', fontSize: 15,
            color: TEXT, margin: '0 0 20px 0', lineHeight: 1.5,
          }}>
            This area is restricted to authorized personnel.
          </p>
          <a href="/community" style={{
            fontFamily: 'Cinzel, serif', fontSize: 12, color: GOLD,
            textDecoration: 'none', letterSpacing: '0.1em',
          }}>
            &larr; Return to Community
          </a>
        </div>
      </div>
    )
  }

  const matches: any[] = result?.matches ?? []
  const dossiers: any[] = result?.dossiers ?? []

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG }}>
      <AdminNav current="sol-test" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontFamily: 'Cinzel, serif', fontSize: 32, fontWeight: 600,
            color: GOLD_DEEP, margin: 0, letterSpacing: '0.05em',
          }}>
            🔬 SOL HYBRID TEST
          </h1>
          <p style={{
            fontFamily: '"Crimson Pro", serif', fontSize: 15,
            color: MUTED, margin: '8px 0 0 0', lineHeight: 1.5, maxWidth: 720,
          }}>
            Test the SOL hybrid retrieval pipeline before it wires into Ask SOL.
            Paste a question, see matches + dossiers + the context block SOL
            would receive.
          </p>
        </div>

        {/* Embedding backfill */}
        <div style={{
          marginBottom: 32,
          padding: 16,
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 6,
        }}>
          <div style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 12,
            fontWeight: 600,
            color: GOLD_DEEP,
            letterSpacing: '0.15em',
            marginBottom: 12,
          }}>
            🧬 EMBEDDING BACKFILL
          </div>
          <p style={{
            fontFamily: '"Crimson Pro", serif',
            fontSize: 13,
            color: MUTED,
            margin: '0 0 12px 0',
            lineHeight: 1.5,
          }}>
            Embed all spirits that lack a vector embedding. One OpenAI call
            per batch of 50. Idempotent — only embeds rows where{' '}
            <code>embedding IS NULL</code>. Safe to run repeatedly.
          </p>
          <button
            onClick={runBackfill}
            disabled={backfillRunning}
            style={{
              padding: '10px 16px',
              fontFamily: 'Cinzel, serif',
              fontSize: 12,
              letterSpacing: '0.12em',
              background: backfillRunning ? MUTED : GOLD_DEEP,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 4,
              cursor: backfillRunning ? 'wait' : 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {backfillRunning ? 'EMBEDDING...' : 'RUN BACKFILL'}
          </button>

          {backfillError && (
            <div style={{
              marginTop: 12,
              padding: 8,
              background: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: 4,
              fontFamily: '"Crimson Pro", serif',
              fontSize: 13,
              color: '#991B1B',
            }}>
              Backfill failed: {backfillError}
            </div>
          )}

          {backfillResult && (
            <div style={{
              marginTop: 12,
              padding: 12,
              background: PAGE_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 4,
              fontFamily: 'ui-monospace, Menlo, monospace',
              fontSize: 12,
              color: TEXT,
              lineHeight: 1.5,
            }}>
              <div>✓ processed: <strong>{backfillResult.processed}</strong> spirits</div>
              <div>batches: {backfillResult.batches}</div>
              <div>duration: {backfillResult.durationMs} ms</div>
              {Array.isArray(backfillResult.errors) && backfillResult.errors.length > 0 && (
                <div style={{ marginTop: 8, color: '#991B1B' }}>
                  errors: {backfillResult.errors.length} — see console
                </div>
              )}
            </div>
          )}
        </div>

        {/* Question input */}
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={6}
          placeholder="Paste a question to test entity recognition + dossier hydration…"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '12px 14px',
            fontFamily: '"Crimson Pro", serif',
            fontSize: 15,
            lineHeight: 1.5,
            background: CARD_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 6,
            color: TEXT,
            resize: 'vertical',
          }}
        />

        {/* Presets */}
        <div style={{
          display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap',
        }}>
          <button
            onClick={() => setQuestion(SPEC_ACCEPTANCE_TEST)}
            style={presetButtonStyle()}
          >
            BELTAR / ZELDA / SHEIKAH (SPEC ACCEPTANCE TEST)
          </button>
          <button
            onClick={() => setQuestion('Tell me about Legion')}
            style={presetButtonStyle()}
          >
            AKA TOKEN MATCH (LEGION)
          </button>
          <button
            onClick={() => setQuestion('What is the meaning of life')}
            style={presetButtonStyle()}
          >
            NO-MATCH QUERY
          </button>
        </div>

        {/* Run button */}
        <div style={{ marginTop: 16 }}>
          <button
            onClick={run}
            disabled={running || !question.trim()}
            style={{
              padding: '10px 20px',
              fontFamily: 'Cinzel, serif',
              fontSize: 12,
              letterSpacing: '0.1em',
              background: running || !question.trim() ? BORDER : GOLD_DEEP,
              color: running || !question.trim() ? MUTED : '#FFFFFF',
              border: 'none',
              borderRadius: 4,
              cursor: running || !question.trim() ? 'default' : 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {running ? 'Running…' : 'Run hybrid retrieval'}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            background: '#FEE2E2', border: '1px solid #FCA5A5',
            borderRadius: 4, padding: '8px 12px', marginTop: 16,
            fontFamily: '"Crimson Pro", serif', fontSize: 13, color: '#991B1B',
          }}>
            Hybrid retrieval failed: {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ marginTop: 28 }}>
            {/* Summary */}
            <div style={{
              display: 'flex', gap: 24, flexWrap: 'wrap',
              background: CARD_BG, border: `1px solid ${BORDER}`,
              borderRadius: 6, padding: 16, marginBottom: 20,
            }}>
              {[
                ['MATCHES', String(matches.length)],
                ['DOSSIERS', String(dossiers.length)],
                ['CONTEXT BLOCK', `${result.contextBlockLength ?? (result.contextBlock?.length ?? 0)} chars`],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{
                    fontFamily: 'Cinzel, serif', fontSize: 10, color: MUTED,
                    letterSpacing: '0.12em',
                  }}>
                    {label}
                  </div>
                  <div style={{
                    fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 600,
                    color: GOLD_DEEP, marginTop: 4,
                  }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Matches table */}
            <div style={{
              fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 600,
              color: GOLD_DEEP, letterSpacing: '0.15em',
              marginBottom: 12, paddingBottom: 8,
              borderBottom: `1px solid ${BORDER}`,
            }}>
              🎯 MATCHES · {matches.length}
            </div>
            {matches.length === 0 ? (
              <div style={{
                fontFamily: '"Crimson Pro", serif', color: MUTED,
                fontSize: 14, padding: '8px 0', marginBottom: 24,
              }}>
                No spirits matched this question.
              </div>
            ) : (
              <div style={{
                background: CARD_BG, border: `1px solid ${BORDER}`,
                borderRadius: 6, overflow: 'hidden', marginBottom: 24,
              }}>
                {matches.map((m, i) => (
                  <div key={`${m.id}-${i}`} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    borderTop: i === 0 ? 'none' : `1px solid ${BORDER}`,
                  }}>
                    <span style={{
                      fontFamily: '"Crimson Pro", serif', fontSize: 15,
                      fontWeight: 600, color: TEXT, flex: '1 1 200px',
                    }}>
                      {m.name}
                    </span>
                    <span style={{
                      fontFamily: 'Cinzel, serif', fontSize: 10,
                      letterSpacing: '0.08em', padding: '2px 8px',
                      borderRadius: 3,
                      background: m.matched_via === 'name' ? GOLD_DEEP : BORDER,
                      color: m.matched_via === 'name' ? '#FFFFFF' : MUTED,
                    }}>
                      {String(m.matched_via).toUpperCase()}
                    </span>
                    <span style={{
                      fontFamily: '"Crimson Pro", serif', fontSize: 13,
                      color: MUTED, flex: '0 1 240px', textAlign: 'right',
                    }}>
                      “{m.matched_token}”
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Dossiers */}
            <div style={{
              fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 600,
              color: GOLD_DEEP, letterSpacing: '0.15em',
              marginBottom: 12, paddingBottom: 8,
              borderBottom: `1px solid ${BORDER}`,
            }}>
              📂 DOSSIERS · {dossiers.length}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {dossiers.map((d) => {
                const isOpen = !!expanded[d.id]
                return (
                  <div key={d.id} style={{
                    background: CARD_BG, border: `1px solid ${BORDER}`,
                    borderRadius: 6, overflow: 'hidden',
                  }}>
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [d.id]: !prev[d.id] }))}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        gap: 10, padding: '12px 16px', background: 'transparent',
                        border: 'none', cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 10, color: MUTED }}>{isOpen ? '▼' : '▶'}</span>
                      <span style={{
                        fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 600,
                        color: GOLD_DEEP, letterSpacing: '0.06em',
                      }}>
                        {d.name}
                      </span>
                      {d.is_stub && (
                        <span style={{
                          fontFamily: 'Cinzel, serif', fontSize: 9,
                          letterSpacing: '0.08em', padding: '2px 6px',
                          background: BORDER, color: MUTED, borderRadius: 3,
                        }}>
                          STUB
                        </span>
                      )}
                      <span style={{
                        marginLeft: 'auto', fontFamily: '"Crimson Pro", serif',
                        fontSize: 12, color: MUTED,
                      }}>
                        {d.gateways?.length ?? 0} gw · {d.scriptures?.length ?? 0} scr · {(d.hierarchy?.parents?.length ?? 0) + (d.hierarchy?.children?.length ?? 0)} net · {d.companions?.length ?? 0} comp
                      </span>
                    </button>
                    {isOpen && (
                      <div style={{
                        padding: '0 16px 16px 16px',
                        fontFamily: '"Crimson Pro", serif', fontSize: 13,
                        color: TEXT, lineHeight: 1.5,
                      }}>
                        {d.aka?.length > 0 && (
                          <div style={{ marginBottom: 8, color: MUTED }}>
                            <strong style={{ color: TEXT }}>Aliases:</strong> {d.aka.join(' · ')}
                          </div>
                        )}
                        <div style={{ marginBottom: 8 }}>
                          <strong>Description:</strong>{' '}
                          {d.description
                            ? (d.description.length > 400 ? d.description.slice(0, 400) + '…' : d.description)
                            : <span style={{ color: MUTED }}>(none recorded)</span>}
                        </div>
                        <div style={{
                          display: 'flex', gap: 16, flexWrap: 'wrap',
                          fontSize: 12, color: MUTED, marginTop: 10,
                        }}>
                          <span>Gateways: {d.gateways?.length ?? 0}</span>
                          <span>Scriptures: {d.scriptures?.length ?? 0}</span>
                          <span>Parents: {d.hierarchy?.parents?.length ?? 0}</span>
                          <span>Children: {d.hierarchy?.children?.length ?? 0}</span>
                          <span>Companions: {d.companions?.length ?? 0}</span>
                          <span>Regions: {d.regions?.length ?? 0}</span>
                          <span>Conditions: {d.conditions?.length ?? 0}</span>
                          <span>Arsenal Leads: {d.arsenalLeads?.length ?? 0}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Context block */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginBottom: 12, paddingBottom: 8,
              borderBottom: `1px solid ${BORDER}`,
            }}>
              <span style={{
                fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 600,
                color: GOLD_DEEP, letterSpacing: '0.15em',
              }}>
                🧾 CONTEXT BLOCK
              </span>
              <button
                onClick={copyContext}
                disabled={!result.contextBlock}
                style={{
                  marginLeft: 'auto',
                  padding: '6px 12px',
                  fontFamily: 'Cinzel, serif',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  background: CARD_BG,
                  color: TEXT,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 4,
                  cursor: result.contextBlock ? 'pointer' : 'default',
                }}
              >
                {copied ? 'COPIED ✓' : 'COPY TO CLIPBOARD'}
              </button>
            </div>
            <pre style={{
              background: '#1a1a1a',
              color: '#E5E0D5',
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              padding: 16,
              fontSize: 12,
              lineHeight: 1.5,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            }}>
              {result.contextBlock || '(empty — no dossiers hydrated)'}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
