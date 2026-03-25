import { createFileRoute } from '@tanstack/react-router'

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN
const BASE_ID = 'appLPhhHPP5rKvlKT'
const ASSESSMENTS_TABLE = 'tblohf2u576ZXiE4y'

// Spirit diagnostic engine — maps answers to likely spirits
function diagnoseFlaggedSpirits(data: Record<string, any>): string {
  const flags: string[] = []

  // Category A — Rejection
  if (['Bad','Absent','Indifferent','Never knew him'].includes(data['A - Father Relationship'])) flags.push('Spirit of Rejection (paternal)')
  if (['Bad','Absent','Indifferent','Never knew her'].includes(data['A - Mother Relationship'])) flags.push('Spirit of Rejection (maternal)')
  if (data['A - Adopted'] === 'Yes') flags.push('Spirit of Rejection, Spirit of Abandonment')
  if (data['A - Parents Divorced']?.includes('Yes')) flags.push('Spirit of Rejection, Fear of Abandonment, Covenant-Breaking Spirit')
  if (data['A - Childhood Home Happy'] === 'No') flags.push('Spirit of Rejection, Forgiveness issues')
  if (data['A - Lonely As Teenager'] === 'Yes') flags.push('Spirit of Rejection, Spirit of Rebellion, Spirit of Independence')
  const selfImage = data['A - Self Image'] || []
  if (selfImage.some((s: string) => ['Hate myself','Feel worthless','Condemn myself'].includes(s))) flags.push('Spirit of Self-Hatred, Spirit of Hopelessness, Spirit of Condemnation')
  if (selfImage.includes('Feel inferior')) flags.push('Strongman of Pride (inverted), Spirit of Rejection')

  // Category B — Mental & Emotional
  const anxiety = data['B - Anxiety Depression'] || []
  if (anxiety.includes('Depression')) flags.push('Strongman of Heaviness, Spirit of Depression, Spirit of Despair')
  if (anxiety.includes('Anxiety') || anxiety.includes('Chronic worry')) flags.push('Spirit of Anxiety, Spirit of Fear, Doubt and Unbelief')
  if (anxiety.includes('Mental confusion') || anxiety.includes('Mental blocks')) flags.push('Spirit of Confusion — possible Freemasonry or Witchcraft connection')
  if (data['B - Suicide History'] && data['B - Suicide History'] !== 'Never') flags.push('Spirit of Death, Spirit of Depression, Spirit of Self-Pity — PRIORITY')
  const fears = data['B - Fears'] || []
  if (fears.length > 0 && !fears.includes('None')) flags.push(`Spirits of Fear: ${fears.filter((f: string) => f !== 'None').join(', ')}`)
  const mindStates = data['B - Occult Mind States'] || []
  if (mindStates.some((s: string) => ['Hypnosis','Heavy drug use','Shock treatment'].includes(s))) flags.push('Spirits entered during passive mind state — Familiar Spirits, Mind Control, Confusion')

  // Category C — Occult
  if (data['C - Devil Pact'] && data['C - Devil Pact'] !== 'No') flags.push('BLOOD/DEVIL PACT — Familiar Spirits, Witchcraft, Antichrist, Manipulation — PRIORITY')
  const occult = data['C - Occult Activities'] || []
  const occultMap: Record<string,string> = {
    'Fortunetellers': 'Spirit of Divination, Familiar Spirits',
    'Tarot cards': 'Spirit of Divination, Familiar Spirits',
    'Ouija board': 'Spirit of Divination, Familiar Spirits — PRIORITY',
    'Séances': 'Familiar Spirits, Spirit of Witchcraft',
    'Black magic': 'Spirit of Witchcraft, Antichrist',
    'Demon worship': 'Familiar Spirits, Witchcraft, Antichrist — PRIORITY',
    'Spirit guides': 'Familiar Spirits, Spirit of Divination — PRIORITY',
    'Astral travel': 'Spirit of Astral Projection, Familiar Spirits',
    'Transcendental Meditation': 'Spirits from passive mind state, False religion',
    'Voodoo / firewalking': 'Voodoo Spirits, Witchcraft — PRIORITY',
  }
  occult.forEach((act: string) => { if (occultMap[act]) flags.push(occultMap[act]) })
  const cults = data['C - Cult Involvement'] || []
  if (cults.some((c: string) => c !== 'None')) flags.push(`Spirits of False Religion: ${cults.filter((c: string) => c !== 'None').join(', ')}`)
  if (data['C - Freemasonry'] && !['No',"Don't know"].includes(data['C - Freemasonry'])) flags.push('Spirits of Freemasonry — Apathy, Confusion, Unbelief, Infirmity, Financial bondage')
  if (data['C - Curses'] && ['Yes','Possibly — generational patterns'].includes(data['C - Curses'])) flags.push('Generational Curse — break before deliverance')

  // Category D — Sexual
  const lust = data['D - Lust Struggles'] || []
  if (lust.some((s: string) => s !== 'None')) flags.push('Strongman of Perversion and Lust')
  if (lust.includes('Homosexual desires')) flags.push('Spirit of Homosexuality, Self-Rejection')
  if (lust.includes('Sexual dreams involving demonic presence')) flags.push('Incubus / Succubus — PRIORITY')
  if (data['D - Pornography History'] === 'Currently struggling') flags.push('Strongman of Lust, Spirit of Bondage, Spirit of Perversion, Guilt and Shame')
  if (data['D - Abuse History'] && data['D - Abuse History'] !== 'No') flags.push('Spirit of Rejection, Spirit of Fear, Spirit of Lust (entered through trauma), Victim Spirit')

  // Category E — Addictions
  const addictions = data['E - Addictions'] || []
  if (addictions.some((a: string) => a !== 'None')) flags.push(`Strongman of Bondage, Spirits of: ${addictions.filter((a: string) => a !== 'None').join(', ')} — Compulsion, False Comfort, Escapism`)
  if (data['E - Family Addiction History'] === 'Yes') flags.push('Inherited Strongman of Bondage')

  // Category G — Physical
  if (data['G - Chronic Illness']) flags.push('Strongman of Infirmity — check for hereditary curses')

  // Deduplicate
  const unique = [...new Set(flags)]
  return unique.length > 0
    ? unique.map((f, i) => `${i + 1}. ${f}`).join('\n')
    : 'No specific spirits flagged — review full intake manually'
}

export const Route = createFileRoute('/api/submit-assessment')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!AIRTABLE_TOKEN) return Response.json({ error: 'Missing AIRTABLE_TOKEN' }, { status: 500 })

        try {
          const data = await request.json()
          const flaggedSpirits = diagnoseFlaggedSpirits(data)

          // Build Airtable fields safely — only send non-empty text fields
          const fields: Record<string, string> = {}
          
          // Always include these core fields
          fields['Status'] = 'New'
          fields['Flagged Spirits'] = flaggedSpirits

          // All other fields — convert everything to plain text strings
          const allFields = [
            'First Name','Email','Age Range','How Long Saved','Church Background',
            'Conversion Experience','Prayer Life Description','Assurance of Salvation',
            'Satisfied With Walk','A - Father Relationship','A - Mother Relationship',
            'A - Planned Child','A - Adopted','A - Parents Divorced','A - Childhood Home Happy',
            'A - Lonely As Teenager','A - Rejection Notes','B - Suicide History','B - Mental Notes',
            'B - Dreams Sleep','C - Devil Pact','C - Freemasonry','C - Occult Objects',
            'C - Curses','C - Occult Notes','D - Pornography History','D - Abuse History',
            'D - Sexual Notes','E - Family Addiction History','E - Addiction Notes',
            'F - Country of Birth','G - Chronic Illness','G - Trauma History',
            'G - Blood Transfusion','Own Words','Anything Else',
            'A - Self Image','B - Anxiety Depression','B - Fears','B - Occult Mind States',
            'C - Occult Activities','C - Cult Involvement','D - Lust Struggles',
            'E - Addictions','F - Counter Culture',
          ]
          
          allFields.forEach(f => {
            const val = data[f]
            if (!val) return
            if (Array.isArray(val)) {
              const joined = val.filter((v: string) => v !== 'None').join(', ')
              if (joined) fields[f] = joined
            } else if (String(val).trim()) {
              fields[f] = String(val).trim()
            }
          })

          const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${ASSESSMENTS_TABLE}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields }),
          })

          if (!res.ok) {
            const err = await res.text()
            let parsed: any = {}
            try { parsed = JSON.parse(err) } catch {}
            return Response.json({ 
              error: `Airtable error: ${res.status}`,
              detail: parsed?.error?.message || err,
            }, { status: 502 })
          }

          return Response.json({ success: true })
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 })
        }
      },
    },
  },
})
