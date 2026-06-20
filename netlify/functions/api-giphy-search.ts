import { requireTier, CORS } from './_shared/access'
import type { GiphyHit } from '../../src/lib/giphy-types'

const ALLOWED_HOSTS = new Set([
  'media.giphy.com', 'media0.giphy.com', 'media1.giphy.com',
  'media2.giphy.com', 'media3.giphy.com', 'media4.giphy.com',
])

function urlHost(u: string): string {
  try { return new URL(u).hostname } catch { return '' }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS,
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=60',
    },
  })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'GET') return json({ error: 'GET required' }, 405)

  const auth = await requireTier(req, 1)
  if (auth instanceof Response) return auth

  const apiKey = process.env.GIPHY_API_KEY
  if (!apiKey) return json({ error: 'GIPHY not configured' }, 503)

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim().slice(0, 100)
  if (!q) return json({ hits: [] })

  const giphyUrl = new URL('https://api.giphy.com/v1/gifs/search')
  giphyUrl.searchParams.set('api_key', apiKey)
  giphyUrl.searchParams.set('q', q)
  giphyUrl.searchParams.set('rating', 'pg-13')
  giphyUrl.searchParams.set('limit', '20')
  giphyUrl.searchParams.set('bundle', 'messaging_non_clips')

  let raw: any
  try {
    const res = await fetch(giphyUrl.toString())
    if (!res.ok) return json({ error: 'GIPHY error' }, 502)
    raw = await res.json()
  } catch {
    return json({ error: 'GIPHY fetch failed' }, 502)
  }

  const hits: GiphyHit[] = (raw.data ?? [])
    .map((item: any): GiphyHit | null => {
      const preview = item.images?.fixed_height_small
      const full    = item.images?.fixed_height
      const previewUrl = (preview?.url as string) || ''
      const fullUrl    = (full?.url    as string) || previewUrl
      if (
        !previewUrl ||
        !fullUrl    ||
        !ALLOWED_HOSTS.has(urlHost(previewUrl)) ||
        !ALLOWED_HOSTS.has(urlHost(fullUrl))
      ) return null
      return {
        id:         String(item.id),
        title:      String(item.title || ''),
        previewUrl,
        fullUrl,
        width:  parseInt(String(full?.width  || preview?.width  || '0'), 10),
        height: parseInt(String(full?.height || preview?.height || '0'), 10),
      }
    })
    .filter((h: GiphyHit | null): h is GiphyHit => h !== null)

  return json({ hits })
}

export const config = { path: '/api/giphy-search' }
