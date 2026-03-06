import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { SourceFinderService } from './source-finder.service'

@Controller('source-finder')
@UseGuards(JwtAuthGuard)
export class SourceFinderController {
  constructor(private readonly sourceFinderService: SourceFinderService) {}

  @Post()
  submit(
    @Request() req: { user: { id: string } },
    @Body() body: { videoUrl: string },
  ) {
    return this.sourceFinderService.submit(req.user.id, body.videoUrl)
  }

  @Get()
  findAll(
    @Request() req: { user: { id: string } },
    @Query('page') page?: string,
  ) {
    return this.sourceFinderService.findAll(req.user.id, page ? parseInt(page, 10) : 1)
  }

  @Get(':id')
  getOne(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.sourceFinderService.getOne(req.user.id, id)
  }
}
