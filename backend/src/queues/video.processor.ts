import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Job } from 'bullmq'
import { createHash } from 'crypto'
import { tmpdir } from 'os'
import { join } from 'path'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const execa = require('execa') as (file: string, args: string[]) => Promise<void>
import OpenAI from 'openai'
import { createReadStream, existsSync } from 'fs'
import { PrismaService } from '../common/prisma/prisma.service'
import { RedisService } from '../common/redis/redis.service'
import { EmailService } from '../common/email/email.service'
import { QUEUE_NAME } from './constants'

export interface ProcessVideoJobData {
  transcriptionId: string
  videoUrl: string
  userId: string
  platform: string
}

@Processor(QUEUE_NAME)
export class VideoProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoProcessor.name)
  private readonly openai: OpenAI

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {
    super()
    this.openai = new OpenAI({ apiKey: this.config.get<string>('OPENAI_API_KEY') })
  }

  async process(job: Job<ProcessVideoJobData>): Promise<void> {
    const { transcriptionId, videoUrl, userId } = job.data
    this.logger.log(`Processing job ${job.id} for transcription ${transcriptionId}`)

    try {
      const meta = await this.fetchVideoMeta(videoUrl)
      await this.prisma.transcription.update({
        where: { id: transcriptionId },
        data: { status: 'PROCESSING', title: meta.title, duration: meta.duration },
      })

      const audioPath = await this.getAudio(videoUrl, transcriptionId)
      const { text, segments } = await this.transcribeAudio(audioPath)
      const keywords = await this.extractKeywords(text)

      await this.prisma.transcription.update({
        where: { id: transcriptionId },
        data: { status: 'COMPLETED', text, segments, keywords },
      })

      this.logger.log(`Transcription ${transcriptionId} completed`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      this.logger.error(`Transcription ${transcriptionId} failed: ${errorMsg}`)

      await this.prisma.$transaction([
        this.prisma.transcription.update({
          where: { id: transcriptionId },
          data: { status: 'FAILED', errorMsg },
        }),
        this.prisma.creditWallet.update({
          where: { userId },
          data: { balance: { increment: 1 } },
        }),
        this.prisma.creditTransaction.create({
          data: { userId, amount: 1, reason: 'TRANSCRIPTION_REFUND', description: videoUrl },
        }),
      ])

      // Send failure email — non-blocking
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
      if (user) {
        this.emailService.sendTranscriptionFailedEmail(user.email, videoUrl).catch(() => {})
      }
    }
  }

  private getCookiesArgs(): string[] {
    const cookiesPath = process.env.YT_COOKIES_PATH ?? '/app/cookies.txt'
    if (existsSync(cookiesPath)) {
      return ['--cookies', cookiesPath]
    }
    return []
  }

  private getYtDlpBaseArgs(): string[] {
    const cacheDir = process.env.YT_DLP_CACHE_DIR ?? '/app/yt-dlp-cache'
    return [
      '--no-playlist',
      '--js-runtimes', 'node',
      '--cache-dir', cacheDir,
      ...this.getCookiesArgs(),
    ]
  }

  private async getAudio(videoUrl: string, transcriptionId: string): Promise<string> {
    const uuid = createHash('sha256').update(videoUrl).digest('hex').slice(0, 16)

    const cached = await this.redis.getAudioPath(uuid)
    if (cached && existsSync(cached)) {
      this.logger.log(`Cache hit for uuid ${uuid}`)
      await this.prisma.transcription.update({
        where: { id: transcriptionId },
        data: { audioUuid: uuid },
      })
      return cached
    }

    const outputPath = join(tmpdir(), `vs_${uuid}.mp3`)
    const ytDlp = process.env.YT_DLP_PATH ?? 'yt-dlp'
    const ffmpegPath = process.env.FFMPEG_PATH ?? '/usr/bin/ffmpeg'
    await execa(ytDlp, [
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '5',
      '--output', outputPath,
      '--ffmpeg-location', ffmpegPath,
      ...this.getYtDlpBaseArgs(),
      videoUrl,
    ])

    await this.redis.setAudioPath(uuid, outputPath)
    await this.prisma.transcription.update({
      where: { id: transcriptionId },
      data: { audioUuid: uuid },
    })

    return outputPath
  }

  private async fetchVideoMeta(videoUrl: string): Promise<{ title: string | null; duration: number | null }> {
    try {
      const ytDlp = process.env.YT_DLP_PATH ?? 'yt-dlp'
      const execaFull = require('execa') as (file: string, args: string[]) => Promise<{ stdout: string }>
      const result = await execaFull(ytDlp, [
        '--print', '%(title)s|||%(duration)s',
        '--no-download',
        ...this.getYtDlpBaseArgs(),
        videoUrl,
      ])
      const [title, durationStr] = result.stdout.trim().split('|||')
      const duration = durationStr ? parseInt(durationStr, 10) : null
      return { title: title || null, duration: isNaN(duration as number) ? null : duration }
    } catch {
      return { title: null, duration: null }
    }
  }

  private async transcribeAudio(audioPath: string): Promise<{ text: string; segments: { start: number; end: number; text: string }[] }> {
    const response = await this.openai.audio.transcriptions.create({
      file: createReadStream(audioPath),
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    })
    const segments = (response.segments ?? []).map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text.trim(),
    }))
    return { text: response.text, segments }
  }

  private async extractKeywords(text: string): Promise<string[]> {
    try {
      const res = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Extract 5 to 10 relevant keywords or key phrases from this video transcription. Return only a JSON object: {"keywords": ["word1", "word2", ...]}. No explanation.',
          },
          { role: 'user', content: text.slice(0, 2000) },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 150,
      })
      const content = res.choices[0]?.message?.content ?? '{}'
      return (JSON.parse(content) as { keywords?: string[] }).keywords ?? []
    } catch {
      return []
    }
  }
}
