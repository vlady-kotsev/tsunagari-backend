import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

/**
 * Service for managing Redis operations and connections.
 * Provides methods for basic Redis operations and connection management.
 */
@Injectable()
export class RedisClientService {
  /** Redis client instance */
  private redisClient: Redis;

  /**
   * Creates an instance of RedisClientService.
   * Initializes Redis connection with retry strategy.
   * @param configService - Service for accessing application configuration
   */
  constructor(private configService: ConfigService) {
    this.redisClient = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      retryStrategy: (times: number) => this.retryStrategy(times),
      maxRetriesPerRequest: null,
    });
  }

  /**
   * Retry strategy for Redis connection.
   * @param times - Number of retry attempts
   * @returns Delay in milliseconds or null if no more retries are allowed
   */
  retryStrategy(times: number) {
    const delay = Math.min(
      times * this.configService.get<number>('redis.retryDelay'),
      this.configService.get<number>('redis.maxDelay'),
    );

    if (times > this.configService.get<number>('redis.maxRetries')) {
      Logger.error(`Failed to connect to Redis after ${times} attempts`);
      return null;
    }

    Logger.warn(`Retrying Redis connection in ${delay}ms (attempt ${times})`);
    return delay;
  }

  /**
   * Tests Redis connection by sending a ping command.
   * @throws Error if ping fails
   */
  async pingRedisClient() {
    try {
      await this.redisClient.ping();
      Logger.log('Successfully connected to Redis');
    } catch (error) {
      Logger.error('Redis connection error:', error);
      throw error;
    }
  }

  /**
   * Gracefully closes the Redis connection.
   * @throws Error if connection cannot be closed properly
   */
  async closeRedisClient() {
    try {
      await this.redisClient.quit();
    } catch (error) {
      Logger.error('Error closing Redis connection:', error);
      throw error;
    }
  }

  /**
   * Deletes a key from Redis.
   * @param key - The key to delete
   * @returns Promise resolving to the number of keys deleted
   */
  async del(key: string): Promise<number> {
    try {
      return await this.redisClient.del(key);
    } catch (error) {
      Logger.error(`Error deleting key ${key}: ${error}`);
    }
  }

  /**
   * Retrieves a range of elements from a Redis list.
   * @param key - The key of the list
   * @param start - Start index (default: 0)
   * @param stop - Stop index (default: -1, meaning the last element)
   * @returns Promise resolving to array of elements in the specified range
   */
  async lrange(key: string, start = 0, stop = -1): Promise<string[]> {
    try {
      return await this.redisClient.lrange(key, start, stop);
    } catch (error) {
      Logger.error(`Error getting range from key ${key}: ${error}`);
    }
  }

  /**
   * Appends one or more elements to a Redis list.
   * @param key - The key of the list
   * @param value - The value to append
   * @returns Promise resolving to the length of the list after the push operation
   */
  async rpush(key: string, value: string): Promise<number> {
    try {
      return await this.redisClient.rpush(key, value);
    } catch (error) {
      Logger.error(`Error pushing value to key ${key}: ${error}`);
    }
  }

  /**
   * Gets the length of a Redis list.
   * @param key - The key of the list
   * @returns Promise resolving to the length of the list
   */
  async llen(key: string): Promise<number> {
    try {
      return await this.redisClient.llen(key);
    } catch (error) {
      Logger.error(`Error getting length of key ${key}: ${error}`);
    }
  }
}
