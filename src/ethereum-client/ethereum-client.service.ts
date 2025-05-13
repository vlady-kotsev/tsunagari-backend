import { Injectable } from '@nestjs/common';
import {
  Contract,
  ethers,
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
import { SOLANA_CHAIN_ID } from 'src/queue/consts';
import { SolanaClientService } from 'src/solana-client/solana-client.service';

/**
 * Interface representing Ethereum network providers
 */
interface IProvider {
  /** JSON RPC provider for standard HTTP connections */
  provider: JsonRpcProvider;
  /** WebSocket provider for real-time events */
  wsProvider: WebSocketProvider;
}

/**
 * Service handling Ethereum blockchain interactions and bridge operations
 * @remarks This service manages cross-chain token transfers, event listening, and transaction signing
 */
@Injectable()
export class EthereumClientService {
  /** Map of network chain IDs to their respective providers */
  private networksProviders: Map<number, IProvider>;
  /** Map of network chain IDs to their bridge contract addresses */
  private bridgeAddresses: Map<number, string>;
  /** Map of network chain IDs to their corresponding wallet instances */
  private wallets: Map<number, Wallet>;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisClientService: RedisClientService,
    private readonly queueService: QueueService,
    private readonly solanaClientService: SolanaClientService,
  ) {
    this.networksProviders = new Map<number, IProvider>();
    this.bridgeAddresses = new Map<number, string>();
    this.wallets = new Map<number, Wallet>();

    const networksConfig = this.configService.get('evm.networks');
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
        const walletConfig = this.configService.get('evm.wallet');
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

  /**
   * Sets up event listeners for all configured networks
   * @throws Error if setting up listeners fails for any network
   */
  async setupAllEventListeners() {
    const networksConfig = this.configService.get('evm.networks');
    for (const network of networksConfig) {
      try {
        await this.setupEventListeners(network.chainId);
      } catch (error) {
        Logger.error(
          `Error setting up event listeners for chain ${network.chainId}: ${error}`,
        );
        throw error;
      }
    }
  }

  /**
   * Sets up event listeners for a specific chain
   * @param chainId - The ID of the blockchain network
   * @throws Error if no WebSocket provider is found for the chain
   */
  private async setupEventListeners(chainId: number) {
    const provider = this.networksProviders.get(chainId).wsProvider;
    if (!provider) {
      throw new Error(`No WS provider found for chain ID ${chainId}`);
    }

    // Pinging
    setInterval(() => {
      provider.getBlockNumber().then((blockNumber) => {
        Logger.log(`Pinging for block number: ${blockNumber}`);
      });
    }, this.configService.get('websocket.keepAliveCheckInterval'));

    provider.on('error', (error) => {
      Logger.error(`WebSocket error: ${error}`);
      this.reconnectWebSocket(chainId);
    });

    const bridgeAddress = this.bridgeAddresses.get(chainId);
    const contract = new Contract(bridgeAddress, diamondAbi, provider);

    contract.on(
      EventSignatures.LOCK_EVENT_SIGNATURE,
      (
        user: string,
        tokenAddress: string,
        amount: bigint,
        destinationChainId: number,
        destinationAddress: string,
        eventLog: EventLog,
      ) =>
        this.handleTokensLockedEvent(
          Number(chainId),
          user,
          tokenAddress,
          amount,
          Number(destinationChainId),
          destinationAddress,
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
        destinationAddress: string,
        eventLog: EventLog,
      ) =>
        this.handleWrappedTokensBurnedEvent(
          Number(chainId),
          recipient,
          tokenAddress,
          amount,
          Number(destinationChainId),
          destinationAddress,
          eventLog,
        ),
    );
    Logger.log(`Listening for WrappedTokensBurned events on chain ${chainId}`);
  }

  /**
   * Removes all event listeners across all configured networks
   */
  async removeAllEventListeners() {
    const networksConfig = this.configService.get('evm.networks');
    for (const network of networksConfig) {
      await this.removeEventListeners(network.chainId);
    }
  }

  /**
   * Removes event listeners for a specific chain
   * @param chainId - The ID of the blockchain network
   * @throws Error if no WebSocket provider is found for the chain
   */
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

  /**
   * Handles TokensLocked events from the bridge contract
   * @param originChainId - The chain ID where tokens were locked
   * @param recipient - The address of the recipient
   * @param nativeTokenAddress - The address of the native token
   * @param amount - The amount of tokens locked
   * @param destinationChainId - The target chain ID for the transfer
   * @param eventLog - The event log data
   */
  private async handleTokensLockedEvent(
    originChainId: number,
    recipient: string,
    nativeTokenAddress: string,
    amount: bigint,
    destinationChainId: number,
    destinationAddress: string,
    eventLog: EventLog,
  ) {
    Logger.log(
      `TokensLocked event:, ${destinationAddress}, ${nativeTokenAddress}, ${amount}, ${destinationChainId}`,
    );
    const tokensConfig = this.configService.get('evm.tokens');
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
        destinationAddress,
        nativeTokenAddress,
        wrappedTokenAddress,
        amount.toString(),
        destinationChainId,
        originChainId,
      );
      await this.queueService.addToQueue(job, jobId);
    }
  }

  /**
   * Handles WrappedTokensBurned events from the bridge contract
   * @param originChainId - The chain ID where tokens were burned
   * @param user - The address of the user burning tokens
   * @param wrappedTokenAddress - The address of the wrapped token
   * @param amount - The amount of tokens burned
   * @param destinationChainId - The target chain ID for the transfer
   * @param eventLog - The event log data
   */
  private async handleWrappedTokensBurnedEvent(
    originChainId: number,
    user: string,
    wrappedTokenAddress: string,
    amount: bigint,
    destinationChainId: number,
    destinationAddress: string,
    eventLog: EventLog,
  ) {
    Logger.log(
      `WrappedTokensBurned event:, ${user}, ${wrappedTokenAddress}, ${amount}, ${destinationChainId}, ${destinationAddress}`,
    );

    const tokensConfig = this.configService.get('evm.tokens');
    const nativeTokenAddress =
      tokensConfig[originChainId][wrappedTokenAddress].native[
        destinationChainId
      ];

    const transactionHash = eventLog['log']['transactionHash'];

    const murmur3Seed = this.configService.get('app.murmur3Seed');
    const message = createMessage(transactionHash, murmur3Seed);

    let signature: string;
    if (destinationChainId === SOLANA_CHAIN_ID) {
      const pk = this.configService.get('evm.wallet.privateKey');
      signature = await this.solanaClientService.signMessageEVM(message, pk);
    } else {
      signature = await this.signMessage(message, destinationChainId);
    }

    this.redisClientService.rpush(message, signature);

    let signaturesThreshold: number;

    if (destinationChainId === SOLANA_CHAIN_ID) {
      signaturesThreshold = await this.solanaClientService.getThreshold();
    } else {
      signaturesThreshold = await this.getThreshold(destinationChainId);
    }

    const signaturesCount = await this.redisClientService.llen(message);

    if (signaturesCount >= signaturesThreshold) {
      const murmur3Seed = this.configService.get('app.murmur3Seed');
      const jobId: string = `jobID: ${murmur3(message, murmur3Seed).toString()}`;

      const job = new BridgeJob(
        message,
        JobTypes.HANDLE_BURN,
        destinationAddress,
        wrappedTokenAddress,
        nativeTokenAddress,
        amount.toString(),
        destinationChainId,
        originChainId,
      );
      await this.queueService.addToQueue(job, jobId);
    }
  }

  /**
   * Attempts to reconnect a WebSocket connection for a specific chain
   * @param chainId - The ID of the blockchain network
   */
  private async reconnectWebSocket(chainId: number) {
    try {
      Logger.log(`Attempting to reconnect WebSocket for chain ${chainId}`);
      const networksConfig = this.configService.get('evm.networks');
      const network = networksConfig.find((n) => n.chainId === chainId);

      if (network) {
        const newWsProvider = new WebSocketProvider(network.wsUrl);
        if (newWsProvider.ready) {
          this.networksProviders.set(chainId, {
            ...this.networksProviders.get(chainId),
            wsProvider: newWsProvider,
          });

          await this.setupEventListeners(chainId);
          Logger.log(`Successfully reconnected WebSocket for chain ${chainId}`);
        }
      }
    } catch (error) {
      Logger.error(
        `Failed to reconnect WebSocket for chain ${chainId}: ${error.message}`,
      );

      setTimeout(
        () => this.reconnectWebSocket(chainId),
        this.configService.get('websocket.reconnectInterval'),
      );
    }
  }

  /*//////////////////////////////////////////////////////////////
                       TRANSACTION UTIL METHODS
  //////////////////////////////////////////////////////////////*/

  /**
   * Sends a transaction to a smart contract
   * @param chainId - The target chain ID
   * @param method - The contract method to call
   * @param args - Arguments for the contract method
   * @returns Transaction receipt or undefined
   * @throws Error if wallet or bridge address is not found
   */
  private async sendTransaction(
    chainId: number,
    method: string,
    ...args: any[]
  ): Promise<TransactionReceipt | undefined> {
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
    if (!receipt.status) {
      throw new Error(`Transaction to chain ${chainId} failed`);
    }
    return receipt;
  }

  /**
   * Performs a static call to a smart contract
   * @param chainId - The target chain ID
   * @param method - The contract method to call
   * @param args - Arguments for the contract method
   * @throws Error if provider or bridge address is not found
   */
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

  /**
   * Signs a message using the wallet for a specific chain
   * @param message - The message to sign
   * @param chainId - The chain ID whose wallet should sign
   * @returns The signature
   * @throws Error if no wallet is found for the chain
   */
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

  /**
   * Mints wrapped tokens on the destination chain
   * @param signedMessage - The signed message authorizing the mint
   * @param signatures - Array of validator signatures
   * @param to - Recipient address
   * @param amount - Amount of tokens to mint
   * @param destinationChainId - Target chain ID
   * @param wrappedTokenAddress - Address of the wrapped token contract
   * @returns Transaction receipt
   */
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

  /**
   * Unlocks native tokens on the original chain
   * @param signedMessage - The signed message authorizing the unlock
   * @param signatures - Array of validator signatures
   * @param to - Recipient address
   * @param amount - Amount of tokens to unlock
   * @param destinationChainId - Target chain ID
   * @param nativeTokenAddress - Address of the native token contract
   * @returns Transaction receipt
   */
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

  /**
   * Gets the required threshold of signatures for a specific chain
   * @param chainId - The chain ID to query
   * @returns The signature threshold number
   */
  private async getThreshold(chainId: number) {
    return this.staticCall(chainId, 'getThreshold');
  }
}
