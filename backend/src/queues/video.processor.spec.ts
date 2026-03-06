import { Test, TestingModule } from '@nestjs/testing'
import { getQueueToken } from '@nestjs/bullmq'
import { ConfigService } from '@nestjs/config'
import { Job } from 'bullmq'
import { VideoProcessor, ProcessVideoJobData } from './video.processor'
import { PrismaService } from '../common/prisma/prisma.service'
import { RedisService } from '../common/redis/redis.service'
import { EmailService } from '../common/email/email.service'
import { QUEUE_NAME } from './constants'

// Mock execa — v5 default export is the function itself
jest.mock('execa', () => jest.fn().mockResolvedValue(undefined))

// Mock openai
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: jest.fn().mockResolvedValue({ text: 'transcribed text' }),
      },
    },
  }))
})

// Mock fs
jest.mock('fs', () => ({
  createReadStream: jest.fn().mockReturnValue('mock-stream'),
  existsSync: jest.fn().mockReturnValue(false),
}))

const mockPrisma = {
  transcription: { update: jest.fn().mockResolvedValue(undefined) },
  creditWallet: { update: jest.fn().mockResolvedValue(undefined) },
  user: { findUnique: jest.fn().mockResolvedValue({ email: 'test@example.com' }) },
  $transaction: jest.fn().mockResolvedValue(undefined),
}

const mockEmail = {
  sendTranscriptionFailedEmail: jest.fn().mockResolvedValue(undefined),
}

const mockRedis = {
  getAudioPath: jest.fn().mockResolvedValue(null),
  setAudioPath: jest.fn().mockResolvedValue(undefined),
}

function makeJob(data: ProcessVideoJobData): Job<ProcessVideoJobData> {
  return { id: 'job_1', data } as Job<ProcessVideoJobData>
}

describe('VideoProcessor', () => {
  let processor: VideoProcessor

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: EmailService, useValue: mockEmail },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test-key') } },
        { provide: getQueueToken(QUEUE_NAME), useValue: {} },
      ],
    }).compile()

    processor = module.get<VideoProcessor>(VideoProcessor)
    jest.clearAllMocks()

    // Reset mocks to defaults
    mockRedis.getAudioPath.mockResolvedValue(null)
    const { existsSync } = jest.requireMock<{ existsSync: jest.Mock }>('fs')
    existsSync.mockReturnValue(false)
    jest.requireMock<jest.Mock>('execa').mockResolvedValue(undefined)
  })

  describe('process', () => {
    const jobData: ProcessVideoJobData = {
      transcriptionId: 'tx_1',
      videoUrl: 'https://www.tiktok.com/@user/video/123456789',
      userId: 'uid_1',
      platform: 'tiktok',
    }

    it('should complete transcription with text on success', async () => {
      await processor.process(makeJob(jobData))

      expect(mockPrisma.transcription.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED', text: 'transcribed text' }) }),
      )
    })

    it('should set status PROCESSING before starting', async () => {
      const calls: string[] = []
      mockPrisma.transcription.update.mockImplementation(({ data }: { data: { status: string } }) => {
        calls.push(data.status)
        return Promise.resolve(undefined)
      })

      await processor.process(makeJob(jobData))

      expect(calls[0]).toBe('PROCESSING')
    })

    it('should skip yt-dlp on cache hit', async () => {
      const { existsSync } = jest.requireMock<{ existsSync: jest.Mock }>('fs')
      existsSync.mockReturnValue(true)
      mockRedis.getAudioPath.mockResolvedValue('/tmp/cached.mp3')

      const execaMock = jest.requireMock<jest.Mock>('execa')

      await processor.process(makeJob(jobData))

      expect(execaMock).not.toHaveBeenCalled()
      expect(mockPrisma.transcription.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) }),
      )
    })

    it('should fail and refund credit when yt-dlp throws', async () => {
      jest.requireMock<jest.Mock>('execa').mockRejectedValue(new Error('yt-dlp: video unavailable'))

      await processor.process(makeJob(jobData))

      expect(mockPrisma.$transaction).toHaveBeenCalled()
      // Verify the transaction args include FAILED status and credit increment
      const txArg = mockPrisma.$transaction.mock.calls[0][0] as unknown[]
      expect(txArg).toHaveLength(2)
    })

    it('should fail and refund credit when Whisper throws', async () => {
      const OpenAI = jest.requireMock<jest.Mock>('openai')
      OpenAI.mockImplementation(() => ({
        audio: {
          transcriptions: {
            create: jest.fn().mockRejectedValue(new Error('OpenAI API error')),
          },
        },
      }))

      // Re-create processor with new mock
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          VideoProcessor,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: RedisService, useValue: mockRedis },
          { provide: EmailService, useValue: mockEmail },
          { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test-key') } },
          { provide: getQueueToken(QUEUE_NAME), useValue: {} },
        ],
      }).compile()
      const failProcessor = module.get<VideoProcessor>(VideoProcessor)

      await failProcessor.process(makeJob(jobData))

      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })
  })
})
