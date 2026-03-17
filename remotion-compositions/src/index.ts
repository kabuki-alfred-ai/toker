import { registerRoot, Composition } from 'remotion'
import React from 'react'
import { SubtitledVideo } from './SubtitledVideo'
import type { SubtitledVideoProps } from './components/types'

const defaultProps: SubtitledVideoProps = {
  videoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  wordSegments: [
    { word: 'Hello', punctuated_word: 'Hello', start: 0, end: 0.5 },
    { word: 'world', punctuated_word: 'world!', start: 0.6, end: 1.2 },
  ],
  preset: 'KARAOKE',
  customization: {
    fontSize: 52,
    color: '#FFFFFF',
    highlightColor: '#FFDD00',
    bgColor: '#000000CC',
    position: 'bottom',
  },
  durationInSeconds: 10,
  fps: 30,
  width: 1080,
  height: 1920,
}

registerRoot(() =>
  React.createElement(Composition, {
    id: 'SubtitledVideo',
    component: SubtitledVideo,
    durationInFrames: defaultProps.durationInSeconds * defaultProps.fps,
    fps: defaultProps.fps,
    width: defaultProps.width,
    height: defaultProps.height,
    defaultProps,
  })
)
