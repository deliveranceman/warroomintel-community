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
    // Skip null, undefined, and empty strings — Airtable rejects the entire PATCH
    // if any field name doesn't exist as a column, even with a null value
    if (v === null || v === undefined || v === '') continue
    out[k] = v
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
      subKingdom: data.fields['Sub-Kingdom'] || '',
      culturalPresence: Array.isArray(data.fields['Cultural Presence']) ? data.fields['Cultural Presence'] : [],
      sessionTriggerQuestions: data.fields['Session Trigger Questions'] || '',
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

    // Map camelCase AI fields to exact Airtable field names
    const airtableFields: Record<string, any> = { ...fields }
    const camelToAirtable: Record<string, string> = {
      name: '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE',
      aka: 'Also Known As',
      description: 'Description',
      manifestation: 'Manifestiation', // Airtable field has this typo
      scripture: 'Scripture Reference',
      entryPoints: 'Entry Points',
      sourceOrigin: 'Source / Orgin', // Airtable field has this typo
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
      images: 'Images',
      relatedSpirits: 'Related Spirits',
      biblicalRank: 'Biblical Rank',
      caseType: 'Case Type',
      isGenerational: 'Is Generational',
      isTerritorial: 'Is Territorial',
      subKingdom: 'Sub-Kingdom',
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
      culturalPresence: 'Cultural Presence',
      sessionTriggerQuestions: 'Session Trigger Questions',
      region: 'Region', // TODO: Create 'Region' field in Airtable
    }
    for (const [camel, airtable] of Object.entries(camelToAirtable)) {
      if (camel in airtableFields) {
        const value = airtableFields[camel]
        console.log('[PATCH] Processing field:', camel, '→', airtable, '| value:', JSON.stringify(value))

        // Kingdom is a Single Select — only send known valid options
        if (camel === 'kingdom') {
          const validKingdoms = [
            'Hell / Darkness', 'Air', 'Water / Marine', 'Earth', 'Witchcraft', 'Occult',
            'Religion / False Religion', 'False Religion / Paganism', 'Infirmity / Sickness',
            'Mind / Intellect', 'Sexual Perversion', 'Death / Destruction', 'Fear / Torment',
            'Pride / Self', 'Deception / Lies', 'Anger / Violence', 'Mammon / Greed',
            // Legacy short values kept for backward compat
            'Hell', 'Darkness', 'Water', 'Occult',
          ]
          if (!value || !validKingdoms.includes(value)) {
            delete airtableFields[camel]
            continue
          }
        }

        // Biblical Rank is a Single Select — only send exact Eph. 6:12 values
        if (camel === 'biblicalRank') {
          const validRanks = [
            // New taxonomy
            'Principality', 'World Ruler', 'Power', 'Wicked Spirit',
            'Fallen Angel', 'Demon', 'Familiar Spirit', 'Spirit of Infirmity',
            // Legacy
            'Ruler of Darkness', 'Spiritual Wickedness in High Places',
          ]
          if (!value || !validRanks.includes(value)) {
            delete airtableFields[camel]
            continue
          }
        }

        // Sub-Kingdom is a Single Select — normalize slashes and validate
        if (camel === 'subKingdom') {
          const VALID_SUB_KINGDOMS = [
            'Norse/Germanic', 'Celtic', 'Greek/Roman', 'Egyptian',
            'Babylonian/Sumerian', 'Canaanite/Phoenician', 'Hindu/Eastern',
            'Native American', 'African Traditional', 'Freemasonry/Secret Societies',
            'Satanism/Luciferianism', 'New Age/Occult', 'Marine/Aquatic',
            'Celestial/Astral', 'Infernal/Hell', 'Generational', 'Religious Spirit', 'None',
          ]
          if (!value) {
            delete airtableFields[camel]
            continue
          }
          // Normalize spaces around slashes: "Norse / Germanic" → "Norse/Germanic"
          const normalized = String(value).replace(/\s*\/\s*/g, '/')
          const exact = VALID_SUB_KINGDOMS.find(v => v.toLowerCase() === normalized.toLowerCase())
          if (!exact) {
            console.log('[PATCH] Sub-Kingdom value not recognized, skipping:', value)
            delete airtableFields[camel]
            continue
          }
          // Use the exact Airtable option string
          airtableFields[airtable] = exact
          delete airtableFields[camel]
          continue
        }

        // Cultural Presence is a Multiple Select — send as array of valid strings only
        if (camel === 'culturalPresence') {
          const VALID_CULTURAL = [
            'Film / Cinema', 'Television / Streaming', 'Comics / Graphic Novels', 'Video Games',
            'Music / Lyrics', 'Literature / Fiction', 'Ancient Documents / Texts', 'Religious Texts / Scripture',
            'Secret Society Rituals', 'Academic / Occult Literature', 'Internet / Social Media',
            'Tattoo Culture', 'Fashion / Aesthetics', 'Sports Culture', 'New Age / Wellness Industry',
            'Anime / Manga', 'Role Playing Games / D&D', 'Astrology / Tarot', 'Horror Genre', 'True Crime',
          ]
          if (!Array.isArray(value) || value.length === 0) {
            delete airtableFields[camel]
            continue
          }
          const validated = value.filter((v: any) => VALID_CULTURAL.includes(String(v)))
          if (validated.length === 0) { delete airtableFields[camel]; continue }
          airtableFields[airtable] = validated
          delete airtableFields[camel]
          continue
        }

        airtableFields[airtable] = value
        delete airtableFields[camel]
      }
    }

    // Checkbox fields: Airtable only accepts boolean true — never false, never strings
    for (const checkboxField of ['Is Generational', 'Is Territorial']) {
      if (checkboxField in airtableFields) {
        const v = airtableFields[checkboxField]
        const isTrue = v === true || v === 'true' || v === 'Yes' || v === 'yes'
        if (isTrue) {
          airtableFields[checkboxField] = true
        } else {
          delete airtableFields[checkboxField] // omit false — never send it
        }
      }
    }

    console.log('[admin-demon] PATCH fields being sent to Airtable:', JSON.stringify(Object.keys(airtableFields)))

    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: cleanFields(airtableFields) }),
    })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: { message: res.statusText } }))
      console.error('[admin-demon] Airtable error:', JSON.stringify(errBody))
      return new Response(JSON.stringify({
        error: errBody?.error?.message || 'Airtable update failed',
        detail: JSON.stringify(errBody),
      }), { status: res.status, headers: { 'Content-Type': 'application/json' } })
    }
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
