import { createFileRoute } from '@tanstack/react-router'

const NAME_FIELD = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'

export const Route = createFileRoute('/api/demons')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = process.env.AIRTABLE_TOKEN
        const BASE_ID = 'appVXEj2DLPBTJTtD'
        const TABLE_ID = 'tblcP4lgVykzOhLi4'

        if (!token) {
          return Response.json({ error: 'Missing AIRTABLE_TOKEN env var' }, { status: 500 })
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
              return Response.json({ error: `Airtable ${res.status}`, detail }, { status: 502 })
            }

            const data = await res.json()
            records.push(...data.records)
            offset = data.offset
          } while (offset)

          const demons = records
            .map((r: any, i: number) => ({
              id: i + 1,
              airtableId: r.id,
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
