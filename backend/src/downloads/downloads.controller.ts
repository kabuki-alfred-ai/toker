import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { DownloadsService } from './downloads.service'
import { SubmitDownloadDto } from './dto/submit-download.dto'

@Controller('downloads')
@UseGuards(JwtAuthGuard)
export class DownloadsController {
  constructor(private readonly downloadsService: DownloadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  submit(
    @Request() req: { user: { id: string } },
    @Body() dto: SubmitDownloadDto,
  ) {
    return this.downloadsService.submit(req.user.id, dto)
  }

  @Get()
  findAll(
    @Request() req: { user: { id: string } },
    @Query('page') page?: string,
  ) {
    return this.downloadsService.findAll(req.user.id, page ? parseInt(page, 10) : 1)
  }

  @Get(':id')
  getOne(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.downloadsService.getOne(req.user.id, id)
  }

  @Get(':id/file')
  getFile(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.downloadsService.getPresignedUrl(req.user.id, id)
  }
}
