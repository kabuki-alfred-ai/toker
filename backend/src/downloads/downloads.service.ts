import { ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { PrismaService } from '../common/prisma/prisma.service'
import { StorageService } from '../common/storage/storage.service'
import { SubmitDownloadDto } from './dto/submit-download.dto'
import { DOWNLOAD_QUEUE, DOWNLOAD_JOB } from './downloads.constants'


const FORMAT_MAP: Record<string, string> = {
  mp4: 'mp4', mp3: 'mp3', webm: 'webm', m4a: 'm4a',
}
const QUALITY_MAP: Record<string, string> = {
  '240p': 'q240p', '360p': 'q360p', '480p': 'q480p', '720p': 'q720p', '1080p': 'q1080p',
}

@Injectable()
export class DownloadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue(DOWNLOAD_QUEUE) private readonly queue: Queue,
  ) {}

  async submit(userId: string, dto: SubmitDownloadDto) {
    const cleanUrl = dto.videoUrl.trim()
    if (!cleanUrl.startsWith('http')) {
      throw new UnprocessableEntityException('URL invalide')
    }

    const wallet = await this.prisma.creditWallet.findUnique({ where: { userId } })
    if (!wallet || wallet.balance < 1) {
      throw new HttpException('Crédits insuffisants', HttpStatus.PAYMENT_REQUIRED)
    }

    const format = (FORMAT_MAP[dto.format ?? 'mp4'] ?? 'mp4') as 'mp4' | 'mp3' | 'webm' | 'm4a'
    const quality = (QUALITY_MAP[dto.quality ?? '360p'] ?? 'q360p') as 'q240p' | 'q360p' | 'q480p' | 'q720p' | 'q1080p'

    const download = await this.prisma.$transaction(async (tx) => {
      await tx.creditWallet.update({ where: { userId }, data: { balance: { decrement: 1 } } })
      await tx.creditTransaction.create({
        data: { userId, amount: -1, reason: 'DOWNLOAD_USED', description: cleanUrl },
      })
      return tx.download.create({ data: { userId, videoUrl: cleanUrl, format, quality, status: 'PENDING' } })
    })

    await this.queue.add(DOWNLOAD_JOB, { downloadId: download.id, videoUrl: cleanUrl, userId, format: dto.format ?? 'mp4', quality: dto.quality ?? '360p' })

    return { id: download.id }
  }

  async getOne(userId: string, id: string) {
    const d = await this.prisma.download.findUnique({ where: { id } })
    if (!d) throw new NotFoundException('Téléchargement introuvable')
    if (d.userId !== userId) throw new ForbiddenException()
    const fileUrl = d.storageKey ? await this.storage.getPresignedUrl(d.storageKey) : null
    return { ...d, fileUrl }
  }

  async getPresignedUrl(userId: string, id: string): Promise<{ url: string; expiresIn: number }> {
    const d = await this.prisma.download.findUnique({ where: { id } })
    if (!d) throw new NotFoundException('Téléchargement introuvable')
    if (d.userId !== userId) throw new ForbiddenException()
    if (!d.storageKey) throw new HttpException('Fichier non disponible', HttpStatus.NOT_FOUND)
    const url = await this.storage.getPresignedUrl(d.storageKey)
    return { url, expiresIn: 3600 }
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
      this.prisma.download.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: { id: true, status: true, videoUrl: true, title: true, thumbnail: true, format: true, quality: true, fileSize: true, duration: true, storageKey: true, createdAt: true, errorMsg: true },
      }),
      this.prisma.download.count({ where: { userId } }),
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
