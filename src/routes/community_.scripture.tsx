import { createFileRoute } from '@tanstack/react-router'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { useState, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { CommunitySidebarShell } from '@/components/CommunitySidebarShell'
import { SolIcon } from '@/components/SolIcon'
import { UpgradeGate } from '@/components/UpgradeGate'
import { getAccessLevel } from '@/lib/access'

export const Route = createFileRoute('/community_/scripture')({
  ssr: false,
  component: ScripturePage,
})

const G       = 'var(--gold)'
const BG      = 'var(--deep)'
const SURF    = 'var(--surface)'
const SURF2   = 'var(--surface2)'
const BDR     = 'var(--border)'
const TXT     = 'var(--t-0)'
const DIM     = 'var(--t-3)'
const MUT     = 'var(--t-4)'
const cinzel  = "'Cinzel', serif"
const mono    = "'JetBrains Mono', monospace"
const crimson = "'Crimson Pro', serif"
const georgia = "Georgia, serif"


const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
  'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
  'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews',
  'James', '1 Peter', '2 Peter', '1 John', '2 John',
  '3 John', 'Jude', 'Revelation',
]

interface Verse { verse: number; text: string }
interface ConversationEntry { question: string; response: string }

interface AiPanelProps {
  thread: ConversationEntry[]
  loadingAI: boolean
  aiError: string | null
  question: string
  setQuestion: (q: string) => void
  useLibrary: boolean
  setUseLibrary: (v: boolean) => void
  onSubmit: () => void
  threadEndRef: React.RefObject<HTMLDivElement | null>
  questionRef: React.RefObject<HTMLTextAreaElement | null>
  recentSearches: string[]
  onRecentClick: (q: string) => void
}

function AiPanelContent({
  thread, loadingAI, aiError,
  question, setQuestion,
  useLibrary, setUseLibrary,
  onSubmit, threadEndRef, questionRef,
  recentSearches, onRecentClick,
}: AiPanelProps) {
  return (
    <>
      {/* Recent searches chips */}
      {recentSearches.length > 0 && thread.length === 0 && (
        <div style={{ padding: '10px 20px 0', flexShrink: 0 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: MUT, letterSpacing: '0.1em', marginBottom: 6 }}>RECENT SEARCHES</div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
            {recentSearches.map((s, i) => (
              <button
                key={i}
                onClick={() => onRecentClick(s)}
                style={{
                  background: SURF2, border: `1px solid ${BDR}`, borderRadius: 20,
                  color: DIM, fontFamily: crimson, fontSize: 11,
                  padding: '4px 10px', cursor: 'pointer',
                  maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                }}
              >
                {s.length > 40 ? s.slice(0, 40) + '…' : s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Thread */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {thread.length === 0 && (
          <div style={{ fontFamily: crimson, fontSize: 15, color: MUT, lineHeight: 1.6, fontStyle: 'italic', marginTop: 8 }}>
            Select a verse to load annotation notes, or ask a question about this chapter.
          </div>
        )}
        {thread.map((entry, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            {/* Question */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <div style={{ background: SURF2, border: `1px solid ${BDR}`, borderRadius: 8, padding: '8px 14px', maxWidth: '85%' }}>
                <div style={{ fontFamily: mono, fontSize: 9, color: G, letterSpacing: '0.1em', marginBottom: 4 }}>YOU</div>
                <div style={{ fontFamily: crimson, fontSize: 14, color: TXT, lineHeight: 1.5 }}>{entry.question}</div>
              </div>
            </div>
            {/* Response */}
            <div style={{ border: `1px solid ${BDR}`, borderRadius: 8, padding: '12px 16px', maxWidth: '92%' }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: G, letterSpacing: '0.1em', marginBottom: 6 }}>SOL</div>
              <div style={{ fontFamily: georgia, fontSize: 15, color: DIM, lineHeight: 1.7, whiteSpace: 'pre-wrap' as const }}>
                {entry.response}
              </div>
            </div>
          </div>
        ))}
        {loadingAI && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: G, animation: 'pulse 1.2s ease-in-out infinite' }} />
            <span style={{ fontFamily: mono, fontSize: 10, color: MUT, letterSpacing: '0.1em' }}>Analyzing...</span>
          </div>
        )}
        {aiError && (
          <div style={{ fontFamily: mono, fontSize: 10, color: 'var(--crit)', padding: '8px 12px', background: 'var(--crit-bg)', borderRadius: 4, marginTop: 8 }}>
            {aiError}
          </div>
        )}
        <div ref={threadEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 20px 16px', borderTop: `1px solid ${BDR}`, flexShrink: 0 }}>
        <textarea
          ref={questionRef}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          rows={2}
          placeholder="Ask about this passage, Greek/Hebrew meaning, warfare application, ministry context..."
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit() } }}
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            background: SURF2, border: `1px solid ${BDR}`, borderRadius: 4,
            color: TXT, fontFamily: crimson, fontSize: 14,
            padding: '10px 12px', outline: 'none', resize: 'none' as const,
            lineHeight: 1.5, marginBottom: 8,
          }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={useLibrary}
            onChange={e => setUseLibrary(e.target.checked)}
            style={{ accentColor: G, width: 13, height: 13, cursor: 'pointer' }}
          />
          <span style={{ fontFamily: mono, fontSize: 10, color: useLibrary ? DIM : MUT, letterSpacing: '0.04em', transition: 'color 0.15s' }}>
            📚 Include Ministry Library
          </span>
        </label>
        <button
          onClick={onSubmit}
          disabled={!question.trim() || loadingAI}
          style={{
            width: '100%',
            background: !question.trim() || loadingAI ? 'var(--gold-dim)' : G,
            color: '#1a1305', border: 'none', borderRadius: 4,
            fontFamily: cinzel, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            padding: '10px 0', cursor: !question.trim() || loadingAI ? 'not-allowed' : 'pointer',
          }}
        >
          ASK
        </button>
      </div>
    </>
  )
}

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string | undefined
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function ScripturePage() {
  const { getToken }       = useAuth()
  const { user, isLoaded } = useUser()

  const [book,         setBook]         = useState('Genesis')
  const [chapter,      setChapter]      = useState(1)
  const [inputBook,    setInputBook]    = useState('Genesis')
  const [inputChapter, setInputChapter] = useState(1)
  const [verses,       setVerses]       = useState<Verse[]>([])
  const [loadingVerses, setLoadingVerses] = useState(false)
  const [versesError,  setVersesError]  = useState<string | null>(null)
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null)
  const [dakeNote,     setDakeNote]     = useState<string | null>(null)
  const [loadingDake,  setLoadingDake]  = useState(false)
  const [thread,       setThread]       = useState<ConversationEntry[]>([])
  const [question,     setQuestion]     = useState('')
  const [loadingAI,    setLoadingAI]    = useState(false)
  const [aiError,      setAiError]      = useState<string | null>(null)
  const [isMobile,     setIsMobile]     = useState(false)
  const [panelOpen,    setPanelOpen]    = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const threadEndRef  = useRef<HTMLDivElement>(null)
  const questionRef   = useRef<HTMLTextAreaElement>(null)
  const [useLibrary,  setUseLibrary]   = useState(true)

  const tier      = ((user?.publicMetadata?.tier as string) || 'watchman').toLowerCase()
  const hasAccess = getAccessLevel({ tier, role: (user?.publicMetadata?.role as string | null) }) >= 1

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { loadVerses('Genesis', 1) }, [])

  useEffect(() => { threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread])

  const fetchRecentSearches = useCallback(async () => {
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch('/api/ai-history?tool=ask-sol&limit=5', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setRecentSearches((data.history || []).map((h: any) => h.query))
      }
    } catch {}
  }, [getToken])

  function openPanel() {
    setPanelOpen(true)
    fetchRecentSearches()
    setTimeout(() => questionRef.current?.focus(), 100)
  }

  function closePanel() {
    setPanelOpen(false)
  }

  async function loadVerses(b: string, c: number) {
    setLoadingVerses(true)
    setVersesError(null)
    setVerses([])
    setSelectedVerse(null)
    setDakeNote(null)
    try {
      const bookParam = b.toLowerCase().replace(/ /g, '+')
      const res = await fetch(`https://bible-api.com/${bookParam}+${c}?translation=kjv`)
      if (!res.ok) throw new Error('Could not load passage')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setVerses((data.verses || []).map((v: any) => ({ verse: v.verse, text: v.text })))
      setBook(b)
      setChapter(c)
    } catch (e: any) {
      setVersesError(e.message || 'Failed to load passage')
    } finally {
      setLoadingVerses(false)
    }
  }

  async function handleLoad() {
    await loadVerses(inputBook, inputChapter)
  }

  async function selectVerse(verseNum: number) {
    if (selectedVerse === verseNum) {
      setSelectedVerse(null)
      setDakeNote(null)
      return
    }
    setSelectedVerse(verseNum)
    setDakeNote(null)
    setLoadingDake(true)
    try {
      const url = `${SUPABASE_URL}/rest/v1/bible_notes?book=eq.${encodeURIComponent(book)}&chapter=eq.${chapter}&verse=eq.${verseNum}&select=note`
      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON!,
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        setDakeNote(data?.[0]?.note || null)
      }
    } catch {}
    setLoadingDake(false)
  }

  async function askDake() {
    if (!question.trim() || loadingAI) return
    const q = question.trim()
    setQuestion('')
    setTimeout(() => questionRef.current?.focus(), 0)
    setAiError(null)
    const selectedVerseText = selectedVerse
      ? verses.find(v => v.verse === selectedVerse)?.text || ''
      : ''
    setLoadingAI(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/bible-ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          question: q,
          book,
          chapter,
          verseText: selectedVerseText,
          conversationHistory: thread.flatMap(e => [
            { role: 'user', content: e.question },
            { role: 'assistant', content: e.response },
          ]),
          useLibrary,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setAiError(data.error || 'Analysis failed'); setLoadingAI(false); return }
      setThread(prev => [...prev, { question: q, response: data.response }])
      // Fire-and-forget history record
      if (token) {
        fetch('/api/ai-history', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: 'ask-sol', query: q, response: data.response, context: { book, chapter, verse: selectedVerse } }),
        }).catch(() => {})
      }
    } catch (e: any) {
      setAiError(e.message || 'Network error')
    }
    setLoadingAI(false)
  }

  if (!isLoaded) return (
    <div style={{ height: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.2em', color: MUT }}>LOADING...</div>
    </div>
  )

  if (!user) return (
    <div style={{ height: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' as const }}>
        <div style={{ fontFamily: cinzel, fontSize: 14, color: G, marginBottom: 12 }}>Scripture</div>
        <div style={{ fontFamily: crimson, fontSize: 14, color: DIM, marginBottom: 20 }}>Sign in to access Scripture</div>
        <a href="/sign-in" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', color: BG, background: G, padding: '10px 24px', borderRadius: 4, textDecoration: 'none' }}>SIGN IN</a>
      </div>
    </div>
  )

  const scrUserName      = user?.firstName || user?.username || 'Warrior'
  const scrUserTierLabel = tier === 'watchman' || tier === 'free' ? 'WATCHMAN' : tier.toUpperCase()

  return (
    <CommunitySidebarShell activeItem="Scripture" userName={scrUserName} userTierLabel={scrUserTierLabel} fillViewport>
      {!hasAccess ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UpgradeGate
            variant="screen"
            requiredTier="soldier"
            featureName="Scripture"
            description="SOL's Spiritual Warfare & Reference Bible is available to Soldier tier and above. Upgrade to unlock the full annotated Bible with AI theological analysis."
            isDark
          />
        </div>
      ) : (
      <>
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes slideInUp    { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes pulse        { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, background: BG, overflow: 'hidden', position: 'relative' as const }}>

        {/* Main verse reader — full width */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' }}>
          {/* Page header */}
          <div style={{ padding: isMobile ? '16px 16px 0' : '24px 32px 0', borderBottom: `1px solid ${BDR}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.14em', color: MUT }}>FOUNDATION</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' as const }}>
              <span style={{ fontFamily: cinzel, fontSize: 20, color: G, fontWeight: 700, letterSpacing: '0.06em' }}>SCRIPTURE</span>
              <span style={{ fontFamily: mono, fontSize: 10, color: MUT }}>KJV Text</span>
              <div style={{ marginLeft: 'auto', fontFamily: cinzel, fontSize: 8, color: 'var(--ok)', background: 'var(--ok-bg)', border: '1px solid rgba(122,158,126,0.3)', borderRadius: 4, padding: '3px 10px', letterSpacing: '0.1em', whiteSpace: 'nowrap' as const }}>CLASS III · SOLDIER ACCESS</div>
            </div>

            {/* Navigation bar */}
            <div style={{
              background: SURF2, border: `1px solid ${BDR}`, borderRadius: 6,
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
              flexWrap: 'wrap' as const, marginBottom: 16,
            }}>
              <select
                value={inputBook}
                onChange={e => { setInputBook(e.target.value); setInputChapter(1) }}
                style={{
                  background: SURF, border: `1px solid ${BDR}`, borderRadius: 4,
                  color: TXT, fontFamily: cinzel, fontSize: 11, padding: '6px 10px',
                  outline: 'none', cursor: 'pointer', flex: '1 1 140px',
                }}
              >
                {BIBLE_BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <button
                onClick={() => { const prev = Math.max(1, inputChapter - 1); setInputChapter(prev); loadVerses(inputBook, prev) }}
                disabled={loadingVerses || inputChapter <= 1}
                title="Previous chapter"
                style={{
                  background: SURF, border: `1px solid ${BDR}`, borderRadius: 4,
                  color: inputChapter <= 1 ? MUT : TXT, fontFamily: cinzel, fontSize: 14,
                  padding: '5px 10px', cursor: inputChapter <= 1 ? 'default' : 'pointer',
                  flexShrink: 0, lineHeight: 1,
                }}
              >←</button>
              <input
                type="number"
                value={inputChapter}
                min={1}
                max={150}
                onClick={e => (e.target as HTMLInputElement).select()}
                onChange={e => setInputChapter(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  background: SURF, border: `1px solid ${BDR}`, borderRadius: 4,
                  color: TXT, fontFamily: cinzel, fontSize: 11, padding: '6px 10px',
                  outline: 'none', width: 64, flexShrink: 0, textAlign: 'center' as const,
                }}
              />
              <button
                onClick={() => { const next = inputChapter + 1; setInputChapter(next); loadVerses(inputBook, next) }}
                disabled={loadingVerses}
                title="Next chapter"
                style={{
                  background: SURF, border: `1px solid ${BDR}`, borderRadius: 4,
                  color: TXT, fontFamily: cinzel, fontSize: 14,
                  padding: '5px 10px', cursor: loadingVerses ? 'default' : 'pointer',
                  flexShrink: 0, lineHeight: 1,
                }}
              >→</button>
              <button
                onClick={handleLoad}
                disabled={loadingVerses}
                style={{
                  background: loadingVerses ? 'var(--gold-dim)' : G,
                  color: '#1a1305', border: 'none', borderRadius: 4,
                  fontFamily: cinzel, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                  padding: '8px 18px', cursor: loadingVerses ? 'default' : 'pointer', flexShrink: 0,
                }}
              >
                {loadingVerses ? 'Loading...' : 'Load'}
              </button>
            </div>
          </div>

          {/* Verse area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 12px 100px' : '20px 32px 60px' }}>
            {loadingVerses && (
              <div style={{ fontFamily: cinzel, fontSize: 11, color: MUT, letterSpacing: '0.12em', padding: '48px 0', textAlign: 'center' as const }}>
                LOADING PASSAGE...
              </div>
            )}
            {versesError && (
              <div style={{ fontFamily: crimson, fontSize: 15, color: 'var(--crit)', padding: '20px 0' }}>{versesError}</div>
            )}

            {!loadingVerses && verses.length > 0 && (
              <div style={{ fontFamily: cinzel, fontSize: 10, color: MUT, letterSpacing: '0.14em', marginBottom: 20 }}>
                {book.toUpperCase()} · CHAPTER {chapter}
              </div>
            )}

            {verses.map(v => (
              <div key={v.verse}>
                <div
                  onClick={() => selectVerse(v.verse)}
                  style={{
                    display: 'flex', gap: 12, padding: '8px 10px', borderRadius: 6,
                    cursor: 'pointer',
                    background: selectedVerse === v.verse ? 'rgba(201,168,76,0.08)' : 'transparent',
                    marginBottom: 2,
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (selectedVerse !== v.verse) (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.04)' }}
                  onMouseLeave={e => { if (selectedVerse !== v.verse) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <span style={{ fontFamily: mono, fontSize: 11, color: G, flexShrink: 0, width: 32, paddingTop: 3, lineHeight: 1 }}>
                    {v.verse}
                  </span>
                  <span style={{ fontFamily: georgia, fontSize: 16, color: TXT, lineHeight: 1.7 }}>{v.text}</span>
                </div>

                {selectedVerse === v.verse && (
                  <div style={{ marginLeft: 44, marginBottom: 16 }}>
                    {loadingDake && (
                      <div style={{ fontFamily: mono, fontSize: 10, color: MUT, letterSpacing: '0.1em', padding: '12px 0' }}>
                        LOADING NOTE...
                      </div>
                    )}
                    {!loadingDake && dakeNote && (
                      <div style={{
                        borderLeft: `3px solid ${G}`,
                        background: 'rgba(201,168,76,0.04)',
                        borderRadius: '0 6px 6px 0',
                        padding: '14px 18px', marginTop: 6,
                      }}>
                        <div style={{ fontFamily: mono, fontSize: 9, color: G, letterSpacing: '0.14em', textTransform: 'uppercase' as const, marginBottom: 10 }}>
                          ANNOTATION NOTES
                        </div>
                        <div style={{ fontFamily: georgia, fontSize: 15, color: DIM, lineHeight: 1.7, maxHeight: 300, overflowY: 'auto' as const }}>
                          {dakeNote}
                        </div>
                      </div>
                    )}
                    {!loadingDake && !dakeNote && (
                      <div style={{ borderLeft: `3px solid ${BDR}`, padding: '10px 16px', marginTop: 6 }}>
                        <div style={{ fontFamily: mono, fontSize: 10, color: MUT, letterSpacing: '0.08em' }}>
                          No annotation available for this verse.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── FLOATING TAB BUTTON (desktop only) ── */}
        {!isMobile && (
          <button
            onClick={panelOpen ? closePanel : openPanel}
            style={{
              position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)',
              zIndex: 8999,
              background: panelOpen ? SURF2 : G,
              color: panelOpen ? G : '#1a1305',
              border: `1px solid ${G}`,
              borderRight: 'none',
              borderRadius: '8px 0 0 8px',
              padding: '14px 8px',
              cursor: 'pointer',
              writingMode: 'vertical-rl' as any,
              textOrientation: 'mixed' as any,
              fontFamily: cinzel,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              whiteSpace: 'nowrap' as const,
            }}
          >
            ASK SOL ✦
          </button>
        )}

        {/* ── DESKTOP FLYOUT PANEL ── */}
        {!isMobile && (
          <>
            {/* Backdrop */}
            {panelOpen && (
              <div
                onClick={closePanel}
                style={{ position: 'fixed', inset: 0, zIndex: 8998, background: 'rgba(0,0,0,0.35)' }}
              />
            )}
            <div style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, width: 580,
              background: SURF,
              borderLeft: `2px solid ${G}`,
              display: 'flex', flexDirection: 'column' as const,
              zIndex: 9000,
              transform: panelOpen ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.3s ease',
              overflow: 'hidden',
            }}>
              {/* Panel header */}
              <div style={{ padding: '20px 24px 12px', borderBottom: `1px solid ${BDR}`, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <SolIcon size={28} />
                    <div style={{ fontFamily: cinzel, fontSize: 18, color: G, fontWeight: 700, letterSpacing: '0.06em' }}>ASK SOL</div>
                  </div>
                  <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, fontStyle: 'italic' }}>Pulling from internal ministry notes, various commentaries, and the War Room Intel knowledge base.</div>
                </div>
                <button
                  onClick={closePanel}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', color: MUT, fontSize: 20, lineHeight: 1, borderRadius: 4 }}
                >
                  <X size={20} />
                </button>
              </div>
              <AiPanelContent
                thread={thread}
                loadingAI={loadingAI}
                aiError={aiError}
                question={question}
                setQuestion={setQuestion}
                useLibrary={useLibrary}
                setUseLibrary={setUseLibrary}
                onSubmit={askDake}
                threadEndRef={threadEndRef}
                questionRef={questionRef}
                recentSearches={recentSearches}
                onRecentClick={q => { setQuestion(q); setTimeout(() => questionRef.current?.focus(), 0) }}
              />
            </div>
          </>
        )}

        {/* ── MOBILE: Ask Dake button + bottom sheet ── */}
        {isMobile && (
          <>
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${BDR}`, flexShrink: 0 }}>
              <button
                onClick={openPanel}
                style={{
                  width: '100%', background: G, color: '#1a1305', border: 'none', borderRadius: 4,
                  fontFamily: cinzel, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
                  padding: '12px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <SolIcon size={18} />
                ASK SOL ✦
              </button>
            </div>

            {panelOpen && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
                <div
                  onClick={closePanel}
                  style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }}
                />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '75vh', background: SURF,
                  borderTop: `2px solid ${G}`, borderRadius: '16px 16px 0 0',
                  display: 'flex', flexDirection: 'column' as const, overflow: 'hidden',
                  animation: 'slideInUp 0.3s ease',
                }}>
                  {/* Drag handle */}
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', flexShrink: 0 }}>
                    <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(201,168,76,0.3)' }} />
                  </div>
                  {/* Header */}
                  <div style={{ padding: '8px 20px 12px', borderBottom: `1px solid ${BDR}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <SolIcon size={22} />
                        <div style={{ fontFamily: cinzel, fontSize: 16, color: G, fontWeight: 700, letterSpacing: '0.06em' }}>ASK SOL</div>
                      </div>
                      <div style={{ fontFamily: crimson, fontSize: 12, color: DIM, fontStyle: 'italic' }}>Pulling from internal ministry notes, various commentaries, and the War Room Intel knowledge base.</div>
                    </div>
                    <button
                      onClick={closePanel}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', minWidth: 36, minHeight: 36, justifyContent: 'center' }}
                    >
                      <X size={20} color={MUT} />
                    </button>
                  </div>
                  <AiPanelContent
                    thread={thread}
                    loadingAI={loadingAI}
                    aiError={aiError}
                    question={question}
                    setQuestion={setQuestion}
                    useLibrary={useLibrary}
                    setUseLibrary={setUseLibrary}
                    onSubmit={askDake}
                    threadEndRef={threadEndRef}
                    questionRef={questionRef}
                    recentSearches={recentSearches}
                    onRecentClick={q => { setQuestion(q); setTimeout(() => questionRef.current?.focus(), 0) }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
      </>
      )}
    </CommunitySidebarShell>
  )
}
