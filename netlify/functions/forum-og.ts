const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const re of patterns) {
    const m = url.match(re)
    if (m) return m[1]
  }
  return null
}

function extractMeta(html: string, property: string): string {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property.replace('og:', '')}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property.replace('og:', '')}["']`, 'i'),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()
  }
  return ''
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return m?.[1]?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim() || ''
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: HEADERS })

  let body: any
  try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS }) }

  const { url: rawUrl } = body
  if (!rawUrl?.trim()) return new Response(JSON.stringify({ error: 'url required' }), { status: 400, headers: HEADERS })

  let parsedUrl: URL
  try {
    parsedUrl = new URL(rawUrl.trim())
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), { status: 400, headers: HEADERS })
  }

  const domain = parsedUrl.hostname.replace('www.', '')

  // YouTube — use known thumbnail pattern, no fetch needed for channel URLs
  const ytId = extractYouTubeId(rawUrl)
  if (ytId) {
    return new Response(JSON.stringify({
      title: '',
      thumbnail: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      description: '',
      url: rawUrl,
      domain,
    }), { status: 200, headers: HEADERS })
  }

  // Fetch page HTML for OG tags
  try {
    const res = await fetch(rawUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WarRoomBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return new Response(JSON.stringify({ title: '', thumbnail: '', description: '', url: rawUrl, domain }), { status: 200, headers: HEADERS })

    const html = await res.text()
    const title = extractMeta(html, 'og:title') || extractTitle(html)
    const thumbnail = extractMeta(html, 'og:image')
    const description = extractMeta(html, 'og:description')

    return new Response(JSON.stringify({ title, thumbnail, description, url: rawUrl, domain }), { status: 200, headers: HEADERS })
  } catch {
    return new Response(JSON.stringify({ title: '', thumbnail: '', description: '', url: rawUrl, domain }), { status: 200, headers: HEADERS })
  }
}

export const config = { path: '/api/forum-og' }
