import React from 'react'
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'
import type { WordSegment, SubtitleCustomization } from '../types'
import { getActiveWordIndex } from '../../utils/timing'

interface KaraokeProps {
  wordSegments: WordSegment[]
  customization: SubtitleCustomization
}

export function Karaoke({ wordSegments, customization }: KaraokeProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const currentTime = frame / fps

  const activeIdx = getActiveWordIndex(wordSegments, currentTime)
  if (activeIdx < 0) return null

  const seg = wordSegments[activeIdx]
  const fs = customization.fontSize

  const wordStartFrame = Math.round(seg.start * fps)
  const springVal = spring({
    frame: frame - wordStartFrame,
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.6 },
  })
  const wordScale = interpolate(springVal, [0, 1], [0.85, 1.0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const wordOpacity = interpolate(frame - wordStartFrame, [0, 4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const positionStyle: React.CSSProperties = {
    top: `${customization.position}%`,
    transform: `translateY(-50%) scale(${wordScale})`,
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 32px',
        opacity: wordOpacity,
        ...positionStyle,
      }}
    >
      <span
        style={{
          fontSize: fs,
          fontWeight: '900',
          fontFamily: '"Arial Black", Arial, sans-serif',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          lineHeight: 1.2,
          textAlign: 'center',
          display: 'inline-block',
          backgroundColor: customization.highlightColor,
          color: '#000000',
          borderRadius: '0.2em',
          padding: `${fs * 0.08}px ${fs * 0.25}px`,
        }}
      >
        {seg.punctuated_word}
      </span>
    </div>
  )
}
