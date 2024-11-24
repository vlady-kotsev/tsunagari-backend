import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { BridgeJob } from './job/BridgeJob';
import JobTypes from './job/JobTypes';

describe('QueueService', () => {
  let service: QueueService;
  let queueMock: jest.Mocked<Queue>;
  let configService: jest.Mocked<ConfigService>;

  const mockConfig = {
    'queue.jobAddAttempts': 3,
    'queue.jobRetryDelay': 1000,
  };

  beforeAll(() => {
    jest.spyOn(Logger, 'error').mockImplementation(() => {});
    jest.spyOn(Logger, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    queueMock = {
      add: jest.fn(),
      getJob: jest.fn(),
    } as unknown as jest.Mocked<Queue>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getQueueToken('default'),
          useValue: queueMock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          } as unknown as jest.Mocked<ConfigService>,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
    configService = module.get<ConfigService>(
      ConfigService,
    ) as jest.Mocked<ConfigService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addToQueue', () => {
    const mockJobData: BridgeJob = {
      message: 'test-message',
      type: JobTypes.HANDLE_BURN,
      recipient: 'test-recipient',
      originTokenAddress: 'test-address',
      destinationTokenAddress: 'test-address',
      amount: '100',
      originChainId: 1,
      destinationChainId: 2,
    };
    const mockJobId = 'test-job-id';

    it('should successfully add a new job to the queue', async () => {
      const mockJob = { id: mockJobId };
      queueMock.getJob.mockResolvedValue(null);
      queueMock.add.mockResolvedValue(mockJob as any);

      const result = await service.addToQueue(mockJobData, mockJobId);

      expect(queueMock.add).toHaveBeenCalledWith('job-name', mockJobData, {
        jobId: mockJobId,
        attempts: mockConfig['queue.jobAddAttempts'],
        backoff: {
          type: 'exponential',
          delay: mockConfig['queue.jobRetryDelay'],
        },
        removeOnComplete: true,
      });
      expect(result).toEqual(mockJob);
    });

    it('should not add job if it already exists', async () => {
      const existingJob = { id: mockJobId };
      queueMock.getJob.mockResolvedValue(existingJob as any);
      const loggerSpy = jest.spyOn(Logger, 'warn');

      const result = await service.addToQueue(mockJobData, mockJobId);

      expect(queueMock.add).not.toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        `Job with ID ${mockJobId} already exists`,
      );
      expect(result).toBeUndefined();
    });

    it('should handle errors when adding job', async () => {
      const error = new Error('Queue error');
      queueMock.getJob.mockResolvedValue(null);
      queueMock.add.mockRejectedValue(error);
      const loggerSpy = jest.spyOn(Logger, 'error');

      const result = await service.addToQueue(mockJobData, mockJobId);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Error adding job to queue:',
        error,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('getJobStatus', () => {
    const mockJobId = 'test-job-id';

    it('should return null if job not found', async () => {
      queueMock.getJob.mockResolvedValue(null);

      const result = await service.getJobStatus(mockJobId);

      expect(result).toBeNull();
      expect(queueMock.getJob).toHaveBeenCalledWith(mockJobId);
    });

    it('should return job status if job exists', async () => {
      const mockJob = {
        id: mockJobId,
        data: { someData: 'test' },
        progress: 50,
        getState: jest.fn().mockResolvedValue('active'),
      };
      queueMock.getJob.mockResolvedValue(mockJob as any);

      const result = await service.getJobStatus(mockJobId);

      expect(result).toEqual({
        id: mockJobId,
        state: 'active',
        progress: 50,
        data: { someData: 'test' },
      });
      expect(mockJob.getState).toHaveBeenCalled();
    });
  });
});
