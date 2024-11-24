import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisClientService } from './redis-client.service';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

jest.mock('ioredis');

describe('RedisClientService', () => {
  let service: RedisClientService;
  let configService: ConfigService;
  let redisMock: jest.Mocked<Redis>;

  const mockConfig = {
    'redis.host': 'localhost',
    'redis.port': 6379,
    'redis.password': 'password',
    'redis.retryDelay': 100,
    'redis.maxDelay': 2000,
    'redis.maxRetries': 3,
  };

  beforeAll(() => {
    jest.spyOn(Logger, 'error').mockImplementation(() => {});
    jest.spyOn(Logger, 'log').mockImplementation(() => {});
    jest.spyOn(Logger, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisClientService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<RedisClientService>(RedisClientService);
    configService = module.get<ConfigService>(ConfigService);
    redisMock = service['redisClient'] as jest.Mocked<Redis>;
  });

  describe('constructor', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      
      const MockRedis = jest.fn().mockImplementation((config: any) => ({
        ping: jest.fn(),
        quit: jest.fn(),
        del: jest.fn(),
        lrange: jest.fn(),
        rpush: jest.fn(),
        llen: jest.fn(),
      }));

      (Redis as unknown as jest.Mock).mockImplementation(MockRedis);
    });

    it('should initialize Redis with correct config', () => {
      new RedisClientService(configService);
      
      const constructorCall = (Redis as unknown as jest.Mock).mock.calls[0][0];
      expect(constructorCall).toBeDefined();
      
      expect(constructorCall.host).toBe(mockConfig['redis.host']);
      expect(constructorCall.port).toBe(mockConfig['redis.port']);
      expect(constructorCall.password).toBe(mockConfig['redis.password']);
      expect(constructorCall.retryStrategy).toBeDefined();
      expect(constructorCall.maxRetriesPerRequest).toBeNull();
    });

    it('should pass correct retry strategy function to Redis', () => {
      new RedisClientService(configService);
      
      const constructorCall = (Redis as unknown as jest.Mock).mock.calls[0][0];
      expect(constructorCall).toBeDefined();
      
      const retryStrategyFn = constructorCall.retryStrategy;
      expect(retryStrategyFn).toBeDefined();
      
      const result = retryStrategyFn(2);
      expect(result).toBe(200); // 2 * retryDelay(100)
      
      const resultExceeded = retryStrategyFn(4);
      expect(resultExceeded).toBeNull();
    });
  });

  describe('retryStrategy', () => {
    it('should return delay when attempts are within limit', () => {
      const times = 2;
      const delay = service['retryStrategy'](times);
      expect(delay).toBe(200); // times * retryDelay
    });

    it('should return null when max retries exceeded', () => {
      const times = 4;
      const loggerSpy = jest.spyOn(Logger, 'error');
      const delay = service['retryStrategy'](times);
      
      expect(delay).toBeNull();
      expect(loggerSpy).toHaveBeenCalledWith(
        `Failed to connect to Redis after ${times} attempts`
      );
    });
  });

  describe('pingRedisClient', () => {
    it('should successfully ping Redis', async () => {
      redisMock.ping.mockResolvedValue('PONG');
      const loggerSpy = jest.spyOn(Logger, 'log');

      await service.pingRedisClient();

      expect(redisMock.ping).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith('Successfully connected to Redis');
    });

    it('should throw error on ping failure', async () => {
      const error = new Error('Ping failed');
      redisMock.ping.mockRejectedValue(error);
      const loggerSpy = jest.spyOn(Logger, 'error');

      await expect(service.pingRedisClient()).rejects.toThrow(error);
      expect(loggerSpy).toHaveBeenCalledWith('Redis connection error:', error);
    });
  });

  describe('closeRedisClient', () => {
    it('should successfully close Redis connection', async () => {
      redisMock.quit.mockResolvedValue('OK');

      await service.closeRedisClient();

      expect(redisMock.quit).toHaveBeenCalled();
    });

    it('should throw error on close failure', async () => {
      const error = new Error('Close failed');
      redisMock.quit.mockRejectedValue(error);
      const loggerSpy = jest.spyOn(Logger, 'error');

      await expect(service.closeRedisClient()).rejects.toThrow(error);
      expect(loggerSpy).toHaveBeenCalledWith('Error closing Redis connection:', error);
    });
  });

  describe('Redis operations', () => {
    describe('del', () => {
      it('should successfully delete key', async () => {
        redisMock.del.mockResolvedValue(1);

        const result = await service.del('test-key');

        expect(result).toBe(1);
        expect(redisMock.del).toHaveBeenCalledWith('test-key');
      });

      it('should handle delete error', async () => {
        const error = new Error('Delete failed');
        redisMock.del.mockRejectedValue(error);
        const loggerSpy = jest.spyOn(Logger, 'error');

        await service.del('test-key');

        expect(loggerSpy).toHaveBeenCalledWith(`Error deleting key test-key: ${error}`);
      });
    });

    describe('lrange', () => {
      it('should get range of elements', async () => {
        const mockResult = ['item1', 'item2'];
        redisMock.lrange.mockResolvedValue(mockResult);

        const result = await service.lrange('test-key');

        expect(result).toEqual(mockResult);
        expect(redisMock.lrange).toHaveBeenCalledWith('test-key', 0, -1);
      });

      it('should handle lrange error', async () => {
        const error = new Error('LRANGE failed');
        redisMock.lrange.mockRejectedValue(error);
        const loggerSpy = jest.spyOn(Logger, 'error');

        await service.lrange('test-key');

        expect(loggerSpy).toHaveBeenCalledWith(`Error getting range from key test-key: ${error}`);
      });
    });

    describe('rpush', () => {
      it('should push value to list', async () => {
        redisMock.rpush.mockResolvedValue(1);

        const result = await service.rpush('test-key', 'value');

        expect(result).toBe(1);
        expect(redisMock.rpush).toHaveBeenCalledWith('test-key', 'value');
      });

      it('should handle rpush error', async () => {
        const error = new Error('RPUSH failed');
        redisMock.rpush.mockRejectedValue(error);
        const loggerSpy = jest.spyOn(Logger, 'error');

        await service.rpush('test-key', 'value');

        expect(loggerSpy).toHaveBeenCalledWith(`Error pushing value to key test-key: ${error}`);
      });
    });

    describe('llen', () => {
      it('should get list length', async () => {
        redisMock.llen.mockResolvedValue(5);

        const result = await service.llen('test-key');

        expect(result).toBe(5);
        expect(redisMock.llen).toHaveBeenCalledWith('test-key');
      });

      it('should handle llen error', async () => {
        const error = new Error('LLEN failed');
        redisMock.llen.mockRejectedValue(error);
        const loggerSpy = jest.spyOn(Logger, 'error');

        await service.llen('test-key');

        expect(loggerSpy).toHaveBeenCalledWith(`Error getting length of key test-key: ${error}`);
      });
    });
  });
});
