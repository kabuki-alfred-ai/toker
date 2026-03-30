import React from 'react'
import { AbsoluteFill, Video, useVideoConfig } from 'remotion'
import { SubtitleOverlay } from './components/SubtitleOverlay'
import { EmojiOverlay } from './components/EmojiOverlay'
import type { SubtitledVideoProps } from './components/types'

export function SubtitledVideo({ videoSrc, wordSegments, emojiEvents, preset, customization }: SubtitledVideoProps) {
  const { width, height } = useVideoConfig()
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Video
        src={videoSrc}
        style={{ width, height, objectFit: 'contain' }}
      />
      <SubtitleOverlay
        wordSegments={wordSegments}
        preset={preset}
        customization={customization}
      />
      {customization.animatedEmojis && (
        <EmojiOverlay
          wordSegments={wordSegments}
          position={customization.position}
          emojiEvents={emojiEvents}
        />
      )}
    </AbsoluteFill>
  )
}
