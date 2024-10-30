import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import config from '../../config/config.json';
import { BridgeJob } from './job/BridgeJob';

@Injectable()
export class QueueService {
  constructor(@InjectQueue(config.queue.name) private queue: Queue) {}

  async addToQueue(data: BridgeJob, jobId: string) {
    try {
      const existingJob = await this.queue.getJob(jobId);
      if (existingJob) {
        Logger.warn(`Job with ID ${jobId} already exists`);
        return;
      }

      const job = await this.queue.add('job-name', data, {
        jobId: jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      });

      Logger.log(`Job added to queue: ${job.id}`);
      return job;
    } catch (error) {
      Logger.error('Error adding job to queue:', error);
      throw error;
    }
  }

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
