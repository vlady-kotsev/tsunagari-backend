import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import config from '../../config/config.json';
import { RedisClientService } from 'src/redis-client/redis-client.service';
import { EthereumClientService } from 'src/ethereum-client/ethereum-client.service';
import { BridgeJob } from './job/BridgeJob';
import JobTypes from './job/JobTypes';
import { CreateTransactionDto } from 'src/transaction/dto/create-transaction.dto';
import { TransactionService } from 'src/transaction/transaction.service';

@Processor(config.queue.name)
export class QueueProcessor extends WorkerHost {
  constructor(
    private readonly redisClientService: RedisClientService,
    private readonly ethereumClientService: EthereumClientService,
    private readonly transactionService: TransactionService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    Logger.debug('Processing job:', job.id);
    Logger.debug('Job data:', job.data);

    await this.processJob(job.data);

    Logger.debug('Job completed:', job.id);
  }

  private async processJob(data: BridgeJob) {
    const signatures = await this.redisClientService.lrange(data.message);
    if (signatures.length === 0) {
      return;
    }
    await this.redisClientService.del(data.message);
    if (data.type === JobTypes.HANDLE_LOCK) {
      await this.ethereumClientService.mintWrappedTokens(
        data.message,
        signatures,
        data.recipient,
        BigInt(data.amount),
        data.destinationChainId,
        data.destinationTokenAddress,
      );
    } else if (data.type === JobTypes.HANDLE_BURN) {
      await this.ethereumClientService.unlockTokens(
        data.message,
        signatures,
        data.recipient,
        BigInt(data.amount),
        data.destinationChainId,
        data.destinationTokenAddress,
      );
    }
    Logger.log(`Processing job: ${data.type}`);
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job<BridgeJob>) {
    const transaction = new CreateTransactionDto(
      job.data.recipient,
      job.data.originTokenAddress,
      job.data.destinationTokenAddress,
      Number(job.data.amount),
      job.data.originChainId,
      job.data.destinationChainId,
    );

    await this.transactionService.addTransaction(transaction);

    Logger.debug(`Job completed: ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    Logger.error(`Job ${job.id} failed:`, error);
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    Logger.debug(`Job ${job.id} started`);
  }
}
