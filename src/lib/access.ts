const TIER_ORDER: Record<string, number> = {
  watchman: 0, free: 0,
  charter_soldier: 1, soldier: 1,
  charter_commander: 2, commander: 2,
  founding_general: 3, general: 3,
  minister: 4,
  commandant: 5,
}

const ROLE_BOOST: Record<string, number> = {
  commandant: 5,
  minister: 4,
  admin: 4,
}

/** Returns the effective access level for a user, taking the higher of their tier and role. */
export function getAccessLevel({ tier, role }: { tier?: string | null; role?: string | null }): number {
  const tierLvl = TIER_ORDER[(tier ?? '').toLowerCase()] ?? 0
  const roleLvl = ROLE_BOOST[(role ?? '').toLowerCase()] ?? 0
  return Math.max(tierLvl, roleLvl)
}
