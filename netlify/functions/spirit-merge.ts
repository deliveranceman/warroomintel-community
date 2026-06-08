import { requireAdmin2 } from './_shared/access'

const { token: airtableToken } = JSON.parse(process.env.AIRTABLE || '{}')
const AIRTABLE_TOKEN = airtableToken!
const BASE_ID        = 'appVXEj2DLPBTJTtD'
const TABLE_ID       = 'tblcP4lgVykzOhLi4'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

const CAMEL_TO_AIRTABLE: Record<string, string> = {
  name: '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE',
  aka: 'Also Known As',
  description: 'Description',
  manifestation: 'Manifestiation',
  scripture: 'Scripture Reference',
  entryPoints: 'Entry Points',
  sourceOrigin: 'Source / Orgin',
  kingdom: 'Kingdom',
  strongman: 'Strongman',
  legalRights: 'Legal Rights',
  symptoms: 'Symptoms',
  companionSpirits: 'Companion Spirits',
  wriNotes: 'WRI Exorcist Notes',
  assignment: 'Assignment',
  hierarchyCategory: 'Hierarchy Category',
  parentStrongman: 'Parent Strongman',
  deliveranceSequence: 'Deliverance Sequence',
  operationalNotes: 'Operational Notes',
  primaryBattlefield: 'Primary Battlefield',
  personalityPresentation: 'Typical Personality Presentation',
  counterScriptures: 'Counter Scriptures',
  phonetic: 'Phonetic',
  relatedSpirits: 'Related Spirits',
  biblicalRank: 'Biblical Rank',
  caseType: 'Case Type',
  isGenerational: 'Is Generational',
  isTerritorial: 'Is Territorial',
  clusterSpirits: 'Cluster Spirits',
  legalRightsFramework: 'Legal Rights Framework',
  institutionalExpression: 'Institutional Expression',
  sessionIndicators: 'Session Indicators',
  resistanceSignature: 'Resistance Signature',
  demonicAgreements: 'Demonic Agreements',
  transmissionVectors: 'Transmission Vectors',
  etymologyNotes: 'Etymology Notes',
  archaeologyNotes: 'Archaeology Notes',
  scriptureContext: 'Scripture Context',
  prayerPoints: 'Prayer Points',
  aftercareNotes: 'Aftercare Notes',
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS })
  }

  const { keepId, deleteId, mergedFields } = body
  if (!keepId || !deleteId || !mergedFields) {
    return new Response(JSON.stringify({ error: 'keepId, deleteId, and mergedFields required' }), { status: 400, headers: HEADERS })
  }

  // Map camelCase keys to Airtable field names, skip empty values
  const airtableFields: Record<string, any> = {}
  for (const [camel, val] of Object.entries(mergedFields as Record<string, any>)) {
    if (val === null || val === undefined || val === '') continue
    airtableFields[CAMEL_TO_AIRTABLE[camel] || camel] = val
  }

  // Update the kept record
  const patchRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${keepId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: airtableFields }),
  })
  if (!patchRes.ok) {
    const err = await patchRes.text()
    return new Response(JSON.stringify({ error: `Airtable patch failed: ${err}` }), { status: 500, headers: HEADERS })
  }

  // Delete the duplicate record
  const delRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${deleteId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
  })
  if (!delRes.ok) {
    const err = await delRes.text()
    return new Response(JSON.stringify({ error: `Airtable delete failed: ${err}` }), { status: 500, headers: HEADERS })
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/spirit-merge' }
