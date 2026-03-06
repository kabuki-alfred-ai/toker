import { ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { PrismaService } from '../common/prisma/prisma.service'
import { QUEUE_NAME, JOB_NAME } from '../queues/constants'
import { SubmitTranscriptionDto } from './dto/submit-transcription.dto'

const PLATFORM_PATTERNS: Record<string, RegExp> = {
  tiktok: /https?:\/\/(?:www\.)?tiktok\.com\/@[\w.]+\/video\/\d+/,
  instagram: /https?:\/\/(?:www\.)?instagram\.com\/reel\/[\w-]+/,
  youtube: /https?:\/\/(?:www\.)?(?:youtube\.com\/shorts\/[\w-]+|youtu\.be\/[\w-]+)/,
}

function detectPlatform(url: string): { platform: string; cleanUrl: string } | null {
  for (const [platform, regex] of Object.entries(PLATFORM_PATTERNS)) {
    const match = url.match(regex)
    if (match) return { platform, cleanUrl: match[0] }
  }
  return null
}

@Injectable()
export class TranscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAME) private readonly queue: Queue,
  ) {}

  async submit(userId: string, dto: SubmitTranscriptionDto) {
    const detected = detectPlatform(dto.videoUrl)
    if (!detected) {
      throw new UnprocessableEntityException('URL non supportée — TikTok, Reels ou YouTube Shorts uniquement')
    }
    const { platform, cleanUrl } = detected

    const wallet = await this.prisma.creditWallet.findUnique({ where: { userId } })
    if (!wallet || wallet.balance < 1) {
      throw new HttpException('Crédits insuffisants', HttpStatus.PAYMENT_REQUIRED)
    }

    const transcription = await this.prisma.$transaction(async (tx) => {
      await tx.creditWallet.update({
        where: { userId },
        data: { balance: { decrement: 1 } },
      })
      await tx.creditTransaction.create({
        data: { userId, amount: -1, reason: 'TRANSCRIPTION_USED', description: cleanUrl },
      })
      return tx.transcription.create({
        data: { userId, videoUrl: cleanUrl, status: 'PENDING' },
      })
    })

    await this.queue.add(JOB_NAME, {
      transcriptionId: transcription.id,
      videoUrl: cleanUrl,
      userId,
      platform,
    })

    return { id: transcription.id }
  }

  async getOne(userId: string, id: string) {
    const t = await this.prisma.transcription.findUnique({ where: { id } })
    if (!t) throw new NotFoundException('Transcription introuvable')
    if (t.userId !== userId) throw new ForbiddenException()
    return { id: t.id, status: t.status, text: t.text, segments: t.segments, keywords: t.keywords, errorMsg: t.errorMsg, videoUrl: t.videoUrl, title: t.title, duration: t.duration, createdAt: t.createdAt }
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
      this.prisma.transcription.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: { id: true, status: true, videoUrl: true, title: true, duration: true, createdAt: true, errorMsg: true },
      }),
      this.prisma.transcription.count({ where: { userId } }),
    ])
    return { items, total, page, limit }
  }
}
