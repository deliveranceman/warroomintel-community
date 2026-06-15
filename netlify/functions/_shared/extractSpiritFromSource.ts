import { solCall } from './solClient'
import { fillLayer2Prompt, type Layer2ExtractionInput, type Layer2ExtractionOutput } from './prompts/layer2Extraction'

export interface ExtractionResult {
  output: Layer2ExtractionOutput
  meta: {
    model: string
    inputTokens: number
    outputTokens: number
    costUsd: number
    durationMs: number
  }
}

export async function extractSpiritFromSource(
  opts: Layer2ExtractionInput,
  options?: {
    tier?: 'standard' | 'heavy'
    meta?: { userId: string; userTier: string }
  }
): Promise<ExtractionResult> {
  const prompt  = fillLayer2Prompt(opts)
  const started = Date.now()

  const result = await solCall({
    tier:      options?.tier ?? 'standard',
    maxTokens: 8192,
    messages:  [{ role: 'user', content: prompt }],
    meta: {
      userId:   options?.meta?.userId   ?? 'system',
      userTier: options?.meta?.userTier ?? 'admin',
      callType: 'layer2_extraction',
    },
  })

  const durationMs = Date.now() - started

  const cleaned = result.text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  let output: Layer2ExtractionOutput
  try {
    output = JSON.parse(cleaned)
  } catch (e: any) {
    throw new Error(
      `Layer 2 extraction: failed to parse JSON — ${e.message}\n` +
      `First 500 chars: ${cleaned.slice(0, 500)}`
    )
  }

  return {
    output,
    meta: {
      model:        result.model,
      inputTokens:  result.inputTokens,
      outputTokens: result.outputTokens,
      costUsd:      result.costUsd,
      durationMs,
    },
  }
}
