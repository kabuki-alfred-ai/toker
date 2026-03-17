import type { WordSegment } from '../components/types'

export function getActiveWordIndex(wordSegments: WordSegment[], currentTimeSeconds: number): number {
  for (let i = 0; i < wordSegments.length; i++) {
    if (currentTimeSeconds >= wordSegments[i].start && currentTimeSeconds <= wordSegments[i].end) {
      return i
    }
  }
  // Return index of last word that started before current time
  for (let i = wordSegments.length - 1; i >= 0; i--) {
    if (currentTimeSeconds >= wordSegments[i].start) {
      return i
    }
  }
  return -1
}

interface Chunk {
  words: WordSegment[]
  startIndex: number
  endIndex: number
}

/** Returns true if this word ends a natural phrase (sentence-end punctuation) */
function isSentenceEnd(w: WordSegment): boolean {
  return /[.!?]$/.test(w.punctuated_word)
}

/** Returns true if this word ends a clause (softer break) */
function isClauseEnd(w: WordSegment): boolean {
  return /[,;:]$/.test(w.punctuated_word)
}

/** Timing gap to next word in seconds (silent pause = natural break) */
function gapAfter(segments: WordSegment[], i: number): number {
  if (i + 1 >= segments.length) return 999
  return segments[i + 1].start - segments[i].end
}

export function buildChunks(wordSegments: WordSegment[]): Chunk[] {
  const chunks: Chunk[] = []
  let i = 0

  while (i < wordSegments.length) {
    const chunk: WordSegment[] = []
    let charCount = 0
    const startIndex = i

    while (i < wordSegments.length) {
      const seg = wordSegments[i]
      const word = seg.punctuated_word || seg.word

      // Hard limit: 3 words max (short-format style)
      if (chunk.length >= 3) break

      chunk.push(seg)
      charCount += word.length + 1

      const gap = gapAfter(wordSegments, i)
      i++

      // Break after sentence-ending punctuation (. ! ?)
      if (isSentenceEnd(seg)) break

      // Break on silence > 0.35s (natural pause in speech)
      if (gap > 0.35) break

      // Soft break after clause punctuation (, ; :) when chunk has ≥ 3 words
      if (isClauseEnd(seg) && chunk.length >= 3) break
    }

    if (chunk.length > 0) {
      chunks.push({ words: chunk, startIndex, endIndex: startIndex + chunk.length - 1 })
    }
  }

  return chunks
}

export function getVisibleChunk(wordSegments: WordSegment[], currentTimeSeconds: number): { words: WordSegment[]; startIndex: number } | null {
  if (wordSegments.length === 0) return null
  const chunks = buildChunks(wordSegments)
  for (const chunk of chunks) {
    const chunkStart = chunk.words[0].start
    const chunkEnd = chunk.words[chunk.words.length - 1].end
    if (currentTimeSeconds >= chunkStart && currentTimeSeconds <= chunkEnd + 0.5) {
      return { words: chunk.words, startIndex: chunk.startIndex }
    }
  }
  return null
}
