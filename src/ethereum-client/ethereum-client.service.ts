import { Injectable } from '@nestjs/common';
import {
  Contract,
  EventLog,
  JsonRpcProvider,
  TransactionReceipt,
  Wallet,
  WebSocketProvider,
} from 'ethers';
import { RedisClientService } from 'src/redis-client/redis-client.service';
import { QueueService } from 'src/queue/queue.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import diamondAbi from './abi/diamond.json';
import { murmur3 } from 'murmurhash-js';
import { BridgeJob } from 'src/queue/job/BridgeJob';
import JobTypes from 'src/queue/job/JobTypes';
import { EventSignatures, SmartContractMethods } from './constants';
import { messageToBytes, createMessage } from './utils';

interface IProvider {
  provider: JsonRpcProvider;
  wsProvider: WebSocketProvider;
}

@Injectable()
export class EthereumClientService {
  private networksProviders: Map<number, IProvider>;
  private bridgeAddresses: Map<number, string>;
  private wallets: Map<number, Wallet>;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisClientService: RedisClientService,
    private readonly queueService: QueueService,
  ) {
    this.networksProviders = new Map<number, IProvider>();
    this.bridgeAddresses = new Map<number, string>();
    this.wallets = new Map<number, Wallet>();

    const networksConfig = this.configService.get('networks');
    for (const network of networksConfig) {
      if (!this.networksProviders.has(network.chainId)) {
        this.networksProviders.set(network.chainId, {
          provider: new JsonRpcProvider(network.rpcUrl),
          wsProvider: new WebSocketProvider(network.wsUrl),
        });
      }

      if (!this.bridgeAddresses.has(network.chainId)) {
        this.bridgeAddresses.set(network.chainId, network.bridgeAddress);
      }

      if (!this.wallets.has(network.chainId)) {
        const walletConfig = this.configService.get('wallet');
        this.wallets.set(
          network.chainId,
          new Wallet(
            walletConfig.privateKey,
            this.networksProviders.get(network.chainId).provider,
          ),
        );
      }
      Logger.log(`Added wallet and providers for chain ${network.chainId}`);
    }
  }

  /*//////////////////////////////////////////////////////////////
                         EVENT METHODS
  //////////////////////////////////////////////////////////////*/

  async setupAllEventListeners() {
    const networksConfig = this.configService.get('networks');
    for (const network of networksConfig) {
      await this.setupEventListeners(network.chainId);
    }
  }

  private async setupEventListeners(chainId: number) {
    const provider = this.networksProviders.get(chainId).wsProvider;
    if (!provider) {
      throw new Error(`No WS provider found for chain ID ${chainId}`);
    }

    const bridgeAddress = this.bridgeAddresses.get(chainId);
    const contract = new Contract(bridgeAddress, diamondAbi, provider);

    contract.on(
      EventSignatures.LOCK_EVENT_SIGNATURE,
      (
        recipient: string,
        tokenAddress: string,
        amount: bigint,
        destinationChainId: number,
        eventLog: EventLog,
      ) =>
        this.handleTokensLockedEvent(
          Number(chainId),
          recipient,
          tokenAddress,
          amount,
          Number(destinationChainId),
          eventLog,
        ),
    );
    Logger.log(`Listening for TokensLocked events on chain ${chainId}`);

    contract.on(
      EventSignatures.BURN_EVENT_SIGNATURE,
      (
        recipient: string,
        tokenAddress: string,
        amount: bigint,
        destinationChainId: number,
        eventLog: EventLog,
      ) =>
        this.handleWrappedTokensBurnedEvent(
          Number(chainId),
          recipient,
          tokenAddress,
          amount,
          Number(destinationChainId),
          eventLog,
        ),
    );
    Logger.log(`Listening for WrappedTokensBurned events on chain ${chainId}`);
  }

  async removeAllEventListeners() {
    const networksConfig = this.configService.get('networks');
    for (const network of networksConfig) {
      await this.removeEventListeners(network.chainId);
    }
  }

  private async removeEventListeners(chainId: number) {
    const provider = this.networksProviders.get(chainId).wsProvider;
    if (!provider) {
      throw new Error(`No WS provider found for chain ID ${chainId}`);
    }
    const bridgeAddress = this.bridgeAddresses.get(chainId);
    const contract = new Contract(bridgeAddress, diamondAbi, provider);

    contract.removeAllListeners();
    Logger.log(`Removed all event listeners for chain ${chainId}`);
  }

  private async handleTokensLockedEvent(
    originChainId: number,
    recipient: string,
    nativeTokenAddress: string,
    amount: bigint,
    destinationChainId: number,
    eventLog: EventLog,
  ) {
    Logger.log(
      `TokensLocked event:, ${recipient}, ${nativeTokenAddress}, ${amount}, ${destinationChainId}`,
    );
    const tokensConfig = this.configService.get('tokens');
    const wrappedTokenAddress =
      tokensConfig[originChainId][nativeTokenAddress].wrapped[
        destinationChainId
      ];

    const transactionHash = eventLog['log']['transactionHash'];

    const murmur3Seed = this.configService.get('app.murmur3Seed');
    const message = createMessage(transactionHash, murmur3Seed);

    const signature = await this.signMessage(message, destinationChainId);
    this.redisClientService.rpush(message, signature);

    Logger.log(`Signed message: ${message}`);

    const signaturesThreshold = await this.getThreshold(destinationChainId);
    const signaturesCount = await this.redisClientService.llen(message);

    if (signaturesCount >= signaturesThreshold) {
      const murmur3Seed = this.configService.get('app.murmur3Seed');
      const jobId: string = `jobID: ${murmur3(message, murmur3Seed).toString()}`;
      const job = new BridgeJob(
        message,
        JobTypes.HANDLE_LOCK,
        recipient,
        nativeTokenAddress,
        wrappedTokenAddress,
        amount.toString(),
        destinationChainId,
        originChainId,
      );
      await this.queueService.addToQueue(job, jobId);
    }
  }

  private async handleWrappedTokensBurnedEvent(
    originChainId: number,
    user: string,
    wrappedTokenAddress: string,
    amount: bigint,
    destinationChainId: number,
    eventLog: EventLog,
  ) {
    Logger.log(
      `WrappedTokensBurned event:, ${user}, ${wrappedTokenAddress}, ${amount}, ${destinationChainId}`,
    );
    const tokensConfig = this.configService.get('tokens');
    const nativeTokenAddress =
      tokensConfig[originChainId][wrappedTokenAddress].native[
        destinationChainId
      ];

    const transactionHash = eventLog['log']['transactionHash'];

    const murmur3Seed = this.configService.get('app.murmur3Seed');
    const message = createMessage(transactionHash, murmur3Seed);

    const signature = await this.signMessage(message, destinationChainId);
    this.redisClientService.rpush(message, signature);

    const signaturesThreshold = await this.getThreshold(destinationChainId);
    const signaturesCount = await this.redisClientService.llen(message);

    if (signaturesCount >= signaturesThreshold) {
      const murmur3Seed = this.configService.get('app.murmur3Seed');
      const jobId: string = `jobID: ${murmur3(message, murmur3Seed).toString()}`;

      const job = new BridgeJob(
        message,
        JobTypes.HANDLE_BURN,
        user,
        wrappedTokenAddress,
        nativeTokenAddress,
        amount.toString(),
        destinationChainId,
        originChainId,
      );
      await this.queueService.addToQueue(job, jobId);
    }
  }

  /*//////////////////////////////////////////////////////////////
                       TRANSACTION UTIL METHODS
  //////////////////////////////////////////////////////////////*/

  private async sendTransaction(
    chainId: number,
    method: string,
    ...args: any[]
  ): Promise<TransactionReceipt> {
    const wallet = this.wallets.get(chainId);
    if (!wallet) {
      throw new Error(`No wallet found for chain ID ${chainId}`);
    }
    const bridgeAddress = this.bridgeAddresses.get(chainId);
    if (!bridgeAddress) {
      throw new Error(`No bridge address found for chain ID ${chainId}`);
    }

    const contract = new Contract(bridgeAddress, diamondAbi, wallet);
    const tx = await contract[method](...args);

    const receipt = await tx.wait();
    return receipt;
  }

  private async staticCall(chainId: number, method: string, ...args: any[]) {
    const provider = this.networksProviders.get(chainId);
    if (!provider) {
      throw new Error(`No provider found for chain ID ${chainId}`);
    }
    const bridgeAddress = this.bridgeAddresses.get(chainId);
    if (!bridgeAddress) {
      throw new Error(`No bridge address found for chain ID ${chainId}`);
    }
    const contract = new Contract(bridgeAddress, diamondAbi, provider);

    return contract.getFunction(method).staticCall(...args);
  }

  private async signMessage(message: string, chainId: number): Promise<string> {
    const wallet = this.wallets.get(chainId);
    if (!wallet) {
      throw new Error(`No wallet found for chain ID ${chainId}`);
    }
    const signature = await wallet.signMessage(message);
    return signature;
  }

  /*//////////////////////////////////////////////////////////////
                         SMART CONTRACT METHODS
  //////////////////////////////////////////////////////////////*/

  async mintWrappedTokens(
    signedMessage: string,
    signatures: string[],
    to: string,
    amount: bigint,
    destinationChainId: number,
    wrappedTokenAddress: string,
  ): Promise<TransactionReceipt> {
    const messageBytes = messageToBytes(signedMessage);

    return this.sendTransaction(
      destinationChainId,
      SmartContractMethods.MINT_WRAPPED_TOKENS,
      amount,
      to,
      wrappedTokenAddress,
      messageBytes,
      signatures,
    );
  }

  async unlockTokens(
    signedMessage: string,
    signatures: string[],
    to: string,
    amount: bigint,
    destinationChainId: number,
    nativeTokenAddress: string,
  ): Promise<TransactionReceipt> {
    const messageBytes = messageToBytes(signedMessage);

    return this.sendTransaction(
      destinationChainId,
      SmartContractMethods.UNLOCK_TOKENS,
      amount,
      to,
      nativeTokenAddress,
      messageBytes,
      signatures,
    );
  }

  private async getThreshold(chainId: number) {
    return this.staticCall(chainId, 'getThreshold');
  }
}
