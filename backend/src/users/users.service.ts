import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import * as bcrypt from 'bcrypt'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { creditWallet: true },
    })
    if (!user) throw new NotFoundException('User not found')
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      credits: { balance: user.creditWallet?.balance ?? 0 },
    }
  }

  async updateProfile(userId: string, dto: { firstName?: string; lastName?: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName?.trim() || null,
        lastName: dto.lastName?.trim() || null,
      },
    })
    return { firstName: user.firstName, lastName: user.lastName }
  }

  async updateEmail(userId: string, dto: { email: string; currentPassword: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')

    const valid = await bcrypt.compare(dto.currentPassword, user.password)
    if (!valid) throw new UnauthorizedException('Mot de passe incorrect')

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing && existing.id !== userId) throw new ConflictException('Email déjà utilisé')

    await this.prisma.user.update({ where: { id: userId }, data: { email: dto.email } })
    return { email: dto.email }
  }

  async updatePassword(userId: string, dto: { currentPassword: string; newPassword: string }) {
    if (dto.newPassword.length < 8) throw new BadRequestException('Le mot de passe doit faire au moins 8 caractères')

    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')

    const valid = await bcrypt.compare(dto.currentPassword, user.password)
    if (!valid) throw new UnauthorizedException('Mot de passe actuel incorrect')

    const hashed = await bcrypt.hash(dto.newPassword, 10)
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } })
    return { success: true }
  }
}
