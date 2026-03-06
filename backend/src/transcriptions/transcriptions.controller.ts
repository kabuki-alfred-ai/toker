import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Request, UseGuards } from '@nestjs/common'
import { TranscriptionsService } from './transcriptions.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { SubmitTranscriptionDto } from './dto/submit-transcription.dto'

@Controller('transcriptions')
@UseGuards(JwtAuthGuard)
export class TranscriptionsController {
  constructor(private readonly transcriptionsService: TranscriptionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  submit(
    @Request() req: { user: { id: string } },
    @Body() dto: SubmitTranscriptionDto,
  ) {
    return this.transcriptionsService.submit(req.user.id, dto)
  }

  @Get()
  findAll(
    @Request() req: { user: { id: string } },
    @Query('page') page?: string,
  ) {
    return this.transcriptionsService.findAll(req.user.id, page ? parseInt(page, 10) : 1)
  }

  @Get(':id')
  getOne(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.transcriptionsService.getOne(req.user.id, id)
  }
}
