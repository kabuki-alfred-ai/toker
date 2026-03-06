import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import Stripe from 'stripe'
import { PrismaService } from '../common/prisma/prisma.service'
import { EmailService } from '../common/email/email.service'

export const CREDIT_PACKS = [
  { id: 'pack_10', credits: 10, price: 999, label: '10 crédits', priceLabel: '9,99€' },
  { id: 'pack_50', credits: 50, price: 3999, label: '50 crédits', priceLabel: '39,99€', recommended: true },
  { id: 'pack_100', credits: 100, price: 6999, label: '100 crédits', priceLabel: '69,99€' },
] as const

export type PackId = typeof CREDIT_PACKS[number]['id']

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)
  private readonly stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async createCheckoutSession(userId: string, userEmail: string, packId: PackId) {
    const pack = CREDIT_PACKS.find((p) => p.id === packId)
    if (!pack) throw new BadRequestException('Pack invalide')

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: userEmail,
      line_items: [{ price_data: { currency: 'eur', unit_amount: pack.price, product_data: { name: pack.label } }, quantity: 1 }],
      metadata: { userId, packId, credits: String(pack.credits) },
      success_url: `${appUrl}/dashboard?credits_added=${pack.credits}`,
      cancel_url: `${appUrl}/credits`,
    })

    return { url: session.url }
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    let event: Stripe.Event
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET ?? '')
    } catch {
      throw new BadRequestException('Webhook signature invalide')
    }

    if (event.type !== 'checkout.session.completed') return { received: true }

    const session = event.data.object as Stripe.Checkout.Session
    const { userId, credits } = session.metadata ?? {}
    if (!userId || !credits) {
      this.logger.error('Webhook missing metadata', session.id)
      return { received: true }
    }

    const creditsNum = parseInt(credits, 10)
    await this.prisma.$transaction([
      this.prisma.creditWallet.update({
        where: { userId },
        data: { balance: { increment: creditsNum } },
      }),
      this.prisma.creditTransaction.create({
        data: { userId, amount: creditsNum, reason: 'PURCHASE', description: `${creditsNum} crédits achetés` },
      }),
    ])
    this.logger.log(`Credited ${creditsNum} credits to user ${userId}`)

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    if (user) {
      this.emailService.sendCreditPurchasedEmail(user.email, creditsNum).catch(() => {})
    }

    return { received: true }
  }
}
