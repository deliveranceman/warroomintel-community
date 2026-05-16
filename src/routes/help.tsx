import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/help')({
  component: HelpPage,
})

// ── STYLE TOKENS ─────────────────────────────────────────
const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"
const gold    = 'var(--gold)'
const deep    = 'var(--deep)'
const surface = 'var(--surface)'
const surface2 = 'var(--surface2)'
const border  = 'var(--border)'
const borderBright = 'var(--border-bright)'
const text    = 'var(--text)'
const textDim = 'var(--text-dim)'
const muted   = 'var(--muted)'
const goldDim = 'var(--gold-dim)'

// ── SHARED FIELD COMPONENTS ───────────────────────────────
function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div style={{ borderTop: `2px solid ${gold}`, paddingTop: '20px', marginBottom: '28px' }}>
      <div style={{ fontFamily: cinzel, fontSize: '8px', letterSpacing: '0.3em', color: gold, marginBottom: '6px' }}>SECTION {number}</div>
      <div style={{ fontFamily: cinzel, fontSize: '16px', fontWeight: 700, color: text, letterSpacing: '0.06em' }}>{title}</div>
    </div>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.12em', color: gold, marginBottom: '8px', textTransform: 'uppercase' as const }}>
      {children}{required && <span style={{ color: 'rgba(201,168,76,0.6)', marginLeft: '4px' }}>*</span>}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  background: deep,
  border: `1px solid ${border}`,
  borderRadius: '4px',
  padding: '11px 14px',
  fontFamily: crimson,
  fontSize: '15px',
  color: text,
  outline: 'none',
  boxSizing: 'border-box' as const,
  transition: 'border-color 0.2s',
}

function TextInput({ name, value, onChange, placeholder, required }: {
  name: string; value: string; onChange: (n: string, v: string) => void;
  placeholder?: string; required?: boolean
}) {
  return (
    <input
      name={name} value={value} required={required}
      onChange={e => onChange(name, e.target.value)}
      placeholder={placeholder}
      style={inputStyle}
      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)')}
      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.18)')}
    />
  )
}

function TextArea({ name, value, onChange, placeholder, rows = 5 }: {
  name: string; value: string; onChange: (n: string, v: string) => void;
  placeholder?: string; rows?: number
}) {
  return (
    <textarea
      name={name} value={value}
      onChange={e => onChange(name, e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ ...inputStyle, resize: 'vertical' as const, minHeight: `${rows * 24}px` }}
      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)')}
      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.18)')}
    />
  )
}

function RadioGroup({ name, value, onChange, options }: {
  name: string; value: string; onChange: (n: string, v: string) => void; options: string[]
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px' }}>
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onChange(name, opt)}
          style={{
            fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.08em',
            padding: '8px 16px', borderRadius: '3px',
            border: value === opt ? `1px solid ${gold}` : `1px solid ${border}`,
            color: value === opt ? gold : textDim,
            background: value === opt ? goldDim : 'transparent',
            cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' as const,
          }}>
          {opt}
        </button>
      ))}
    </div>
  )
}

function CheckGroup({ name, value, onChange, options }: {
  name: string; value: string[]; onChange: (n: string, v: string[]) => void; options: string[]
}) {
  const toggle = (opt: string) => {
    const next = value.includes(opt) ? value.filter(x => x !== opt) : [...value, opt]
    onChange(name, next)
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
      {options.map(opt => {
        const checked = value.includes(opt)
        return (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            style={{
              fontFamily: crimson, fontSize: '14px',
              padding: '9px 14px', borderRadius: '3px', textAlign: 'left' as const,
              border: checked ? `1px solid ${gold}` : `1px solid ${border}`,
              color: checked ? gold : textDim,
              background: checked ? goldDim : 'transparent',
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
            <span style={{
              width: '14px', height: '14px', flexShrink: 0,
              border: checked ? `2px solid ${gold}` : `1px solid ${muted}`,
              borderRadius: '2px',
              background: checked ? gold : 'transparent',
              display: 'inline-block',
              transition: 'all 0.15s',
            }} />
            {opt}
          </button>
        )
      })}
    </div>
  )
}

// ── FORM ─────────────────────────────────────────────────
type FormState = {
  firstName: string; lastName: string; email: string; phone: string
  stateCountry: string; ageRange: string
  believer: string; timeSaved: string; inChurch: string; previousMinistry: string
  experiences: string[]; duration: string; description: string; alreadyTried: string; currentlySafe: string
  contactMethod: string; bestTime: string; notes: string
}

const INITIAL: FormState = {
  firstName: '', lastName: '', email: '', phone: '',
  stateCountry: '', ageRange: '',
  believer: '', timeSaved: '', inChurch: '', previousMinistry: '',
  experiences: [], duration: '', description: '', alreadyTried: '', currentlySafe: '',
  contactMethod: '', bestTime: '', notes: '',
}

const EXPERIENCE_OPTIONS = [
  'Demonic oppression or harassment',
  'Hearing voices or intrusive thoughts',
  'Compulsive behaviors I cannot stop',
  'Unexplained fear, anxiety, or panic',
  'Physical symptoms with no medical explanation',
  'Sexual bondage or perversion',
  'Rage or violence episodes',
  'Depression or suicidal thoughts',
  'Occult or witchcraft involvement',
  'Freemasonry in my family',
  'Trauma or abuse history',
  'Relationship or soul tie issues',
  'Something I cannot explain',
]

function HelpPage() {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setField(name: string, value: string) {
    setForm(f => ({ ...f, [name]: value }))
  }

  function setCheckField(name: string, value: string[]) {
    setForm(f => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.firstName || !form.lastName || !form.email || !form.stateCountry || !form.description) {
      setError('Please fill in all required fields.')
      return
    }
    if (form.description.length < 100) {
      setError('Please describe your situation in at least 100 characters.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/submit-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Submission failed')
      }
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Thank-you screen ──
  if (submitted) {
    return (
      <div style={{ minHeight: 'calc(100vh - 73px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', background: deep }}>
        <div style={{ maxWidth: '560px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚔</div>
          <h2 style={{ fontFamily: cinzel, fontSize: '22px', color: gold, letterSpacing: '0.1em', marginBottom: '16px' }}>Your Request Has Been Received</h2>
          <p style={{ fontFamily: crimson, fontSize: '17px', color: textDim, fontStyle: 'italic', lineHeight: 1.8, marginBottom: '8px' }}>
            Our ministry team reviews every submission personally. You will hear from us at{' '}
            <strong style={{ color: gold }}>{form.email}</strong>{' '}
            within 3–5 business days.
          </p>
          <p style={{ fontFamily: crimson, fontSize: '16px', color: textDim, fontStyle: 'italic', lineHeight: 1.7, marginBottom: '32px' }}>
            In the meantime — take the free Ministry Assessment to help us understand your situation better.
          </p>
          <a href="/assessment"
            style={{ display: 'inline-block', fontFamily: cinzel, fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', padding: '14px 32px', background: gold, color: deep, textDecoration: 'none', borderRadius: '3px' }}>
            Take Assessment →
          </a>
        </div>
      </div>
    )
  }

  // ── Form ──
  return (
    <div style={{ background: deep, minHeight: 'calc(100vh - 73px)' }}>

      {/* Page header */}
      <div style={{ background: surface, borderBottom: `1px solid ${border}`, padding: '3rem 2rem 2.5rem' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <p style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.3em', color: gold, marginBottom: '12px' }}>✦ Ministry Support</p>
          <h1 style={{ fontFamily: cinzel, fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 700, color: text, marginBottom: '14px', lineHeight: 1.1 }}>
            Request <em style={{ color: gold, fontStyle: 'normal' }}>Ministry Help</em>
          </h1>
          <p style={{ fontFamily: crimson, fontSize: '17px', color: textDim, fontStyle: 'italic', lineHeight: 1.8, maxWidth: '580px' }}>
            If you believe you are under spiritual attack, struggling with bondage, or need deliverance ministry — fill out this form. Our team reviews every submission personally.
          </p>
        </div>
      </div>

      {/* Form body */}
      <form onSubmit={handleSubmit} style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 2rem 5rem' }}>

        {/* ── Section 1: Contact ── */}
        <SectionHeader number="1" title="Contact Information" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <FieldLabel required>First Name</FieldLabel>
            <TextInput name="firstName" value={form.firstName} onChange={setField} required />
          </div>
          <div>
            <FieldLabel required>Last Name</FieldLabel>
            <TextInput name="lastName" value={form.lastName} onChange={setField} required />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <FieldLabel required>Email</FieldLabel>
          <TextInput name="email" value={form.email} onChange={setField} placeholder="we will respond here" required />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <FieldLabel>Phone (optional)</FieldLabel>
          <TextInput name="phone" value={form.phone} onChange={setField} placeholder="optional" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <FieldLabel required>State / Country</FieldLabel>
            <TextInput name="stateCountry" value={form.stateCountry} onChange={setField} placeholder="e.g. Tennessee, USA" required />
          </div>
          <div>
            <FieldLabel required>Age Range</FieldLabel>
            <RadioGroup name="ageRange" value={form.ageRange} onChange={setField}
              options={['Under 18', '18–25', '26–35', '36–45', '46–55', '56–65', '66+']} />
          </div>
        </div>

        {/* ── Section 2: Faith ── */}
        <SectionHeader number="2" title="Your Faith" />

        <div style={{ marginBottom: '24px' }}>
          <FieldLabel>Are you a born-again believer?</FieldLabel>
          <RadioGroup name="believer" value={form.believer} onChange={setField}
            options={['Yes', 'No', 'Not Sure']} />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <FieldLabel>How long have you been saved?</FieldLabel>
          <RadioGroup name="timeSaved" value={form.timeSaved} onChange={setField}
            options={['Less than 1 year', '1–5 years', '5–10 years', '10+ years', 'Not saved yet']} />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <FieldLabel>Are you currently in a local church?</FieldLabel>
          <RadioGroup name="inChurch" value={form.inChurch} onChange={setField}
            options={['Yes', 'No', 'Looking']} />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <FieldLabel>Have you received previous deliverance ministry?</FieldLabel>
          <RadioGroup name="previousMinistry" value={form.previousMinistry} onChange={setField}
            options={['Yes', 'No']} />
        </div>

        {/* ── Section 3: What Is Happening ── */}
        <SectionHeader number="3" title="What Is Happening" />

        <div style={{ marginBottom: '28px' }}>
          <FieldLabel>How would you describe what you are experiencing?</FieldLabel>
          <p style={{ fontFamily: crimson, fontSize: '13px', color: muted, fontStyle: 'italic', marginBottom: '12px' }}>Select all that apply</p>
          <CheckGroup name="experiences" value={form.experiences} onChange={setCheckField}
            options={EXPERIENCE_OPTIONS} />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <FieldLabel>How long have you been experiencing this?</FieldLabel>
          <RadioGroup name="duration" value={form.duration} onChange={setField}
            options={['Less than 1 month', '1–6 months', '6 months – 2 years', '2–5 years', '5+ years']} />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <FieldLabel required>In your own words describe what is happening</FieldLabel>
          <p style={{ fontFamily: crimson, fontSize: '13px', color: muted, fontStyle: 'italic', marginBottom: '10px' }}>
            {form.description.length < 100
              ? `${100 - form.description.length} more characters required`
              : `${form.description.length} characters`}
          </p>
          <TextArea name="description" value={form.description} onChange={setField} rows={7}
            placeholder="Tell us what you are experiencing in as much detail as you feel comfortable sharing. The more you share the better we can assess how to help." />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <FieldLabel>What have you already tried?</FieldLabel>
          <TextArea name="alreadyTried" value={form.alreadyTried} onChange={setField} rows={4}
            placeholder="Prayer, counseling, previous ministry, medication, etc." />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <FieldLabel required>Are you currently safe?</FieldLabel>
          <RadioGroup name="currentlySafe" value={form.currentlySafe} onChange={setField}
            options={['Yes', 'No — I need immediate help']} />
          {form.currentlySafe === 'No — I need immediate help' && (
            <div style={{ marginTop: '12px', background: 'rgba(180,30,30,0.12)', border: '1px solid rgba(200,50,50,0.4)', borderRadius: '4px', padding: '14px 16px' }}>
              <p style={{ fontFamily: cinzel, fontSize: '11px', color: '#e06060', letterSpacing: '0.08em', marginBottom: '6px' }}>URGENT</p>
              <p style={{ fontFamily: crimson, fontSize: '14px', color: textDim, lineHeight: 1.7, margin: 0 }}>
                If you are in immediate danger please contact emergency services at <strong style={{ color: text }}>911</strong>. For mental health crisis support call <strong style={{ color: text }}>988</strong>.
              </p>
            </div>
          )}
        </div>

        {/* ── Section 4: How to Reach You ── */}
        <SectionHeader number="4" title="How to Reach You" />

        <div style={{ marginBottom: '24px' }}>
          <FieldLabel>Best way to contact you</FieldLabel>
          <RadioGroup name="contactMethod" value={form.contactMethod} onChange={setField}
            options={['Email', 'Phone', 'Either']} />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <FieldLabel>Best time to reach you</FieldLabel>
          <RadioGroup name="bestTime" value={form.bestTime} onChange={setField}
            options={['Morning', 'Afternoon', 'Evening', 'Anytime']} />
        </div>

        <div style={{ marginBottom: '36px' }}>
          <FieldLabel>Additional notes for our team (optional)</FieldLabel>
          <TextArea name="notes" value={form.notes} onChange={setField} rows={3}
            placeholder="Anything else you'd like us to know before we reach out..." />
        </div>

        {/* Disclaimer */}
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '4px', padding: '16px 18px', marginBottom: '28px' }}>
          <p style={{ fontFamily: crimson, fontSize: '13px', color: muted, lineHeight: 1.8, margin: 0, fontStyle: 'italic' }}>
            War Room Intel is a spiritual ministry resource. We are not licensed therapists, counselors, or medical practitioners. This form does not constitute a medical or psychological intake. If you are experiencing a mental health emergency please contact emergency services immediately. Ministry response times vary — we review all submissions but cannot guarantee a response timeline.
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: '20px', background: 'rgba(180,30,30,0.1)', border: '1px solid rgba(200,50,50,0.35)', borderRadius: '4px', padding: '12px 16px', fontFamily: crimson, fontSize: '14px', color: '#e06060' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting}
          style={{
            width: '100%', padding: '16px',
            background: submitting ? 'rgba(201,168,76,0.4)' : gold,
            color: deep, border: 'none', borderRadius: '4px',
            fontFamily: cinzel, fontSize: '12px', fontWeight: 700,
            letterSpacing: '0.14em', cursor: submitting ? 'default' : 'pointer',
            textTransform: 'uppercase' as const, transition: 'all 0.2s',
          }}>
          {submitting ? 'Submitting...' : 'Submit Ministry Request ⚔'}
        </button>
      </form>
    </div>
  )
}
