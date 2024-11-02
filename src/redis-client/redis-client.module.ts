import { Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RedisClientService } from './redis-client.service';

@Module({
  providers: [RedisClientService],
  exports: [RedisClientService],
})
export class RedisClientModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly redisClientService: RedisClientService) {}

  async onModuleInit() {
    try {
      await this.redisClientService.pingRedisClient();
    } catch (error) {
      Logger.error('Redis connection error:', error);
    }
  }

  async onModuleDestroy() {
    try {
      await this.redisClientService.closeRedisClient();
    } catch (error) {
      Logger.error('Error closing Redis connection:', error);
    }
  }
}
