import { createFileRoute } from '@tanstack/react-router'
import { requireTier } from '../../netlify/functions/_shared/access'

const { token: airtableToken } = JSON.parse(process.env.AIRTABLE || '{}')

const NAME_FIELD = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'

export const Route = createFileRoute('/api/demons')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authRes = await requireTier(request, 1)
        if (authRes instanceof Response) return authRes
        const token = airtableToken
        const BASE_ID = 'appVXEj2DLPBTJTtD'
        const TABLE_ID = 'tblcP4lgVykzOhLi4'

        console.log('[api.demons] AIRTABLE_TOKEN present:', !!token)

        if (!token) {
          console.error('[api.demons] AIRTABLE_TOKEN env var is not set')
          // Return empty array so the page loads rather than breaking
          return Response.json({ demons: [], total: 0, error: 'AIRTABLE_TOKEN not configured' })
        }

        try {
          const records: any[] = []
          let offset: string | undefined = undefined

          do {
            const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`)
            url.searchParams.set('pageSize', '100')
            url.searchParams.set('view', 'viw1ickrF5zgNGifc')
            if (offset) url.searchParams.set('offset', offset)

            const res = await fetch(url.toString(), {
              headers: { Authorization: `Bearer ${token}` },
            })

            if (!res.ok) {
              const detail = await res.text()
              console.error(`[api.demons] Airtable ${res.status}:`, detail)
              // Return empty array rather than crashing the page
              return Response.json({ demons: [], total: 0, airtableError: `Airtable ${res.status}` })
            }

            const data = await res.json()
            records.push(...data.records)
            offset = data.offset
          } while (offset)

          const demons = records
            .map((r: any, i: number) => ({
              id: i + 1,
              airtableId: r.id,
              createdTime: r.createdTime || '',
              name: r.fields[NAME_FIELD] || '',
              aka: r.fields['Also Known As'] || '',
              kingdom: r.fields['Kingdom'] || '',
              description: r.fields['Description'] || '',
              assignment: r.fields['Assignment'] || '',
              // Soldier tier
              function: r.fields['Description'] || '',
              manifestation: r.fields['Manifestiation'] || '',
              scripture: r.fields['Scripture Reference'] || '',
              strongman: r.fields['Strongman'] || '',
              // Commander tier
              entryPoints: r.fields['Entry Points'] || '',
              legalRights: r.fields['Legal Rights'] || '',
              protocol: r.fields['Deliverance Protocol'] || '',
              // General tier
              symptoms: r.fields['Symptoms'] || '',
              companionSpirits: r.fields['Companion Spirits'] || '',
              wriNotes: r.fields['WRI Exorcist Notes'] || '',
              sourceOrigin: r.fields['Source / Orgin'] || '',
              // Operational intel (new fields)
              hierarchyCategory: r.fields['Hierarchy Category'] || '',
              parentStrongman: r.fields['Parent Strongman'] || '',
              deliveranceSequence: r.fields['Deliverance Sequence'] || '',
              operationalNotes: r.fields['Operational Notes'] || '',
              primaryBattlefield: r.fields['Primary Battlefield'] || '',
              personalityPresentation: r.fields['Typical Personality Presentation'] || '',
              counterScriptures: r.fields['Counter Scriptures'] || '',
              region: r.fields['Region'] || '', // TODO: Create 'Region' field in Airtable
              // AI-enhanced fields — mapped from new Airtable columns
              phonetic: r.fields['Phonetic'] || '',
              images: r.fields['Images']
                ? String(r.fields['Images']).split(',').map((s: string) => s.trim()).filter(Boolean)
                : [],
              relatedSpirits: r.fields['Related Spirits'] || '',
              biblicalRank: r.fields['Biblical Rank'] || '',
              caseType: r.fields['Case Type'] || '',
              isGenerational: r.fields['Is Generational'] === true || r.fields['Is Generational'] === 'true',
              isTerritorial: r.fields['Is Territorial'] === true || r.fields['Is Territorial'] === 'true',
              subKingdom: r.fields['Sub-Kingdom'] || '',
              clusterSpirits: r.fields['Cluster Spirits'] || '',
              legalRightsFramework: r.fields['Legal Rights Framework'] || '',
              institutionalExpression: r.fields['Institutional Expression'] || '',
              sessionIndicators: r.fields['Session Indicators'] || '',
              resistanceSignature: r.fields['Resistance Signature'] || '',
              demonicAgreements: r.fields['Demonic Agreements'] || '',
              transmissionVectors: r.fields['Transmission Vectors'] || '',
              etymologyNotes: r.fields['Etymology Notes'] || '',
              archaeologyNotes: r.fields['Archaeology Notes'] || '',
              scriptureContext: r.fields['Scripture Context'] || '',
              prayerPoints: r.fields['Prayer Points'] || '',
              aftercareNotes: r.fields['Aftercare Notes'] || '',
              culturalPresence: Array.isArray(r.fields['Cultural Presence']) ? r.fields['Cultural Presence'] : [],
              sessionTriggerQuestions: r.fields['Session Trigger Questions'] || '',
            }))
            // Skip the header row (first record has "Primary Name" as the name value)
            .filter((d: any) => d.name && d.name !== 'Primary Name')

          return Response.json({ demons, total: demons.length })
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 })
        }
      },
    },
  },
})
