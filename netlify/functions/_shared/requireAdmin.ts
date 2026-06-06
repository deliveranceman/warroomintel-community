import { decodeJwt } from './clerkAuth'

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

export async function requireAdmin(req: Request): Promise<{ userId: string } | Response> {
  const raw   = req.headers.get('authorization') || req.headers.get('Authorization') || ''
  const token = raw.replace(/^Bearer\s+/i, '').trim()

  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })

  const decoded = decodeJwt(token)
  if (!decoded?.sub) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: CORS })

  const meta    = decoded?.publicMetadata || decoded?.public_metadata || {}
  const isAdmin =
    meta.role === 'admin' || meta.role === 'minister' || meta.role === 'commandant' ||
    meta.tier === 'minister' || meta.tier === 'commandant'

  if (!isAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: CORS })

  return { userId: decoded.sub as string }
}
