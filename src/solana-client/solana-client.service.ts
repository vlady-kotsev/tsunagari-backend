import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueService } from 'src/queue/queue.service';
import { RedisClientService } from 'src/redis-client/redis-client.service';
import {
  AnchorProvider,
  BN,
  EventParser,
  Program,
  Wallet as SolWallet,
  web3,
} from '@coral-xyz/anchor';
import IDL from './idl/bridge_solana.json';
import { BridgeSolana } from './types/bridge_solana';
import { createMessage } from 'src/ethereum-client/utils';
import pdaDeriver from './pda-deriver.js';
import { murmur3 } from 'murmurhash-js';
import { BridgeJob } from 'src/queue/job/BridgeJob';
import JobTypes from 'src/queue/job/JobTypes';
import { ethers, Wallet } from 'ethers';
import { ISolanaBurnedEvent, ISolanaLockEvent } from './interfaces.js';
import { BURN_EVENT_NAME, ETH_DECIMALS, LOCK_EVENT_NAME } from './constants';
import { secp256k1 } from '@noble/curves/secp256k1';
import { SOLANA_CHAIN_ID } from 'src/queue/consts';

@Injectable()
export class SolanaClientService implements OnModuleInit {
  private bridgeProgram: Program<BridgeSolana>;
  private wsConnection: web3.Connection;
  private connection: web3.Connection;
  private eventParser: EventParser;
  private evmWallet: Wallet;
  private authority: web3.Keypair;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisClientService: RedisClientService,
    private readonly queueService: QueueService,
  ) {}

  async onModuleInit() {
    const bs58 = (await import('bs58')).default;

    const privateKey = this.configService.get<string>('evm.wallet.privateKey');
    this.evmWallet = new Wallet(privateKey);

    const secretKeyString = this.configService.get<string>(
      'solana.wallet.privateKey',
      '',
    );
    const secretKeyBytes = bs58.decode(secretKeyString);

    this.authority = web3.Keypair.fromSecretKey(secretKeyBytes);
    const wallet = new SolWallet(this.authority);

    const solanaRpc = this.configService.get<string>(
      'solana.network.rpcUrl',
      '',
    );
    this.connection = new web3.Connection(solanaRpc, {
      commitment: 'finalized',
    });
    const provider = new AnchorProvider(this.connection, wallet, {
      commitment: 'finalized',
    });
    this.bridgeProgram = new Program(IDL as any, provider);

    this.eventParser = new EventParser(
      this.bridgeProgram.programId,
      this.bridgeProgram.coder,
    );

    const solanaWs = this.configService.get<string>(
      'solana.network.rpcUrl',
      '',
    );
    this.wsConnection = new web3.Connection(solanaWs, {
      commitment: 'finalized',
    });
  }

  async setupEventListeners() {
    if (!this.wsConnection) {
      throw new Error(`No WS provider found for chain Solana`);
    }

    const programIdString = this.configService.get<string>(
      'solana.network.bridgeAddress',
      '',
    );

    if (!programIdString) {
      throw new Error(`No Solana bridge address provided`);
    }

    const programId = new web3.PublicKey(programIdString);

    this.wsConnection.onLogs(
      programId,
      async (logs) => {
        const events = this.eventParser.parseLogs(logs.logs);
        for (const event of events) {
          if (event.name === BURN_EVENT_NAME) {
            await this.handleTokensBurnedEvent(
              event.data as ISolanaBurnedEvent,
              logs.signature,
            );
          } else if (event.name === LOCK_EVENT_NAME) {
            await this.handleTokensLockedEvent(
              event.data as ISolanaLockEvent,
              logs.signature,
            );
          }
        }
      },
      'finalized',
    );
  }

  private async handleTokensLockedEvent(
    eventLog: ISolanaLockEvent,
    txSignature: string,
  ) {
    const { getMint } = await import('@solana/spl-token');
    const {
      amount,
      lockedTokenMint: nativeTokenAddress,
      destinationChain,
      destinationAddress,
    } = eventLog;
    Logger.log(
      `TokensLocked event:, ${destinationAddress}, ${nativeTokenAddress.toBase58()}, ${amount}, ${destinationChain}`,
    );
    const tokensConfig = this.configService.get('solana.tokens');

    const wrappedTokenAddress =
      tokensConfig[nativeTokenAddress.toBase58()].wrapped[
        destinationChain.toString()
      ];

    const murmur3Seed = this.configService.get('app.murmur3Seed');
    const message = createMessage(txSignature, murmur3Seed);

    const signature = await this.signMessage(message);
    this.redisClientService.rpush(message, signature);

    Logger.log(`Signed message: ${message}`);

    const signaturesThreshold = await this.getThreshold();
    const signaturesCount = await this.redisClientService.llen(message);

    // handle decimals
    const decimals = (await getMint(this.connection, nativeTokenAddress))
      .decimals;

    const adjustedAmount =
      Number(amount) * Math.pow(10, ETH_DECIMALS - decimals);

    if (signaturesCount >= signaturesThreshold) {
      const murmur3Seed = this.configService.get('app.murmur3Seed');
      const jobId: string = `jobID: ${murmur3(message, murmur3Seed).toString()}`;
      const job = new BridgeJob(
        message,
        JobTypes.HANDLE_LOCK,
        destinationAddress,
        nativeTokenAddress.toBase58(),
        wrappedTokenAddress,
        adjustedAmount.toString(),
        destinationChain,
        SOLANA_CHAIN_ID,
      );
      await this.queueService.addToQueue(job, jobId);
    }
  }

  private async handleTokensBurnedEvent(
    eventLog: ISolanaBurnedEvent,
    txSignature: string,
  ) {
    const { getMint } = await import('@solana/spl-token');
    const {
      amount,
      burnedTokenMint: tokenMint,
      destinationChain,
      destinationAddress,
    } = eventLog;

    Logger.log(
      `TokensBurned event:, ${destinationAddress}, ${tokenMint.toBase58()}, ${amount}, ${destinationChain}`,
    );
    const tokensConfig = this.configService.get('solana.tokens');

    const nativeTokenAddress =
      tokensConfig[tokenMint.toBase58()].native[destinationChain.toString()];

    const murmur3Seed = this.configService.get('app.murmur3Seed');
    const message = createMessage(txSignature, murmur3Seed);

    const signature = await this.signMessage(message);
    this.redisClientService.rpush(message, signature);

    Logger.log(`Signed message: ${message}`);

    const signaturesThreshold = await this.getThreshold();
    const signaturesCount = await this.redisClientService.llen(message);

    // handle decimals
    const decimals = (await getMint(this.connection, tokenMint)).decimals;

    const adjustedAmount =
      Number(amount) * Math.pow(10, ETH_DECIMALS - decimals);

    if (signaturesCount >= signaturesThreshold) {
      const murmur3Seed = this.configService.get('app.murmur3Seed');
      const jobId: string = `jobID: ${murmur3(message, murmur3Seed).toString()}`;
      const job = new BridgeJob(
        message,
        JobTypes.HANDLE_BURN,
        destinationAddress,
        tokenMint.toBase58(),
        nativeTokenAddress,
        adjustedAmount.toString(),
        Number(destinationChain),
        SOLANA_CHAIN_ID,
      );
      await this.queueService.addToQueue(job, jobId);
    }
  }

  async unlockTokens(
    signedMessage: string,
    signatures: Buffer<ArrayBuffer>[],
    receiverString: string,
    amount: bigint,
    nativeTokenMint: web3.PublicKey,
  ): Promise<{ status: boolean; txSignature: string }> {
    const {
      getAssociatedTokenAddress,
      TOKEN_PROGRAM_ID,
      getMint,
      getOrCreateAssociatedTokenAccount,
    } = await import('@solana/spl-token');

    const messageBytes = Buffer.from(
      signedMessage.startsWith('0x') ? signedMessage.slice(2) : signedMessage,
      'hex',
    );

    const programId = this.bridgeProgram.programId;
    const bridgeConfigPDA = pdaDeriver.bridgeConfig(programId);
    const vaultPDA = pdaDeriver.splVault(programId);

    const receiver = await this.hexToBase58(receiverString);

    const userAta = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.authority,
      nativeTokenMint,
      new web3.PublicKey(receiver),
    );

    const vaultAtaPDA = await getAssociatedTokenAddress(
      nativeTokenMint,
      vaultPDA,
      true,
    );

    const mintInfo = await getMint(this.connection, nativeTokenMint);

    // Create more precise amount calculation
    const amountBN: BN = new BN(amount.toString());
    const scaleFactor: BN = new BN(10).pow(
      new BN(ETH_DECIMALS - mintInfo.decimals),
    );
    const scaledAmount: BN = amountBN.div(scaleFactor);

    // Create UsedSignature PDAs for each signature
    const remainingAccounts = signatures.map((signature) => {
      const usedSignaturePDA = pdaDeriver.usedSignature(signature, programId);
      return {
        pubkey: usedSignaturePDA,
        isSigner: false,
        isWritable: true,
      };
    });

    const txSignature = await this.bridgeProgram.methods
      .unlock({
        tokenMint: nativeTokenMint,
        amount: scaledAmount,
        message: messageBytes,
        signatures: signatures,
      })
      .accounts({
        payer: this.authority.publicKey,
        mint: nativeTokenMint,
        //@ts-ignore
        splVault: vaultPDA,
        bridgeConfig: bridgeConfigPDA,
        from: vaultAtaPDA,
        to: userAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .remainingAccounts(remainingAccounts)
      .signers([this.authority])
      .rpc({ commitment: 'finalized', skipPreflight: false });

    const status = await this.checkTransactionStatus(txSignature);
    return { status, txSignature };
  }

  async mintWrappedTokens(
    signedMessage: string,
    signatures: Buffer<ArrayBuffer>[],
    receiverString: string,
    amount: bigint,
    wrappedTokenMint: web3.PublicKey,
  ) {
    const {
      getAssociatedTokenAddress,
      TOKEN_PROGRAM_ID,
      getMint,
      ASSOCIATED_TOKEN_PROGRAM_ID,
      getOrCreateAssociatedTokenAccount
    } = await import('@solana/spl-token');

    const messageBytes = Buffer.from(
      signedMessage.startsWith('0x') ? signedMessage.slice(2) : signedMessage,
      'hex',
    );

    const programId = this.bridgeProgram.programId;
    const bridgeConfigPDA = pdaDeriver.bridgeConfig(programId);
    const vaultPDA = pdaDeriver.splVault(programId);

    const receiver = await this.hexToBase58(receiverString);
    const receiverPubkey = new web3.PublicKey(receiver);

    const receiverATA = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.authority,
      wrappedTokenMint,
      receiverPubkey,
    );

    const mintInfo = await getMint(this.connection, wrappedTokenMint);

    const amountBN: BN = new BN(amount.toString());
    const scaleFactor: BN = new BN(10).pow(
      new BN(ETH_DECIMALS - mintInfo.decimals),
    );
    const scaledAmount: BN = amountBN.div(scaleFactor);

    const remainingAccounts = signatures.map((signature) => {
      const usedSignaturePDA = pdaDeriver.usedSignature(signature, programId);
      return {
        pubkey: usedSignaturePDA,
        isSigner: false,
        isWritable: true,
      };
    });

    const txSignature = await this.bridgeProgram.methods
      .mintWrapped({
        amount: scaledAmount, // 1 token with 3 decimals
        to: receiverPubkey,
        wrappedTokenAddress: wrappedTokenMint,
        message: messageBytes,
        signatures: signatures,
      })
      .accounts({
        payer: this.authority.publicKey,
        receiver: receiverPubkey,
        mint: wrappedTokenMint,
        //@ts-ignore
        receiverAta: receiverATA.address,
        splVault: vaultPDA,
        bridgeConfig: bridgeConfigPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        associcatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .remainingAccounts(remainingAccounts)
      .signers([this.authority])
      .rpc({ commitment: 'finalized' });

    const status = await this.checkTransactionStatus(txSignature);
    return { status, txSignature };
  }

  private async signMessage(message: string): Promise<string> {
    const wallet = this.evmWallet;
    const signature = await wallet.signMessage(message);
    return signature;
  }

  async getThreshold() {
    const bridgeConfigPDA = pdaDeriver.bridgeConfig(
      this.bridgeProgram.programId,
    );
    const bridgeConfig =
      await this.bridgeProgram.account.bridgeConfig.fetch(bridgeConfigPDA);
    return bridgeConfig.threshold;
  }

  private async checkTransactionStatus(signature: string): Promise<boolean> {
    try {
      const tx = await this.wsConnection.getTransaction(signature, {
        commitment: 'finalized',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        return false;
      }

      return tx.meta?.err === null;
    } catch (error) {
      Logger.error(`Error checking transaction status: ${error}`);
      return false;
    }
  }

  async signMessageEVM(message: string, privateKey: string) {
    const messageBytes = Buffer.from(message, 'hex');
    const messageHash = ethers.keccak256(messageBytes).slice(2);
    const signature = secp256k1.sign(messageHash, privateKey);
    const signatureBytes = Buffer.concat([
      signature.toCompactRawBytes(),
      Buffer.from([signature.recovery]),
    ]);

    return signatureBytes.toString('hex');
  }

  async hexToBase58(hexStr) {
    const bs58 = (await import('bs58')).default;
    const bytes = Buffer.from(
      hexStr.startsWith('0x') ? hexStr.slice(2) : hexStr,
      'hex',
    );

    return bs58.encode(bytes);
  }
}
