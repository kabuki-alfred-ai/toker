import type { CalculateEmojiSrc } from '@remotion/animated-emoji'
import { getAvailableEmojis } from '@remotion/animated-emoji'

const codepointMap: Record<string, string> = {}
getAvailableEmojis().forEach((e) => {
  codepointMap[e.name] = e.codepoint
})

/**
 * Uses Google Fonts Noto Animated Emoji CDN instead of local static files.
 * This avoids needing to copy emoji videos into the project's public folder.
 */
export const googleFontsCDNSrc: CalculateEmojiSrc = ({ emoji, format }) => {
  const codepoint = codepointMap[emoji]
  if (!codepoint) throw new Error(`No codepoint found for emoji: ${emoji}`)
  const ext = format === 'hevc' ? 'mp4' : 'webm'
  return `https://fonts.gstatic.com/s/e/notoemoji/latest/${codepoint}/512.${ext}`
}
