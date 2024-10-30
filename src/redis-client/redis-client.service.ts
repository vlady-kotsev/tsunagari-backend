import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisClientService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;

  constructor() {
    this.redisClient = new Redis({
      host: 'localhost',
      port: 6379,
    });
  }

  async onModuleInit() {
    try {
      await this.redisClient.ping();
      Logger.log('Successfully connected to Redis');
    } catch (error) {
      Logger.error('Redis connection error:', error);
    }
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
  }

  async del(key: string): Promise<number> {
    return await this.redisClient.del(key);
  }

  async lrange(key: string, start = 0, stop = -1): Promise<string[]> {
    return await this.redisClient.lrange(key, start, stop);
  }

  async rpush(key: string, value: string): Promise<number> {
    return await this.redisClient.rpush(key, value);
  }

  async llen(key: string): Promise<number> {
    return await this.redisClient.llen(key);
  }
}
