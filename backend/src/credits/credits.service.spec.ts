import { Test, TestingModule } from '@nestjs/testing'
import { CreditsService } from './credits.service'
import { PrismaService } from '../common/prisma/prisma.service'

const mockPrisma = {
  creditWallet: { updateMany: jest.fn().mockResolvedValue({ count: 3 }) },
}

describe('CreditsService', () => {
  let service: CreditsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get<CreditsService>(CreditsService)
    jest.clearAllMocks()
  })

  describe('weeklyReset', () => {
    it('should update wallets with balance < 5', async () => {
      await service.weeklyReset()
      expect(mockPrisma.creditWallet.updateMany).toHaveBeenCalledWith({
        where: { balance: { lt: 5 } },
        data: { balance: 5 },
      })
    })
  })

  describe('getNextResetDate', () => {
    it('should return a future Monday at midnight UTC', async () => {
      const date = await service.getNextResetDate()
      expect(date.getUTCDay()).toBe(1) // Monday
      expect(date.getUTCHours()).toBe(0)
      expect(date > new Date()).toBe(true)
    })
  })
})
