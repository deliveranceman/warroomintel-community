import { createFileRoute } from '@tanstack/react-router'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export const Route = createFileRoute('/community_/scripture')({
  ssr: false,
  component: ScripturePage,
})

const G       = '#C9A84C'
const BG      = '#0D0B14'
const SURF    = '#12101e'
const SURF2   = '#1a1726'
const BDR     = 'rgba(201,168,76,0.22)'
const TXT     = '#e8dcc8'
const DIM     = '#a09080'
const MUT     = '#6b5e45'
const cinzel  = "'Cinzel', serif"
const mono    = "'JetBrains Mono', monospace"
const crimson = "'Crimson Pro', serif"
const georgia = "Georgia, serif"

const TIER_LEVELS: Record<string, number> = { watchman: 0, free: 0, soldier: 1, commander: 2, general: 3, minister: 99 }

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
interface ConversationMessage { role: 'user' | 'assistant'; content: string }

interface AiPanelProps {
  conversation: ConversationMessage[]
  loadingAI: boolean
  aiError: string | null
  question: string
  setQuestion: (q: string) => void
  useLibrary: boolean
  setUseLibrary: (v: boolean) => void
  onSubmit: () => void
  convEndRef: React.RefObject<HTMLDivElement | null>
  questionRef: React.RefObject<HTMLTextAreaElement | null>
}

function AiPanelContent({
  conversation, loadingAI, aiError,
  question, setQuestion,
  useLibrary, setUseLibrary,
  onSubmit, convEndRef, questionRef,
}: AiPanelProps) {
  return (
    <>
      {/* Conversation */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {conversation.length === 0 && (
          <div style={{ fontFamily: crimson, fontSize: 15, color: MUT, lineHeight: 1.6, fontStyle: 'italic', marginTop: 8 }}>
            Select a verse to load Dake's notes, or ask a question about this chapter.
          </div>
        )}
        {conversation.map((msg, i) => (
          <div key={i} style={{ marginBottom: 16, display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'user' ? (
              <div style={{ background: SURF2, border: `1px solid ${BDR}`, borderRadius: 8, padding: '8px 14px', maxWidth: '85%' }}>
                <div style={{ fontFamily: crimson, fontSize: 14, color: TXT, lineHeight: 1.5 }}>{msg.content}</div>
              </div>
            ) : (
              <div style={{ border: `1px solid ${BDR}`, borderRadius: 8, padding: '12px 16px', maxWidth: '92%' }}>
                <div style={{ fontFamily: georgia, fontSize: 15, color: DIM, lineHeight: 1.7, whiteSpace: 'pre-wrap' as const }}>
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}
        {loadingAI && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: G, animation: 'pulse 1.2s ease-in-out infinite' }} />
            <span style={{ fontFamily: mono, fontSize: 10, color: MUT, letterSpacing: '0.1em' }}>Analyzing...</span>
          </div>
        )}
        {aiError && (
          <div style={{ fontFamily: mono, fontSize: 10, color: '#e07070', padding: '8px 12px', background: 'rgba(224,112,112,0.08)', borderRadius: 4, marginTop: 8 }}>
            {aiError}
          </div>
        )}
        <div ref={convEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 20px 16px', borderTop: `1px solid ${BDR}`, flexShrink: 0 }}>
        <textarea
          ref={questionRef}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          rows={2}
          placeholder="Ask about this passage, a spirit mentioned, Greek/Hebrew meaning, warfare application..."
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit() } }}
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            background: SURF2, border: `1px solid ${BDR}`, borderRadius: 4,
            color: TXT, fontFamily: crimson, fontSize: 14,
            padding: '10px 12px', outline: 'none', resize: 'none' as const,
            lineHeight: 1.5, marginBottom: 8,
          }}
        />
        {/* Library toggle */}
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
            background: !question.trim() || loadingAI ? 'rgba(201,168,76,0.25)' : G,
            color: '#1a1305', border: 'none', borderRadius: 4,
            fontFamily: cinzel, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            padding: '10px 0', cursor: !question.trim() || loadingAI ? 'not-allowed' : 'pointer',
          }}
        >
          Ask
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
  const [conversation, setConversation] = useState<ConversationMessage[]>([])
  const [question,     setQuestion]     = useState('')
  const [loadingAI,    setLoadingAI]    = useState(false)
  const [aiError,      setAiError]      = useState<string | null>(null)
  const [isMobile,     setIsMobile]     = useState(false)
  const [showAIPanel,  setShowAIPanel]  = useState(false)
  const convEndRef  = useRef<HTMLDivElement>(null)
  const questionRef = useRef<HTMLTextAreaElement>(null)
  const [useLibrary, setUseLibrary] = useState(true)

  const tier      = ((user?.publicMetadata?.tier as string) || 'watchman').toLowerCase()
  const tierLevel = TIER_LEVELS[tier] ?? 0
  const hasAccess = tierLevel >= 1

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { loadVerses('Genesis', 1) }, [])

  useEffect(() => { convEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [conversation])

  async function loadVerses(b: string, c: number) {
    setLoadingVerses(true)
    setVersesError(null)
    setVerses([])
    setSelectedVerse(null)
    setDakeNote(null)
    setConversation([])
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
      console.log('[Dake] Fetching:', url, { book, chapter, verse: verseNum })
      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
      })
      console.log('[Dake] Response status:', res.status)
      if (res.ok) {
        const data = await res.json()
        console.log('[Dake] Rows returned:', data?.length, data?.[0] ?? '(no row)')
        setDakeNote(data?.[0]?.note || null)
      } else {
        console.error('[Dake] Non-OK response:', res.status, await res.text())
      }
    } catch (e: any) {
      console.error('[Dake] Fetch error:', e?.message)
    }
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
    const updated: ConversationMessage[] = [...conversation, { role: 'user', content: q }]
    setConversation(updated)
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
          conversationHistory: conversation,
          useLibrary,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setAiError(data.error || 'Analysis failed'); setLoadingAI(false); return }
      setConversation([...updated, { role: 'assistant', content: data.response }])
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

  if (!hasAccess) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
      <div style={{ maxWidth: 480, textAlign: 'center' as const }}>
        <div style={{ fontFamily: cinzel, fontSize: 11, color: MUT, letterSpacing: '0.18em', marginBottom: 16 }}>RESTRICTED ACCESS</div>
        <div style={{
          display: 'inline-block', fontFamily: cinzel, fontSize: 8, color: '#7a9e7e',
          background: 'rgba(122,158,126,0.1)', border: '1px solid rgba(122,158,126,0.3)',
          borderRadius: 4, padding: '3px 10px', letterSpacing: '0.1em', marginBottom: 20,
        }}>
          CLASS III · SOLDIER ACCESS
        </div>
        <h1 style={{ fontFamily: cinzel, fontSize: 24, color: G, fontWeight: 700, margin: '0 0 12px' }}>Scripture</h1>
        <p style={{ fontFamily: crimson, fontSize: 16, color: DIM, lineHeight: 1.6, margin: '0 0 8px' }}>
          The Dake Annotated Reference Bible is available to Soldier tier and above.
        </p>
        <p style={{ fontFamily: crimson, fontSize: 14, color: MUT, lineHeight: 1.6, margin: '0 0 28px' }}>
          Upgrade your membership to unlock the full annotated Bible with AI theological analysis.
        </p>
        <a href="/#pricing" style={{ display: 'inline-block', background: G, color: '#1a1305', padding: '10px 28px', fontFamily: cinzel, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', borderRadius: 2, marginRight: 12 }}>
          UPGRADE MEMBERSHIP
        </a>
        <a href="/community" style={{ display: 'inline-block', background: 'transparent', border: `1px solid ${BDR}`, color: DIM, padding: '9px 20px', fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', textDecoration: 'none', borderRadius: 2 }}>
          Return to Community
        </a>
      </div>
    </div>
  )

  // ── LEFT PANEL — verse reader ────────────────────────────────────────────────
  const leftPanel = (
    <div style={{
      flex: isMobile ? 1 : '0 0 60%',
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
      borderRight: isMobile ? 'none' : `1px solid ${BDR}`,
    }}>
      {/* Page header */}
      <div style={{ padding: isMobile ? '16px 16px 0' : '24px 32px 0', borderBottom: `1px solid ${BDR}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <a href="/community" style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: MUT, textDecoration: 'none', minHeight: 36, display: 'flex', alignItems: 'center' }}>← COMMUNITY</a>
          <span style={{ color: BDR }}>|</span>
          <span style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.14em', color: MUT }}>FOUNDATION</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' as const }}>
          <span style={{ fontFamily: cinzel, fontSize: 20, color: G, fontWeight: 700, letterSpacing: '0.06em' }}>SCRIPTURE</span>
          <span style={{ fontFamily: mono, fontSize: 10, color: MUT }}>Dake Annotated Reference Bible</span>
          <div style={{ marginLeft: 'auto', fontFamily: cinzel, fontSize: 8, color: '#7a9e7e', background: 'rgba(122,158,126,0.1)', border: '1px solid rgba(122,158,126,0.3)', borderRadius: 4, padding: '3px 10px', letterSpacing: '0.1em', whiteSpace: 'nowrap' as const }}>CLASS III · SOLDIER ACCESS</div>
        </div>

        {/* Navigation bar */}
        <div style={{
          background: SURF2, border: `1px solid ${BDR}`, borderRadius: 6,
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
          flexWrap: 'wrap' as const, marginBottom: 16,
        }}>
          <select
            value={inputBook}
            onChange={e => setInputBook(e.target.value)}
            style={{
              background: SURF, border: `1px solid ${BDR}`, borderRadius: 4,
              color: TXT, fontFamily: cinzel, fontSize: 11, padding: '6px 10px',
              outline: 'none', cursor: 'pointer', flex: '1 1 140px',
            }}
          >
            {BIBLE_BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <input
            type="number"
            value={inputChapter}
            min={1}
            max={150}
            onChange={e => setInputChapter(Math.max(1, parseInt(e.target.value) || 1))}
            style={{
              background: SURF, border: `1px solid ${BDR}`, borderRadius: 4,
              color: TXT, fontFamily: cinzel, fontSize: 11, padding: '6px 10px',
              outline: 'none', width: 64, flexShrink: 0,
            }}
          />
          <button
            onClick={handleLoad}
            disabled={loadingVerses}
            style={{
              background: loadingVerses ? 'rgba(201,168,76,0.25)' : G,
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
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 12px 80px' : '20px 32px 60px' }}>
        {loadingVerses && (
          <div style={{ fontFamily: cinzel, fontSize: 11, color: MUT, letterSpacing: '0.12em', padding: '48px 0', textAlign: 'center' as const }}>
            LOADING PASSAGE...
          </div>
        )}
        {versesError && (
          <div style={{ fontFamily: crimson, fontSize: 15, color: '#e07070', padding: '20px 0' }}>{versesError}</div>
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
                    LOADING DAKE NOTE...
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
                      DAKE'S NOTES
                    </div>
                    <div style={{ fontFamily: georgia, fontSize: 15, color: DIM, lineHeight: 1.7, maxHeight: 300, overflowY: 'auto' as const }}>
                      {dakeNote}
                    </div>
                  </div>
                )}
                {!loadingDake && !dakeNote && (
                  <div style={{ borderLeft: `3px solid ${BDR}`, padding: '10px 16px', marginTop: 6 }}>
                    <div style={{ fontFamily: mono, fontSize: 10, color: MUT, letterSpacing: '0.08em' }}>
                      No Dake annotation for this verse.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: Ask Dake button */}
      {isMobile && (
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${BDR}`, flexShrink: 0 }}>
          <button
            onClick={() => setShowAIPanel(true)}
            style={{
              width: '100%', background: G, color: '#1a1305', border: 'none', borderRadius: 4,
              fontFamily: cinzel, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
              padding: '12px 0', cursor: 'pointer',
            }}
          >
            Ask Dake
          </button>
        </div>
      )}
    </div>
  )

  // ── RIGHT PANEL — AI chat ────────────────────────────────────────────────────
  const rightPanel = (
    <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column' as const, background: SURF, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px 12px', borderBottom: `1px solid ${BDR}`, flexShrink: 0 }}>
        <div style={{ fontFamily: cinzel, fontSize: 18, color: G, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 2 }}>ASK DAKE</div>
        <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, fontStyle: 'italic' }}>AI Theological Analysis</div>
      </div>
      <AiPanelContent
        conversation={conversation}
        loadingAI={loadingAI}
        aiError={aiError}
        question={question}
        setQuestion={setQuestion}
        useLibrary={useLibrary}
        setUseLibrary={setUseLibrary}
        onSubmit={askDake}
        convEndRef={convEndRef}
        questionRef={questionRef}
      />
    </div>
  )

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' as const, background: BG, overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {leftPanel}
        {!isMobile && rightPanel}
      </div>

      {/* Mobile bottom sheet */}
      {isMobile && showAIPanel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
          <div
            onClick={() => setShowAIPanel(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }}
          />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '70vh', background: SURF,
            borderTop: `2px solid ${G}`, borderRadius: '16px 16px 0 0',
            display: 'flex', flexDirection: 'column' as const, overflow: 'hidden',
          }}>
            <div style={{ padding: '14px 20px 12px', borderBottom: `1px solid ${BDR}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ fontFamily: cinzel, fontSize: 16, color: G, fontWeight: 700, letterSpacing: '0.06em' }}>ASK DAKE</div>
                <div style={{ fontFamily: crimson, fontSize: 12, color: DIM, fontStyle: 'italic' }}>AI Theological Analysis</div>
              </div>
              <button
                onClick={() => setShowAIPanel(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', minWidth: 36, minHeight: 36, justifyContent: 'center' }}
              >
                <X size={20} color={MUT} />
              </button>
            </div>
            <AiPanelContent
              conversation={conversation}
              loadingAI={loadingAI}
              aiError={aiError}
              question={question}
              setQuestion={setQuestion}
              useLibrary={useLibrary}
              setUseLibrary={setUseLibrary}
              onSubmit={askDake}
              convEndRef={convEndRef}
              questionRef={questionRef}
            />
          </div>
        </div>
      )}
    </div>
  )
}
