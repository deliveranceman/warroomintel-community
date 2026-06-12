export const TIER_LEVEL: Record<string, number> = {
  watchman: 0, free: 0, soldier: 1, commander: 2, general: 3, minister: 4, commandant: 5,
}

export function memberLevel(m: { tier?: string; role?: string }): number {
  const tier = String(m.tier || '').toLowerCase().trim()
  const role = String(m.role || '').toLowerCase().trim()
  const roleBoost = role === 'commandant' ? 5 : (role === 'minister' || role === 'admin') ? 4 : 0
  return Math.max(TIER_LEVEL[tier] ?? 0, roleBoost)
}
