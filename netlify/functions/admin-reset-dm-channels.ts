import type { Context } from '@netlify/functions'
import { StreamClient } from '@stream-io/node-sdk'

export default async (req: Request, _context: Context) => {
  if (req.headers.get('x-admin-secret') !== process.env.ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const apiKey    = process.env.VITE_STREAM_API_KEY!
  const apiSecret = process.env.STREAM_API_SECRET!

  if (!apiKey || !apiSecret) {
    return new Response(JSON.stringify({ error: 'Stream not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const KEEP = new Set(['war-room-general', 'prayer-wall-requests'])

  try {
    const client = new StreamClient(apiKey, apiSecret)

    const { channels } = await client.queryChannels(
      { type: 'messaging' },
      {},
      { limit: 30 },
    )

    const toDelete = channels.filter((ch: any) => {
      const id = ch.id || ch.channel?.id
      return id && !KEEP.has(id)
    })

    const deletedIds: string[] = []
    for (const ch of toDelete) {
      const id = ch.id || ch.channel?.id
      try {
        await client.chat.channel('messaging', id).delete({ hard_delete: true })
        deletedIds.push(id)
      } catch (err: any) {
        console.error(`Failed to delete channel ${id}:`, err.message)
      }
    }

    return new Response(
      JSON.stringify({ deleted: deletedIds.length, ids: deletedIds }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    console.error('admin-reset-dm-channels error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Stream error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config = { path: '/api/admin-reset-dm-channels' }
