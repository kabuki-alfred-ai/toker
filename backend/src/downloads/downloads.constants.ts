export const DOWNLOAD_QUEUE = 'download'
export const DOWNLOAD_JOB = 'process-download'

const YOUTUBE_RE = /^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=[\w-]+|shorts\/[\w-]+)|youtu\.be\/[\w-]+)/
const TIKTOK_RE = /^https?:\/\/(?:www\.|vm\.)?tiktok\.com\//
const REEL_RE = /^https?:\/\/(?:www\.)?instagram\.com\/(?:reel|reels|p)\//

export function detectPlatform(url: string): 'youtube' | 'other' {
  if (YOUTUBE_RE.test(url)) return 'youtube'
  if (TIKTOK_RE.test(url)) return 'other'
  if (REEL_RE.test(url)) return 'other'
  return 'other'
}
