import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

// USD per token. Anthropic list prices per 1M tokens ÷ 1e6. Single source of truth.
type Rate = { input: number; output: number }
const MODEL_RATES: Record<string, Rate> = {
  'claude-sonnet-4-5':         { input: 3 / 1e6, output: 15 / 1e6 },
  'claude-haiku-4-5':          { input: 1 / 1e6, output: 5 / 1e6 },
  'claude-haiku-4-5-20251001': { input: 1 / 1e6, output: 5 / 1e6 },
}

// Unknown model → assume the most expensive (sonnet) so we never undercount spend.
const DEFAULT_RATE: Rate = MODEL_RATES['claude-sonnet-4-5']

// Flat per-query cost for an OpenAI text-embedding-3-small lookup (tiny, approximated).
export const EMBEDDING_COST_USD = 0.000002

export function costUsd(model: string | null | undefined, inputTokens = 0, outputTokens = 0): number {
  const rate = (model && MODEL_RATES[model]) || DEFAULT_RATE
  return inputTokens * rate.input + outputTokens * rate.output
}

/**
 * Fire-and-forget per-call usage record. Computes cost_usd from model + tokens
 * and writes a row to ai_usage_log via the service-role client. Never throws —
 * logging must never break a member-facing response.
 * (Requires the ai_usage_log_cost migration: user_id / tier / cost_usd columns.)
 */
export function logAiUsage(args: {
  userId: string
  tier?: string | null
  callType: string
  model?: string | null
  inputTokens?: number
  outputTokens?: number
  spiritName?: string | null
}): void {
  if (!supabaseUrl || !supabaseServiceKey) return
  const cost = costUsd(args.model, args.inputTokens || 0, args.outputTokens || 0)
  const client = createClient(supabaseUrl, supabaseServiceKey)
  client.from('ai_usage_log').insert({
    user_id:       args.userId,
    tier:          args.tier || null,
    call_type:     args.callType,
    spirit_name:   args.spiritName || null,
    model:         args.model || null,
    input_tokens:  args.inputTokens || 0,
    output_tokens: args.outputTokens || 0,
    cost_usd:      cost,
  }).then(undefined, (e) => { console.warn('[logAiUsage] insert failed:', e?.message || e) })
}
