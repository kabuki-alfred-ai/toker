export interface WordSegment {
  word: string
  punctuated_word: string
  start: number
  end: number
}

export type SubtitlePreset = 'KARAOKE' | 'BOLD_SHADOW' | 'PILL' | 'OUTLINE'

export interface SubtitleCustomization {
  fontSize: number
  color: string
  highlightColor: string
  bgColor: string
  position: number  // 0 = top, 100 = bottom (percentage of video height)
}

export interface SubtitledVideoProps {
  videoSrc: string
  wordSegments: WordSegment[]
  preset: SubtitlePreset
  customization: SubtitleCustomization
  durationInSeconds: number
  fps: number
  width: number
  height: number
}
