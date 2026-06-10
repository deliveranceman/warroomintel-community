// Single source of truth for SOL model selection by member tier.
// Free/Watchman callers get the cheaper Haiku; paying tiers get Sonnet.
export const SOL_SONNET = 'claude-sonnet-4-5'
export const SOL_HAIKU = 'claude-haiku-4-5'

const FREE_TIERS = new Set(['', 'free', 'watchman'])

export function pickSolModel(tier: string | undefined | null): string {
  return FREE_TIERS.has((tier || '').toLowerCase()) ? SOL_HAIKU : SOL_SONNET
}
