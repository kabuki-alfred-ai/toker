import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@Request() req: { user: { id: string } }) {
    return this.usersService.getMe(req.user.id)
  }

  @Patch('me')
  updateProfile(
    @Request() req: { user: { id: string } },
    @Body() body: { firstName?: string; lastName?: string },
  ) {
    return this.usersService.updateProfile(req.user.id, body)
  }

  @Patch('me/email')
  updateEmail(
    @Request() req: { user: { id: string } },
    @Body() body: { email: string; currentPassword: string },
  ) {
    return this.usersService.updateEmail(req.user.id, body)
  }

  @Patch('me/password')
  updatePassword(
    @Request() req: { user: { id: string } },
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.usersService.updatePassword(req.user.id, body)
  }
}
