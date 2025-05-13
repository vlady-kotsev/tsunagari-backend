import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { RedisClientService } from 'src/redis-client/redis-client.service';
import { EthereumClientService } from 'src/ethereum-client/ethereum-client.service';
import { BridgeJob } from './job/BridgeJob';
import JobTypes from './job/JobTypes';
import { ClientGrpcProxy } from '@nestjs/microservices';
import { TransactionsService } from 'src/transactions/transactions.service';
import { CreateTransactionDto } from 'src/transactions/dto/transaction.dto';
import { firstValueFrom } from 'rxjs';
import { Metadata } from '@grpc/grpc-js';
import { ConfigService } from '@nestjs/config';
import { TransactionReceipt } from 'ethers';
import { SOLANA_CHAIN_ID } from './consts';
import { SolanaClientService } from 'src/solana-client/solana-client.service';
import { web3 } from '@coral-xyz/anchor';

/**
 * Processor for handling bridge-related queue jobs.
 * Manages the processing of token locking and burning operations across chains.
 */
@Processor('default')
export class QueueProcessor extends WorkerHost implements OnModuleInit {
  /** Service for handling transaction-related gRPC calls */
  private transactionsService: TransactionsService;

  /**
   * Creates an instance of QueueProcessor.
   * @param redisClientService - Service for Redis operations
   * @param ethereumClientService - Service for Ethereum blockchain interactions
   * @param grpcClient - gRPC client for transaction service communication
   */
  constructor(
    private readonly redisClientService: RedisClientService,
    private readonly ethereumClientService: EthereumClientService,
    private readonly solanaClientService: SolanaClientService,
    @Inject('TRANSACTIONS_PACKAGE')
    private readonly grpcClient: ClientGrpcProxy,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  /**
   * Initializes the gRPC transaction service on module initialization.
   */
  async onModuleInit() {
    this.transactionsService = this.grpcClient.getService<TransactionsService>(
      'TransactionsService',
    );
  }

  /**
   * Processes incoming jobs from the queue.
   * @param job - The job to be processed
   * @returns Promise resolving when the job is completed
   */
  async process(job: Job<any, any, string>): Promise<any> {
    Logger.log('Processing job:', job.id);
    Logger.log('Job data:', job.data);

    await this.processJob(job.data);

    Logger.log('Job completed:', job.id);
  }

  /**
   * Processes a bridge job, handling either token locking or burning operations.
   * @param data - The bridge job data containing operation details
   * @throws Error if the job processing fails
   */
  private async processJob(data: BridgeJob) {
    try {
      const signatures = await this.redisClientService.lrange(data.message);
      if (signatures.length === 0) {
        return;
      }
      await this.redisClientService.del(data.message);

      if (data.destinationChainId === SOLANA_CHAIN_ID) {
        await this.processJobWithSolanaDestination(data, signatures);
      } else {
        await this.processJobWithEvmDestination(data, signatures);
      }
      Logger.log(`Processing job: ${data.type}`);
    } catch (error) {
      Logger.error(`Error processing job: ${error}`);
    }
  }

  private processJobWithSolanaDestination = async (
    data: BridgeJob,
    signatures: string[],
  ) => {
    let success: boolean;
    let tx: string;

    if (data.type === JobTypes.HANDLE_LOCK) {
      // handle lock
    } else if (data.type === JobTypes.HANDLE_BURN) {
      const nativeTokenMint = new web3.PublicKey(data.destinationTokenAddress);
      const signatureBytes = signatures.map((sig) => {

        const cleanSig = sig.startsWith('0x') ? sig.slice(2) : sig;
        return Buffer.from(cleanSig, 'hex');
      });

      const { status, txSignature } =
        await this.solanaClientService.unlockTokens(
          data.message,
          signatureBytes,
          data.recipient,
          BigInt(data.amount),
          nativeTokenMint,
        );
      success = status;
      tx = txSignature;
    }

    if (!success) {
      Logger.error(`Transaction failed: ${tx}`);
    }
  };

  private processJobWithEvmDestination = async (
    data: BridgeJob,
    signatures: string[],
  ) => {
    // get only the last 20 bytes
    let recipient = `0x${data.recipient.slice(-40)}`;

    let receipt: TransactionReceipt;
    if (data.type === JobTypes.HANDLE_LOCK) {
      receipt = await this.ethereumClientService.mintWrappedTokens(
        data.message,
        signatures,
        recipient,
        BigInt(data.amount),
        data.destinationChainId,
        data.destinationTokenAddress,
      );
    } else if (data.type === JobTypes.HANDLE_BURN) {
      receipt = await this.ethereumClientService.unlockTokens(
        data.message,
        signatures,
        recipient,
        BigInt(data.amount),
        data.destinationChainId,
        data.destinationTokenAddress,
      );
    }

    if (receipt.status === 0) {
      Logger.error(`Transaction failed: ${receipt.hash}`);
      return;
    }
  };

  /**
   * Handles job completion by storing transaction details, calling the backend-api via gRPC.
   * @param job - The completed bridge job
   */
  @OnWorkerEvent('completed')
  async onCompleted(job: Job<BridgeJob>) {
    const transaction = new CreateTransactionDto();

    transaction.user = job.data.recipient;
    transaction.originTokenAddress = job.data.originTokenAddress;
    transaction.destinationTokenAddress = job.data.destinationTokenAddress;
    transaction.amount = job.data.amount;
    transaction.originChainId = job.data.originChainId;
    transaction.destinationChainId = job.data.destinationChainId;

    try {
      const metadata = new Metadata();
      metadata.add(
        'password',
        this.configService.get<string>('app.grpcPassword'),
      );
      await firstValueFrom(
        this.transactionsService.StoreTransaction(transaction, metadata),
      );
    } catch (error) {
      Logger.error(`Error storing transaction: ${error}`);
      return;
    }

    Logger.log(`Job completed: ${job.id}`);
  }

  /**
   * Handles job failures by logging the error.
   * @param job - The failed job
   * @param error - The error that caused the failure
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    Logger.error(`Job ${job.id} failed:`, error);
  }

  /**
   * Handles job activation by logging the start.
   * @param job - The activated job
   */
  @OnWorkerEvent('active')
  onActive(job: Job) {
    Logger.log(`Job ${job.id} started`);
  }
}
