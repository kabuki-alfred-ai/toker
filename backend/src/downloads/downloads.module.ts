import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { DownloadsController } from './downloads.controller'
import { DownloadsService } from './downloads.service'
import { DownloadsProcessor } from './downloads.processor'
import { AuthModule } from '../auth/auth.module'
import { DOWNLOAD_QUEUE } from './downloads.constants'

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({ name: DOWNLOAD_QUEUE }),
  ],
  controllers: [DownloadsController],
  providers: [DownloadsService, DownloadsProcessor],
})
export class DownloadsModule {}
