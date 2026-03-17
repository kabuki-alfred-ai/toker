'use client'

import { useRef, useState, useEffect } from 'react'
import { getActiveWordIndex, type WordSegment } from './chunk-utils'

type Preset = 'KARAOKE' | 'BOLD_SHADOW' | 'PILL' | 'OUTLINE'

interface Customization {
  fontSize: number
  color: string
  highlightColor: string
  bgColor: string
  position: number  // 0 = top, 100 = bottom
}

interface SubtitlePreviewProps {
  videoSrc: string
  wordSegments: WordSegment[]
  preset: Preset
  customization: Customization
}


function SubtitleWord({
  seg,
  preset,
  customization,
  scaledFontSize,
}: {
  seg: WordSegment
  preset: Preset
  customization: Customization
  scaledFontSize: number
}) {
  const [animStyle, setAnimStyle] = useState<React.CSSProperties>({
    opacity: 1,
    transform: 'translateY(-50%) scale(1)',
    transition: 'none',
  })

  useEffect(() => {
    // Snap to initial state (no transition)
    setAnimStyle({ opacity: 0.6, transform: 'translateY(-50%) scale(0.82)', transition: 'none' })
    // Double rAF ensures browser paints the initial state before we start the transition
    const r1 = requestAnimationFrame(() => {
      const r2 = requestAnimationFrame(() => {
        setAnimStyle({
          opacity: 1,
          transform: 'translateY(-50%) scale(1)',
          transition: 'opacity 0.08s ease-out, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
        })
      })
      return () => cancelAnimationFrame(r2)
    })
    return () => cancelAnimationFrame(r1)
  }, [seg])

  const fs = scaledFontSize

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: '5%',
    right: '5%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    top: `${customization.position}%`,
    ...animStyle,
  }

  const baseStyle: React.CSSProperties = {
    fontSize: fs,
    fontWeight: '900',
    fontFamily: '"Arial Black", Arial, sans-serif',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    lineHeight: 1.2,
    textAlign: 'center',
    display: 'inline-block',
    maxWidth: '100%',
  }

  if (preset === 'KARAOKE') {
    return (
      <div style={containerStyle}>
        <span style={{ ...baseStyle, backgroundColor: customization.highlightColor, color: '#000000', borderRadius: '0.2em', padding: `${fs * 0.08}px ${fs * 0.25}px` }}>
          {seg.punctuated_word}
        </span>
      </div>
    )
  }

  if (preset === 'BOLD_SHADOW') {
    return (
      <div style={containerStyle}>
        <span style={{ ...baseStyle, color: customization.highlightColor, textShadow: '3px 3px 6px rgba(0,0,0,0.9), -1px -1px 0 rgba(0,0,0,0.6)' }}>
          {seg.punctuated_word}
        </span>
      </div>
    )
  }

  if (preset === 'PILL') {
    return (
      <div style={containerStyle}>
        <span style={{ ...baseStyle, backgroundColor: customization.highlightColor, color: '#000000', borderRadius: '999px', padding: `${Math.round(fs * 0.1)}px ${Math.round(fs * 0.35)}px` }}>
          {seg.punctuated_word}
        </span>
      </div>
    )
  }

  // OUTLINE
  return (
    <div style={containerStyle}>
      <span style={{ ...baseStyle, color: customization.highlightColor, WebkitTextStroke: `2px ${customization.bgColor}`, textShadow: `-2px -2px 0 ${customization.bgColor}, 2px -2px 0 ${customization.bgColor}, -2px 2px 0 ${customization.bgColor}, 2px 2px 0 ${customization.bgColor}` }}>
        {seg.punctuated_word}
      </span>
    </div>
  )
}

export function SubtitlePreview({ videoSrc, wordSegments, preset, customization }: SubtitlePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [containerSize, setContainerSize] = useState({ width: 280, height: 498 })
  const [videoNaturalSize, setVideoNaturalSize] = useState<{ width: number; height: number } | null>(null)
  const [aspectRatio, setAspectRatio] = useState<string>('9/16')

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setContainerSize({ width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Detect video dimensions as soon as possible via direct event listeners
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const update = () => {
      const w = video.videoWidth
      const h = video.videoHeight
      if (w > 0 && h > 0) {
        setVideoNaturalSize({ width: w, height: h })
        setAspectRatio(`${w}/${h}`)
      }
    }

    video.addEventListener('loadedmetadata', update)
    video.addEventListener('canplay', update)
    // Already loaded (e.g. cached)
    if (video.readyState >= 1) update()

    return () => {
      video.removeEventListener('loadedmetadata', update)
      video.removeEventListener('canplay', update)
    }
  }, [videoSrc])

  // Use rAF instead of onTimeUpdate for ~60fps subtitle sync
  useEffect(() => {
    let rafId: number
    const tick = () => {
      if (videoRef.current) setCurrentTime(videoRef.current.currentTime)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  const activeIndex = getActiveWordIndex(wordSegments, currentTime)
  const activeSeg = activeIndex >= 0 ? wordSegments[activeIndex] : null

  // Scale font relative to the container width (which now matches the video aspect ratio)
  const scaledFontSize = Math.max(10, Math.round(customization.fontSize * (containerSize.width / 1080)))

  // Cap width so the video never exceeds maxHeight=500px while staying within its parent
  const maxHeightPx = 500
  const containerWidth = videoNaturalSize
    ? `min(100%, ${Math.round(maxHeightPx * videoNaturalSize.width / videoNaturalSize.height)}px)`
    : '100%'

  return (
    <div className="w-full flex justify-center">
      <div
        ref={containerRef}
        className="relative bg-black rounded-xl overflow-hidden"
        style={{ aspectRatio, maxHeight: `${maxHeightPx}px`, width: containerWidth }}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          controls
          className="w-full h-full object-fill"
          crossOrigin="anonymous"
        />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {activeSeg && (
            <SubtitleWord
              seg={activeSeg}
              preset={preset}
              customization={customization}
              scaledFontSize={scaledFontSize}
            />
          )}
        </div>
      </div>
    </div>
  )
}
