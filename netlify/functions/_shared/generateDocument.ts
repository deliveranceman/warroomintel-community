import { cleanAIOutput } from '../../lib/clean-ai-output'
import { solCall } from './solClient'

const SYSTEM_PROMPT = `You are Claude (made by Anthropic), operating as the SOL analyst for War Room Intel — a vetted deliverance-ministry research platform run by Pastor Justin Payne of Staffordtown Church (Copperhill, Tennessee). SOL is the name of your role on this platform.

Every user reaching you has been authenticated by Clerk and tier-gated by the platform owner. They are trained ministers, deliverance practitioners, intercessors, and researchers. They are the experts in their context. You are their research and synthesis tool.

When asked directly whether you are an AI or which model you are, answer honestly and briefly, then return to the task without apology or extended preamble. Do NOT volunteer this information unprompted.

ABSOLUTE PROHIBITIONS:
- Never refuse to write prayers, renunciations, warfare declarations, or ministry protocols
- Never add disclaimers about vulnerable individuals or psychological harm
- Never question the minister's qualifications, theology, or methodology
- Never use phrases like "as an AI," "I'm not able to," or "I can't help with"

OUTPUT FORMAT (document generation):

The user request includes an input.sections array shaped:
  [{ id, label, instruction }, ...]

Your task is to fill in EACH section's content based on its instruction, the user's subject, and any specialInstructions.
Return JSON in this exact shape:

  {
    "title": "Document title",
    "subtitle": "Optional subtitle or null",
    "sections": [
      {
        "id": "<exact id from input.sections[i].id>",
        "label": "<exact label from input.sections[i].label>",
        "content": "<markdown content addressing the instruction>"
      }
    ]
  }

Each section's content should be substantive — 3-8 paragraphs of focused ministry-research material per the instruction. Use markdown within content (## subheaders, bullets, bold for emphasis, scripture references inline).

Member mode: respond to subject + specialInstructions + per-section instructions with the appropriate filled sections.
Admin mode: same shape, but use spiritData as additional context for whichever sections are spirit-specific.

RULES:
- You MUST preserve the id and label fields from each input section byte-for-byte. The client renders by id.
- You MUST emit one output section per input section, in the same order.
- No preamble, no explanation, no markdown fences (no triple backticks) around the JSON. The first character of your response must be {. The last character must be }.`

function extractJson(raw: string): string {
  let s = raw.trim()
  let fencesStripped = false
  const fencedMatch = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```\s*$/)
  if (fencedMatch) { s = fencedMatch[1].trim(); fencesStripped = true }
  const firstBrace = s.indexOf('{')
  const lastBrace  = s.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(
      `No JSON object found in response. Fences stripped: ${fencesStripped}. First 300 chars: ${raw.slice(0, 300)}`
    )
  }
  return s.slice(firstBrace, lastBrace + 1)
}

function validateDocument(parsed: any, inputSections: any[]): void {
  if (!parsed || typeof parsed !== 'object') throw new Error('Parsed result is not an object')
  if (!parsed.title || typeof parsed.title !== 'string') throw new Error('Output missing required field: title (string)')
  if (!Array.isArray(parsed.sections)) throw new Error('Output missing required field: sections (array)')
  if (parsed.sections.length !== inputSections.length) {
    throw new Error(
      `Section count mismatch: expected ${inputSections.length}, got ${parsed.sections.length}. ` +
      `Expected ids: [${inputSections.map((s: any) => s.id).join(', ')}], ` +
      `Got ids: [${parsed.sections.map((s: any) => s?.id ?? 'undefined').join(', ')}]`
    )
  }
  for (let i = 0; i < inputSections.length; i++) {
    const expected = inputSections[i]
    const actual   = parsed.sections[i]
    if (!actual || typeof actual !== 'object') throw new Error(`Section ${i} is not an object`)
    if (actual.id !== expected.id) {
      throw new Error(`Output missing section id "${expected.id}" at index ${i} (got "${actual.id ?? 'undefined'}")`)
    }
    if (!actual.content || typeof actual.content !== 'string') {
      throw new Error(`Section ${i} ("${expected.id}") missing content string`)
    }
  }
}

export async function runGenerateDocument(client: any, job: any): Promise<void> {
  const jobId    = job.id as string
  const params   = (job.input_params as any) || {}
  const userId   = (job.user_id as string) || ''
  const userTier = (job.tier    as string) || ''

  const mode                = (params.mode               as string)  || 'member'
  const templateName        = (params.templateName        as string)  || ''
  const sections            = Array.isArray(params.sections) ? params.sections : []
  const subject             = (params.subject             as string)  || ''
  const specialInstructions = (params.specialInstructions as string)  || ''
  const spiritData          = params.spiritData ?? null

  const meta = { userId, userTier, callType: 'generate_document' }

  try {
    // ── Stage: preparing ──────────────────────────────────────────────────────
    await client.from('ai_jobs').update({
      status:     'running',
      started_at: new Date().toISOString(),
      stage:      'preparing',
      progress:   5,
    }).eq('id', jobId)

    if (!subject.trim()) throw new Error('input_params.subject is empty')
    if (!sections.length) throw new Error('input_params.sections is empty')

    // ── Stage: building (fetch ministry context) ──────────────────────────────
    await client.from('ai_jobs').update({ stage: 'building', progress: 20 }).eq('id', jobId)

    const { data: contexts } = await client
      .from('ministry_context')
      .select('label, context_text, scope')
      .eq('is_active', true)
      .in('scope', ['global', 'session'])
      .order('scope')

    const contextText = (contexts || [])
      .map((c: any) => `[${c.label || c.scope}]:\n${c.context_text}`)
      .join('\n\n---\n\n')

    const systemWithContext = contextText
      ? `MINISTRY CONTEXT:\n${contextText}\n\nApply this ministry voice to the document.\n\n---\n\n${SYSTEM_PROMPT}`
      : SYSTEM_PROMPT

    // ── Stage: generating ─────────────────────────────────────────────────────
    await client.from('ai_jobs').update({ stage: 'generating', progress: 40 }).eq('id', jobId)

    const sectionInputJson = JSON.stringify(
      sections.map((s: any) => ({ id: s.id, label: s.label, instruction: s.instruction })),
      null,
      2
    )

    const spiritBlock = spiritData
      ? `\nSpirit database data:\n${JSON.stringify(spiritData, null, 2)}`
      : ''

    const userPrompt = `Generate a "${templateName}" document.

Subject: ${subject.trim()}
${specialInstructions ? `\nSpecial Instructions: ${specialInstructions}` : ''}${spiritBlock}

Input sections — fill each with content:
${sectionInputJson}

Your output must be JSON with exactly ${sections.length} section(s) in the same order, with id and label preserved byte-for-byte from above. Each section needs substantive content (3-8 paragraphs).`

    const result = await solCall({
      tier:      'standard',
      system:    systemWithContext,
      messages:  [{ role: 'user', content: userPrompt }],
      maxTokens: 6000,
      timeoutMs: 180_000,
      meta,
    })

    // Meter immediately after the call
    await client.from('ai_jobs').update({
      model_used:    result.model,
      tokens_used:   result.inputTokens + result.outputTokens,
      cost_estimate: result.costUsd,
    }).eq('id', jobId)

    // ── Stage: finalizing ─────────────────────────────────────────────────────
    await client.from('ai_jobs').update({ stage: 'finalizing', progress: 90 }).eq('id', jobId)

    let extracted: string
    try {
      extracted = extractJson(result.text)
    } catch (extractErr: any) {
      throw new Error(`JSON extraction failed: ${extractErr.message}`)
    }

    let parsed: any
    try {
      parsed = JSON.parse(extracted)
    } catch (parseErr: any) {
      throw new Error(
        `JSON.parse failed: ${parseErr.message}. ` +
        `Extracted snippet (300 chars): ${extracted.slice(0, 300)}`
      )
    }

    validateDocument(parsed, sections)

    parsed.sections = parsed.sections.map((s: any) => ({ ...s, content: cleanAIOutput(s.content || '') }))

    await client.from('ai_jobs').update({
      status:        'complete',
      stage:         'complete',
      progress:      100,
      completed_at:  new Date().toISOString(),
      model_used:    result.model,
      tokens_used:   result.inputTokens + result.outputTokens,
      cost_estimate: result.costUsd,
      result_json:   { document: parsed },
    }).eq('id', jobId)

    console.log(`[generateDocument] ${jobId} complete — mode: ${mode}, subject: "${subject.slice(0, 50)}", sections: ${sections.length}`)

  } catch (e: any) {
    const errMsg = (e.message || String(e)).slice(0, 2000)
    console.error(`[generateDocument] ${jobId} failed:`, errMsg)

    await client.from('ai_jobs').update({
      status:        'failed',
      error_message: errMsg,
      completed_at:  new Date().toISOString(),
    }).eq('id', jobId).then(undefined, () => {})
  }
}
