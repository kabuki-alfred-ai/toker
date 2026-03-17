import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { MulterModule } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { SubtitleGeneratorController } from './subtitle-generator.controller'
import { SubtitleGeneratorService } from './subtitle-generator.service'
import { SubtitleGeneratorProcessor } from './subtitle-generator.processor'
import { AuthModule } from '../auth/auth.module'
import { SUBTITLE_GENERATOR_QUEUE } from './subtitle-generator.constants'

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({ name: SUBTITLE_GENERATOR_QUEUE }),
    MulterModule.register({ storage: memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } }),
  ],
  controllers: [SubtitleGeneratorController],
  providers: [SubtitleGeneratorService, SubtitleGeneratorProcessor],
})
export class SubtitleGeneratorModule {}
