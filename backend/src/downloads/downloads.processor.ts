import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Job } from 'bullmq'
import execa from 'execa'
import { readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { PrismaService } from '../common/prisma/prisma.service'
import { StorageService } from '../common/storage/storage.service'
import { detectPlatform, DOWNLOAD_QUEUE } from './downloads.constants'

const CONTENT_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  webm: 'video/webm',
  mp4: 'video/mp4',
}

export interface DownloadJobData {
  downloadId: string
  videoUrl: string
  userId: string
  format: string
  quality: string
}

interface SocialKitResponse {
  success: boolean
  data: {
    title: string
    duration: string
    durationSeconds: number
    thumbnail: string
    downloadUrl: string
    fileSize: number
    fileSizeMB: string
    format: string
    quality: string
    expiresIn: string
  }
}

@Processor(DOWNLOAD_QUEUE)
export class DownloadsProcessor extends WorkerHost {
  private readonly logger = new Logger(DownloadsProcessor.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
  ) {
    super()
  }

  private async processYouTube(downloadId: string, videoUrl: string, format: string, quality: string) {
    const apiKey = this.config.get<string>('SOCIALKIT_API_KEY')
    if (!apiKey) throw new Error('SOCIALKIT_API_KEY not configured')

    const res = await fetch('https://api.socialkit.dev/youtube/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-access-key': apiKey },
      body: JSON.stringify({ url: videoUrl, format, quality }),
    })
    const body = await res.json() as SocialKitResponse
    if (!res.ok || !body.success) throw new Error(`SocialKit error: ${JSON.stringify(body)}`)

    const { title, duration, thumbnail, downloadUrl, fileSizeMB } = body.data
    const ext = format in CONTENT_TYPES ? format : 'mp4'
    const storageKey = `downloads/${downloadId}.${ext}`
    await this.storage.uploadFromUrl(storageKey, downloadUrl, CONTENT_TYPES[ext] ?? 'video/mp4')
    return { title, duration, thumbnail, storageKey, fileSize: fileSizeMB ? `${fileSizeMB} MB` : null }
  }

  private async processYtdlp(downloadId: string, videoUrl: string, format: string) {
    const isAudio = format === 'mp3' || format === 'm4a'
    const ext = isAudio ? format : 'mp4'
    const outPath = join(tmpdir(), `dl_${downloadId}.${ext}`)

    const args = [
      '--no-playlist',
      '--no-warnings',
      '-o', outPath,
      ...(isAudio
        ? ['-x', '--audio-format', format]
        : ['-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', '--merge-output-format', 'mp4']
      ),
    ]

    const proxy = this.config.get<string>('PROXY_URL')
    if (proxy) args.push('--proxy', proxy)

    args.push(videoUrl)

    this.logger.log(`yt-dlp ${videoUrl}`)
    await execa('yt-dlp', args, { timeout: 5 * 60 * 1000 })

    const buffer = await readFile(outPath)
    const storageKey = `downloads/${downloadId}.${ext}`
    await this.storage.uploadFromBuffer(storageKey, buffer, CONTENT_TYPES[ext] ?? 'video/mp4')
    await unlink(outPath).catch(() => null)

    const fileSizeMB = (buffer.length / 1024 / 1024).toFixed(1)
    return { title: null, duration: null, thumbnail: null, storageKey, fileSize: `${fileSizeMB} MB` }
  }

  async process(job: Job<DownloadJobData>): Promise<void> {
    const { downloadId, videoUrl, userId, format, quality } = job.data
    this.logger.log(`Processing download job ${job.id} — ${downloadId}`)

    try {
      await this.prisma.download.update({ where: { id: downloadId }, data: { status: 'PROCESSING' } })

      const platform = detectPlatform(videoUrl)
      const result = platform === 'youtube'
        ? await this.processYouTube(downloadId, videoUrl, format, quality)
        : await this.processYtdlp(downloadId, videoUrl, format)

      await this.prisma.download.update({
        where: { id: downloadId },
        data: { status: 'COMPLETED', ...result },
      })

      this.logger.log(`Download ${downloadId} completed — "${result.title ?? videoUrl}"`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      this.logger.error(`Download ${downloadId} failed: ${errorMsg}`)

      await this.prisma.$transaction([
        this.prisma.download.update({ where: { id: downloadId }, data: { status: 'FAILED', errorMsg } }),
        this.prisma.creditWallet.update({ where: { userId }, data: { balance: { increment: 1 } } }),
        this.prisma.creditTransaction.create({
          data: { userId, amount: 1, reason: 'DOWNLOAD_REFUND', description: videoUrl },
        }),
      ])
    }
  }
}
