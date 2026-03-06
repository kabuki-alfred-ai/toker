import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'
import { AuthService } from './auth.service'
import { PrismaService } from '../common/prisma/prisma.service'
import { EmailService } from '../common/email/email.service'

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  creditWallet: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
}

const mockEmail = {
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
}

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
}

describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmail },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    jest.clearAllMocks()
  })

  describe('register', () => {
    const dto = { email: 'test@example.com', password: 'password123' }
    const createdUser = { id: 'cuid_123', email: dto.email, password: 'hashed', role: 'USER', createdAt: new Date(), updatedAt: new Date() }

    it('should create user + wallet with balance 5', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<typeof createdUser>) => cb(mockPrisma))
      mockPrisma.user.create.mockResolvedValue(createdUser)
      mockPrisma.creditWallet.create.mockResolvedValue({ id: 'wallet_1', userId: createdUser.id, balance: 5 })

      const result = await service.register(dto)

      expect(result).toEqual({ id: createdUser.id, email: createdUser.email })
      expect(mockPrisma.creditWallet.create).toHaveBeenCalledWith({
        data: { userId: createdUser.id, balance: 5 },
      })
    })

    it('should hash password before storing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<typeof createdUser>) => cb(mockPrisma))
      mockPrisma.user.create.mockResolvedValue(createdUser)
      mockPrisma.creditWallet.create.mockResolvedValue({})

      await service.register(dto)

      const createCall = mockPrisma.user.create.mock.calls[0][0]
      expect(createCall.data.password).not.toBe(dto.password)
      const isHashed = await bcrypt.compare(dto.password, createCall.data.password)
      expect(isHashed).toBe(true)
    })

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createdUser)

      await expect(service.register(dto)).rejects.toThrow(ConflictException)
      await expect(service.register(dto)).rejects.toThrow('Cet email est déjà utilisé')
    })

    it('should not return password in response', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<typeof createdUser>) => cb(mockPrisma))
      mockPrisma.user.create.mockResolvedValue(createdUser)
      mockPrisma.creditWallet.create.mockResolvedValue({})

      const result = await service.register(dto)

      expect(result).not.toHaveProperty('password')
    })
  })

  describe('login', () => {
    const dto = { email: 'test@example.com', password: 'password123' }

    it('should return token + user on valid credentials', async () => {
      const hashed = await bcrypt.hash(dto.password, 10)
      const user = { id: 'uid_1', email: dto.email, password: hashed, role: 'USER' }
      mockPrisma.user.findUnique.mockResolvedValue(user)
      mockJwt.sign.mockReturnValue('jwt.token')

      const result = await service.login(dto)

      expect(result.token).toBe('jwt.token')
      expect(result.user).toEqual({ id: user.id, email: user.email, role: 'USER' })
      expect(result.user).not.toHaveProperty('password')
    })

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException)
      await expect(service.login(dto)).rejects.toThrow('Email ou mot de passe incorrect')
    })

    it('should throw UnauthorizedException on wrong password', async () => {
      const user = { id: 'uid_1', email: dto.email, password: 'wrong_hash', role: 'USER' }
      mockPrisma.user.findUnique.mockResolvedValue(user)

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException)
    })
  })
})
