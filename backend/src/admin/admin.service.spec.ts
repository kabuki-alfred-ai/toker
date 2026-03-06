import { Test, TestingModule } from '@nestjs/testing'
import { AdminService } from './admin.service'
import { PrismaService } from '../common/prisma/prisma.service'

const mockPrisma = {
  transcription: { count: jest.fn(), findMany: jest.fn() },
  user: { count: jest.fn(), findMany: jest.fn() },
}

describe('AdminService', () => {
  let service: AdminService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get<AdminService>(AdminService)
    jest.clearAllMocks()
  })

  describe('getStats', () => {
    it('should return platform stats', async () => {
      mockPrisma.transcription.count.mockResolvedValue(5)
      mockPrisma.user.count.mockResolvedValue(2)

      const result = await service.getStats()

      expect(result).toHaveProperty('transcriptionsToday')
      expect(result).toHaveProperty('transcriptionsTotal')
      expect(result).toHaveProperty('newUsersThisWeek')
      expect(result).toHaveProperty('creditsConsumedToday')
    })
  })

  describe('getUsers', () => {
    it('should return paginated users with balance and tx count', async () => {
      const users = [{
        id: 'uid_1', email: 'a@b.com', role: 'USER', createdAt: new Date(),
        creditWallet: { balance: 5 },
        _count: { transcriptions: 3 },
      }]
      mockPrisma.user.findMany.mockResolvedValue(users)
      mockPrisma.user.count.mockResolvedValue(1)

      const result = await service.getUsers(1, '')

      expect(result.items[0].email).toBe('a@b.com')
      expect(result.items[0].balance).toBe(5)
      expect(result.items[0].transcriptionsCount).toBe(3)
    })
  })

  describe('getJobs', () => {
    it('should return paginated jobs with user email', async () => {
      const jobs = [{
        id: 'tx_1', status: 'FAILED', videoUrl: 'https://tiktok.com/@x/video/1',
        errorMsg: 'yt-dlp error', createdAt: new Date(), updatedAt: new Date(),
        user: { email: 'a@b.com' },
      }]
      mockPrisma.transcription.findMany.mockResolvedValue(jobs)
      mockPrisma.transcription.count.mockResolvedValue(1)

      const result = await service.getJobs(1, 'FAILED')

      expect(result.items[0].userEmail).toBe('a@b.com')
      expect(result.items[0].errorMsg).toBe('yt-dlp error')
    })
  })

  describe('AdminGuard', () => {
    it('should deny non-admin users', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AdminGuard } = require('../common/guards/admin.guard')
      const guard = new AdminGuard()
      const ctx = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: 'USER' } }),
        }),
      }
      expect(() => guard.canActivate(ctx as never)).toThrow()
    })

    it('should allow admin users', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AdminGuard } = require('../common/guards/admin.guard')
      const guard = new AdminGuard()
      const ctx = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: 'ADMIN' } }),
        }),
      }
      expect(guard.canActivate(ctx)).toBe(true)
    })
  })
})
