import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import Redis from 'ioredis'

const AUDIO_CACHE_TTL = 7 * 24 * 60 * 60 // 7 days in seconds

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis

  onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      lazyConnect: true,
    })
  }

  async onModuleDestroy() {
    await this.client.quit()
  }

  async getAudioPath(uuid: string): Promise<string | null> {
    return this.client.get(`audio:uuid:${uuid}`)
  }

  async setAudioPath(uuid: string, filePath: string): Promise<void> {
    await this.client.setex(`audio:uuid:${uuid}`, AUDIO_CACHE_TTL, filePath)
  }
}
