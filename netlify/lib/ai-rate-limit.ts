import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

export type AIFeature =
  | 'ask_dake'
  | 'ai_assistant'
  | 'bible_ask'
  | 'symptom_investigator'
  | 'gateway'
  | 'dream'
  | 'document'
  | 'session_ai'
  | 'assessment'
  | 'warroom_chat'
  | 'deliverance'
  | 'spirit_mapping'

export const AI_FEATURES: AIFeature[] = [
  'ask_dake', 'ai_assistant', 'bible_ask', 'symptom_investigator',
  'gateway', 'dream', 'document', 'session_ai', 'assessment',
  'warroom_chat', 'deliverance', 'spirit_mapping',
]

// Single TOTAL daily AI-call cap per tier, across ALL features combined. -1 = unlimited.
// minister/commandant/admin are unlimited; any caller with verified level >= 4 also bypasses.
export const TIER_DAILY_CAP: Record<string, number> = {
  watchman:          3,
  free:              3,
  soldier:           20,
  charter_soldier:   25,
  commander:         50,
  charter_commander: 60,
  general:           150,
  founding_general:  150,
  minister:          -1,
  commandant:        -1,
  admin:             -1,
}

// Fail-closed default for an unrecognised tier string → most-restrictive free cap.
const DEFAULT_CAP = TIER_DAILY_CAP.watchman

export function tierDailyCap(tier: string): number {
  const cap = TIER_DAILY_CAP[(tier || '').toLowerCase()]
  return cap === undefined ? DEFAULT_CAP : cap
}

export function getLimit(tier: string, _feature: AIFeature): number {
  return tierDailyCap(tier)
}

function sb() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Enforce a single per-tier TOTAL daily cap across all AI features.
 * Verified callers pass `level` (auth.level); level >= 4 (minister/commandant/admin) bypasses.
 * Returns a 429-shaped result on over-limit. Fails OPEN on infra error so a DB
 * hiccup never blocks a paying member — this is cost governance, not security.
 */
export async function checkAndIncrementUsage(
  userId: string,
  tier: string,
  feature: AIFeature,
  level?: number,
): Promise<{ allowed: boolean; remaining: number; limit: number; current: number }> {
  const cap = tierDailyCap(tier)
  const unlimited = cap === -1 || (typeof level === 'number' && level >= 4)
  const client = sb()
  const date = today()

  if (unlimited) {
    // Still record the call for burn-rate accounting; ignore failures.
    await client.rpc('increment_ai_usage', { p_user_id: userId, p_feature: feature, p_usage_date: date }).then(undefined, () => {})
    return { allowed: true, remaining: -1, limit: -1, current: 0 }
  }

  // Sum today's calls across every feature for this user.
  const { data: rows, error } = await client
    .from('ai_usage_daily')
    .select('call_count')
    .eq('user_id', userId)
    .eq('usage_date', date)

  if (error) {
    console.error('[ai-rate-limit] usage read failed — failing open:', error.message)
    return { allowed: true, remaining: cap, limit: cap, current: 0 }
  }

  const current = (rows || []).reduce((sum, r: any) => sum + (r.call_count || 0), 0)

  if (current >= cap) {
    return { allowed: false, remaining: 0, limit: cap, current }
  }

  const { error: incErr } = await client.rpc('increment_ai_usage', {
    p_user_id: userId, p_feature: feature, p_usage_date: date,
  })
  if (incErr) console.error('[ai-rate-limit] increment failed:', incErr.message)

  return { allowed: true, remaining: Math.max(0, cap - current - 1), limit: cap, current: current + 1 }
}

export async function getUsageToday(userId: string): Promise<Record<string, number>> {
  const client = sb()
  const { data } = await client
    .from('ai_usage_daily')
    .select('feature, call_count')
    .eq('user_id', userId)
    .eq('usage_date', today())
  const result: Record<string, number> = {}
  for (const row of data || []) result[row.feature] = row.call_count
  return result
}

export function getUpgradeMessage(tier: string, _feature: AIFeature): string {
  const tiers: Record<string, string> = {
    watchman: 'Soldier', free: 'Soldier',
    soldier: 'Commander', charter_soldier: 'Commander',
    commander: 'General', charter_commander: 'General',
  }
  const nextTier = tiers[(tier || '').toLowerCase()]
  if (!nextTier) return `You have reached your daily AI usage limit.`
  return `Daily AI usage limit reached. Upgrade to ${nextTier} for a higher cap.`
}
