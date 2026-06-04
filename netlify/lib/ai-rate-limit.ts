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

// Daily call limits per tier per feature. -1 = unlimited.
export const DAILY_LIMITS: Record<string, Record<AIFeature, number>> = {
  watchman: {
    ask_dake:             5,
    ai_assistant:         5,
    bible_ask:            5,
    symptom_investigator: 0,
    gateway:              0,
    dream:                0,
    document:             0,
    session_ai:           0,
    assessment:           1,
  },
  free: {
    ask_dake:             5,
    ai_assistant:         5,
    bible_ask:            5,
    symptom_investigator: 0,
    gateway:              0,
    dream:                0,
    document:             0,
    session_ai:           0,
    assessment:           1,
  },
  soldier: {
    ask_dake:             20,
    ai_assistant:         20,
    bible_ask:            20,
    symptom_investigator: 0,
    gateway:              10,
    dream:                10,
    document:             10,
    session_ai:           0,
    assessment:           5,
  },
  charter_soldier: {
    ask_dake:             20,
    ai_assistant:         20,
    bible_ask:            20,
    symptom_investigator: 0,
    gateway:              10,
    dream:                10,
    document:             10,
    session_ai:           0,
    assessment:           5,
  },
  commander: {
    ask_dake:             50,
    ai_assistant:         50,
    bible_ask:            50,
    symptom_investigator: 30,
    gateway:              30,
    dream:                30,
    document:             25,
    session_ai:           15,
    assessment:           15,
  },
  charter_commander: {
    ask_dake:             50,
    ai_assistant:         50,
    bible_ask:            50,
    symptom_investigator: 30,
    gateway:              30,
    dream:                30,
    document:             25,
    session_ai:           15,
    assessment:           15,
  },
  general: {
    ask_dake:             -1,
    ai_assistant:         -1,
    bible_ask:            -1,
    symptom_investigator: -1,
    gateway:              -1,
    dream:                -1,
    document:             -1,
    session_ai:           50,
    assessment:           -1,
  },
  founding_general: {
    ask_dake:             -1,
    ai_assistant:         -1,
    bible_ask:            -1,
    symptom_investigator: -1,
    gateway:              -1,
    dream:                -1,
    document:             -1,
    session_ai:           50,
    assessment:           -1,
  },
  minister: {
    ask_dake:             -1,
    ai_assistant:         -1,
    bible_ask:            -1,
    symptom_investigator: -1,
    gateway:              -1,
    dream:                -1,
    document:             -1,
    session_ai:           -1,
    assessment:           -1,
  },
  admin: {
    ask_dake:             -1,
    ai_assistant:         -1,
    bible_ask:            -1,
    symptom_investigator: -1,
    gateway:              -1,
    dream:                -1,
    document:             -1,
    session_ai:           -1,
    assessment:           -1,
  },
}

// BETA: unlimited — kept for future restoration
export function getLimit(_tier: string, _feature: AIFeature): number {
  return -1
}

function sb() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function checkAndIncrementUsage(
  _userId: string,
  _tier: string,
  _feature: AIFeature,
): Promise<{ allowed: boolean; remaining: number; limit: number; current: number }> {
  // BETA: rate limits disabled — all calls pass through
  return { allowed: true, remaining: 999, limit: 999, current: 0 }
}

export async function getUsageToday(userId: string): Promise<Record<string, number>> {
  const client = sb()
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await client
    .from('ai_usage_daily')
    .select('feature, call_count')
    .eq('user_id', userId)
    .eq('usage_date', today)
  const result: Record<string, number> = {}
  for (const row of data || []) result[row.feature] = row.call_count
  return result
}

const FEATURE_LABELS: Record<AIFeature, string> = {
  ask_dake:             'Ask Dake',
  ai_assistant:         'AI Assistant',
  bible_ask:            'Bible Study AI',
  symptom_investigator: 'Symptom Investigator',
  gateway:              'Gateway Investigator',
  dream:                'Dream Interpreter',
  document:             'Document Creator',
  session_ai:           'Session AI',
  assessment:           'Assessment Strategy',
}

export function getUpgradeMessage(tier: string, feature: AIFeature): string {
  const tiers: Record<string, string> = {
    watchman: 'Soldier', free: 'Soldier',
    soldier: 'Commander', charter_soldier: 'Commander',
    commander: 'General', charter_commander: 'General',
  }
  const nextTier = tiers[tier]
  const label = FEATURE_LABELS[feature] || feature
  if (!nextTier) return `You have reached your daily limit for ${label}.`
  return `Daily limit reached for ${label}. Upgrade to ${nextTier} for more.`
}
