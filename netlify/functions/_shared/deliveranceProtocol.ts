import { solCall } from './solClient'

export async function runDeliveranceProtocol(client: any, job: any): Promise<void> {
  const jobId  = job.id as string
  const params = (job.input_params as any) || {}
  const meta   = {
    userId:   (job.user_id as string) || '',
    userTier: (job.tier    as string) || '',
    callType: 'deliverance_protocol',
  }

  const {
    mode = 'spirit',
    spiritData,
    spiritName: bodySpitName = '',
    spiritNames = [],
    includeCluster = true,
    manifestationDescription = '',
    manifestationCandidates = [],
  } = params

  const primaryName = spiritData?.name || bodySpitName || manifestationCandidates?.[0]?.name || 'Unknown Spirit'

  try {
    await client.from('ai_jobs').update({
      status:     'running',
      started_at: new Date().toISOString(),
      stage:      'generating',
      progress:   10,
    }).eq('id', jobId)

    const contextBlock = mode === 'spirit'
      ? `Spirit: "${primaryName}"
${includeCluster && spiritNames.length ? `Cluster spirits: ${spiritNames.join(', ')}` : ''}
${spiritData?.description ? `Description: ${spiritData.description}` : ''}
${spiritData?.manifestation ? `Manifestations: ${spiritData.manifestation}` : ''}`
      : `Symptom investigation — probable spirits: ${(manifestationCandidates as any[]).map((s: any) => s.name).join(', ')}
Symptoms presented: ${manifestationDescription}`

    const userPrompt = `Generate a complete deliverance session protocol.

${contextBlock}

Respond with ONLY this JSON structure (no markdown, no explanation):
{
  "preSessionIntel": {
    "summary": "2-3 sentence operational overview for the minister",
    "keyLegalGrounds": ["ground 1", "ground 2", "ground 3"],
    "keyScriptures": ["Book X:Y — brief quote", "Book X:Y — brief quote"],
    "warningFlags": ["warning 1", "warning 2"]
  },
  "legalGroundChecklist": [
    {"ground": "Ground name", "question": "Diagnostic question to ask", "scripture": "Book X:Y"}
  ],
  "renunciationPrayers": [
    {"title": "Prayer title", "prayer": "Full prayer text (first person — I renounce...)", "notes": "Brief minister notes"}
  ],
  "commandPrayers": [
    {"target": "Spirit name", "command": "Full command prayer (authoritative minister voice)", "authority": "Scripture reference"}
  ],
  "aftercare": {
    "initialSteps": ["Step 1", "Step 2", "Step 3"],
    "dailyPractices": ["Practice 1", "Practice 2"],
    "warningSignsToWatch": ["Sign 1"],
    "followUpQuestions": ["Question 1"]
  }
}

Requirements: 3-5 legal grounds, 2-3 renunciation prayers, 2-3 command prayers, practical aftercare.`

    await client.from('ai_jobs').update({ progress: 20 }).eq('id', jobId)

    const result = await solCall({
      tier: 'standard',
      system: 'You are a seasoned deliverance ministry protocol generator. Generate scripture-grounded, minister-ready protocols. Respond with valid JSON only — no markdown, no explanation.',
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 8000,
      timeoutMs: 300_000,
      meta,
    })

    await client.from('ai_jobs').update({ stage: 'parsing', progress: 85 }).eq('id', jobId)

    // Meter immediately — if JSON parse fails the row still reflects actual usage.
    await client.from('ai_jobs').update({
      model_used:    result.model,
      tokens_used:   (result.inputTokens ?? 0) + (result.outputTokens ?? 0),
      cost_estimate: result.costUsd,
    }).eq('id', jobId)

    const stripped = result.text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .replace(/['']/g, "'")
      .replace(/[""]/g, '"')
      .trim()

    const jsonMatch = stripped.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[deliveranceProtocol] No JSON object found. Raw prefix:', result.text.slice(0, 300))
      throw new Error('No JSON in AI response')
    }

    let protocol: any
    try {
      protocol = JSON.parse(jsonMatch[0])
    } catch (parseErr: any) {
      console.error('[deliveranceProtocol] JSON.parse failed:', parseErr.message, '— raw prefix:', result.text.slice(0, 300))
      throw new Error(`JSON parse failed: ${parseErr.message}`)
    }

    await client.from('ai_jobs').update({
      status:        'complete',
      progress:      100,
      completed_at:  new Date().toISOString(),
      model_used:    result.model,
      tokens_used:   result.inputTokens + result.outputTokens,
      cost_estimate: result.costUsd,
      result_json:   { protocol, arsenalResources: [], spiritData: spiritData || null },
    }).eq('id', jobId)

    console.log(`[deliveranceProtocol] ${jobId} complete for "${primaryName}"`)

  } catch (e: any) {
    const errMsg = (e.message || String(e)).slice(0, 2000)
    console.error(`[deliveranceProtocol] ${jobId} failed:`, errMsg)

    await client.from('ai_jobs').update({
      status:        'failed',
      error_message: errMsg,
      completed_at:  new Date().toISOString(),
    }).eq('id', jobId).then(undefined, () => {})
  }
}
