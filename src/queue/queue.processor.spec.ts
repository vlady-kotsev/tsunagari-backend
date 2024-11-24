import { Test, TestingModule } from '@nestjs/testing';
import { QueueProcessor } from './queue.processor';
import { RedisClientService } from 'src/redis-client/redis-client.service';
import { EthereumClientService } from 'src/ethereum-client/ethereum-client.service';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import JobTypes from './job/JobTypes';
import { of, throwError } from 'rxjs';
import { TransactionReceipt } from 'ethers';

describe('QueueProcessor', () => {
  let processor: QueueProcessor;

  const mockRedisClientService = {
    lrange: jest.fn(),
    del: jest.fn(),
  };

  const mockEthereumClientService = {
    mintWrappedTokens: jest.fn(),
    unlockTokens: jest.fn(),
  };

  const mockConfig = {
    'app.grpcPassword': 'test-password',
  };

  const mockGrpcClient = {
    getService: jest.fn(() => ({
      StoreTransaction: jest.fn().mockReturnValue(of({})),
    })),
  };

  const mockJob = {
    id: 'test-job-id',
    data: {
      type: JobTypes.HANDLE_LOCK,
      message: 'test-message',
      recipient: '0x123',
      amount: '1000',
      destinationChainId: 1,
      destinationTokenAddress: '0x456',
      originTokenAddress: '0x789',
      originChainId: 2,
    },
  } as Job;

  const mockReceipt: TransactionReceipt = {
    status: 1,
    hash: '0xabc',
  } as TransactionReceipt;

  beforeEach(async () => {
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueProcessor,
        {
          provide: RedisClientService,
          useValue: mockRedisClientService,
        },
        {
          provide: EthereumClientService,
          useValue: mockEthereumClientService,
        },
        {
          provide: 'TRANSACTIONS_PACKAGE',
          useValue: mockGrpcClient,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          } as unknown as jest.Mocked<ConfigService>,
        },
      ],
    }).compile();

    processor = module.get<QueueProcessor>(QueueProcessor);
    await processor.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('should process HANDLE_LOCK job successfully', async () => {
      mockRedisClientService.lrange.mockResolvedValue(['signature1']);
      mockEthereumClientService.mintWrappedTokens.mockResolvedValue(
        mockReceipt,
      );

      await processor.process(mockJob);

      expect(mockRedisClientService.lrange).toHaveBeenCalledWith(
        'test-message',
      );
      expect(mockRedisClientService.del).toHaveBeenCalledWith('test-message');
      expect(mockEthereumClientService.mintWrappedTokens).toHaveBeenCalled();
    });

    it('should process HANDLE_BURN job successfully', async () => {
      const burnJob = {
        ...mockJob,
        data: { ...mockJob.data, type: JobTypes.HANDLE_BURN },
      };
      mockRedisClientService.lrange.mockResolvedValue(['signature1']);
      mockEthereumClientService.unlockTokens.mockResolvedValue(mockReceipt);

      await processor.process(burnJob as Job);

      expect(mockRedisClientService.lrange).toHaveBeenCalledWith(
        'test-message',
      );
      expect(mockRedisClientService.del).toHaveBeenCalledWith('test-message');
      expect(mockEthereumClientService.unlockTokens).toHaveBeenCalled();
    });

    it('should handle empty signatures', async () => {
      mockRedisClientService.lrange.mockResolvedValue([]);

      await processor.process(mockJob);

      expect(mockRedisClientService.lrange).toHaveBeenCalledWith(
        'test-message',
      );
      expect(mockRedisClientService.del).not.toHaveBeenCalled();
      expect(
        mockEthereumClientService.mintWrappedTokens,
      ).not.toHaveBeenCalled();
    });

    it('should handle failed transaction', async () => {
      mockRedisClientService.lrange.mockResolvedValue(['signature1']);
      mockEthereumClientService.mintWrappedTokens.mockResolvedValue({
        ...mockReceipt,
        status: 0,
      });

      await processor.process(mockJob);

      expect(Logger.error).toHaveBeenCalled();
    });

    it('should handle error in processJob', async () => {
      mockRedisClientService.lrange.mockRejectedValue(new Error('Redis error'));

      await processor.process(mockJob);

      expect(Logger.error).toHaveBeenCalledWith(
        'Error processing job: Error: Redis error'
      );
    });
  });

  describe('event handlers', () => {
    it('should handle completed event', async () => {
      await processor.onCompleted(mockJob);
      expect(Logger.log).toHaveBeenCalledWith(`Job completed: ${mockJob.id}`);
    });

    it('should handle failed event', () => {
      const error = new Error('Test error');
      processor.onFailed(mockJob, error);
      expect(Logger.error).toHaveBeenCalled();
    });

    it('should handle active event', () => {
      processor.onActive(mockJob);
      expect(Logger.log).toHaveBeenCalledWith(`Job ${mockJob.id} started`);
    });

    it('should handle error in onCompleted when storing transaction', async () => {
      jest.clearAllMocks();
      
      const mockGrpcError = new Error('GRPC error');
      const mockStoreTransaction = jest.fn().mockReturnValue(
        throwError(() => mockGrpcError)
      );

      jest.spyOn(Logger, 'error').mockImplementation(() => undefined);

      mockGrpcClient.getService.mockReturnValue({
        StoreTransaction: mockStoreTransaction,
      });

      await processor.onModuleInit();

      await processor.onCompleted(mockJob);

      expect(Logger.error).toHaveBeenCalledWith(
        `Error storing transaction: ${mockGrpcError}`
      );
    });
  });
});
