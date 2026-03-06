import { BadRequestException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { PaymentsService } from './payments.service'
import { PrismaService } from '../common/prisma/prisma.service'
import { EmailService } from '../common/email/email.service'

// Mock Stripe — shared instance so tests can control methods
const mockStripeInstance = {
  checkout: { sessions: { create: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }) } },
  webhooks: { constructEvent: jest.fn() },
}

jest.mock('stripe', () => jest.fn().mockImplementation(() => mockStripeInstance))

const mockPrisma = {
  creditWallet: { update: jest.fn().mockResolvedValue(undefined) },
  user: { findUnique: jest.fn().mockResolvedValue({ email: 'test@example.com' }) },
}

const mockEmail = { sendCreditPurchasedEmail: jest.fn().mockResolvedValue(undefined) }

describe('PaymentsService', () => {
  let service: PaymentsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile()
    service = module.get<PaymentsService>(PaymentsService)
    jest.clearAllMocks()
  })

  describe('createCheckoutSession', () => {
    it('should return Stripe checkout URL for valid pack', async () => {
      const result = await service.createCheckoutSession('uid_1', 'test@example.com', 'pack_10')
      expect(result.url).toBe('https://checkout.stripe.com/test')
    })

    it('should throw BadRequestException for unknown pack', async () => {
      await expect(
        service.createCheckoutSession('uid_1', 'test@example.com', 'pack_invalid' as never),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('handleWebhook', () => {
    it('should credit wallet on checkout.session.completed', async () => {
      mockStripeInstance.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: { metadata: { userId: 'uid_1', credits: '50' } } },
      })

      await service.handleWebhook(Buffer.from('body'), 'sig')

      expect(mockPrisma.creditWallet.update).toHaveBeenCalledWith({
        where: { userId: 'uid_1' },
        data: { balance: { increment: 50 } },
      })
    })

    it('should throw BadRequestException on invalid signature', async () => {
      mockStripeInstance.webhooks.constructEvent.mockImplementation(() => { throw new Error('Invalid signature') })

      await expect(service.handleWebhook(Buffer.from('body'), 'bad_sig')).rejects.toThrow(BadRequestException)
    })

    it('should ignore non-checkout events', async () => {
      mockStripeInstance.webhooks.constructEvent.mockReturnValue({ type: 'payment_intent.created', data: { object: {} } })

      const result = await service.handleWebhook(Buffer.from('body'), 'sig')
      expect(result).toEqual({ received: true })
      expect(mockPrisma.creditWallet.update).not.toHaveBeenCalled()
    })
  })
})
