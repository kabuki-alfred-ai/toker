import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { VideoProcessor } from './video.processor'
import { EmailModule } from '../common/email/email.module'
import { QUEUE_NAME } from './constants'

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_NAME }), EmailModule],
  providers: [VideoProcessor],
})
export class QueuesModule {}
