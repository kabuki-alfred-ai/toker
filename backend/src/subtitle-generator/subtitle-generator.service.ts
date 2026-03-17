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
import { SubmitSubtitleGenerationDto } from './dto/submit-subtitle-generation.dto'
import { SUBTITLE_GENERATOR_QUEUE, SUBTITLE_GENERATOR_JOB } from './subtitle-generator.constants'

@Injectable()
export class SubtitleGeneratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue(SUBTITLE_GENERATOR_QUEUE) private readonly queue: Queue,
  ) {}

  // Step 1: submit URL for transcription only (deducts 1 credit)
  async submitTranscribe(userId: string, dto: SubmitSubtitleGenerationDto) {
    const wallet = await this.prisma.creditWallet.findUnique({ where: { userId } })
    if (!wallet || wallet.balance < 1) {
      throw new HttpException('Crédits insuffisants', HttpStatus.PAYMENT_REQUIRED)
    }

    const defaultCustomization = {
      fontSize: dto.customization?.fontSize ?? 52,
      color: dto.customization?.color ?? '#FFFFFF',
      highlightColor: dto.customization?.highlightColor ?? '#FFDD00',
      bgColor: dto.customization?.bgColor ?? '#000000CC',
      position: dto.customization?.position ?? 'bottom',
    }

    const generation = await this.prisma.$transaction(async (tx) => {
      await tx.creditWallet.update({ where: { userId }, data: { balance: { decrement: 1 } } })
      await tx.creditTransaction.create({ data: { userId, amount: -1, reason: 'SUBTITLE_GENERATION_USED', description: dto.videoUrl } })
      return tx.subtitleGeneration.create({
        data: {
          userId,
          videoUrl: dto.videoUrl,
          preset: (dto.preset ?? 'KARAOKE') as any,
          customization: defaultCustomization,
          status: 'PENDING',
        },
      })
    })

    await this.queue.add(SUBTITLE_GENERATOR_JOB, {
      generationId: generation.id,
      videoUrl: dto.videoUrl,
      userId,
      jobType: 'TRANSCRIBE',
    })

    return { id: generation.id }
  }

  // Step 1b: submit a file upload for transcription (deducts 1 credit)
  async submitTranscribeFromFile(userId: string, file: Express.Multer.File) {
    if (!file) throw new HttpException('Aucun fichier fourni', HttpStatus.BAD_REQUEST)

    const wallet = await this.prisma.creditWallet.findUnique({ where: { userId } })
    if (!wallet || wallet.balance < 1) {
      throw new HttpException('Crédits insuffisants', HttpStatus.PAYMENT_REQUIRED)
    }

    const defaultCustomization = {
      fontSize: 48,
      color: '#FFFFFF',
      highlightColor: '#FFE600',
      bgColor: '#000000CC',
      position: 82,
    }

    const videoUrl = `upload://${file.originalname}`

    const generation = await this.prisma.$transaction(async (tx) => {
      await tx.creditWallet.update({ where: { userId }, data: { balance: { decrement: 1 } } })
      await tx.creditTransaction.create({ data: { userId, amount: -1, reason: 'SUBTITLE_GENERATION_USED', description: videoUrl } })
      return tx.subtitleGeneration.create({
        data: {
          userId,
          videoUrl,
          preset: 'KARAOKE',
          customization: defaultCustomization,
          status: 'PENDING',
        },
      })
    })

    // Upload file to RustFS immediately (skip yt-dlp in the processor)
    const inputStorageKey = `subtitle-generations/inputs/${generation.id}.mp4`
    await this.storage.uploadFromBuffer(inputStorageKey, file.buffer, file.mimetype || 'video/mp4')

    await this.prisma.subtitleGeneration.update({
      where: { id: generation.id },
      data: { inputStorageKey },
    })

    await this.queue.add(SUBTITLE_GENERATOR_JOB, {
      generationId: generation.id,
      videoUrl,
      userId,
      jobType: 'TRANSCRIBE',
    })

    return { id: generation.id }
  }

  // Step 2: trigger render with chosen preset/customization (and optionally edited wordSegments)
  async submitRender(userId: string, id: string, preset: string, customization: object, wordSegments?: unknown[]) {
    const record = await this.prisma.subtitleGeneration.findUnique({ where: { id } })
    if (!record) throw new NotFoundException('Génération introuvable')
    if (record.userId !== userId) throw new ForbiddenException()
    if (record.status !== 'TRANSCRIBED') {
      throw new HttpException('Transcription non terminée', HttpStatus.BAD_REQUEST)
    }

    await this.prisma.subtitleGeneration.update({
      where: { id },
      data: {
        preset: preset as any,
        customization: {
          ...(record.customization as object ?? {}),
          ...customization,
        } as any,
        // Persist edited word segments if provided by the client
        ...(wordSegments ? { wordSegments: wordSegments as any } : {}),
        status: 'PENDING',
      },
    })

    await this.queue.add(SUBTITLE_GENERATOR_JOB, {
      generationId: id,
      videoUrl: record.videoUrl,
      userId,
      jobType: 'RENDER',
    })

    return { id }
  }

  async getOne(userId: string, id: string) {
    const record = await this.prisma.subtitleGeneration.findUnique({ where: { id } })
    if (!record) throw new NotFoundException('Génération introuvable')
    if (record.userId !== userId) throw new ForbiddenException()
    const fileUrl = record.storageKey ? await this.storage.getPresignedUrl(record.storageKey) : null
    const inputFileUrl = record.inputStorageKey ? await this.storage.getPresignedUrl(record.inputStorageKey, 7200) : null
    return { ...record, fileUrl, inputFileUrl }
  }

  async getPresignedUrl(userId: string, id: string): Promise<{ url: string; expiresIn: number }> {
    const record = await this.prisma.subtitleGeneration.findUnique({ where: { id } })
    if (!record) throw new NotFoundException('Génération introuvable')
    if (record.userId !== userId) throw new ForbiddenException()
    if (!record.storageKey) throw new HttpException('Fichier non disponible', HttpStatus.NOT_FOUND)
    const url = await this.storage.getPresignedUrl(record.storageKey)
    return { url, expiresIn: 3600 }
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
      this.prisma.subtitleGeneration.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: { id: true, status: true, videoUrl: true, preset: true, storageKey: true, errorMsg: true, createdAt: true },
      }),
      this.prisma.subtitleGeneration.count({ where: { userId } }),
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
