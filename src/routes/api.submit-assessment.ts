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

          // Build fields — send everything as plain long text
          // Use a single consolidated text field approach to avoid field type issues
          const fields: Record<string, string> = {}

          // Core identity fields
          if (data['First Name']) fields['First Name'] = String(data['First Name']).trim()
          if (data['Email']) fields['Email'] = String(data['Email']).trim()
          
          // Build a single comprehensive notes field with all answers
          const sections: string[] = []
          
          sections.push('=== ABOUT YOU ===')
          sections.push(`Age Range: ${data['Age Range'] || 'Not provided'}`)
          sections.push(`How Long Saved: ${data['How Long Saved'] || 'Not provided'}`)
          
          sections.push('\n=== SPIRITUAL FOUNDATION ===')
          if (data['Church Background']) sections.push(`Church Background: ${data['Church Background']}`)
          if (data['Conversion Experience']) sections.push(`Conversion: ${data['Conversion Experience']}`)
          if (data['Prayer Life Description']) sections.push(`Prayer Life: ${data['Prayer Life Description']}`)
          if (data['Assurance of Salvation']) sections.push(`Assurance of Salvation: ${data['Assurance of Salvation']}`)
          if (data['Satisfied With Walk']) sections.push(`Satisfied With Walk: ${data['Satisfied With Walk']}`)
          
          sections.push('\n=== CATEGORY A: REJECTION ===')
          if (data['A - Father Relationship']) sections.push(`Father Relationship: ${data['A - Father Relationship']}`)
          if (data['A - Mother Relationship']) sections.push(`Mother Relationship: ${data['A - Mother Relationship']}`)
          if (data['A - Planned Child']) sections.push(`Planned Child: ${data['A - Planned Child']}`)
          if (data['A - Adopted']) sections.push(`Adopted: ${data['A - Adopted']}`)
          if (data['A - Parents Divorced']) sections.push(`Parents Divorced: ${data['A - Parents Divorced']}`)
          if (data['A - Childhood Home Happy']) sections.push(`Happy Childhood: ${data['A - Childhood Home Happy']}`)
          if (data['A - Lonely As Teenager']) sections.push(`Lonely As Teenager: ${data['A - Lonely As Teenager']}`)
          if (data['A - Self Image']?.length) sections.push(`Self Image: ${(data['A - Self Image'] as string[]).join(', ')}`)
          if (data['A - Rejection Notes']) sections.push(`Notes: ${data['A - Rejection Notes']}`)
          
          sections.push('\n=== CATEGORY B: MENTAL & EMOTIONAL ===')
          if (data['B - Anxiety Depression']?.length) sections.push(`Struggles: ${(data['B - Anxiety Depression'] as string[]).join(', ')}`)
          if (data['B - Suicide History']) sections.push(`Suicide History: ${data['B - Suicide History']}`)
          if (data['B - Fears']?.length) sections.push(`Fears: ${(data['B - Fears'] as string[]).join(', ')}`)
          if (data['B - Occult Mind States']?.length) sections.push(`Mind States: ${(data['B - Occult Mind States'] as string[]).join(', ')}`)
          if (data['B - Dreams Sleep']) sections.push(`Dreams/Sleep: ${data['B - Dreams Sleep']}`)
          if (data['B - Mental Notes']) sections.push(`Notes: ${data['B - Mental Notes']}`)
          
          sections.push('\n=== CATEGORY C: OCCULT & WITCHCRAFT ===')
          if (data['C - Devil Pact']) sections.push(`Devil Pact: ${data['C - Devil Pact']}`)
          if (data['C - Occult Activities']?.length) sections.push(`Occult Activities: ${(data['C - Occult Activities'] as string[]).join(', ')}`)
          if (data['C - Cult Involvement']?.length) sections.push(`Cult Involvement: ${(data['C - Cult Involvement'] as string[]).join(', ')}`)
          if (data['C - Freemasonry']) sections.push(`Freemasonry: ${data['C - Freemasonry']}`)
          if (data['C - Occult Objects']) sections.push(`Occult Objects: ${data['C - Occult Objects']}`)
          if (data['C - Curses']) sections.push(`Curses: ${data['C - Curses']}`)
          if (data['C - Occult Notes']) sections.push(`Notes: ${data['C - Occult Notes']}`)
          
          sections.push('\n=== CATEGORY D: SEXUAL STRUGGLES ===')
          if (data['D - Lust Struggles']?.length) sections.push(`Struggles: ${(data['D - Lust Struggles'] as string[]).join(', ')}`)
          if (data['D - Pornography History']) sections.push(`Pornography: ${data['D - Pornography History']}`)
          if (data['D - Abuse History']) sections.push(`Abuse History: ${data['D - Abuse History']}`)
          if (data['D - Sexual Notes']) sections.push(`Notes: ${data['D - Sexual Notes']}`)
          
          sections.push('\n=== CATEGORY E: ADDICTIONS ===')
          if (data['E - Addictions']?.length) sections.push(`Addictions: ${(data['E - Addictions'] as string[]).join(', ')}`)
          if (data['E - Family Addiction History']) sections.push(`Family History: ${data['E - Family Addiction History']}`)
          if (data['E - Addiction Notes']) sections.push(`Notes: ${data['E - Addiction Notes']}`)
          
          sections.push('\n=== CATEGORY F/G: BACKGROUND & HEALTH ===')
          if (data['F - Country of Birth']) sections.push(`Country: ${data['F - Country of Birth']}`)
          if (data['F - Counter Culture']?.length) sections.push(`Counter Culture: ${(data['F - Counter Culture'] as string[]).join(', ')}`)
          if (data['G - Chronic Illness']) sections.push(`Chronic Illness: ${data['G - Chronic Illness']}`)
          if (data['G - Trauma History']) sections.push(`Trauma: ${data['G - Trauma History']}`)
          if (data['G - Blood Transfusion']) sections.push(`Blood Transfusion: ${data['G - Blood Transfusion']}`)
          
          sections.push('\n=== IN THEIR OWN WORDS ===')
          if (data['Own Words']) sections.push(data['Own Words'] as string)
          if (data['Anything Else']) sections.push(`Additional: ${data['Anything Else']}`)
          
          sections.push('\n=== FLAGGED SPIRITS (AUTO-GENERATED) ===')
          sections.push(flaggedSpirits)
          
          fields['Own Words'] = sections.join('\n')

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
