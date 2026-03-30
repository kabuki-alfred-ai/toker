import React from 'react'
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'
import { AnimatedEmoji } from '@remotion/animated-emoji'
import type { EmojiName } from '@remotion/animated-emoji'
import type { WordSegment, EmojiEvent } from './types'
import { generateEmojiEvents } from '../utils/emoji-mapper'
import { googleFontsCDNSrc } from '../utils/emoji-cdn'

interface EmojiOverlayProps {
  wordSegments: WordSegment[]
  position: number // subtitle vertical position 0-100
  emojiEvents?: EmojiEvent[] | null // pre-computed by Gemini; falls back to keyword mapper
}

export function EmojiOverlay({ wordSegments, position, emojiEvents: precomputedEvents }: EmojiOverlayProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const currentTime = frame / fps

  const events = React.useMemo(
    () => (precomputedEvents && precomputedEvents.length > 0)
      ? precomputedEvents
      : generateEmojiEvents(wordSegments),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const activeEvent = events.find(
    (e) => currentTime >= e.startTime && currentTime < e.endTime,
  )
  if (!activeEvent) return null

  const startFrame = Math.round(activeEvent.startTime * fps)
  const endFrame = Math.round(activeEvent.endTime * fps)

  // Pop-in spring
  const springVal = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 12, stiffness: 260, mass: 0.5 },
  })
  const scale = interpolate(springVal, [0, 1], [0.1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Fade out near end
  const opacity = interpolate(frame, [endFrame - 8, endFrame], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Place the emoji above the subtitle
  const emojiTop = Math.max(2, position - 14)

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: `${emojiTop}%`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      <AnimatedEmoji
        emoji={activeEvent.emoji as EmojiName}
        scale="0.5"
        calculateSrc={googleFontsCDNSrc}
        style={{ width: 120, height: 120 }}
      />
    </div>
  )
}
