import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { TranscriptionsController } from './transcriptions.controller'
import { TranscriptionsService } from './transcriptions.service'
import { AuthModule } from '../auth/auth.module'
import { QUEUE_NAME } from '../queues/constants'

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({ name: QUEUE_NAME }),
  ],
  controllers: [TranscriptionsController],
  providers: [TranscriptionsService],
})
export class TranscriptionsModule {}
