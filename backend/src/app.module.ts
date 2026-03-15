import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { BullModule } from '@nestjs/bullmq'
import { ScheduleModule } from '@nestjs/schedule'
import { AppController } from './app.controller'
import { PrismaModule } from './common/prisma/prisma.module'
import { RedisModule } from './common/redis/redis.module'
import { StorageModule } from './common/storage/storage.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { TranscriptionsModule } from './transcriptions/transcriptions.module'
import { QueuesModule } from './queues/queues.module'
import { PaymentsModule } from './payments/payments.module'
import { CreditsModule } from './credits/credits.module'
import { AdminModule } from './admin/admin.module'
import { SourceFinderModule } from './source-finder/source-finder.module'
import { DownloadsModule } from './downloads/downloads.module'
import { SubtitleRemoverModule } from './subtitle-remover/subtitle-remover.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../.env', '.env'] }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    RedisModule,
    StorageModule,
    AuthModule,
    UsersModule,
    TranscriptionsModule,
    QueuesModule,
    PaymentsModule,
    CreditsModule,
    AdminModule,
    SourceFinderModule,
    DownloadsModule,
    SubtitleRemoverModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
