import { useState, useEffect } from 'react'

const G = '#C9A84C'
const BG = '#0D0B14'
const SURF = '#12101e'
const SURF2 = '#1a1726'
const BDR = 'rgba(201,168,76,0.22)'
const TXT = '#e8dcc8'
const DIM = '#a09080'
const MUT = '#6b5e45'
const cinzel = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

interface Region {
  id: string
  name: string
  status: string
  tier: string
  updated_at: string
}

interface Submission {
  id: string
  region: { name: string }
  submitted_at: string
  admin_status: string
  admin_notes?: string
}

interface Props {
  userId: string
  userName: string
}

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  draft: { color: '#6b6b7a', label: 'Draft', icon: '📝' },
  submitted: { color: '#5C7CBF', label: 'Under Review', icon: '⏳' },
  approved: { color: '#80e090', label: 'Live on Map', icon: '✓' },
  rejected: { color: '#e09090', label: 'Needs Revision', icon: '↩' },
}

export function SubmitRegion({ userId, userName }: Props) {
  const [regions, setRegions] = useState<Region[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/sm-regions').then(r => r.json()).catch(() => ({ regions: [] })),
      fetch(`/api/sm-submissions?userId=${userId}`).then(r => r.json()).catch(() => ({ submissions: [] })),
    ]).then(([rd, sd]) => {
      setRegions(rd.regions || [])
      setSubmissions(sd.submissions || [])
      setLoading(false)
    })
  }, [userId])

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '32px 24px', background: BG }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {/* Hero */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: cinzel, fontSize: 22, color: G, marginBottom: 6 }}>📤 Submit Region</div>
          <div style={{ fontFamily: crimson, fontSize: 14, color: DIM, fontStyle: 'italic' }}>
            Contribute your field intelligence to the global spiritual mapping database
          </div>
        </div>

        {/* 3-step flow */}
        <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 10, padding: '24px', marginBottom: 28 }}>
          <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.18em', color: MUT, marginBottom: 16 }}>SUBMISSION PROCESS</div>
          <div style={{ display: 'flex', gap: 0 }}>
            {[
              { step: 1, label: 'Complete Assessment', desc: 'Fill all 9 sections of the Field Assessment form', icon: '🗂' },
              { step: 2, label: 'Generate Dossier', desc: 'AI generates your Field Intelligence Dossier', icon: '⚡' },
              { step: 3, label: 'Submit for Review', desc: 'Admin reviews and approves for the Global Map', icon: '📤' },
            ].map((s, i) => (
              <div key={s.step} style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: 0, position: 'relative' }}>
                {i > 0 && <div style={{ position: 'absolute', left: 0, top: 20, width: 1, height: 60, background: BDR }} />}
                <div style={{ flex: 1, padding: i > 0 ? '0 0 0 24px' : '0 24px 0 0', borderLeft: i > 0 ? `1px solid ${BDR}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${G}22`, border: `1px solid ${G}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 12, color: G, flexShrink: 0 }}>
                      {s.step}
                    </div>
                    <div style={{ fontFamily: cinzel, fontSize: 11, color: TXT }}>{s.label}</div>
                  </div>
                  <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, lineHeight: 1.5, paddingLeft: 42 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* My Regions */}
        {!loading && regions.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.18em', color: MUT, marginBottom: 12 }}>MY REGIONS</div>
            {regions.map(r => {
              const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.draft
              return (
                <div key={r.id} style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 8, padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 20 }}>📍</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 12, color: TXT, marginBottom: 3 }}>{r.name}</div>
                    <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', color: MUT }}>{r.tier?.toUpperCase()}</div>
                  </div>
                  <span style={{
                    fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em',
                    color: cfg.color, border: `1px solid ${cfg.color}44`,
                    padding: '3px 10px', borderRadius: 20,
                  }}>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Submission history */}
        {!loading && submissions.length > 0 && (
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.18em', color: MUT, marginBottom: 12 }}>SUBMISSION HISTORY</div>
            {submissions.map(s => {
              const cfg = STATUS_CONFIG[s.admin_status] || STATUS_CONFIG.submitted
              return (
                <div key={s.id} style={{ background: SURF2, border: `1px solid ${BDR}`, borderRadius: 8, padding: '14px 16px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: s.admin_notes ? 8 : 0 }}>
                    <div>
                      <div style={{ fontFamily: cinzel, fontSize: 11, color: TXT }}>{s.region?.name}</div>
                      <div style={{ fontFamily: cinzel, fontSize: 8, color: MUT, letterSpacing: '0.08em', marginTop: 2 }}>
                        Submitted {new Date(s.submitted_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span style={{
                      fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em',
                      color: cfg.color, border: `1px solid ${cfg.color}44`,
                      padding: '3px 10px', borderRadius: 20,
                    }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                  {s.admin_notes && (
                    <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, fontStyle: 'italic', borderTop: `1px solid ${BDR}`, paddingTop: 8, marginTop: 8 }}>
                      Admin note: {s.admin_notes}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!loading && regions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontFamily: crimson, fontSize: 15, color: DIM, fontStyle: 'italic', marginBottom: 20 }}>
              No regions in your portfolio yet. Complete a Field Assessment to get started.
            </div>
            <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.14em', color: MUT }}>
              TAB: Field Assessment → Create Region → Complete 9 Sections → Generate Dossier → Submit
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
