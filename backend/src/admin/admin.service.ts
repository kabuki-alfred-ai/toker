import { Injectable } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)

    const weekStart = new Date()
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay())
    weekStart.setUTCHours(0, 0, 0, 0)

    const [txToday, txTotal, usersThisWeek, creditsUsedToday] = await Promise.all([
      this.prisma.transcription.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.transcription.count(),
      this.prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      this.prisma.transcription.count({
        where: { createdAt: { gte: todayStart }, status: { in: ['COMPLETED', 'PROCESSING', 'PENDING'] } },
      }),
    ])

    return {
      transcriptionsToday: txToday,
      transcriptionsTotal: txTotal,
      newUsersThisWeek: usersThisWeek,
      creditsConsumedToday: creditsUsedToday,
    }
  }

  async getUsers(page = 1, search = '') {
    const limit = 20
    const skip = (page - 1) * limit
    const where = search ? { email: { contains: search, mode: 'insensitive' as const } } : {}

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, role: true, createdAt: true,
          creditWallet: { select: { balance: true } },
          _count: { select: { transcriptions: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ])

    return {
      items: users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        balance: u.creditWallet?.balance ?? 0,
        transcriptionsCount: u._count.transcriptions,
      })),
      total,
      page,
    }
  }

  async getJobs(page = 1, status?: string) {
    const limit = 20
    const skip = (page - 1) * limit
    const where = status ? { status: status as never } : {}

    const [items, total] = await Promise.all([
      this.prisma.transcription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, status: true, videoUrl: true, errorMsg: true,
          createdAt: true, updatedAt: true,
          user: { select: { email: true } },
        },
      }),
      this.prisma.transcription.count({ where }),
    ])

    return {
      items: items.map((t) => ({
        id: t.id,
        status: t.status,
        videoUrl: t.videoUrl.slice(0, 60),
        errorMsg: t.errorMsg,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        userEmail: t.user.email,
      })),
      total,
      page,
    }
  }
}
