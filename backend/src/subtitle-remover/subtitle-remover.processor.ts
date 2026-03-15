import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Job } from 'bullmq'
import execa from 'execa'
import { unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import Replicate from 'replicate'
import { PrismaService } from '../common/prisma/prisma.service'
import { StorageService } from '../common/storage/storage.service'
import { detectPlatform } from '../downloads/downloads.constants'
import { SUBTITLE_REMOVER_QUEUE } from './subtitle-remover.constants'

export interface SubtitleRemovalJobData {
  removalId: string
  videoUrl: string
  userId: string
}

interface SocialKitResponse {
  success: boolean
  data: { downloadUrl: string }
}

@Processor(SUBTITLE_REMOVER_QUEUE)
export class SubtitleRemoverProcessor extends WorkerHost {
  private readonly logger = new Logger(SubtitleRemoverProcessor.name)
  private readonly replicate: Replicate
  private readonly model: `${string}/${string}:${string}`

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
  ) {
    super()
    this.replicate = new Replicate({
      auth: this.config.getOrThrow<string>('REPLICATE_API_TOKEN'),
    })
    this.model = this.config.getOrThrow<string>('REPLICATE_VSR_MODEL') as `${string}/${string}:${string}`
  }

  private async resolveDirectUrl(videoUrl: string): Promise<string> {
    if (detectPlatform(videoUrl) === 'youtube') {
      const apiKey = this.config.getOrThrow<string>('SOCIALKIT_API_KEY')
      const res = await fetch('https://api.socialkit.dev/youtube/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-key': apiKey },
        body: JSON.stringify({ url: videoUrl, format: 'mp4', quality: '1080p' }),
      })
      const body = await res.json() as SocialKitResponse
      if (!res.ok || !body.success) throw new Error(`SocialKit error: ${JSON.stringify(body)}`)
      return body.data.downloadUrl
    }

    // Non-YouTube: download locally with yt-dlp, upload to RustFS, return presigned URL
    const tmpId = `vsr_${Date.now()}`
    const outPath = join(tmpdir(), `${tmpId}.mp4`)
    const args = ['--no-playlist', '--no-warnings', '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', '--merge-output-format', 'mp4', '-o', outPath]
    const proxy = this.config.get<string>('PROXY_URL')
    if (proxy) args.push('--proxy', proxy)
    args.push(videoUrl)

    this.logger.log(`yt-dlp resolving direct video for subtitle removal: ${videoUrl}`)
    await execa('yt-dlp', args, { timeout: 5 * 60 * 1000 })

    const { readFile: rf } = await import('fs/promises')
    const buffer = await rf(outPath)
    const storageKey = `subtitle-remover-inputs/${tmpId}.mp4`
    await this.storage.uploadFromBuffer(storageKey, buffer, 'video/mp4')
    await unlink(outPath).catch(() => null)

    return this.storage.getPresignedUrl(storageKey, 3600, true)
  }

  async process(job: Job<SubtitleRemovalJobData>): Promise<void> {
    const { removalId, videoUrl, userId } = job.data
    this.logger.log(`Processing subtitle removal ${removalId}`)

    try {
      await this.prisma.subtitleRemoval.update({
        where: { id: removalId },
        data: { status: 'PROCESSING' },
      })

      await job.updateProgress(5)

      // Résoudre l'URL sociale en lien direct téléchargeable
      this.logger.log(`Resolving direct download URL for ${videoUrl}`)
      const directUrl = await this.resolveDirectUrl(videoUrl)
      this.logger.log(`Direct URL resolved: ${directUrl}`)

      await job.updateProgress(10)

      const output = await this.replicate.run(this.model, {
        input: { video: directUrl },
      })

      await job.updateProgress(90)

      // Replicate retourne une URL vers le fichier traité
      const outputUrl = Array.isArray(output) ? String(output[0]) : String(output)

      // Upload to RustFS for permanent storage
      const storageKey = `subtitle-removals/${removalId}.mp4`
      this.logger.log(`Uploading ${removalId} to storage as ${storageKey}`)
      await this.storage.uploadFromUrl(storageKey, outputUrl, 'video/mp4')

      await this.prisma.subtitleRemoval.update({
        where: { id: removalId },
        data: { status: 'COMPLETED', storageKey },
      })

      this.logger.log(`Subtitle removal ${removalId} completed → ${storageKey}`)
      await job.updateProgress(100)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      this.logger.error(`Subtitle removal ${removalId} failed: ${errorMsg}`)

      await this.prisma.$transaction([
        this.prisma.subtitleRemoval.update({
          where: { id: removalId },
          data: { status: 'FAILED', errorMsg },
        }),
        this.prisma.creditWallet.update({
          where: { userId },
          data: { balance: { increment: 1 } },
        }),
        this.prisma.creditTransaction.create({
          data: {
            userId,
            amount: 1,
            reason: 'SUBTITLE_REMOVAL_REFUND',
            description: videoUrl,
          },
        }),
      ])
    }
  }
}
