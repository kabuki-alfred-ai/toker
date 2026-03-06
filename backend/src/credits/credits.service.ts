import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../common/prisma/prisma.service'

const FREE_CREDITS = 5

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name)

  constructor(private readonly prisma: PrismaService) {}

  // Every Monday at 00:00 UTC
  @Cron('0 0 * * 1')
  async weeklyReset() {
    this.logger.log('Running weekly credits reset')
    const wallets = await this.prisma.creditWallet.findMany({
      where: { balance: { lt: FREE_CREDITS } },
      select: { userId: true, balance: true },
    })
    if (wallets.length === 0) return

    await this.prisma.$transaction([
      this.prisma.creditWallet.updateMany({
        where: { balance: { lt: FREE_CREDITS } },
        data: { balance: FREE_CREDITS },
      }),
      ...wallets.map((w) =>
        this.prisma.creditTransaction.create({
          data: {
            userId: w.userId,
            amount: FREE_CREDITS - w.balance,
            reason: 'WEEKLY_RESET',
            description: 'Recharge hebdomadaire automatique',
          },
        }),
      ),
    ])
    this.logger.log(`Reset ${wallets.length} wallets to ${FREE_CREDITS} credits`)
  }

  async getHistory(userId: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
      this.prisma.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: { id: true, amount: true, reason: true, description: true, createdAt: true },
      }),
      this.prisma.creditTransaction.count({ where: { userId } }),
    ])
    return { items, total, page, limit }
  }

  async getNextResetDate(): Promise<Date> {
    const now = new Date()
    const nextMonday = new Date(now)
    const day = now.getUTCDay()
    const daysUntilMonday = day === 0 ? 1 : 8 - day
    nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday)
    nextMonday.setUTCHours(0, 0, 0, 0)
    return nextMonday
  }
}
