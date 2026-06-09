import { createClient } from '@supabase/supabase-js'
import { requireTier } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function supabase() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

const CATEGORY_PROMPTS: Record<string, string> = {
  history: `Research the spiritual and historical background of this region. Focus on:
- Indigenous peoples and their spiritual practices
- Founding covenants, land dedications, and spiritual ceremonies
- Major historical bloodshed: battles, massacres, violent events
- Masonic lodges, secret societies, and fraternal orders
- False religion history: cults, occult groups, spiritualist movements
- Environmental devastation and land defilement events
- Broken treaties and injustices
Provide a concise but thorough spiritual intelligence summary. Format with clear sections.`,

  current: `Research the current spiritual and social conditions in this region. Focus on:
- Current addiction and substance abuse patterns and statistics
- Poverty rates, economic indicators, and financial bondage
- Crime patterns, violent crime, gang activity
- Church landscape: denominations, unity/division, revival history
- Current dominant cultural idols and spiritual strongholds
- Recent spiritual activity, both positive and negative
Provide a concise intelligence summary with current data where available.`,

  occult: `Research occult and dark spiritual activity in this region. Focus on:
- Active occult groups, covens, or spiritual organizations
- New Age centers, metaphysical shops, spiritual practices outside Christianity
- Folk magic, root work, or traditional spiritual practices
- Documented paranormal activity or spiritual phenomena
- Locations associated with occult history
- Online occult communities connected to this area
Present findings objectively as spiritual intelligence data.`,

  church: `Research the church landscape and spiritual climate of this region. Focus on:
- Major denominations present and their history
- Known revivals or moves of God in history
- Church splits, divisions, and controversies
- Charismatic and intercessory prayer presence
- Mission organizations and apostolic activity
- Current church unity or lack thereof
This is for prayer mapping purposes.`,

  ancestry: `Research the ancestral and indigenous heritage of this region. Focus on:
- Native American tribes that historically occupied this territory
- Their spiritual practices, ceremonies, and covenants with the land
- Pioneer and settler spiritual practices and covenants
- Generational patterns in the family lines that settled this region
- Historical religious revivals or spiritual awakenings
- Bloodline patterns: what spiritual strongholds run generationally?`,

  news: `Search for recent news and current events from this region relevant to spiritual mapping. Focus on:
- Recent violent crimes, murders, or unusual deaths
- Drug-related news and addiction crisis coverage
- Economic hardship stories
- Political or social conflict
- Any unusual spiritual or religious events
- Environmental issues
Provide a summary of spiritually relevant current events from the last 2 years.`,
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers })

  // Commander+ required (beta_access users bypass tier for testing).
  const auth = await requireTier(req, 2, { allowBeta: true })
  if (auth instanceof Response) return auth

  try {
    const { regionId, regionName, radiusMiles, categories } = await req.json()
    if (!regionId || !regionName || !categories?.length) {
      return new Response(JSON.stringify({ error: 'regionId, regionName, categories required' }), { status: 400, headers })
    }

    const sb = supabase()
    const results: Record<string, string> = {}

    for (const category of categories) {
      const prompt = CATEGORY_PROMPTS[category]
      if (!prompt) continue

      const systemPrompt = `You are a War Room Intel strategic analyst conducting classified spiritual mapping research. You gather intelligence on geographic regions for the purpose of informed intercessory prayer and spiritual warfare. Your research is used by trained deliverance ministers and intercession teams. Be thorough, factual, and spiritually discerning.`

      const userMessage = `Region: ${regionName} (radius: ${radiusMiles} miles)\n\n${prompt}`

      const tools = [{
        type: 'web_search_20250305' as const,
        name: 'web_search',
      }]

      const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'web-search-2025-03-05',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 2000,
          system: systemPrompt,
          tools,
          messages: [{ role: 'user', content: userMessage }],
        }),
      })

      if (!apiRes.ok) {
        const errText = await apiRes.text()
        console.error(`Claude API error for ${category}:`, errText)
        results[category] = `Research unavailable — API error for ${category}`
        continue
      }

      const data = await apiRes.json()

      // Extract text from response (may include tool use blocks)
      let summary = ''
      if (data.content && Array.isArray(data.content)) {
        for (const block of data.content) {
          if (block.type === 'text') {
            summary += block.text
          }
        }
      }

      if (!summary) {
        summary = `No research data returned for ${category}`
      }

      results[category] = summary

      // Save to cache
      await sb.from('sm_research_cache').insert({
        region_id: regionId,
        category,
        summary,
        search_query: userMessage,
      })
    }

    // Update region's ai_research_cache
    const { data: region } = await sb.from('sm_regions').select('ai_research_cache').eq('id', regionId).single()
    const existing = region?.ai_research_cache || {}
    await sb.from('sm_regions').update({
      ai_research_cache: { ...existing, ...results },
      updated_at: new Date().toISOString(),
    }).eq('id', regionId)

    return new Response(JSON.stringify({ results }), { status: 200, headers })
  } catch (err: any) {
    console.error('sm-research error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }
}

export const config = { path: '/api/sm-research' }
