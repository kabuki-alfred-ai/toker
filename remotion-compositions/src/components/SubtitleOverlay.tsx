import React from 'react'
import type { WordSegment, SubtitlePreset, SubtitleCustomization } from './types'
import { Karaoke } from './presets/Karaoke'
import { BoldShadow } from './presets/BoldShadow'
import { Pill } from './presets/Pill'
import { Outline } from './presets/Outline'

interface SubtitleOverlayProps {
  wordSegments: WordSegment[]
  preset: SubtitlePreset
  customization: SubtitleCustomization
}

export function SubtitleOverlay({ wordSegments, preset, customization }: SubtitleOverlayProps) {
  switch (preset) {
    case 'KARAOKE': return <Karaoke wordSegments={wordSegments} customization={customization} />
    case 'BOLD_SHADOW': return <BoldShadow wordSegments={wordSegments} customization={customization} />
    case 'PILL': return <Pill wordSegments={wordSegments} customization={customization} />
    case 'OUTLINE': return <Outline wordSegments={wordSegments} customization={customization} />
    default: return null
  }
}
