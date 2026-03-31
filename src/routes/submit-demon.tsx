import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/submit-demon')({
  component: SubmitDemonPage,
})

const gold = '#C9A84C'
const goldLight = '#E8C97A'
const goldDim = 'rgba(201,168,76,0.15)'
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

type FormData = Record<string, string>

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.12em', color: gold, marginBottom: '6px', textTransform: 'uppercase' as const, display: 'flex', gap: '6px' }}>
      {children}
      {required && <span style={{ color: 'rgba(220,80,80,0.7)' }}>*</span>}
    </div>
  )
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '12px', color: muted, fontStyle: 'italic', marginBottom: '8px', lineHeight: 1.4 }}>{children}</div>
}

function TextInput({ name, value, onChange, placeholder, multiline, rows }: {
  name: string; value: string; onChange: (n: string, v: string) => void
  placeholder?: string; multiline?: boolean; rows?: number
}) {
  const style = {
    width: '100%', background: deep, border: `1px solid ${border}`,
    borderRadius: '4px', padding: '10px 14px', fontFamily: crimson,
    fontSize: '15px', color: text, outline: 'none',
    boxSizing: 'border-box' as const,
    resize: multiline ? 'vertical' as const : 'none' as const,
    minHeight: multiline ? `${(rows || 3) * 28}px` : undefined,
    transition: 'border-color 0.2s',
  }
  return multiline
    ? <textarea name={name} value={value} onChange={e => onChange(name, e.target.value)} placeholder={placeholder} style={style} rows={rows || 3} />
    : <input name={name} value={value} onChange={e => onChange(name, e.target.value)} placeholder={placeholder} style={style} />
}

function SelectInput({ name, value, onChange, options }: {
  name: string; value: string; onChange: (n: string, v: string) => void; options: string[]
}) {
  return (
    <select name={name} value={value} onChange={e => onChange(name, e.target.value)}
      style={{ width: '100%', background: deep, border: `1px solid ${border}`, borderRadius: '4px', padding: '10px 14px', fontFamily: crimson, fontSize: '15px', color: value ? text : muted, outline: 'none', boxSizing: 'border-box' as const, cursor: 'pointer' }}>
      <option value="">— Select type —</option>
      {options.map(o => <option key={o} value={o} style={{ color: text, background: deep }}>{o}</option>)}
    </select>
  )
}

function Field({ children, half }: { children: React.ReactNode; half?: boolean }) {
  return (
    <div style={{ marginBottom: '24px', gridColumn: half ? 'span 1' : 'span 2' }}>
      {children}
    </div>
  )
}

const DEMON_TYPES = [
  'Principality', 'Power', 'Ruler of Darkness', 'Spiritual Wickedness in High Places',
  'Strongman', 'Spirit', 'Fallen Angel', 'Duke of Hell', 'Prince of Hell',
  'Female Demon', 'Spirit of Infirmity', 'Spirit of Rebellion', 'Spirit of Divination',
  'Familiar Spirit', 'Unclean Spirit', 'Other',
]

function SubmitDemonPage() {
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const suggestName = searchParams?.get('suggest') || ''
  const [data, setData] = useState<FormData>(suggestName ? { 'Primary Name': suggestName } : {})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (name: string, value: string) => setData(d => ({ ...d, [name]: value }))

  const handleSubmit = async () => {
    if (!data['Primary Name']) { setError('Please provide the demon\'s primary name.'); return }
    if (!data['Type']) { setError('Please select a spirit type.'); return }
    if (!data['Function / Description']) { setError('Please provide a function or description.'); return }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/submit-demon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: '540px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '24px' }}>⚔</div>
          <h2 style={{ fontFamily: cinzel, fontSize: 'clamp(20px, 3vw, 30px)', color: gold, marginBottom: '16px' }}>Submission Received</h2>
          <p style={{ fontSize: '17px', color: textDim, lineHeight: 1.7, marginBottom: '24px', fontWeight: 300 }}>
            Thank you for contributing to the War Room database. Your submission will be reviewed by our ministry team and added once verified. Together we're building the most comprehensive spiritual warfare resource available.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <a href="/submit-demon" onClick={() => { setSubmitted(false); setData({}) }}
              style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.1em', color: gold, textDecoration: 'none', border: `1px solid ${borderBright}`, padding: '11px 24px', borderRadius: '3px', display: 'inline-block' }}>
              Submit Another
            </a>
            <a href="/#database"
              style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.1em', color: deep, background: gold, textDecoration: 'none', padding: '11px 24px', borderRadius: '3px', display: 'inline-block', fontWeight: 700 }}>
              View Database →
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: deep }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.3em', color: gold, marginBottom: '12px' }}>⚔ War Room Database</p>
          <h1 style={{ fontFamily: cinzel, fontSize: 'clamp(22px, 4vw, 38px)', fontWeight: 700, color: text, marginBottom: '12px', lineHeight: 1.1 }}>
            Submit a <em style={{ color: gold, fontStyle: 'normal' }}>Demon Entry</em>
          </h1>
          <p style={{ fontSize: '16px', color: textDim, fontWeight: 300, fontStyle: 'italic', maxWidth: '500px', margin: '0 auto' }}>
            Help grow the War Room database. All submissions are reviewed by our ministry team before being added. Fields marked * are required.
          </p>
        </div>

        {/* Info banner */}
        <div style={{ background: surface2, border: `1px solid ${border}`, borderRadius: '6px', padding: '14px 18px', marginBottom: '32px', display: 'flex', gap: '12px' }}>
          <span style={{ fontSize: '16px', flexShrink: 0 }}>🗡</span>
          <div style={{ fontSize: '13px', color: textDim, lineHeight: 1.6 }}>
            Only add spirits that are documented in Scripture, historical Christian demonology, or verified ministry experience. Provide as much detail as you have — partial submissions are welcome. Our team will research and complete missing fields.
          </div>
        </div>

        {/* Form */}
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '8px', padding: 'clamp(1.5rem, 4vw, 2.5rem)' }}>

          {/* Section: Identity */}
          <div style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.25em', color: gold, marginBottom: '20px', paddingBottom: '10px', borderBottom: `1px solid ${border}` }}>
            ✦ Spirit Identity
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <Field>
              <Label required>Primary Name</Label>
              <SubLabel>The most commonly used name for this spirit</SubLabel>
              <TextInput name="Primary Name" value={data['Primary Name'] || ''} onChange={update} placeholder="e.g. Spirit of Rejection" />
            </Field>

            <Field>
              <Label>Also Known As (AKA)</Label>
              <SubLabel>Alternate names, titles, or aliases</SubLabel>
              <TextInput name="AKA" value={data['AKA'] || ''} onChange={update} placeholder="e.g. Abandonment Spirit; Rejection Demon" />
            </Field>

            <Field>
              <Label required>Spirit Type / Classification</Label>
              <SubLabel>Select the most accurate classification</SubLabel>
              <SelectInput name="Type" value={data['Type'] || ''} onChange={update} options={DEMON_TYPES} />
            </Field>

            <Field>
              <Label>Rank / Authority Level</Label>
              <SubLabel>e.g. Strongman, Ruling spirit, Subordinate spirit</SubLabel>
              <TextInput name="Rank" value={data['Rank'] || ''} onChange={update} placeholder="e.g. Strongman — rules over subordinate rejection spirits" />
            </Field>
          </div>

          {/* Section: Function */}
          <div style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.25em', color: gold, margin: '8px 0 20px', paddingBottom: '10px', borderBottom: `1px solid ${border}` }}>
            ✦ Function & Manifestation
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <Field>
              <Label required>Function / Description</Label>
              <SubLabel>What this spirit does, its primary assignment, how it operates</SubLabel>
              <TextInput name="Function / Description" value={data['Function / Description'] || ''} onChange={update} placeholder="Describe the spirit's function, assignment, and how it operates..." multiline rows={4} />
            </Field>

            <Field>
              <Label>Manifestation Signs</Label>
              <SubLabel>How does this spirit manifest in a person's life? Symptoms, behaviours, patterns</SubLabel>
              <TextInput name="Manifestation Signs" value={data['Manifestation Signs'] || ''} onChange={update} placeholder="e.g. Fear of abandonment, self-hatred, inability to receive love, rebellion..." multiline rows={4} />
            </Field>

            <Field>
              <Label>Entry Points</Label>
              <SubLabel>How does this spirit typically gain access? Trauma, sin, inheritance, occult involvement, etc.</SubLabel>
              <TextInput name="Entry Points" value={data['Entry Points'] || ''} onChange={update} placeholder="e.g. Childhood rejection, absent father, adoption, abuse, generational inheritance..." multiline rows={3} />
            </Field>

            <Field>
              <Label>Associated Spirits</Label>
              <SubLabel>Spirits that commonly accompany or serve under this one</SubLabel>
              <TextInput name="Associated Spirits" value={data['Associated Spirits'] || ''} onChange={update} placeholder="e.g. Fear, Self-pity, Hopelessness, Depression, Rebellion..." multiline rows={3} />
            </Field>
          </div>

          {/* Section: Scripture & Protocol */}
          <div style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.25em', color: gold, margin: '8px 0 20px', paddingBottom: '10px', borderBottom: `1px solid ${border}` }}>
            ✦ Scripture & Deliverance
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <Field>
              <Label>Scripture References</Label>
              <SubLabel>Biblical references that identify, name, or address this spirit</SubLabel>
              <TextInput name="Scripture References" value={data['Scripture References'] || ''} onChange={update} placeholder="e.g. Isaiah 53:3, Psalm 27:10, John 1:11..." multiline rows={3} />
            </Field>

            <Field>
              <Label>Deliverance Protocol</Label>
              <SubLabel>How to minister deliverance from this spirit — what you know from experience or study</SubLabel>
              <TextInput name="Deliverance Protocol" value={data['Deliverance Protocol'] || ''} onChange={update} placeholder="e.g. First break generational ties, pray forgiveness of parents, command the spirit of rejection to leave by name..." multiline rows={3} />
            </Field>

            <Field>
              <Label>Binding Prayer</Label>
              <SubLabel>Specific prayer language effective against this spirit (optional)</SubLabel>
              <TextInput name="Binding Prayer" value={data['Binding Prayer'] || ''} onChange={update} placeholder="e.g. In the name of Jesus I bind the spirit of rejection and command it to leave..." multiline rows={3} />
            </Field>

            <Field>
              <Label>Historical / Theological Sources</Label>
              <SubLabel>Books, ministers, or traditions where this spirit is documented</SubLabel>
              <TextInput name="Sources" value={data['Sources'] || ''} onChange={update} placeholder="e.g. Frank Hammond - Pigs in the Parlor; Win Worley; Derek Prince..." multiline rows={3} />
            </Field>
          </div>

          {/* Section: Submitter */}
          <div style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.25em', color: gold, margin: '8px 0 20px', paddingBottom: '10px', borderBottom: `1px solid ${border}` }}>
            ✦ Your Information (optional)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <Field>
              <Label>Your Name or Initials</Label>
              <SubLabel>For credit in the database entry (optional — can be anonymous)</SubLabel>
              <TextInput name="Submitter Name" value={data['Submitter Name'] || ''} onChange={update} placeholder="e.g. Pastor J.M. or Anonymous" />
            </Field>

            <Field>
              <Label>Your Email</Label>
              <SubLabel>In case our team needs to follow up (never published)</SubLabel>
              <TextInput name="Submitter Email" value={data['Submitter Email'] || ''} onChange={update} placeholder="your@email.com" />
            </Field>

            <div style={{ gridColumn: 'span 2', marginBottom: '24px' }}>
              <Label>Ministry Context / Experience</Label>
              <SubLabel>How did you encounter this spirit? Ministry experience, deliverance session, personal experience, research?</SubLabel>
              <TextInput name="Ministry Context" value={data['Ministry Context'] || ''} onChange={update} placeholder="Briefly describe how you know about this spirit — ministry experience, deliverance session, biblical research, etc." multiline rows={3} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(220,50,50,0.1)', border: '1px solid rgba(220,50,50,0.3)', borderRadius: '4px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px', color: '#E08080' }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: `1px solid ${border}` }}>
            <div style={{ fontSize: '12px', color: muted, fontStyle: 'italic', maxWidth: '320px', lineHeight: 1.5 }}>
              All submissions are reviewed before going live. Thank you for helping grow this resource.
            </div>
            <button onClick={handleSubmit} disabled={submitting}
              style={{ fontFamily: cinzel, fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', padding: '13px 32px', borderRadius: '3px', border: 'none', background: submitting ? muted : gold, color: deep, cursor: submitting ? 'default' : 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
              {submitting ? 'Submitting...' : 'Submit Entry ⚔'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
