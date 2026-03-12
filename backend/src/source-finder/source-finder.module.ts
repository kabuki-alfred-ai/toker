import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { SourceFinderController } from './source-finder.controller'
import { SourceFinderService } from './source-finder.service'
import { SourceFinderProcessor } from './source-finder.processor'
import { GeminiSourceFinderService } from './gemini-source-finder.service'
import { SOURCE_FINDER_QUEUE } from './source-finder.constants'

@Module({
  imports: [BullModule.registerQueue({ name: SOURCE_FINDER_QUEUE })],
  controllers: [SourceFinderController],
  providers: [SourceFinderService, SourceFinderProcessor, GeminiSourceFinderService],
})
export class SourceFinderModule {}
