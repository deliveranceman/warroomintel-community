import { verifyToken } from '@clerk/backend'

// Verified server-side auth helper.
// Uses @clerk/backend verifyToken for local cryptographic signature verification —
// accepts the v5 JWT that getToken() produces, no API round-trip, cannot fail-open.
// Step 2 still calls GET /v1/users/{id} to read public_metadata (tier/role) from Clerk.
// @clerk/backend is available as a transitive dep of @clerk/tanstack-start.

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY!

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

// Single source of truth for the server-side tier ladder.
const TIER_ORDER: Record<string, number> = {
  watchman:   0,
  free:       0,
  soldier:    1,
  commander:  2,
  general:    3,
  minister:   4,
  commandant: 5,
}

export function tierLevel(tier?: string | null): number {
  return TIER_ORDER[(tier ?? '').toLowerCase()] ?? 0
}

export interface AuthResult {
  userId:      string
  tier:        string
  role:        string
  level:       number
  isAdmin:     boolean
  displayName: string
}

function unauth(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })
}

function forbidden(): Response {
  return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: CORS })
}

/**
 * Verifies the Bearer token via Clerk REST API — signatures are actually checked.
 * Fails closed on every error path: no fallback to JWT decoding.
 * Matches the exact two-step pattern from netlify/functions/download.ts.
 */
export async function requireAuth(req: Request): Promise<AuthResult | Response> {
  const raw = req.headers.get('authorization') || req.headers.get('Authorization') || ''
  let token = raw.replace(/^Bearer\s+/i, '').trim()

  // Fallback: read __session cookie (present on browser navigate requests that lack a Bearer header)
  if (!token) {
    const cookies = req.headers.get('cookie') || ''
    const m = cookies.match(/(?:^|;\s*)__session=([^;]+)/)
    if (m) token = decodeURIComponent(m[1])
  }

  if (!token) return unauth()

  try {
    // Step 1 — local cryptographic signature verification via @clerk/backend verifyToken
    // Accepts the v5 JWT from getToken(); no API round-trip; fails closed on any error.
    let claims: any
    try {
      claims = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY })
    } catch {
      return unauth()
    }
    const userId = claims.sub as string | undefined
    if (!userId) return unauth()

    // Step 2 — fetch public_metadata from Clerk (never trust claims in token payload)
    const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
    })
    if (!userRes.ok) return unauth()

    const userData = await userRes.json()
    const tier = ((userData.public_metadata?.tier as string) || 'watchman').toLowerCase()
    const role = ((userData.public_metadata?.role as string) || '').toLowerCase()

    // Role-aware level: commandant/minister/admin outrank by role regardless of tier field.
    // 'admin' role maps to minister-level (4) to preserve parity with existing requireAdmin.
    const roleBoost =
      role === 'commandant'            ? 5 :
      role === 'minister' || role === 'admin' ? 4 :
      0
    const level   = Math.max(tierLevel(tier), roleBoost)
    const isAdmin = level >= 4

    const firstName   = ((userData.first_name  as string) || '').trim()
    const lastName    = ((userData.last_name   as string) || '').trim()
    const fullName    = [firstName, lastName].filter(Boolean).join(' ')
    const emailLocal  = ((userData.email_addresses as any[])?.[0]?.email_address as string || '').split('@')[0]
    const displayName = fullName || ((userData.username as string) || '').trim() || emailLocal || ''

    return { userId, tier, role, level, isAdmin, displayName }
  } catch {
    return unauth()
  }
}

/**
 * Guards by minimum tier level.
 * Returns the AuthResult on success, or a 401/403 Response on failure.
 */
export async function requireTier(
  req: Request,
  minLevel: number,
): Promise<AuthResult | Response> {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth
  if (auth.level < minLevel) return forbidden()
  return auth
}

/**
 * Convenience guard: requires minister (4) or higher.
 * Named requireAdmin2 to avoid colliding with the existing _shared/requireAdmin.ts
 * during the migration phase — callers will be switched route-by-route.
 */
export async function requireAdmin2(req: Request): Promise<AuthResult | Response> {
  return requireTier(req, 4)
}
