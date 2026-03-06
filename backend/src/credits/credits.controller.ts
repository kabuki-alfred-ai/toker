import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CreditsService } from './credits.service'

@Controller('credits')
@UseGuards(JwtAuthGuard)
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get('history')
  getHistory(
    @Request() req: { user: { id: string } },
    @Query('page') page?: string,
  ) {
    return this.creditsService.getHistory(req.user.id, page ? parseInt(page, 10) : 1)
  }
}
