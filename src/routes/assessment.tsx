import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/assessment')({
  component: AssessmentPage,
})

const gold = '#C9A84C'
const goldLight = '#E8C97A'
const goldDim = 'rgba(201,168,76,0.15)'
const deep = '#0D0B14'
const surface = '#13101E'
const surface2 = '#1C1828'
const surface3 = '#221E30'
const border = 'rgba(201,168,76,0.18)'
const borderBright = 'rgba(201,168,76,0.45)'
const text = '#EDE9F5'
const textDim = '#A89FC0'
const muted = '#6B6480'

const cinzel = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

type FormData = Record<string, string | string[]>

const STEPS = [
  { id: 'intro',      label: 'About You',          category: null },
  { id: 'spiritual',  label: 'Spiritual Foundation', category: null },
  { id: 'catA',       label: 'Rejection',           category: 'A' },
  { id: 'catB',       label: 'Mental & Emotional',  category: 'B' },
  { id: 'catC',       label: 'Occult & Witchcraft',  category: 'C' },
  { id: 'catD',       label: 'Sexual Struggles',     category: 'D' },
  { id: 'catE',       label: 'Addictions',           category: 'E' },
  { id: 'catFG',      label: 'Background & Health',  category: 'F/G' },
  { id: 'freetext',   label: 'In Your Own Words',    category: null },
]

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.12em', color: gold, marginBottom: '8px', textTransform: 'uppercase' as const }}>{children}</div>
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '13px', color: textDim, fontStyle: 'italic', marginBottom: '10px', lineHeight: 1.5 }}>{children}</div>
}

function TextInput({ name, value, onChange, placeholder, multiline }: { name: string; value: string; onChange: (n: string, v: string) => void; placeholder?: string; multiline?: boolean }) {
  const style = { width: '100%', background: deep, border: `1px solid ${border}`, borderRadius: '4px', padding: '10px 14px', fontFamily: crimson, fontSize: '15px', color: text, outline: 'none', boxSizing: 'border-box' as const, resize: multiline ? 'vertical' as const : 'none' as const, minHeight: multiline ? '100px' : undefined }
  return multiline
    ? <textarea name={name} value={value} onChange={e => onChange(name, e.target.value)} placeholder={placeholder} style={style} rows={4} />
    : <input name={name} value={value} onChange={e => onChange(name, e.target.value)} placeholder={placeholder} style={style} />
}

function RadioGroup({ name, value, onChange, options }: { name: string; value: string; onChange: (n: string, v: string) => void; options: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px' }}>
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onChange(name, opt)}
          style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.08em', padding: '7px 14px', borderRadius: '3px', border: value === opt ? `1px solid ${gold}` : `1px solid ${border}`, color: value === opt ? gold : textDim, background: value === opt ? goldDim : 'transparent', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' as const }}>
          {opt}
        </button>
      ))}
    </div>
  )
}

function CheckGroup({ name, value, onChange, options }: { name: string; value: string[]; onChange: (n: string, v: string[]) => void; options: string[] }) {
  const toggle = (opt: string) => {
    const cur = value || []
    const next = cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt]
    onChange(name, next)
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px' }}>
      {options.map(opt => {
        const checked = (value || []).includes(opt)
        return (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            style={{ fontFamily: crimson, fontSize: '13px', padding: '6px 14px', borderRadius: '3px', border: checked ? `1px solid ${gold}` : `1px solid ${border}`, color: checked ? gold : textDim, background: checked ? goldDim : 'transparent', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', border: checked ? `2px solid ${gold}` : `1px solid ${muted}`, borderRadius: '2px', background: checked ? gold : 'transparent', flexShrink: 0, display: 'inline-block' }} />
            {opt}
          </button>
        )
      })}
    </div>
  )
}

function Field({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: '28px' }}>{children}</div>
}

function SectionHeader({ step, total }: { step: number; total: number }) {
  const s = STEPS[step]
  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{ flex: 1, height: '2px', background: i <= step ? gold : border, borderRadius: '1px', transition: 'background 0.3s' }} />
        ))}
      </div>
      <div style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.25em', color: muted, marginBottom: '6px' }}>
        Step {step + 1} of {total} {s.category ? `— Category ${s.category}` : ''}
      </div>
      <h2 style={{ fontFamily: cinzel, fontSize: 'clamp(18px, 3vw, 26px)', fontWeight: 600, color: text, margin: 0 }}>{s.label}</h2>
    </div>
  )
}

function StepIntro({ data, update }: { data: FormData; update: (n: string, v: string | string[]) => void }) {
  return (
    <>
      <div style={{ background: surface2, border: `1px solid ${border}`, borderRadius: '6px', padding: '16px 20px', marginBottom: '28px' }}>
        <div style={{ fontFamily: cinzel, fontSize: '11px', color: gold, letterSpacing: '0.1em', marginBottom: '8px' }}>🔒 Your Privacy</div>
        <div style={{ fontSize: '14px', color: textDim, lineHeight: 1.6 }}>
          This intake form is completely confidential. Your name and email are only seen by the ministry leader — never published or shared. Submissions to the public board are fully anonymized.
        </div>
      </div>
      <Field>
        <Label>First Name or Initials</Label>
        <SubLabel>Optional — used only when we respond to you personally</SubLabel>
        <TextInput name="First Name" value={data['First Name'] as string || ''} onChange={update} placeholder="e.g. John or J.D." />
      </Field>
      <Field>
        <Label>Email Address</Label>
        <SubLabel>Required — this is how we send your personal response. Never shared publicly.</SubLabel>
        <TextInput name="Email" value={data['Email'] as string || ''} onChange={update} placeholder="your@email.com" />
      </Field>
      <Field>
        <Label>Age Range</Label>
        <RadioGroup name="Age Range" value={data['Age Range'] as string || ''} onChange={update} options={['Under 18', '18-25', '26-35', '36-45', '46-55', '56-65', '66+']} />
      </Field>
      <Field>
        <Label>How Long Have You Been Saved?</Label>
        <RadioGroup name="How Long Saved" value={data['How Long Saved'] as string || ''} onChange={update} options={['Not sure I am', 'Less than 1 year', '1-5 years', '5-10 years', '10-20 years', '20+ years']} />
      </Field>
    </>
  )
}

function StepSpiritual({ data, update }: { data: FormData; update: (n: string, v: string | string[]) => void }) {
  return (
    <>
      <Field>
        <Label>What is your church background?</Label>
        <SubLabel>Denomination, tradition, or type of church you grew up in or currently attend</SubLabel>
        <TextInput name="Church Background" value={data['Church Background'] as string || ''} onChange={update} placeholder="e.g. Baptist, Pentecostal, Catholic, non-denominational..." multiline />
      </Field>
      <Field>
        <Label>Describe your conversion experience</Label>
        <SubLabel>How did you come to faith? Was your life genuinely changed?</SubLabel>
        <TextInput name="Conversion Experience" value={data['Conversion Experience'] as string || ''} onChange={update} placeholder="Tell us about your salvation experience..." multiline />
      </Field>
      <Field>
        <Label>What is your prayer life like?</Label>
        <TextInput name="Prayer Life Description" value={data['Prayer Life Description'] as string || ''} onChange={update} placeholder="How often do you pray? Can you pray freely or does something resist you?" multiline />
      </Field>
      <Field>
        <Label>Do you have assurance of salvation?</Label>
        <RadioGroup name="Assurance of Salvation" value={data['Assurance of Salvation'] as string || ''} onChange={update} options={['Yes', 'No', 'Unsure — I struggle with this']} />
      </Field>
      <Field>
        <Label>Are you satisfied with your Christian walk?</Label>
        <RadioGroup name="Satisfied With Walk" value={data['Satisfied With Walk'] as string || ''} onChange={update} options={['Yes', 'No', 'Somewhat']} />
      </Field>
    </>
  )
}

function StepCatA({ data, update }: { data: FormData; update: (n: string, v: string | string[]) => void }) {
  return (
    <>
      <div style={{ background: surface2, border: `1px solid ${border}`, borderRadius: '6px', padding: '14px 18px', marginBottom: '24px', fontSize: '13px', color: textDim, lineHeight: 1.6 }}>
        These questions help identify spirits of rejection that may have entered through family dynamics and childhood experiences.
      </div>
      <Field>
        <Label>How would you describe your relationship with your father?</Label>
        <RadioGroup name="A - Father Relationship" value={data['A - Father Relationship'] as string || ''} onChange={update} options={['Good', 'Bad', 'Indifferent', 'Absent', 'Deceased', 'Never knew him']} />
      </Field>
      <Field>
        <Label>How would you describe your relationship with your mother?</Label>
        <RadioGroup name="A - Mother Relationship" value={data['A - Mother Relationship'] as string || ''} onChange={update} options={['Good', 'Bad', 'Indifferent', 'Absent', 'Deceased', 'Never knew her']} />
      </Field>
      <Field>
        <Label>Were you a planned child?</Label>
        <RadioGroup name="A - Planned Child" value={data['A - Planned Child'] as string || ''} onChange={update} options={['Yes', 'No', "Don't know"]} />
      </Field>
      <Field>
        <Label>Were you adopted?</Label>
        <RadioGroup name="A - Adopted" value={data['A - Adopted'] as string || ''} onChange={update} options={['Yes', 'No']} />
      </Field>
      <Field>
        <Label>Did your parents divorce?</Label>
        <RadioGroup name="A - Parents Divorced" value={data['A - Parents Divorced'] as string || ''} onChange={update} options={['Yes', 'No', 'Separated but not divorced']} />
      </Field>
      <Field>
        <Label>Was yours a happy home during childhood?</Label>
        <RadioGroup name="A - Childhood Home Happy" value={data['A - Childhood Home Happy'] as string || ''} onChange={update} options={['Yes', 'No', 'Sometimes']} />
      </Field>
      <Field>
        <Label>Were you lonely as a teenager?</Label>
        <RadioGroup name="A - Lonely As Teenager" value={data['A - Lonely As Teenager'] as string || ''} onChange={update} options={['Yes', 'No', 'Sometimes']} />
      </Field>
      <Field>
        <Label>How would you describe your self-image? (select all that apply)</Label>
        <CheckGroup name="A - Self Image" value={data['A - Self Image'] as string[] || []} onChange={update} options={['Low self-image', 'Feel insecure', 'Condemn myself', 'Hate myself', 'Feel worthless', 'Feel like a failure', 'Feel inferior', 'Question my identity', 'None of these']} />
      </Field>
      <Field>
        <Label>Anything else about rejection, family wounds, or relationships you want to share?</Label>
        <TextInput name="A - Rejection Notes" value={data['A - Rejection Notes'] as string || ''} onChange={update} placeholder="List any times you've been hurt, abandoned, or suffered injustice — pre-school, school, marriage, work, church..." multiline />
      </Field>
    </>
  )
}

function StepCatB({ data, update }: { data: FormData; update: (n: string, v: string | string[]) => void }) {
  return (
    <>
      <Field>
        <Label>Do you struggle with any of the following? (select all that apply)</Label>
        <CheckGroup name="B - Anxiety Depression" value={data['B - Anxiety Depression'] as string[] || []} onChange={update} options={['Anxiety', 'Chronic worry', 'Depression', 'Easily frustrated', 'Emotional immaturity', 'Mental confusion', 'Mental blocks', 'Day-dreaming / escapism', 'None']} />
      </Field>
      <Field>
        <Label>Have you or close family members suffered from mental illness?</Label>
        <SubLabel>e.g. schizophrenia, bipolar disorder, OCD, severe depression — in yourself, parents, or grandparents</SubLabel>
        <TextInput name="B - Mental Notes" value={data['B - Mental Notes'] as string || ''} onChange={update} placeholder="Describe who and what condition..." multiline />
      </Field>
      <Field>
        <Label>Have you experienced any of the following? (select all that apply)</Label>
        <SubLabel>These can open doors to demonic entry through a passive mind state</SubLabel>
        <CheckGroup name="B - Occult Mind States" value={data['B - Occult Mind States'] as string[] || []} onChange={update} options={['Psychiatric hospitalization', 'Hypnosis', 'Anesthesia', 'Heavy drug use', 'Shock treatment', 'Extended unconsciousness', 'None']} />
      </Field>
      <Field>
        <Label>Have you ever had thoughts of suicide or wished to die?</Label>
        <RadioGroup name="B - Suicide History" value={data['B - Suicide History'] as string || ''} onChange={update} options={['Never', 'Thoughts only — never acted', 'Attempted in the past', 'Currently struggling with this']} />
      </Field>
      <Field>
        <Label>Do you have strong or prolonged fears? (select all that apply)</Label>
        <CheckGroup name="B - Fears" value={data['B - Fears'] as string[] || []} onChange={update} options={['Fear of failure', 'Fear of death', 'Fear of abandonment', 'Fear of authority figures', 'Fear of the dark', 'Fear of the future', 'Fear of violence', 'Fear of insanity', 'Fear of rejection', 'Fear of being alone', 'Fear of the unknown', 'None']} />
      </Field>
      <Field>
        <Label>Do you suffer from bad dreams or sleeplessness?</Label>
        <RadioGroup name="B - Dreams Sleep" value={data['B - Dreams Sleep'] as string || ''} onChange={update} options={['Bad dreams regularly', 'Sleeplessness', 'Both', 'Neither']} />
      </Field>
    </>
  )
}

function StepCatC({ data, update }: { data: FormData; update: (n: string, v: string | string[]) => void }) {
  return (
    <>
      <div style={{ background: surface2, border: `1px solid ${border}`, borderRadius: '6px', padding: '14px 18px', marginBottom: '24px', fontSize: '13px', color: textDim, lineHeight: 1.6 }}>
        Answer honestly — there is no condemnation here. These doors can all be closed through repentance and deliverance.
      </div>
      <Field>
        <Label>Have you ever made a pact with the devil?</Label>
        <RadioGroup name="C - Devil Pact" value={data['C - Devil Pact'] as string || ''} onChange={update} options={['Yes — blood pact', 'Yes — verbal/written', 'No']} />
      </Field>
      <Field>
        <Label>Have you ever been involved in any of the following? (select all that apply)</Label>
        <CheckGroup name="C - Occult Activities" value={data['C - Occult Activities'] as string[] || []} onChange={update}
          options={['Fortunetellers', 'Tarot cards', 'Ouija board', 'Astrology / horoscopes', 'Séances', 'Palmistry', 'Black magic', 'Clairvoyance / psychics', 'New Age movement', 'Reincarnation / past lives', 'Crystals', 'Demon worship', 'Spirit guides', 'Astral travel', 'Transcendental Meditation', 'Yoga', 'Martial arts', 'Halloween / Mardi Gras celebrations', 'Voodoo / firewalking', 'None']} />
      </Field>
      <Field>
        <Label>Have you or your family been involved in any cults or secret societies? (select all that apply)</Label>
        <CheckGroup name="C - Cult Involvement" value={data['C - Cult Involvement'] as string[] || []} onChange={update}
          options={["Jehovah's Witnesses", 'Mormons', 'Scientology', 'Christian Science', 'Unity', 'Eastern religions', 'Freemasonry', 'Eastern Star', 'Shriner', 'Other secret society', 'None']} />
      </Field>
      <Field>
        <Label>Is there Freemasonry in your family history?</Label>
        <RadioGroup name="C - Freemasonry" value={data['C - Freemasonry'] as string || ''} onChange={update} options={['Yes — in my direct family', 'Yes — extended family', 'Yes — myself', 'No', "Don't know"]} />
      </Field>
      <Field>
        <Label>Do you have or have you had any occult objects, symbols, or idols?</Label>
        <SubLabel>Zodiac signs, crystals, Buddha statues, pagan symbols, good luck charms, tattoos with occult meaning, etc.</SubLabel>
        <RadioGroup name="C - Occult Objects" value={data['C - Occult Objects'] as string || ''} onChange={update} options={['Yes — still have them', 'Yes — already destroyed', 'No']} />
      </Field>
      <Field>
        <Label>Has a curse been placed on you or your family to your knowledge?</Label>
        <RadioGroup name="C - Curses" value={data['C - Curses'] as string || ''} onChange={update} options={['Yes', 'Possibly — generational patterns', 'No', "Don't know"]} />
      </Field>
      <Field>
        <Label>Anything else about occult involvement you want to share?</Label>
        <TextInput name="C - Occult Notes" value={data['C - Occult Notes'] as string || ''} onChange={update} placeholder="Any other witchcraft, satanic, or occult involvement not covered above..." multiline />
      </Field>
    </>
  )
}

function StepCatD({ data, update }: { data: FormData; update: (n: string, v: string | string[]) => void }) {
  return (
    <>
      <div style={{ background: surface2, border: `1px solid ${border}`, borderRadius: '6px', padding: '14px 18px', marginBottom: '24px', fontSize: '13px', color: textDim, lineHeight: 1.6 }}>
        This section is handled with complete confidentiality. Your answers are seen only by the ministry leader. Be as honest as you are able — these are common entry points for demonic bondage and there is no shame in naming them.
      </div>
      <Field>
        <Label>Do you struggle with any of the following? (select all that apply)</Label>
        <CheckGroup name="D - Lust Struggles" value={data['D - Lust Struggles'] as string[] || []} onChange={update}
          options={['Lustful thoughts', 'Fantasy lust', 'Homosexual desires', 'Compulsive sexual behavior', 'Sexual dreams involving demonic presence', 'None']} />
      </Field>
      <Field>
        <Label>Have you struggled with pornography?</Label>
        <RadioGroup name="D - Pornography History" value={data['D - Pornography History'] as string || ''} onChange={update} options={['No', 'Past only — not current', 'Currently struggling']} />
      </Field>
      <Field>
        <Label>Have you experienced sexual abuse or trauma?</Label>
        <RadioGroup name="D - Abuse History" value={data['D - Abuse History'] as string || ''} onChange={update} options={['No', 'Yes — as a child', 'Yes — as an adult', 'Both']} />
      </Field>
      <Field>
        <Label>Is there anything else in this area you want to share privately?</Label>
        <TextInput name="D - Sexual Notes" value={data['D - Sexual Notes'] as string || ''} onChange={update} placeholder="Any additional sexual struggles, history, or bondages..." multiline />
      </Field>
    </>
  )
}

function StepCatE({ data, update }: { data: FormData; update: (n: string, v: string | string[]) => void }) {
  return (
    <>
      <Field>
        <Label>Do you currently struggle with or have you struggled with any addictions? (select all that apply)</Label>
        <CheckGroup name="E - Addictions" value={data['E - Addictions'] as string[] || []} onChange={update}
          options={['Alcohol', 'Smoking / nicotine', 'Marijuana', 'Prescription drugs', 'Street drugs', 'Gambling', 'Food / eating disorders', 'Pornography', 'Compulsive spending', 'Compulsive exercise', 'Social media / screens', 'None']} />
      </Field>
      <Field>
        <Label>Is there a history of addiction in your family?</Label>
        <RadioGroup name="E - Family Addiction History" value={data['E - Family Addiction History'] as string || ''} onChange={update} options={['Yes', 'No', "Don't know"]} />
      </Field>
      <Field>
        <Label>Anything else about addictions or compulsive behaviors?</Label>
        <TextInput name="E - Addiction Notes" value={data['E - Addiction Notes'] as string || ''} onChange={update} placeholder="Any additional context about addictions or compulsions..." multiline />
      </Field>
    </>
  )
}

function StepCatFG({ data, update }: { data: FormData; update: (n: string, v: string | string[]) => void }) {
  return (
    <>
      <Field>
        <Label>Country / Region of Birth</Label>
        <TextInput name="F - Country of Birth" value={data['F - Country of Birth'] as string || ''} onChange={update} placeholder="e.g. USA, Nigeria, Brazil..." />
      </Field>
      <Field>
        <Label>Have you been part of any counter-culture groups? (select all that apply)</Label>
        <CheckGroup name="F - Counter Culture" value={data['F - Counter Culture'] as string[] || []} onChange={update}
          options={['Gangs', 'Drug culture', 'New Age community', 'Biker culture', 'Occult subculture', 'None']} />
      </Field>
      <Field>
        <Label>Do you suffer from any chronic illness or hereditary conditions?</Label>
        <TextInput name="G - Chronic Illness" value={data['G - Chronic Illness'] as string || ''} onChange={update} placeholder="List any chronic illness, hereditary conditions, or persistent physical problems..." multiline />
      </Field>
      <Field>
        <Label>Have you experienced any severe accidents, traumas, or losses?</Label>
        <SubLabel>Physical or emotional — accidents, deaths of loved ones, war experience, near-death experiences</SubLabel>
        <TextInput name="G - Trauma History" value={data['G - Trauma History'] as string || ''} onChange={update} placeholder="Describe any significant traumas not already mentioned..." multiline />
      </Field>
      <Field>
        <Label>Have you ever received a blood transfusion or donated blood?</Label>
        <RadioGroup name="G - Blood Transfusion" value={data['G - Blood Transfusion'] as string || ''} onChange={update} options={['Received blood', 'Donated blood', 'Both', 'Neither']} />
      </Field>
    </>
  )
}

function StepFreeText({ data, update }: { data: FormData; update: (n: string, v: string | string[]) => void }) {
  return (
    <>
      <div style={{ background: surface2, border: `1px solid ${border}`, borderRadius: '6px', padding: '14px 18px', marginBottom: '24px', fontSize: '14px', color: textDim, lineHeight: 1.7, fontStyle: 'italic' }}>
        "Ask God to remind you of specific incidents, large or small. If it comes to your mind during this time, it is probably the Holy Spirit reminding you — include it."
      </div>
      <Field>
        <Label>Describe what you are experiencing in your own words</Label>
        <SubLabel>What brought you here? What are you feeling, seeing, or struggling with?</SubLabel>
        <TextInput name="Own Words" value={data['Own Words'] as string || ''} onChange={update} placeholder="Tell us in your own words what you are experiencing and what you believe is happening spiritually..." multiline />
      </Field>
      <Field>
        <Label>Is there anything else this form hasn't covered?</Label>
        <SubLabel>Try to pinpoint when struggles began, any connected traumas, or anything you feel led to share</SubLabel>
        <TextInput name="Anything Else" value={data['Anything Else'] as string || ''} onChange={update} placeholder="Anything else the ministry leader should know..." multiline />
      </Field>
    </>
  )
}

function AssessmentPage() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<FormData>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (name: string, value: string | string[]) => setData(d => ({ ...d, [name]: value }))

  const handleSubmit = async () => {
    if (!data['Email']) { setError('Please provide an email address so we can respond to you.'); return }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/submit-assessment', {
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
          <div style={{ fontSize: '48px', marginBottom: '24px' }}>✦</div>
          <h2 style={{ fontFamily: cinzel, fontSize: 'clamp(22px, 3vw, 32px)', color: gold, marginBottom: '16px' }}>Assessment Received</h2>
          <p style={{ fontSize: '17px', color: textDim, fontWeight: 300, lineHeight: 1.7, marginBottom: '24px' }}>
            Your intake has been submitted to the War Room ministry team. You will receive a personal response at the email you provided. This may take a few days depending on volume.
          </p>
          <p style={{ fontSize: '14px', color: muted, fontStyle: 'italic', marginBottom: '32px' }}>
            "For God has not given us a spirit of fear, but of power and of love and of a sound mind." — 2 Timothy 1:7
          </p>
          <a href="/" style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.1em', color: gold, textDecoration: 'none', border: `1px solid ${borderBright}`, padding: '12px 28px', borderRadius: '3px', display: 'inline-block' }}>
            Return to War Room
          </a>
        </div>
      </div>
    )
  }

  const stepComponents = [
    <StepIntro data={data} update={update} />,
    <StepSpiritual data={data} update={update} />,
    <StepCatA data={data} update={update} />,
    <StepCatB data={data} update={update} />,
    <StepCatC data={data} update={update} />,
    <StepCatD data={data} update={update} />,
    <StepCatE data={data} update={update} />,
    <StepCatFG data={data} update={update} />,
    <StepFreeText data={data} update={update} />,
  ]

  const isLast = step === STEPS.length - 1

  return (
    <div style={{ minHeight: '100vh', background: deep }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.3em', color: gold, marginBottom: '12px' }}>⚔ War Room Ministry</p>
          <h1 style={{ fontFamily: cinzel, fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 700, color: text, marginBottom: '12px', lineHeight: 1.1 }}>
            Deliverance<br /><em style={{ color: gold, fontStyle: 'normal' }}>Intake Assessment</em>
          </h1>
          <p style={{ fontSize: '16px', color: textDim, fontWeight: 300, fontStyle: 'italic', maxWidth: '480px', margin: '0 auto' }}>
            A confidential ministry intake to help identify spiritual strongholds and receive a personal response from our deliverance team.
          </p>
        </div>

        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '8px', padding: 'clamp(1.5rem, 4vw, 2.5rem)' }}>
          <SectionHeader step={step} total={STEPS.length} />
          {stepComponents[step]}

          {error && (
            <div style={{ background: 'rgba(220,50,50,0.1)', border: '1px solid rgba(220,50,50,0.3)', borderRadius: '4px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px', color: '#E08080' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', paddingTop: '24px', borderTop: `1px solid ${border}` }}>
            {step > 0 ? (
              <button onClick={() => setStep(s => s - 1)}
                style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.1em', padding: '11px 24px', borderRadius: '3px', border: `1px solid ${border}`, color: textDim, background: 'transparent', cursor: 'pointer' }}>
                ← Back
              </button>
            ) : <div />}

            {isLast ? (
              <button onClick={handleSubmit} disabled={submitting}
                style={{ fontFamily: cinzel, fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', padding: '13px 32px', borderRadius: '3px', border: 'none', background: submitting ? muted : gold, color: deep, cursor: submitting ? 'default' : 'pointer', transition: 'background 0.2s' }}>
                {submitting ? 'Submitting...' : 'Submit Assessment ✦'}
              </button>
            ) : (
              <button onClick={() => setStep(s => s + 1)}
                style={{ fontFamily: cinzel, fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', padding: '13px 32px', borderRadius: '3px', border: 'none', background: gold, color: deep, cursor: 'pointer', transition: 'background 0.2s' }}>
                Continue →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
