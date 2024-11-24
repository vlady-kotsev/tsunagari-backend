import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { spawn, ChildProcess, exec } from 'child_process';
import { ethers } from 'ethers';
import { AppModule } from './../src/app.module';
import { ConfigService } from '@nestjs/config';
import { promisify } from 'util';
import { RedisClientService } from '../src/redis-client/redis-client.service';
import { deployDiamond } from './contract-deployment/deploy-diamond';
import { deployNativeToken } from './contract-deployment/deploy-native-token';
import { deployWrappedToken } from './contract-deployment/deploy-wrapped-token';
import { SignatureGenerator } from './utils/SignatureGenerator';
import { Transport } from '@nestjs/microservices';
import path from 'path';
import {
  CHAIN1_PORT,
  CHAIN2_PORT,
  mockConfigService,
  mockGrpcClient,
} from './mocks';

const execAsync = promisify(exec);

let diamond1: ethers.Contract;
let diamond2: ethers.Contract;
let nativeToken1: ethers.Contract;
let wrappedToken2: ethers.Contract;
let app: INestApplication;

const waitForRedis = async (retries = 30, delay = 1000): Promise<void> => {
  for (let i = 0; i < retries; i++) {
    try {
      await execAsync(
        'docker compose -f test/docker-compose.e2e.yml exec -T redis redis-cli ping',
      );
      console.log('Redis is ready');
      return;
    } catch (error) {
      console.log(`Waiting for Redis... (attempt ${i + 1}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Redis failed to start');
};

const deployContracts = async (
  wallet1: ethers.Wallet,
  wallet2: ethers.Wallet,
) => {
  // Deploy contracts
  diamond1 = await deployDiamond(wallet1);
  diamond2 = await deployDiamond(wallet2);
  nativeToken1 = await deployNativeToken(wallet1, 'Native Token', 'NTV');
  wrappedToken2 = await deployWrappedToken(
    wallet2,
    await diamond2.getAddress(),
    'Wrapped Token',
    'WTT',
  );

  // Get deployed addresses
  const diamond1Address = await diamond1.getAddress();
  const diamond2Address = await diamond2.getAddress();
  const nativeToken1Address = await nativeToken1.getAddress();
  const wrappedToken2Address = await wrappedToken2.getAddress();

  // Update mock config with deployed addresses
  mockConfigService.get = jest.fn((key: string) => {
    const config = {
      app: {
        murmur3Seed: 123,
        grpcHost: 'localhost',
        grpcPort: '5000',
        grpcPassword: 'grpcpass',
        protoPath: path.join(__dirname, '../src/proto/transactions.proto'),
      },
      websocket: {
        reconnectInterval: 5000,
        keepAliveCheckInterval: 60000,
      },
      queue: {
        name: 'bridge-queue',
        host: 'localhost',
        port: 6379,
        jobRetryDelay: 1000,
        jobAddAttempts: 3,
      },
      redis: {
        host: 'localhost',
        port: 6379,
        retryDelay: 5000,
        maxRetries: 10,
        maxDelay: 30000,
      },
      wallet: {
        privateKey:
          '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      },
      networks: [
        {
          name: 'chain1',
          bridgeAddress: diamond1Address,
          rpcUrl: `http://localhost:${CHAIN1_PORT}`,
          wsUrl: `ws://localhost:${CHAIN1_PORT}`,
          chainId: 1,
        },
        {
          name: 'chain2',
          bridgeAddress: diamond2Address,
          rpcUrl: `http://localhost:${CHAIN2_PORT}`,
          wsUrl: `ws://localhost:${CHAIN2_PORT}`,
          chainId: 2,
        },
      ],
      tokens: {
        '1': {
          [nativeToken1Address]: {
            name: 'Native Token',
            symbol: 'NTV',
            wrapped: {
              '2': wrappedToken2Address,
            },
          },
        },
        '2': {
          [wrappedToken2Address]: {
            name: 'Wrapped Token',
            symbol: 'WTT',
            native: {
              '1': nativeToken1Address,
            },
          },
        },
      },
    };
    return key.split('.').reduce((obj, k) => obj?.[k], config);
  });

  console.log('Updated config with deployed addresses:', {
    diamond1: diamond1Address,
    diamond2: diamond2Address,
    nativeToken1: nativeToken1Address,
    wrappedToken2: wrappedToken2Address,
  });
};

const stopAnvilProcess = async (process: ChildProcess | null) => {
  if (process) {
    console.log('Stopping Anvil process...');
    process.kill('SIGKILL');
    return new Promise<void>((resolve) => {
      process.on('exit', () => {
        console.log('Anvil process stopped');
        resolve();
      });
    });
  }
};

describe('Bridge E2E Tests', () => {
  let chain1Process: ChildProcess;
  let chain2Process: ChildProcess;
  let chain1Provider: ethers.JsonRpcProvider;
  let chain2Provider: ethers.JsonRpcProvider;

  // Add wallet variables
  let testWallet1: ethers.Wallet;
  let testWallet2: ethers.Wallet;

  // Helper function to start Docker Compose
  const startDockerCompose = async () => {
    try {
      // First, ensure everything is down
      await execAsync('docker compose -f test/docker-compose.e2e.yml down -v');

      // Start the services
      await execAsync('docker compose -f test/docker-compose.e2e.yml up -d');

      // Wait for Redis to be ready
      await waitForRedis();
    } catch (error) {
      console.error('Failed to start Docker Compose:', error);
      throw error;
    }
  };

  // Helper function to stop Docker Compose
  const stopDockerCompose = async () => {
    try {
      await execAsync('docker compose -f test/docker-compose.e2e.yml down -v');
      console.log('Docker Compose stopped');
    } catch (error) {
      console.error('Failed to stop Docker Compose:', error);
    }
  };

  // Helper function to start an Anvil instance
  const startAnvil = (port: number): Promise<ChildProcess> => {
    return new Promise((resolve, reject) => {
      const anvil = spawn('anvil', [
        '--port',
        port.toString(),
        '--block-time',
        '1',
        '--accounts',
        '10',
      ]);

      anvil.stdout.on('data', (data) => {
        if (data.toString().includes('Listening on')) {
          resolve(anvil);
        }
      });

      anvil.stderr.on('data', (data) => {
        console.error(`Anvil Error (port ${port}):`, data.toString());
      });

      setTimeout(() => {
        reject(new Error(`Anvil failed to start on port ${port}`));
      }, 5000);
    });
  };

  beforeAll(async () => {
    try {
      await startDockerCompose();

      // Start Anvil instances
      chain1Process = await startAnvil(CHAIN1_PORT);
      chain2Process = await startAnvil(CHAIN2_PORT);

      // Initialize providers
      chain1Provider = new ethers.JsonRpcProvider(
        `http://localhost:${CHAIN1_PORT}`,
      );
      chain2Provider = new ethers.JsonRpcProvider(
        `http://localhost:${CHAIN2_PORT}`,
      );

      // Initialize test wallets
      testWallet1 = new ethers.Wallet(
        mockConfigService.get('wallet.privateKey'),
        chain1Provider,
      );
      testWallet2 = new ethers.Wallet(
        mockConfigService.get('wallet.privateKey'),
        chain2Provider,
      );

      // Deploy contracts on anvils
      await deployContracts(testWallet1, testWallet2);

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(ConfigService)
        .useValue(mockConfigService)
        .overrideProvider('TRANSACTIONS_PACKAGE')
        .useFactory({
          factory: () => ({
            getService: () => mockGrpcClient,
          }),
        })
        .compile();

      app = moduleFixture.createNestApplication();

      app.connectMicroservice({
        transport: Transport.GRPC,
        options: {
          url: 'localhost:5000',
          package: 'transactions',
          protoPath: path.join(__dirname, '../src/proto/transactions.proto'),
        },
      });

      await app.init();
    } catch (error) {
      console.error('Setup failed:', error);
      throw error;
    }
  }, 300000);

  afterAll(async () => {
    console.log('Starting cleanup...');
    try {
      if (app) {
        await app.close();
      }

      await stopDockerCompose();

      console.log('Cleanup completed successfully');

      // Stop all providers
      if (chain1Provider) {
        console.log('Destroying chain1 provider...');
        chain1Provider.destroy();
      }
      if (chain2Provider) {
        console.log('Destroying chain2 provider...');
        chain2Provider.destroy();
      }

      // Stop Anvil processes
      await Promise.all([
        stopAnvilProcess(chain1Process),
        stopAnvilProcess(chain2Process),
      ]);

      // Stop Docker containers
      await stopDockerCompose();

      // Remove all listeners
      process.removeAllListeners();
      console.log('Cleanup completed successfully');
      console.log('Exiting like a barbarian...');

      setTimeout(() => {
        process.kill(process.pid, 'SIGKILL');
      }, 6000);
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }, 30000);

  it('should have both chains running', async () => {
    const chain1Block = await chain1Provider.getBlockNumber();
    const chain2Block = await chain2Provider.getBlockNumber();

    expect(chain1Block).toBeGreaterThanOrEqual(0);
    expect(chain2Block).toBeGreaterThanOrEqual(0);
  });

  it('should have Redis running', async () => {
    await waitForRedis();
    const redisClientService = app.get(RedisClientService);
    await expect(redisClientService.pingRedisClient()).resolves.not.toThrow();
  });

  it('should have funded test wallets', async () => {
    const balance1 = await testWallet1.provider.getBalance(testWallet1.address);
    const balance2 = await testWallet2.provider.getBalance(testWallet2.address);

    expect(balance1).toBeGreaterThan(0n);
    expect(balance2).toBeGreaterThan(0n);
  });

  it('should connect to Redis', async () => {
    const redisClient = app.get(RedisClientService);
    expect(redisClient).toBeDefined();
    await expect(redisClient.pingRedisClient()).resolves.not.toThrow();
  });

  it('should be able to transfer from chain 1 to chain 2 and back', async () => {
    // ## 0. Preparations ##
    let nonce1 = await testWallet1.getNonce();
    let nonce2 = await testWallet2.getNonce();

    // Amount to bridge
    const amountToBridge = ethers.parseEther('10');

    // Get initial balances
    const initialNativeBalance = await nativeToken1.balanceOf(
      testWallet1.address,
    );
    const initialWrappedBalance = await wrappedToken2.balanceOf(
      testWallet2.address,
    );

    // ##### Part 1: Transfer from chain 1 to chain 2 #####

    // 1. ## Approve diamond1 to spend native tokens ##
    const approveTx = await nativeToken1.approve(
      await diamond1.getAddress(),
      amountToBridge,
      {
        maxFeePerGas:
          ((await testWallet1.provider!.getFeeData()).maxFeePerGas! * 120n) /
          100n,
        maxPriorityFeePerGas:
          ((await testWallet1.provider!.getFeeData()).maxPriorityFeePerGas! *
            120n) /
          100n,
        nonce: nonce1++,
      },
    );
    await approveTx.wait();

    console.log('Approved diamond1 to spend tokens');

    // 2. ## Add native token to supported tokens on diamond1 ##
    // 2.1 Generate signature
    const signatureGenerator = new SignatureGenerator();
    const signature1 = signatureGenerator.getUniqueSignature();
    const message1 = ethers.toUtf8Bytes(signatureGenerator.getNoncedMessage());

    const addSupportedTokenTx1 = await diamond1.addNewSupportedToken(
      await nativeToken1.getAddress(),
      message1,
      [signature1],
      {
        maxFeePerGas:
          ((await testWallet1.provider!.getFeeData()).maxFeePerGas! * 120n) /
          100n,
        maxPriorityFeePerGas:
          ((await testWallet1.provider!.getFeeData()).maxPriorityFeePerGas! *
            120n) /
          100n,
        nonce: nonce1++,
      },
    );
    await addSupportedTokenTx1.wait();
    console.log('Native Token added to supported tokens');

    // 3. ## Add wrapped token to supported tokens on diamond2 ##
    // 3.1 Generate signature
    const signature2 = signatureGenerator.getUniqueSignature();
    const message2 = ethers.toUtf8Bytes(signatureGenerator.getNoncedMessage());

    const addSupportedTokenTx2 = await diamond2.addNewSupportedToken(
      await wrappedToken2.getAddress(),
      message2,
      [signature2],
      {
        maxFeePerGas:
          ((await testWallet1.provider!.getFeeData()).maxFeePerGas! * 120n) /
          100n,
        maxPriorityFeePerGas:
          ((await testWallet1.provider!.getFeeData()).maxPriorityFeePerGas! *
            120n) /
          100n,
        nonce: nonce2++,
      },
    );
    await addSupportedTokenTx2.wait();
    console.log('Wrapped Token added to supported tokens');

    // 4. ## Lock tokens in diamond1 ##
    console.log('Submitting lock transaction...');

    const lockTx = await diamond1.lockTokens(
      amountToBridge,
      await nativeToken1.getAddress(),
      2,
      {
        maxFeePerGas:
          ((await testWallet1.provider!.getFeeData()).maxFeePerGas! * 120n) /
          100n,
        maxPriorityFeePerGas:
          ((await testWallet1.provider!.getFeeData()).maxPriorityFeePerGas! *
            120n) /
          100n,
        nonce: nonce1++,
      },
    );
    await lockTx.wait();

    console.log('Locked tokens in diamond1');
    console.log('Waiting for the bridge to process the transaction');

    let startTime = Date.now();
    const timeout = 30000;
    while (Date.now() - startTime < timeout) {
      const currentWrappedBalance = await wrappedToken2.balanceOf(
        testWallet2.address,
      );
      if (currentWrappedBalance > initialWrappedBalance) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // 5. ## Get balances after the transfer from chain 1 to chain 2 ##
    const afterLockNativeBalance = await nativeToken1.balanceOf(
      testWallet1.address,
    );
    const afterLockWrappedBalance = await wrappedToken2.balanceOf(
      testWallet2.address,
    );

    // 6. ## Verify the balances after the transfer from chain 1 to chain 2 ##
    expect(afterLockNativeBalance).toBe(initialNativeBalance - amountToBridge);
    expect(afterLockWrappedBalance).toBe(
      initialWrappedBalance + (amountToBridge * 95n) / 100n, // 5% fee
    );

    // ##### Part 2: Transfer from chain 2 to chain 1 #####
    console.log('Starting transfer from chain 2 to chain 1');

    // 1. ## Approve diamond2 to spend wrapped tokens ##
    nonce2 = await testWallet2.getNonce();

    const approveTxWrapped = await wrappedToken2.approve(
      await diamond2.getAddress(),
      afterLockWrappedBalance,
      {
        maxFeePerGas:
          ((await testWallet2.provider!.getFeeData()).maxFeePerGas! * 120n) /
          100n,
        maxPriorityFeePerGas:
          ((await testWallet2.provider!.getFeeData()).maxPriorityFeePerGas! *
            120n) /
          100n,
        nonce: nonce2++,
      },
    );
    await approveTxWrapped.wait();

    console.log('Approved diamond2 to spend wrapped tokens');

    // 2. ## Burn wrapped tokens in diamond2 ##

    const burnTx = await diamond2.burnWrappedToken(
      afterLockWrappedBalance,
      await wrappedToken2.getAddress(),
      1,
      {
        maxFeePerGas:
          ((await testWallet2.provider!.getFeeData()).maxFeePerGas! * 120n) /
          100n,
        maxPriorityFeePerGas:
          ((await testWallet2.provider!.getFeeData()).maxPriorityFeePerGas! *
            120n) /
          100n,
        nonce: nonce2++,
      },
    );
    await burnTx.wait();

    console.log('Burned wrapped tokens in diamond2');

    startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const currentWrappedBalance = await wrappedToken2.balanceOf(
        testWallet2.address,
      );
      if (currentWrappedBalance < afterLockWrappedBalance) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // 3. ## Verify the balances after the transfer from chain 2 to chain 1 ##
    const afterBurnNativeBalance = await nativeToken1.balanceOf(
      testWallet1.address,
    );
    const afterBurnWrappedBalance = await wrappedToken2.balanceOf(
      testWallet2.address,
    );

    expect(afterBurnNativeBalance).toBe(
      afterLockNativeBalance + (afterLockWrappedBalance * 95n) / 100n, // 5% fee
    );
    expect(afterBurnWrappedBalance).toBe(0n);
  }, 300000);
});
