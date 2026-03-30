import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Job } from 'bullmq'
import execa from 'execa'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { PrismaService } from '../common/prisma/prisma.service'
import { StorageService } from '../common/storage/storage.service'
import { SUBTITLE_GENERATOR_QUEUE } from './subtitle-generator.constants'

export interface SubtitleGenerationJobData {
  generationId: string
  videoUrl: string
  userId: string
  jobType: 'TRANSCRIBE' | 'RENDER'
  preset?: string
  customization?: {
    fontSize: number
    color: string
    highlightColor: string
    bgColor: string
    position: string
  }
}

interface WordSegment {
  word: string
  punctuated_word: string
  start: number
  end: number
}

interface EmojiEvent {
  emoji: string
  startTime: number
  endTime: number
}

const AVAILABLE_EMOJIS = `fire: excitement, energy, hype, amazing
mind-blown: shock, disbelief, revelation, WTF, impossible
red-heart: love, affection, romance, deep care
sparkling-heart: beauty, cute, aesthetic, wonderful
joy: funny, humor, laugh, comedy
rofl: hilarious, LMAO, dying of laughter
party-popper: win, success, celebration, achievement, congratulations
birthday-cake: birthday, anniversary
loudly-crying: sadness, grief, heartbreak, tears, pain
money-with-wings: money, wealth, earnings, financial, business
thumbs-up: approval, perfect, correct, agreement, great
clap: applause, respect, impressive, well done
100: facts, truth, no cap, accurate, real
eyes: attention, look, watch, reveal, notice
muscle: strength, power, workout, hustle, grind, motivation
sparkles: magic, shine, extraordinary, special
rocket: fast growth, launch, viral, trending up, scaling
light-bulb: idea, tip, hack, insight, secret, discovery
sunglasses-face: cool, swag, confident, boss, chill
folded-hands: thanks, gratitude, pray, blessed
angry: anger, frustration, rage, unfair, hate
screaming: fear, horror, shock, terror
glowing-star: best, top, GOAT, legend, award
thinking-face: reflection, doubt, question, analysis, hmm
graduation-cap: learning, education, knowledge, course, tutorial
musical-notes: music, song, rhythm, beat
star-struck: wow, celebrity, amazed, blown away
wave: greeting, hello, goodbye, welcome
nerd-face: genius, smart, strategy, calculated
sleep: tired, exhausted, bored, rest
sleepy: drowsy, slightly tired
collision: explosion, boom, burst
rainbow: hope, diversity, positivity
rose: romance, flowers, beauty, nature`

@Processor(SUBTITLE_GENERATOR_QUEUE)
export class SubtitleGeneratorProcessor extends WorkerHost {
  private readonly logger = new Logger(SubtitleGeneratorProcessor.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
  ) {
    super()
  }

  async process(job: Job<SubtitleGenerationJobData>): Promise<void> {
    const { generationId, jobType } = job.data
    if (jobType === 'RENDER') {
      return this.processRender(job)
    }
    return this.processTranscribe(job)
  }

  // ── Phase A: Download + Transcribe ──────────────────────────────────────────

  private async processTranscribe(job: Job<SubtitleGenerationJobData>): Promise<void> {
    const { generationId, videoUrl, userId } = job.data
    this.logger.log(`Transcribing ${generationId}`)

    const tmpDir = join(tmpdir(), `subtitle-gen-${generationId}`)
    await mkdir(tmpDir, { recursive: true })

    try {
      await job.updateProgress(0)
      const videoPath = join(tmpDir, 'input.mp4')

      // Check if file was already uploaded directly (skip yt-dlp)
      const record = await this.prisma.subtitleGeneration.findUnique({ where: { id: generationId } })
      const alreadyUploaded = !!record?.inputStorageKey

      if (alreadyUploaded) {
        this.logger.log(`File already uploaded for ${generationId}, downloading from storage...`)
        const presignedUrl = await this.storage.getPresignedUrl(record!.inputStorageKey!, 3600)
        const response = await fetch(presignedUrl)
        if (!response.ok) throw new Error(`Failed to download from storage: ${response.status}`)
        await writeFile(videoPath, Buffer.from(await response.arrayBuffer()))
        await job.updateProgress(10)
      } else {
        // Download via yt-dlp
        const args = [
          '--no-playlist', '--no-warnings',
          '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
          '--merge-output-format', 'mp4',
          '-o', videoPath,
        ]
        const proxy = this.config.get<string>('PROXY_URL')
        if (proxy) args.push('--proxy', proxy)
        args.push(videoUrl)

        this.logger.log(`Downloading video: ${videoUrl}`)
        await execa('yt-dlp', args, { timeout: 5 * 60 * 1000 })
        await job.updateProgress(10)

        // Upload input video to RustFS for preview and rendering
        const inputStorageKey = `subtitle-generations/inputs/${generationId}.mp4`
        const videoBuffer = await readFile(videoPath)
        await this.storage.uploadFromBuffer(inputStorageKey, videoBuffer, 'video/mp4')
        this.logger.log(`Uploaded input video: ${inputStorageKey}`)
      }

      // ffprobe for dimensions
      const { stdout: probeOut } = await execa('ffprobe', [
        '-v', 'quiet', '-print_format', 'json', '-show_streams', '-show_format',
        videoPath,
      ])
      const probeData = JSON.parse(probeOut)
      const videoStream = probeData.streams?.find((s: any) => s.codec_type === 'video')
      const width: number = videoStream?.width ?? 1080
      const height: number = videoStream?.height ?? 1920
      const durationInSeconds: number = parseFloat(probeData.format?.duration ?? '30')
      await job.updateProgress(20)

      // Transcription
      await this.prisma.subtitleGeneration.update({
        where: { id: generationId },
        data: { status: 'TRANSCRIBING' },
      })

      let wordSegments: WordSegment[] = []
      const socialKitKey = this.config.get<string>('SOCIALKIT_API_KEY')
      // Only try SocialKit for real URLs (not uploads)
      const socialKitResult = (socialKitKey && !videoUrl.startsWith('upload://'))
        ? await this.transcribeWithSocialKit(videoUrl, socialKitKey)
        : null

      if (socialKitResult) {
        wordSegments = socialKitResult
        this.logger.log(`SocialKit: ${wordSegments.length} word segments`)
      } else {
        this.logger.log('Using OpenAI Whisper...')
        const audioPath = join(tmpDir, 'audio.mp3')
        await execa('ffmpeg', ['-i', videoPath, '-vn', '-ac', '1', '-ar', '16000', '-f', 'mp3', audioPath])
        wordSegments = await this.transcribeWithOpenAI(audioPath)
        this.logger.log(`OpenAI Whisper: ${wordSegments.length} words`)
      }

      const inputStorageKey = alreadyUploaded
        ? record!.inputStorageKey!
        : `subtitle-generations/inputs/${generationId}.mp4`

      // Generate emoji events with Gemini (best-effort, non-blocking)
      const emojiEvents = await this.generateEmojiEventsWithGemini(wordSegments).catch((err) => {
        this.logger.warn(`Gemini emoji generation failed, falling back to keyword mapper: ${err?.message}`)
        return null
      })

      await this.prisma.subtitleGeneration.update({
        where: { id: generationId },
        data: {
          wordSegments: wordSegments as any,
          inputStorageKey,
          emojiEvents: emojiEvents as any,
          status: 'TRANSCRIBED',
          customization: {
            ...(await this.prisma.subtitleGeneration.findUnique({ where: { id: generationId }, select: { customization: true } }))?.customization as any ?? {},
            _meta: { width, height, durationInSeconds },
          } as any,
        },
      })

      this.logger.log(`Transcription complete for ${generationId}`)
      await job.updateProgress(100)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      this.logger.error(`Transcription ${generationId} failed: ${errorMsg}`)
      await this.prisma.$transaction([
        this.prisma.subtitleGeneration.update({ where: { id: generationId }, data: { status: 'FAILED', errorMsg } }),
        this.prisma.creditWallet.update({ where: { userId: job.data.userId }, data: { balance: { increment: 1 } } }),
        this.prisma.creditTransaction.create({ data: { userId: job.data.userId, amount: 1, reason: 'SUBTITLE_GENERATION_REFUND', description: job.data.videoUrl } }),
      ])
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  }

  // ── Phase B: Render ──────────────────────────────────────────────────────────

  private async processRender(job: Job<SubtitleGenerationJobData>): Promise<void> {
    const { generationId, userId } = job.data
    this.logger.log(`Rendering ${generationId}`)

    const tmpDir = join(tmpdir(), `subtitle-render-${generationId}`)
    await mkdir(tmpDir, { recursive: true })

    try {
      await job.updateProgress(0)

      const record = await this.prisma.subtitleGeneration.findUnique({ where: { id: generationId } })
      if (!record) throw new Error('Record not found')

      const wordSegments = (record.wordSegments as any[]) ?? []
      const emojiEvents = (record.emojiEvents as EmojiEvent[] | null) ?? null
      const preset = record.preset
      const customization = record.customization as any ?? {}
      const meta = customization._meta ?? {}
      const width: number = meta.width ?? 1080
      const height: number = meta.height ?? 1920
      const durationInSeconds: number = meta.durationInSeconds ?? 30
      const fps = 30

      const videoSrc = await this.storage.getPresignedUrl(record.inputStorageKey!, 7200)

      await this.prisma.subtitleGeneration.update({
        where: { id: generationId },
        data: { status: 'RENDERING' },
      })

      const bundleDir = this.config.get<string>('REMOTION_BUNDLE_PATH') ?? '/app/remotion-compositions/build'
      const outputPath = join(tmpDir, 'output.mp4')

      const inputProps = { videoSrc, wordSegments, emojiEvents, preset, customization: { ...customization, _meta: undefined }, durationInSeconds, fps, width, height }

      const chromeExecutable = this.config.get<string>('CHROME_EXECUTABLE_PATH') ?? undefined
      const concurrency = Number(this.config.get<string>('REMOTION_CONCURRENCY') ?? '1')

      const { renderMedia, selectComposition } = await import('@remotion/renderer')

      const composition = await selectComposition({ serveUrl: bundleDir, id: 'SubtitledVideo', inputProps })

      await renderMedia({
        composition,
        serveUrl: bundleDir,
        codec: 'h264',
        outputLocation: outputPath,
        ...(chromeExecutable ? { browserExecutable: chromeExecutable } : {}),
        concurrency,
        inputProps,
        onProgress: async ({ progress }) => {
          await job.updateProgress(Math.round(progress * 100))
        },
      })

      const buffer = await readFile(outputPath)
      const storageKey = `subtitle-generations/${generationId}.mp4`
      await this.storage.uploadFromBuffer(storageKey, buffer, 'video/mp4')

      await this.prisma.subtitleGeneration.update({
        where: { id: generationId },
        data: { status: 'COMPLETED', storageKey },
      })

      this.logger.log(`Render complete for ${generationId}`)
      await job.updateProgress(100)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      this.logger.error(`Render ${generationId} failed: ${errorMsg}`)
      await this.prisma.$transaction([
        this.prisma.subtitleGeneration.update({ where: { id: generationId }, data: { status: 'FAILED', errorMsg } }),
        this.prisma.creditWallet.update({ where: { userId }, data: { balance: { increment: 1 } } }),
        this.prisma.creditTransaction.create({ data: { userId, amount: 1, reason: 'SUBTITLE_GENERATION_REFUND', description: generationId } }),
      ])
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async generateEmojiEventsWithGemini(wordSegments: WordSegment[]): Promise<EmojiEvent[] | null> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')
    if (!apiKey) return null
    if (wordSegments.length === 0) return null

    // Build compact transcript: [timestamp] word
    const transcriptLines = wordSegments
      .map((w) => `[${w.start.toFixed(2)}] ${w.word}`)
      .join('\n')

    const prompt = `You are an emoji placement assistant for video subtitles. Given a transcript with word timestamps, select the most emotionally relevant moments to display animated emojis.

Available emojis (name: meaning):
${AVAILABLE_EMOJIS}

Transcript:
${transcriptLines}

Rules:
- Select 3 to 8 emoji placements where they add genuine emotional or semantic value
- Space them at least 4 seconds apart
- Use the timestamp of the most relevant word
- Only use emoji names from the list above
- Return ONLY a valid JSON array, no explanation, no markdown

Output format:
[{"startTime": 1.2, "emoji": "fire"}, {"startTime": 9.5, "emoji": "red-heart"}]`

    const genAI = new GoogleGenerativeAI(apiKey)
    const modelName = this.config.get<string>('GEMINI_MODEL') ?? 'gemini-2.0-flash'
    const model = genAI.getGenerativeModel({ model: modelName })

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    // Extract JSON array from response (Gemini may add ```json blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error(`Gemini returned no JSON array: ${text.slice(0, 200)}`)

    const raw: Array<{ startTime: number; emoji: string }> = JSON.parse(jsonMatch[0])
    if (!Array.isArray(raw)) throw new Error('Gemini response is not an array')

    const DISPLAY_DURATION = 2.3
    const events: EmojiEvent[] = raw
      .filter((e) => typeof e.startTime === 'number' && typeof e.emoji === 'string')
      .sort((a, b) => a.startTime - b.startTime)
      .map((e) => ({ emoji: e.emoji, startTime: e.startTime, endTime: e.startTime + DISPLAY_DURATION }))

    this.logger.log(`Gemini generated ${events.length} emoji events`)
    return events.length > 0 ? events : null
  }

  private getSocialKitPlatform(videoUrl: string): string | null {
    if (/youtube\.com|youtu\.be/i.test(videoUrl)) return 'youtube'
    if (/tiktok\.com/i.test(videoUrl)) return 'tiktok'
    if (/instagram\.com/i.test(videoUrl)) return 'instagram'
    return null
  }

  private async transcribeWithSocialKit(videoUrl: string, apiKey: string): Promise<WordSegment[] | null> {
    const platform = this.getSocialKitPlatform(videoUrl)
    if (!platform) return null

    try {
      this.logger.log(`Trying SocialKit (${platform}/transcript)...`)
      const url = `https://api.socialkit.dev/${platform}/transcript?url=${encodeURIComponent(videoUrl)}`
      const response = await fetch(url, { headers: { 'x-access-key': apiKey } })
      if (!response.ok) throw new Error(`SocialKit ${response.status}: ${await response.text().catch(() => '')}`)

      const json = await response.json() as any
      if (!json.success || !json.data?.transcript) throw new Error('SocialKit returned no transcript')

      const segments: Array<{ start: number; duration: number; text: string }> = json.data.transcriptSegments ?? []
      const wordSegments: WordSegment[] = []

      for (let s = 0; s < segments.length; s++) {
        const seg = segments[s]
        const rawWords = seg.text.trim().split(/\s+/).filter(Boolean)
        if (!rawWords.length) continue
        const segDuration = seg.duration ?? 0
        const wordDuration = segDuration / rawWords.length

        rawWords.forEach((word, i) => {
          const isLast = i === rawWords.length - 1
          const start = seg.start + i * wordDuration
          const end = start + wordDuration

          // Preserve existing punctuation from source text.
          // Mark last word of each segment with a period if it has no punctuation yet
          // so buildChunks can detect natural segment boundaries.
          let punctuated_word = word
          if (isLast && !/[.!?,;:]$/.test(word)) {
            // Use a period only if this segment ends a sentence (next segment has a gap > 0.5s)
            const nextSeg = segments[s + 1]
            const gap = nextSeg ? nextSeg.start - (seg.start + segDuration) : 999
            if (gap > 0.3) {
              punctuated_word = word + '.'
            }
          }

          wordSegments.push({ word, punctuated_word, start, end })
        })
      }
      return this.mergeApostropheWords(wordSegments)
    } catch (err) {
      this.logger.warn(`SocialKit transcript failed: ${err instanceof Error ? err.message : err}`)
      return null
    }
  }

  private async transcribeWithOpenAI(audioPath: string): Promise<WordSegment[]> {
    const openaiApiKey = this.config.getOrThrow<string>('OPENAI_API_KEY')
    const audioBuffer = await readFile(audioPath)
    const formData = new FormData()
    formData.append('file', new Blob([audioBuffer], { type: 'audio/mp3' }), 'audio.mp3')
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'verbose_json')
    formData.append('timestamp_granularities[]', 'word')
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiApiKey}` },
      body: formData,
    })
    if (!res.ok) throw new Error(`OpenAI Whisper error ${res.status}`)
    const data = await res.json() as any
    const raw: WordSegment[] = (data?.words ?? []).map((w: any) => ({ word: w.word, punctuated_word: w.word, start: w.start, end: w.end }))
    return this.mergeApostropheWords(raw)
  }

  /** Merge tokens split on apostrophe: "c'" + "est" → "c'est" */
  private mergeApostropheWords(words: WordSegment[]): WordSegment[] {
    const result: WordSegment[] = []
    let i = 0
    while (i < words.length) {
      const w = words[i]
      // Apostrophe droite (U+2019) ou apostrophe ASCII (U+0027)
      if ((w.word.endsWith("'") || w.word.endsWith('\u2019')) && i + 1 < words.length) {
        const next = words[i + 1]
        const merged = w.word + next.word
        result.push({ word: merged, punctuated_word: merged, start: w.start, end: next.end })
        i += 2
      } else {
        result.push(w)
        i++
      }
    }
    return result
  }
}
