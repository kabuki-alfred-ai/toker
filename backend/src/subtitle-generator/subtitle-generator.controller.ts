import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { SubtitleGeneratorService } from './subtitle-generator.service'
import { SubmitSubtitleGenerationDto } from './dto/submit-subtitle-generation.dto'

@Controller('subtitle-generator')
@UseGuards(JwtAuthGuard)
export class SubtitleGeneratorController {
  constructor(private readonly subtitleGeneratorService: SubtitleGeneratorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  submit(
    @Request() req: { user: { id: string } },
    @Body() dto: SubmitSubtitleGenerationDto,
  ) {
    return this.subtitleGeneratorService.submitTranscribe(req.user.id, dto)
  }

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  submitFromFile(
    @Request() req: { user: { id: string } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.subtitleGeneratorService.submitTranscribeFromFile(req.user.id, file)
  }

  @Post(':id/render')
  @HttpCode(HttpStatus.ACCEPTED)
  render(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: { preset: string; customization: object; wordSegments?: unknown[] },
  ) {
    return this.subtitleGeneratorService.submitRender(req.user.id, id, body.preset, body.customization, body.wordSegments)
  }

  @Get()
  findAll(
    @Request() req: { user: { id: string } },
    @Query('page') page?: string,
  ) {
    return this.subtitleGeneratorService.findAll(req.user.id, page ? parseInt(page, 10) : 1)
  }

  @Get(':id')
  getOne(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.subtitleGeneratorService.getOne(req.user.id, id)
  }

  @Get(':id/file')
  getFile(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.subtitleGeneratorService.getPresignedUrl(req.user.id, id)
  }
}
