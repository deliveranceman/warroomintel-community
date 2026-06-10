import { requireAuth } from './_shared/access'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  return new Response(JSON.stringify({ tier: auth.tier, role: auth.role, userId: auth.userId }), { status: 200, headers })
}

export const config = { path: '/api/verify-tier' }
