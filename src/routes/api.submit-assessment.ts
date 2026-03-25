import { createFileRoute } from '@tanstack/react-router'

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN
const BASE_ID = 'appLPhhHPP5rKvlKT'
const ASSESSMENTS_TABLE = 'tblohf2u576ZXiE4y'

function diagnoseFlaggedSpirits(data: Record<string, any>): string {
  const flags: string[] = []

  if (['Bad','Absent','Indifferent','Never knew him'].includes(data['A - Father Relationship'])) flags.push('Spirit of Rejection (paternal)')
  if (['Bad','Absent','Indifferent','Never knew her'].includes(data['A - Mother Relationship'])) flags.push('Spirit of Rejection (maternal)')
  if (data['A - Adopted'] === 'Yes') flags.push('Spirit of Rejection, Spirit of Abandonment')
  if (data['A - Parents Divorced']?.includes('Yes')) flags.push('Spirit of Rejection, Fear of Abandonment, Covenant-Breaking Spirit')
  if (data['A - Childhood Home Happy'] === 'No') flags.push('Spirit of Rejection, Forgiveness issues')
  if (data['A - Lonely As Teenager'] === 'Yes') flags.push('Spirit of Rejection, Spirit of Rebellion, Spirit of Independence')
  const selfImage = data['A - Self Image'] || []
  if (Array.isArray(selfImage) && selfImage.some((s: string) => ['Hate myself','Feel worthless','Condemn myself'].includes(s))) flags.push('Spirit of Self-Hatred, Spirit of Hopelessness')

  const anxiety = data['B - Anxiety Depression'] || []
  if (Array.isArray(anxiety) && anxiety.includes('Depression')) flags.push('Strongman of Heaviness, Spirit of Depression')
  if (Array.isArray(anxiety) && (anxiety.includes('Anxiety') || anxiety.includes('Chronic worry'))) flags.push('Spirit of Anxiety, Spirit of Fear')
  if (data['B - Suicide History'] && data['B - Suicide History'] !== 'Never') flags.push('Spirit of Death, Spirit of Depression — PRIORITY')
  const fears = data['B - Fears'] || []
  if (Array.isArray(fears) && fears.length > 0 && !fears.includes('None')) flags.push(`Spirits of Fear: ${fears.filter((f: string) => f !== 'None').join(', ')}`)

  if (data['C - Devil Pact'] && data['C - Devil Pact'] !== 'No') flags.push('DEVIL PACT — Witchcraft, Antichrist — PRIORITY')
  const occult = data['C - Occult Activities'] || []
  if (Array.isArray(occult) && occult.some((a: string) => ['Ouija board','Demon worship','Spirit guides','Voodoo / firewalking'].includes(a))) flags.push('Familiar Spirits, Spirit of Divination — PRIORITY')
  if (data['C - Freemasonry'] && !['No',"Don't know"].includes(data['C - Freemasonry'])) flags.push('Spirits of Freemasonry — Confusion, Unbelief, Infirmity')

  const lust = data['D - Lust Struggles'] || []
  if (Array.isArray(lust) && lust.some((s: string) => s !== 'None')) flags.push('Strongman of Perversion and Lust')
  if (data['D - Pornography History'] === 'Currently struggling') flags.push('Strongman of Lust, Spirit of Bondage, Guilt and Shame')
  if (data['D - Abuse History'] && data['D - Abuse History'] !== 'No') flags.push('Spirit of Rejection, Victim Spirit, Spirit of Fear')

  const addictions = data['E - Addictions'] || []
  if (Array.isArray(addictions) && addictions.some((a: string) => a !== 'None')) flags.push(`Strongman of Bondage: ${addictions.filter((a: string) => a !== 'None').join(', ')}`)

  if (data['G - Chronic Illness']) flags.push('Strongman of Infirmity — check for hereditary curses')

  const unique = [...new Set(flags)]
  return unique.length > 0 ? unique.map((f, i) => `${i + 1}. ${f}`).join('\n') : 'No specific spirits flagged — review full intake manually'
}

export const Route = createFileRoute('/api/submit-assessment')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!AIRTABLE_TOKEN) return Response.json({ error: 'Missing AIRTABLE_TOKEN' }, { status: 500 })

        try {
          const data = await request.json()
          const flaggedSpirits = diagnoseFlaggedSpirits(data)

          // Helper to join arrays to string
          const arr = (val: any) => Array.isArray(val) ? val.filter((v: string) => v !== 'None').join(', ') : ''
          const str = (val: any) => val ? String(val).trim() : ''
          // Checkbox fields must be boolean
          const bool = (val: any) => val === 'Yes' || val === true

          const fields: Record<string, any> = {
            // Text fields
            'First Name':               str(data['First Name']),
            'Email':                    str(data['Email']),
            'Age Range':                str(data['Age Range']),
            'How Long Saved':           str(data['How Long Saved']),
            'Assurance of Salvation':   str(data['Assurance of Salvation']),
            'Satisfied With Walk':      str(data['Satisfied With Walk']),
            'A - Father Relationship':  str(data['A - Father Relationship']),
            'A - Mother Relationship':  str(data['A - Mother Relationship']),
            'A - Adopted':              str(data['A - Adopted']),
            'A - Parents Divorced':     str(data['A - Parents Divorced']),
            'A - Lonely As Teenager':   str(data['A - Lonely As Teenager']),
            'A - Self Image':           arr(data['A - Self Image']),
            'A - Rejection Notes':      str(data['A - Rejection Notes']),
            'B - Anxiety Depression':   arr(data['B - Anxiety Depression']),
            'B - Suicide History':      str(data['B - Suicide History']),
            'B - Fears':                arr(data['B - Fears']),
            'B - Mental Notes':         str(data['B - Mental Notes']),
            'B - Occult Mind Notes':    arr(data['B - Occult Mind States']),
            'C - Devil Pact':           str(data['C - Devil Pact']),
            'C - Occult Activities':    arr(data['C - Occult Activities']),
            'C - Cult Involvement':     arr(data['C - Cult Involvement']),
            'C - Freemasonry':          str(data['C - Freemasonry']),
            'C - Occult Objects':       str(data['C - Occult Objects']),
            'C - Occult Notes':         str(data['C - Occult Notes']),
            'D - Lust Struggles':       arr(data['D - Lust Struggles']),
            'D - Pornography History':  str(data['D - Pornography History']),
            'D - Abuse History':        str(data['D - Abuse History']),
            'D - Sexual Notes':         str(data['D - Sexual Notes']),
            'E - Addictions':           arr(data['E - Addictions']),
            'E - Family Addiction History': str(data['E - Family Addiction History']),
            'E - Addiction Notes':      str(data['E - Addiction Notes']),
            'F - Country of Birth':     str(data['F - Country of Birth']),
            'F - Counter Culture':      arr(data['F - Counter Culture']),
            'G - Chronic Illness':      str(data['G - Chronic Illness']),
            'G - Trauma History':       str(data['G - Trauma History']),
            'G - Blood Transfusion':    str(data['G - Blood Transfusion']),
            'Own Words':                str(data['Own Words']),
            'Anything Else':            str(data['Anything Else']),
            'Prayer Life Description':  str(data['Prayer Life Description']),
            'Flagged Spirits':          flaggedSpirits,
            // Checkbox fields — must be boolean
            'A - Childhood Home Happy': bool(data['A - Childhood Home Happy']),
            'A - Planned Child':        bool(data['A - Planned Child']),
          }

          // Build clean fields — only non-empty values
          const cleanFields: Record<string, any> = {}
          Object.entries(fields).forEach(([k, v]) => {
            if (v === null || v === undefined) return
            if (typeof v === 'string' && v.trim() === '') return
            cleanFields[k] = v
          })

          const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${ASSESSMENTS_TABLE}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: cleanFields }),
          })

          if (!res.ok) {
            const err = await res.text()
            let parsed: any = {}
            try { parsed = JSON.parse(err) } catch {}
            // Return the FULL Airtable error so we can see exactly what field is failing
            return Response.json({ 
              error: parsed?.error?.message || `Airtable ${res.status}`,
              type: parsed?.error?.type,
              raw: err,
              fieldsSent: Object.keys(cleanFields),
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
