const CLERK_SECRET   = process.env.CLERK_SECRET_KEY!
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!
const BASE_ID        = 'appVXEj2DLPBTJTtD'
const TABLE_ID       = 'tblcP4lgVykzOhLi4'

async function resolveUser(token: string): Promise<{ userId: string; userData: any } | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      console.error('Token is not a JWT — parts:', parts.length)
      return null
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    console.log('JWT payload sub:', payload.sub)
    console.log('JWT payload azp:', payload.azp)

    const userId = payload.sub
    if (!userId) {
      console.error('No sub in JWT payload')
      return null
    }

    const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${CLERK_SECRET}` },
    })
    console.log('User fetch status:', userRes.status)
    if (!userRes.ok) return null
    const userData = await userRes.json()
    console.log('publicMetadata:', JSON.stringify(userData?.public_metadata))
    return { userId, userData }
  } catch (e) {
    console.error('resolveUser error:', e)
    return null
  }
}

function cleanFields(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined) continue
    out[k] = v === '' ? null : v
  }
  return out
}

async function airtableError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    return body?.error?.message || JSON.stringify(body)
  } catch {
    return res.statusText
  }
}

export default async function handler(req: Request) {
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const id  = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 })

    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${id}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    })
    if (!res.ok) return new Response(JSON.stringify({ error: await airtableError(res) }), { status: res.status })
    const data = await res.json()
    const mapped = {
      ...data,
      phonetic: data.fields['Phonetic'] || '',
      images: data.fields['Images']
        ? String(data.fields['Images']).split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
      relatedSpirits: data.fields['Related Spirits'] || '',
      biblicalRank: data.fields['Biblical Rank'] || '',
      transmissionVectors: data.fields['Transmission Vectors'] || '',
      caseType: data.fields['Case Type'] || '',
      clusterSpirits: data.fields['Cluster Spirits'] || '',
      sessionIndicators: data.fields['Session Indicators'] || '',
      demonicAgreements: data.fields['Demonic Agreements'] || '',
      aftercareNotes: data.fields['Aftercare Notes'] || '',
      etymologyNotes: data.fields['Etymology Notes'] || '',
      archaeologyNotes: data.fields['Archaeology Notes'] || '',
      scriptureContext: data.fields['Scripture Context'] || '',
      resistanceSignature: data.fields['Resistance Signature'] || '',
      institutionalExpression: data.fields['Institutional Expression'] || '',
      prayerPoints: data.fields['Prayer Points'] || '',
      isGenerational: data.fields['Is Generational'] === true || data.fields['Is Generational'] === 'true',
      isTerritorial: data.fields['Is Territorial'] === true || data.fields['Is Territorial'] === 'true',
    }
    return new Response(JSON.stringify({ record: mapped }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  const auth = await resolveUser(token)
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized — invalid session' }), { status: 401 })
  if (auth.userData?.public_metadata?.role !== 'minister') {
    return new Response(JSON.stringify({
      error: 'Forbidden — minister role required',
      debug: { userId: auth.userId, role: auth.userData?.public_metadata?.role, allMetadata: auth.userData?.public_metadata },
    }), { status: 403 })
  }
  const userId = auth.userId

  if (req.method === 'PATCH') {
    const body = await req.json()
    const { id, fields } = body
    if (!id || !fields) return new Response(JSON.stringify({ error: 'id and fields required' }), { status: 400 })

    // Map camelCase AI fields to Airtable field names
    const airtableFields: Record<string, any> = { ...fields }
    const camelToAirtable: Record<string, string> = {
      biblicalRank: 'Biblical Rank',
      transmissionVectors: 'Transmission Vectors',
      caseType: 'Case Type',
      clusterSpirits: 'Cluster Spirits',
      sessionIndicators: 'Session Indicators',
      demonicAgreements: 'Demonic Agreements',
      aftercareNotes: 'Aftercare Notes',
      etymologyNotes: 'Etymology Notes',
      archaeologyNotes: 'Archaeology Notes',
      scriptureContext: 'Scripture Context',
      resistanceSignature: 'Resistance Signature',
      institutionalExpression: 'Institutional Expression',
      prayerPoints: 'Prayer Points',
      isGenerational: 'Is Generational',
      isTerritorial: 'Is Territorial',
      phonetic: 'Phonetic',
      relatedSpirits: 'Related Spirits',
      legalRights: 'Legal Rights',
      legalRightsFramework: 'Legal Rights Framework',
      images: 'Images',
      strongman: 'Strongman',
      assignment: 'Assignment',
      primaryBattlefield: 'Primary Battlefield',
      personalityPresentation: 'Personality Presentation',
      companionSpirits: 'Companion Spirits',
      counterScriptures: 'Counter Scriptures',
      deliveranceSequence: 'Deliverance Sequence',
      operationalNotes: 'Operational Notes',
      wriNotes: 'WRI Notes',
      manifestation: 'Manifestation',
      description: 'Description',
      entryPoints: 'Entry Points',
    }
    for (const [camel, airtable] of Object.entries(camelToAirtable)) {
      if (camel in airtableFields) {
        airtableFields[airtable] = airtableFields[camel]
        delete airtableFields[camel]
      }
    }

    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: cleanFields(airtableFields) }),
    })
    if (!res.ok) return new Response(JSON.stringify({ error: await airtableError(res) }), { status: res.status })
    const data = await res.json()
    return new Response(JSON.stringify({ record: data }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const { fields } = body
    if (!fields) return new Response(JSON.stringify({ error: 'fields required' }), { status: 400 })

    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: cleanFields(fields) }),
    })
    if (!res.ok) return new Response(JSON.stringify({ error: await airtableError(res) }), { status: res.status })
    const data = await res.json()
    return new Response(JSON.stringify({ record: data }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/admin-demon' }
