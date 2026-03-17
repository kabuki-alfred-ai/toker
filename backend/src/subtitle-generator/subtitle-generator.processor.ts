import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
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

      await this.prisma.subtitleGeneration.update({
        where: { id: generationId },
        data: {
          wordSegments: wordSegments as any,
          inputStorageKey,
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

      const inputProps = { videoSrc, wordSegments, preset, customization: { ...customization, _meta: undefined }, durationInSeconds, fps, width, height }

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
