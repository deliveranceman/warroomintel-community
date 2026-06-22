import type { SupabaseClient } from '@supabase/supabase-js'
import type { BloodlineProfile } from './bloodlineTypes'

export type ProfileAccessResult = {
  profile: BloodlineProfile
  canWrite: boolean  // true if caller is the creator; false if shared
}

export class BloodlineAccessError extends Error {
  constructor(
    public code: 'not_found' | 'forbidden' | 'invalid_input',
    message?: string
  ) {
    super(message ?? code)
    this.name = 'BloodlineAccessError'
  }
}

/**
 * Verifies that userId has access to the given bloodline profile.
 * Returns the profile + write capability.
 *
 * Access rules:
 *   - profile.created_by === userId      -> full access (read + write)
 *   - userId in bloodline_profile_shares -> read-only access
 *   - else                               -> forbidden
 *
 * opts.allowCommandantOverride — pass true ONLY when the CALLER has already
 * verified the requesting user is commandant (level >= 5) via the verified
 * Clerk record. When true, grants canWrite:true on ANY existing profile
 * immediately after the profile-exists check, bypassing creator/share checks.
 * The helper trusts the flag; the endpoint is responsible for only setting it
 * true for verified commandants. This is the single-owner exception that WRI
 * grants commandant across all systems.
 *
 * MANDATORY: every endpoint that reads or writes bloodline_*
 * tables for a specific profile MUST call this helper FIRST.
 * Service role bypasses RLS, so this is the only security gate.
 *
 * Per admin_doc 7eec70d5 (engineering reference, Pattern #6).
 */
export async function requireProfileAccess(
  supabase: SupabaseClient,
  profileId: string,
  userId: string,
  opts?: { allowCommandantOverride?: boolean }
): Promise<ProfileAccessResult> {
  // Basic input validation
  if (!profileId || !userId) {
    throw new BloodlineAccessError('invalid_input', 'profileId and userId required')
  }

  // UUID shape check (Postgres will reject malformed anyway, but fail fast)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId)) {
    throw new BloodlineAccessError('invalid_input', 'profileId malformed')
  }

  // Fetch profile
  const { data: profile, error: profileErr } = await supabase
    .from('bloodline_profiles')
    .select('*')
    .eq('id', profileId)
    .maybeSingle()

  if (profileErr) {
    console.error('[requireProfileAccess] profile fetch error:', profileErr.message)
    throw new BloodlineAccessError('not_found', 'profile lookup failed')
  }
  if (!profile) {
    throw new BloodlineAccessError('not_found', 'profile does not exist')
  }

  // Commandant override: verified commandant gets full write on any profile
  if (opts?.allowCommandantOverride) {
    return { profile: profile as BloodlineProfile, canWrite: true }
  }

  // Creator gets full access
  if (profile.created_by === userId) {
    return { profile: profile as BloodlineProfile, canWrite: true }
  }

  // Check share list
  const { data: share, error: shareErr } = await supabase
    .from('bloodline_profile_shares')
    .select('member_id')
    .eq('profile_id', profileId)
    .eq('member_id', userId)
    .maybeSingle()

  if (shareErr) {
    console.error('[requireProfileAccess] share fetch error:', shareErr.message)
    throw new BloodlineAccessError('forbidden', 'share lookup failed')
  }

  if (share) {
    return { profile: profile as BloodlineProfile, canWrite: false }
  }

  throw new BloodlineAccessError('forbidden', 'not creator and not shared with')
}

/**
 * Helper: convert a BloodlineAccessError into the appropriate
 * HTTP Response. Use in endpoint catch blocks.
 */
export function bloodlineAccessErrorResponse(err: unknown): Response {
  if (err instanceof BloodlineAccessError) {
    const status = err.code === 'not_found' ? 404
                : err.code === 'forbidden' ? 403
                : 400
    return new Response(
      JSON.stringify({ error: err.code, message: err.message }),
      { status, headers: { 'Content-Type': 'application/json' } }
    )
  }
  console.error('[bloodlineAccessErrorResponse] unexpected error:', err)
  return new Response(
    JSON.stringify({ error: 'internal_error' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  )
}
