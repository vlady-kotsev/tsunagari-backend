import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { BridgeJob } from './job/BridgeJob';
import { ConfigService } from '@nestjs/config';

/**
 * Service for managing job queues in the bridge system.
 * Handles job creation, status checking, and queue management.
 */
@Injectable()
export class QueueService {
  /**
   * Creates an instance of QueueService.
   * @param queue - The BullMQ queue instance for job processing
   * @param configService - Service for accessing application configuration
   */
  constructor(
    @InjectQueue('default') private queue: Queue,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Adds a new job to the processing queue.
   * @param data - The bridge job data to be processed
   * @param jobId - Unique identifier for the job
   * @returns Promise resolving to the created job or undefined if creation fails
   * @throws Error if job creation fails
   */
  async addToQueue(data: BridgeJob, jobId: string) {
    try {
      const existingJob = await this.queue.getJob(jobId);
      if (existingJob) {
        Logger.warn(`Job with ID ${jobId} already exists`);
        return;
      }

      const job = await this.queue.add('job-name', data, {
        jobId: jobId,
        attempts: this.configService.get<number>('queue.jobAddAttempts'),
        backoff: {
          type: 'exponential',
          delay: this.configService.get<number>('queue.jobRetryDelay'),
        },
        removeOnComplete: true,
      });

      Logger.log(`Job added to queue: ${job.id}`);
      return job;
    } catch (error) {
      Logger.error('Error adding job to queue:', error);
    }
  }

  /**
   * Retrieves the current status of a job.
   * @param jobId - The ID of the job to check
   * @returns Promise resolving to the job status information or null if job not found
   */
  async getJobStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const progress = job.progress;

    return {
      id: job.id,
      state,
      progress,
      data: job.data,
    };
  }
}
