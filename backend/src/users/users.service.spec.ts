import { NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { UsersService } from './users.service'
import { PrismaService } from '../common/prisma/prisma.service'

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
}

describe('UsersService', () => {
  let service: UsersService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
    jest.clearAllMocks()
  })

  describe('getMe', () => {
    it('should return user with credit balance', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'uid_1',
        email: 'test@example.com',
        role: 'USER',
        creditWallet: { balance: 5 },
      })

      const result = await service.getMe('uid_1')

      expect(result).toEqual({
        id: 'uid_1',
        email: 'test@example.com',
        role: 'USER',
        credits: { balance: 5 },
      })
    })

    it('should return balance 0 if no wallet', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'uid_1',
        email: 'test@example.com',
        role: 'USER',
        creditWallet: null,
      })

      const result = await service.getMe('uid_1')

      expect(result.credits.balance).toBe(0)
    })

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(service.getMe('nonexistent')).rejects.toThrow(NotFoundException)
    })
  })
})
