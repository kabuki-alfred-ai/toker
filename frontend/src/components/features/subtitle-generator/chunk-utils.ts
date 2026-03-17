export interface WordSegment {
  word: string
  punctuated_word: string
  start: number
  end: number
}

export interface Chunk {
  words: WordSegment[]
  startIndex: number
}

function isSentenceEnd(w: WordSegment): boolean {
  return /[.!?]$/.test(w.punctuated_word)
}

function isClauseEnd(w: WordSegment): boolean {
  return /[,;:]$/.test(w.punctuated_word)
}

function gapAfter(segments: WordSegment[], i: number): number {
  if (i + 1 >= segments.length) return 999
  return segments[i + 1].start - segments[i].end
}

/**
 * Splits word segments into display chunks respecting:
 * 1. Sentence-ending punctuation (. ! ?) → hard break
 * 2. Timing silence > 0.35s → natural pause break
 * 3. Clause punctuation (, ; :) when chunk ≥ 3 words → soft break
 * 4. Hard limit: 7 words / 42 chars max
 */
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

      if (chunk.length >= 3) break

      chunk.push(seg)
      charCount += word.length + 1

      const gap = gapAfter(wordSegments, i)
      i++

      if (isSentenceEnd(seg)) break
      if (gap > 0.35) break
      if (isClauseEnd(seg) && chunk.length >= 3) break
    }

    if (chunk.length > 0) {
      chunks.push({ words: chunk, startIndex })
    }
  }

  return chunks
}

export function getActiveWordIndex(words: WordSegment[], t: number): number {
  for (let i = words.length - 1; i >= 0; i--) {
    if (t >= words[i].start) return i
  }
  return -1
}

export function getVisibleChunk(words: WordSegment[], t: number, chunks: Chunk[]): Chunk | null {
  for (const chunk of chunks) {
    const start = chunk.words[0].start
    const end = chunk.words[chunk.words.length - 1].end
    if (t >= start && t <= end + 0.4) return chunk
  }
  return null
}
