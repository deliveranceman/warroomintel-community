import type { Context } from '@netlify/functions'

export default async (req: Request, _ctx: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  const body = await req.json()
  const { subscription, userId } = body

  console.log('Push subscription for user:', userId, subscription.endpoint)

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export const config = { path: '/api/push-subscribe' }
