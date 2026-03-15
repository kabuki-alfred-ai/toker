import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { PrismaService } from '../common/prisma/prisma.service'
import { StorageService } from '../common/storage/storage.service'
import { SubmitSubtitleRemovalDto } from './dto/submit-subtitle-removal.dto'
import { SUBTITLE_REMOVER_QUEUE, SUBTITLE_REMOVER_JOB } from './subtitle-remover.constants'

@Injectable()
export class SubtitleRemoverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue(SUBTITLE_REMOVER_QUEUE) private readonly queue: Queue,
  ) {}

  async submit(userId: string, dto: SubmitSubtitleRemovalDto) {
    const wallet = await this.prisma.creditWallet.findUnique({ where: { userId } })
    if (!wallet || wallet.balance < 1) {
      throw new HttpException('Crédits insuffisants', HttpStatus.PAYMENT_REQUIRED)
    }

    const removal = await this.prisma.$transaction(async (tx) => {
      await tx.creditWallet.update({
        where: { userId },
        data: { balance: { decrement: 1 } },
      })
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -1,
          reason: 'SUBTITLE_REMOVAL_USED',
          description: dto.videoUrl,
        },
      })
      return tx.subtitleRemoval.create({
        data: { userId, videoUrl: dto.videoUrl, status: 'PENDING' },
      })
    })

    await this.queue.add(SUBTITLE_REMOVER_JOB, {
      removalId: removal.id,
      videoUrl: dto.videoUrl,
      userId,
    })

    return { id: removal.id }
  }

  async getOne(userId: string, id: string) {
    const record = await this.prisma.subtitleRemoval.findUnique({ where: { id } })
    if (!record) throw new NotFoundException('Suppression introuvable')
    if (record.userId !== userId) throw new ForbiddenException()
    const fileUrl = record.storageKey ? await this.storage.getPresignedUrl(record.storageKey) : null
    return { ...record, fileUrl }
  }

  async getPresignedUrl(userId: string, id: string): Promise<{ url: string; expiresIn: number }> {
    const record = await this.prisma.subtitleRemoval.findUnique({ where: { id } })
    if (!record) throw new NotFoundException('Suppression introuvable')
    if (record.userId !== userId) throw new ForbiddenException()
    if (!record.storageKey) throw new HttpException('Fichier non disponible', HttpStatus.NOT_FOUND)
    const url = await this.storage.getPresignedUrl(record.storageKey)
    return { url, expiresIn: 3600 }
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
      this.prisma.subtitleRemoval.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          status: true,
          videoUrl: true,
          storageKey: true,
          errorMsg: true,
          createdAt: true,
        },
      }),
      this.prisma.subtitleRemoval.count({ where: { userId } }),
    ])
    const enriched = await Promise.all(
      items.map(async (item) => ({
        ...item,
        fileUrl: item.storageKey ? await this.storage.getPresignedUrl(item.storageKey) : null,
      })),
    )
    return { items: enriched, total, page, limit }
  }
}
