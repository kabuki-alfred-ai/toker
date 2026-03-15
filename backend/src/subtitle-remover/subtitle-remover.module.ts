import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { SubtitleRemoverController } from './subtitle-remover.controller'
import { SubtitleRemoverService } from './subtitle-remover.service'
import { SubtitleRemoverProcessor } from './subtitle-remover.processor'
import { AuthModule } from '../auth/auth.module'
import { SUBTITLE_REMOVER_QUEUE } from './subtitle-remover.constants'

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({ name: SUBTITLE_REMOVER_QUEUE }),
  ],
  controllers: [SubtitleRemoverController],
  providers: [SubtitleRemoverService, SubtitleRemoverProcessor],
})
export class SubtitleRemoverModule {}
