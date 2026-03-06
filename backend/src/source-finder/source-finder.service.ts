import { ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { PrismaService } from '../common/prisma/prisma.service'
import { SOURCE_FINDER_QUEUE, SOURCE_FINDER_JOB } from './source-finder.constants'

const PLATFORM_PATTERNS: Record<string, RegExp> = {
  tiktok: /https?:\/\/(?:www\.)?tiktok\.com\/@[\w.]+\/video\/\d+/,
  instagram: /https?:\/\/(?:www\.)?instagram\.com\/reel\/[\w-]+/,
  youtube: /https?:\/\/(?:www\.)?(?:youtube\.com\/shorts\/[\w-]+|youtu\.be\/[\w-]+)/,
}

function extractCleanUrl(url: string): string | null {
  for (const regex of Object.values(PLATFORM_PATTERNS)) {
    const match = url.match(regex)
    if (match) return match[0]
  }
  return null
}

@Injectable()
export class SourceFinderService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(SOURCE_FINDER_QUEUE) private readonly queue: Queue,
  ) {}

  async submit(userId: string, videoUrl: string) {
    const cleanUrl = extractCleanUrl(videoUrl)
    if (!cleanUrl) {
      throw new HttpException(
        'URL non supportée — TikTok, Reels ou YouTube Shorts uniquement',
        HttpStatus.UNPROCESSABLE_ENTITY,
      )
    }

    const wallet = await this.prisma.creditWallet.findUnique({ where: { userId } })
    if (!wallet || wallet.balance < 1) {
      throw new HttpException('Crédits insuffisants', HttpStatus.PAYMENT_REQUIRED)
    }

    const search = await this.prisma.$transaction(async (tx) => {
      await tx.creditWallet.update({
        where: { userId },
        data: { balance: { decrement: 1 } },
      })
      await tx.creditTransaction.create({
        data: { userId, amount: -1, reason: 'SOURCE_FINDER_USED', description: cleanUrl },
      })
      return tx.sourceSearch.create({
        data: { userId, videoUrl: cleanUrl, status: 'PENDING' },
      })
    })

    await this.queue.add(SOURCE_FINDER_JOB, { searchId: search.id, videoUrl: cleanUrl, userId })

    return { id: search.id }
  }

  async getOne(userId: string, id: string) {
    const search = await this.prisma.sourceSearch.findUnique({ where: { id } })
    if (!search) throw new NotFoundException('Recherche introuvable')
    if (search.userId !== userId) throw new ForbiddenException()
    return {
      id: search.id,
      status: search.status,
      videoUrl: search.videoUrl,
      sources: search.sources,
      errorMsg: search.errorMsg,
      createdAt: search.createdAt,
    }
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
      this.prisma.sourceSearch.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          status: true,
          videoUrl: true,
          sources: true,
          createdAt: true,
        },
      }),
      this.prisma.sourceSearch.count({ where: { userId } }),
    ])
    return {
      items: items.map((s) => ({
        ...s,
        sourcesCount: Array.isArray(s.sources)
          ? (s.sources as Array<{ sources?: unknown[] }>).reduce((acc, scene) => acc + (scene.sources?.length ?? 0), 0)
          : 0,
        sources: undefined,
      })),
      total,
      page,
      limit,
    }
  }
}
