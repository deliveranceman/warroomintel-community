import type { GiphyHit } from './giphy-types'

export function buildGifAttachment(hit: GiphyHit) {
  return {
    type: 'giphy' as const,
    asset_url: hit.fullUrl,
    thumb_url: hit.previewUrl,
    title: hit.title,
    custom: { giphy_id: hit.id, gif_width: hit.width, gif_height: hit.height },
  }
}
