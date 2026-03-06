import { ForbiddenException, HttpException, HttpStatus, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { getQueueToken } from '@nestjs/bullmq'
import { TranscriptionsService } from './transcriptions.service'
import { PrismaService } from '../common/prisma/prisma.service'
import { QUEUE_NAME, JOB_NAME } from '../queues/constants'

const mockPrisma = {
  creditWallet: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue(undefined) },
  transcription: { create: jest.fn(), findUnique: jest.fn() },
  $transaction: jest.fn(),
}

const mockQueue = { add: jest.fn().mockResolvedValue(undefined) }

describe('TranscriptionsService', () => {
  let service: TranscriptionsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranscriptionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken(QUEUE_NAME), useValue: mockQueue },
      ],
    }).compile()

    service = module.get<TranscriptionsService>(TranscriptionsService)
    jest.clearAllMocks()
  })

  describe('submit', () => {
    const userId = 'uid_1'

    it('should create transcription and enqueue job for valid TikTok URL', async () => {
      mockPrisma.creditWallet.findUnique.mockResolvedValue({ balance: 3 })
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<{ id: string }>) => cb(mockPrisma))
      mockPrisma.transcription.create.mockResolvedValue({ id: 'tx_1' })

      const result = await service.submit(userId, { videoUrl: 'https://www.tiktok.com/@user/video/123456789' })

      expect(result).toEqual({ id: 'tx_1' })
      expect(mockQueue.add).toHaveBeenCalledWith(JOB_NAME, expect.objectContaining({
        transcriptionId: 'tx_1',
        platform: 'tiktok',
        userId,
      }))
    })

    it('should accept Instagram Reels URL', async () => {
      mockPrisma.creditWallet.findUnique.mockResolvedValue({ balance: 1 })
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<{ id: string }>) => cb(mockPrisma))
      mockPrisma.transcription.create.mockResolvedValue({ id: 'tx_2' })

      const result = await service.submit(userId, { videoUrl: 'https://www.instagram.com/reel/abc123/' })

      expect(result).toEqual({ id: 'tx_2' })
      expect(mockQueue.add).toHaveBeenCalledWith(JOB_NAME, expect.objectContaining({ platform: 'instagram' }))
    })

    it('should accept YouTube Shorts URL', async () => {
      mockPrisma.creditWallet.findUnique.mockResolvedValue({ balance: 2 })
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<{ id: string }>) => cb(mockPrisma))
      mockPrisma.transcription.create.mockResolvedValue({ id: 'tx_3' })

      const result = await service.submit(userId, { videoUrl: 'https://www.youtube.com/shorts/dQw4w9WgXcQ' })

      expect(result).toEqual({ id: 'tx_3' })
      expect(mockQueue.add).toHaveBeenCalledWith(JOB_NAME, expect.objectContaining({ platform: 'youtube' }))
    })

    it('should throw 422 for unsupported URL', async () => {
      await expect(
        service.submit(userId, { videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
      ).rejects.toThrow(UnprocessableEntityException)
    })

    it('should throw 402 when balance is 0', async () => {
      mockPrisma.creditWallet.findUnique.mockResolvedValue({ balance: 0 })

      await expect(
        service.submit(userId, { videoUrl: 'https://www.tiktok.com/@user/video/123456789' }),
      ).rejects.toThrow(new HttpException('Crédits insuffisants', HttpStatus.PAYMENT_REQUIRED))
    })

    it('should throw 402 when no wallet exists', async () => {
      mockPrisma.creditWallet.findUnique.mockResolvedValue(null)

      await expect(
        service.submit(userId, { videoUrl: 'https://www.tiktok.com/@user/video/123456789' }),
      ).rejects.toThrow(new HttpException('Crédits insuffisants', HttpStatus.PAYMENT_REQUIRED))
    })
  })

  describe('getOne', () => {
    const userId = 'uid_1'
    const tx = { id: 'tx_1', userId, status: 'COMPLETED', text: 'hello', errorMsg: null, videoUrl: 'https://tiktok.com/@x/video/1', createdAt: new Date() }

    it('should return transcription for owner', async () => {
      mockPrisma.transcription.findUnique.mockResolvedValue(tx)
      const result = await service.getOne(userId, 'tx_1')
      expect(result.id).toBe('tx_1')
      expect(result.status).toBe('COMPLETED')
    })

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.transcription.findUnique.mockResolvedValue(null)
      await expect(service.getOne(userId, 'missing')).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException if wrong user', async () => {
      mockPrisma.transcription.findUnique.mockResolvedValue({ ...tx, userId: 'other' })
      await expect(service.getOne(userId, 'tx_1')).rejects.toThrow(ForbiddenException)
    })
  })

  describe('findAll', () => {
    it('should return paginated list', async () => {
      const items = [{ id: 'tx_1', status: 'COMPLETED', videoUrl: 'https://tiktok.com/@x/video/1', createdAt: new Date(), errorMsg: null }]
      mockPrisma.transcription.findMany = jest.fn().mockResolvedValue(items)
      mockPrisma.transcription.count = jest.fn().mockResolvedValue(1)

      const result = await service.findAll('uid_1')

      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
    })

    it('should return empty list when no transcriptions', async () => {
      mockPrisma.transcription.findMany = jest.fn().mockResolvedValue([])
      mockPrisma.transcription.count = jest.fn().mockResolvedValue(0)

      const result = await service.findAll('uid_1')

      expect(result.items).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })
})
