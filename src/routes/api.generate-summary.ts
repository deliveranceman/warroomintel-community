import { createFileRoute } from '@tanstack/react-router'

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const BASE_ID = 'appLPhhHPP5rKvlKT'
const ASSESSMENTS_TABLE = 'tblohf2u576ZXiE4y'

export const Route = createFileRoute('/api/generate-summary')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!AIRTABLE_TOKEN) return Response.json({ error: 'Missing AIRTABLE_TOKEN' }, { status: 500 })
        if (!ANTHROPIC_API_KEY) return Response.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 })

        try {
          const { recordId, ownWords, flaggedSpirits } = await request.json()

          if (!recordId) return Response.json({ error: 'Missing recordId' }, { status: 400 })

          // Call Claude to generate anonymous summary
          const prompt = `You are assisting a deliverance ministry team. Below is an anonymous intake from someone seeking help. Write a compassionate, insightful 2-3 paragraph summary of what this person appears to be dealing with spiritually and emotionally. 

IMPORTANT RULES:
- Write in third person ("This individual...", "This person...")
- Remove ALL identifying details — no names, locations, specific people
- Be compassionate and non-judgmental
- Focus on spiritual and emotional patterns, not graphic details
- Do not reproduce sensitive sexual or trauma details explicitly
- Use ministry language appropriate for a deliverance context
- End with a sentence about hope and freedom available through deliverance

Their own words:
${ownWords || 'Not provided'}

Flagged spiritual patterns:
${flaggedSpirits || 'Not provided'}

Write the summary now:`

          const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 600,
              messages: [{ role: 'user', content: prompt }],
            }),
          })

          if (!aiRes.ok) {
            const err = await aiRes.text()
            return Response.json({ error: `Claude API error: ${aiRes.status}`, detail: err }, { status: 502 })
          }

          const aiData = await aiRes.json()
          const summary = aiData.content?.[0]?.text || ''

          // Save summary back to Airtable record
          const updateRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${ASSESSMENTS_TABLE}/${recordId}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${AIRTABLE_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fields: { 'AI Summary': summary } }),
          })

          if (!updateRes.ok) {
            const err = await updateRes.text()
            return Response.json({ error: `Airtable update error`, detail: err }, { status: 502 })
          }

          return Response.json({ success: true, summary })
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 })
        }
      },
    },
  },
})
