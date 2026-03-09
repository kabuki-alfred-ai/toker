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
import { readFile } from 'fs/promises'
import { createReadStream, existsSync, writeFileSync } from 'fs'
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
  private readonly groq: OpenAI | null

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {
    super()
    this.openai = new OpenAI({ apiKey: this.config.get<string>('OPENAI_API_KEY') })
    const groqKey = this.config.get<string>('GROQ_API_KEY')
    this.groq = groqKey ? new OpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: groqKey }) : null
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
    // 1. BEST WAY for Coolify: Base64 string to avoid newline/tab format corruption
    if (process.env.YT_COOKIES_BASE64) {
      const tmpCookiesPath = join(tmpdir(), 'youtube_cookies.txt')
      const decodedCookies = Buffer.from(process.env.YT_COOKIES_BASE64, 'base64').toString('utf-8')
      writeFileSync(tmpCookiesPath, decodedCookies, { encoding: 'utf-8' })
      return ['--cookies', tmpCookiesPath]
    }

    // 2. Check if the user passed the cookies directly as a string in an ENV var
    if (process.env.YT_COOKIES_CONTENT) {
      const tmpCookiesPath = join(tmpdir(), 'youtube_cookies.txt')
      // Clean up the string in case Coolify flattened newlines into literal '\n' or spaces
      const cleanedCookies = process.env.YT_COOKIES_CONTENT.replace(/\\n/g, '\n')
      writeFileSync(tmpCookiesPath, cleanedCookies, { encoding: 'utf-8' })
      return ['--cookies', tmpCookiesPath]
    }

    // 3. Otherwise fallback to a file path
    const cookiesPath = process.env.YT_COOKIES_PATH ?? '/app/cookies.txt'
    if (existsSync(cookiesPath)) {
      return ['--cookies', cookiesPath]
    }

    return []
  }

  private getProxyArgs(videoUrl: string): string[] {
    if (!process.env.PROXY_URL) return []
    const needsProxy = /youtube\.com|youtu\.be/i.test(videoUrl)
    return needsProxy ? ['--proxy', process.env.PROXY_URL] : []
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
      ...(process.env.FORCE_IPV6 === 'true' ? ['--force-ipv6'] : []),
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '5',
      '--output', outputPath,
      '--no-playlist',
      '--ffmpeg-location', ffmpegPath,
      '--js-runtimes', 'deno',
      '--js-runtimes', 'node',
      '--extractor-args', 'youtube:player_client=web,mweb',
      ...this.getCookiesArgs(),
      ...this.getProxyArgs(videoUrl),
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
        '--no-playlist',
        '--js-runtimes', 'deno',
        '--js-runtimes', 'node',
        '--extractor-args', 'youtube:player_client=web,mweb',
        ...this.getCookiesArgs(),
        ...this.getProxyArgs(videoUrl),
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
    const deepgramKey = this.config.get<string>('DEEPGRAM_API_KEY')
    
    // 1. Try Deepgram if available
    if (deepgramKey) {
      this.logger.log('Transcribing via Deepgram...')
      const audioBuffer = await readFile(audioPath)
      const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&utterances=true', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${deepgramKey}`,
          'Content-Type': 'audio/mp3',
        },
        body: audioBuffer
      })
      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`Deepgram API error: ${errorText}`)
      }
      const data = await response.json() as any
      const text = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''
      const utterances = data?.results?.utterances ?? []
      const segments = utterances.map((u: any) => ({
        start: u.start,
        end: u.end,
        text: u.transcript,
      }))
      return { text, segments }
    }

    // 2. Try Groq if available
    if (this.groq) {
      this.logger.log('Transcribing via Groq (whisper-large-v3-turbo)...')
      const response = await this.groq.audio.transcriptions.create({
        file: createReadStream(audioPath),
        model: 'whisper-large-v3-turbo',
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

    // 3. Fallback to OpenAI
    this.logger.log('Transcribing via OpenAI (whisper-1)...')
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
      const client = this.groq ?? this.openai
      const model = this.groq ? 'llama-3.1-8b-instant' : 'gpt-4o-mini'
      
      this.logger.log(`Extracting keywords via ${this.groq ? 'Groq' : 'OpenAI'}...`)
      const res = await client.chat.completions.create({
        model,
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
