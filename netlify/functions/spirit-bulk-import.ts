import { requireAdmin2 } from './_shared/access'

const { token: airtableToken } = JSON.parse(process.env.AIRTABLE || '{}')
const AIRTABLE_TOKEN = airtableToken || process.env.AIRTABLE_API_TOKEN || ''
const BASE_ID        = 'appVXEj2DLPBTJTtD'
const TABLE_ID       = 'tblcP4lgVykzOhLi4'
const NAME_FIELD     = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'

// Field map from .mjs script camelCase → exact Airtable column name (typos preserved)
const FM: Record<string, string> = {
  name:              NAME_FIELD,
  aka:               'Also Known As',
  typeRank:          'Type / Rank',
  description:       'Description',
  manifestations:    'Manifestiation',        // Airtable has this typo
  scripture:         'Scripture Reference',
  entryPoints:       'Entry Points',
  source:            'Source / Orgin',        // Airtable has this typo
  kingdom:           'Kingdom',
  strongman:         'Strongman',
  rank:              'Rank',
  legalRights:       'Legal Rights',
  symptoms:          'Symptoms',
  companionSpirits:  'Companion Spirits',
  wriNotes:          'WRI Exorcist Notes',
  assignment:        'Assignment',
  hierarchyCategory: 'Hierarchy Category',
  parentStrongman:   'Parent Strongman',
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function buildFields(spirit: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [camel, airtable] of Object.entries(FM)) {
    const val = spirit[camel]
    if (val === null || val === undefined || val === '') continue
    // Coerce arrays to newline-joined strings for long-text fields
    out[airtable] = Array.isArray(val) ? val.join('\n') : val
  }
  return out
}

async function findByName(name: string): Promise<string | null> {
  const safe = name.toLowerCase().replace(/'/g, "\\'")
  const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`)
  url.searchParams.set('filterByFormula', `LOWER({${NAME_FIELD}})='${safe}'`)
  url.searchParams.append('fields[]', NAME_FIELD)
  url.searchParams.set('maxRecords', '1')
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.records?.[0]?.id ?? null
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  let spirits: Record<string, any>[]
  try {
    const body = await req.json()
    spirits = body.spirits
    if (!Array.isArray(spirits) || spirits.length === 0) {
      return new Response(JSON.stringify({ error: 'spirits array required' }), { status: 400 })
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  let created = 0
  let updated = 0
  const errors: Array<{ name: string; error: string }> = []

  for (const spirit of spirits) {
    const name = spirit.name?.trim()
    if (!name) {
      errors.push({ name: '(unnamed)', error: 'Missing name field' })
      continue
    }

    try {
      const fields = buildFields(spirit)
      if (Object.keys(fields).length === 0) {
        errors.push({ name, error: 'No mappable fields found' })
        await delay(400)
        continue
      }

      const existingId = await findByName(name)

      if (existingId) {
        // PATCH — update existing record
        const patchRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${existingId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields }),
        })
        if (!patchRes.ok) {
          const errBody = await patchRes.json().catch(() => ({}))
          errors.push({ name, error: errBody?.error?.message || `PATCH ${patchRes.status}` })
        } else {
          updated++
        }
      } else {
        // POST — create new record
        const postRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields }),
        })
        if (!postRes.ok) {
          const errBody = await postRes.json().catch(() => ({}))
          errors.push({ name, error: errBody?.error?.message || `POST ${postRes.status}` })
        } else {
          created++
        }
      }
    } catch (e: any) {
      errors.push({ name, error: e.message || 'Unknown error' })
    }

    await delay(400)
  }

  return new Response(
    JSON.stringify({ created, updated, errors }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

export const config = { path: '/api/spirit-bulk-import' }
