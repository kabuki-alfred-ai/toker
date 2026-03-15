import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { SubtitleRemoverService } from './subtitle-remover.service'
import { SubmitSubtitleRemovalDto } from './dto/submit-subtitle-removal.dto'

@Controller('subtitle-remover')
@UseGuards(JwtAuthGuard)
export class SubtitleRemoverController {
  constructor(private readonly subtitleRemoverService: SubtitleRemoverService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  submit(
    @Request() req: { user: { id: string } },
    @Body() dto: SubmitSubtitleRemovalDto,
  ) {
    return this.subtitleRemoverService.submit(req.user.id, dto)
  }

  @Get()
  findAll(
    @Request() req: { user: { id: string } },
    @Query('page') page?: string,
  ) {
    return this.subtitleRemoverService.findAll(req.user.id, page ? parseInt(page, 10) : 1)
  }

  @Get(':id')
  getOne(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.subtitleRemoverService.getOne(req.user.id, id)
  }

  @Get(':id/file')
  getFile(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.subtitleRemoverService.getPresignedUrl(req.user.id, id)
  }
}
