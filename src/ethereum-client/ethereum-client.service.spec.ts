import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { EthereumClientService } from './ethereum-client.service';
import { RedisClientService } from '../redis-client/redis-client.service';
import { QueueService } from '../queue/queue.service';
import { Contract, JsonRpcProvider, WebSocketProvider, Wallet } from 'ethers';
import { murmur3 } from 'murmurhash-js';
import { SmartContractMethods, EventSignatures } from './constants';

// Mocks
jest.mock('murmurhash-js', () => ({
  murmur3: jest.fn().mockReturnValue({
    toString: () => 'mockedHash',
  }),
}));

const mockWebSocketProvider = {
  getBlockNumber: jest.fn().mockResolvedValue(123),
  on: jest.fn(),
  ready: false,
  _ready: false,
};

const mockContractInstance = {
  on: jest.fn(),
  removeAllListeners: jest.fn(),
  getFunction: jest.fn().mockReturnValue({
    staticCall: jest.fn().mockResolvedValue(42),
  }),

  [SmartContractMethods.MINT_WRAPPED_TOKENS]: jest.fn(),
  [SmartContractMethods.UNLOCK_TOKENS]: jest.fn(),
};

jest.mock('ethers', () => ({
  JsonRpcProvider: jest.fn().mockImplementation(() => ({
    getBlockNumber: jest.fn().mockResolvedValue(123),
  })),
  WebSocketProvider: jest.fn().mockImplementation(() => ({
    ...mockWebSocketProvider,
    get ready() {
      return this._ready;
    }
  })),
  Contract: jest.fn().mockImplementation(() => mockContractInstance),
  Wallet: jest.fn().mockImplementation(() => ({
    signMessage: jest.fn().mockResolvedValue('0xsignature'),
  })),
  toUtf8Bytes: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
  hexlify: jest.fn().mockReturnValue('0xhexstring'),
}));

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
};

// Spy on Logger methods before tests
jest.spyOn(Logger, 'log').mockImplementation(mockLogger.log);
jest.spyOn(Logger, 'error').mockImplementation(mockLogger.error);

describe('EthereumClientService', () => {
  let service: EthereumClientService;
  let configService: ConfigService;
  let redisClientService: RedisClientService;
  let queueService: QueueService;


  const mockConfig = {
    networks: [
      {
        chainId: 1,
        rpcUrl: 'http://localhost:8545',
        wsUrl: 'ws://localhost:8546',
        bridgeAddress: '0x1234567890123456789012345678901234567890',
      },
    ],
    wallet: {
      privateKey:
        '0x1234567890123456789012345678901234567890123456789012345678901234',
    },
    tokens: {
      1: {
        '0xtoken': {
          wrapped: { 2: '0xwrapped' },
          native: { 2: '0xnative' },
        },
      },
    },
    'app.murmur3Seed': 42,
    'websocket.keepAliveCheckInterval': 1000,
    'websocket.reconnectInterval': 1000,
  };

  beforeAll(() => {
    Logger.log = jest.fn();
    Logger.error = jest.fn();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EthereumClientService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => mockConfig[key]),
          },
        },
        {
          provide: RedisClientService,
          useValue: {
            rpush: jest.fn(),
            llen: jest.fn(),
          },
        },
        {
          provide: QueueService,
          useValue: {
            addToQueue: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EthereumClientService>(EthereumClientService);
    configService = module.get<ConfigService>(ConfigService);
    redisClientService = module.get<RedisClientService>(RedisClientService);
    queueService = module.get<QueueService>(QueueService);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize providers and wallets for all networks', () => {
      expect(JsonRpcProvider).toHaveBeenCalledWith('http://localhost:8545');
      expect(WebSocketProvider).toHaveBeenCalledWith('ws://localhost:8546');
      expect(Wallet).toHaveBeenCalled();
    });
  });

  describe('setupAllEventListeners', () => {
    it('should set up listeners for all networks', async () => {
      const setupSpy = jest.spyOn(service as any, 'setupEventListeners');

      await service.setupAllEventListeners();

      expect(setupSpy).toHaveBeenCalledWith(1);
    });

    it('should handle setup errors', async () => {
      const error = new Error('Setup failed');
      jest
        .spyOn(service as any, 'setupEventListeners')
        .mockRejectedValue(error);

      await expect(service.setupAllEventListeners()).rejects.toThrow(error);
    });
  });

  describe('handleTokensLockedEvent', () => {
    it('should process lock event and add job when threshold met', async () => {
      const mockSignature = '0xsignature';
      const mockMessage = 'mockedHash';

      jest
        .spyOn(service as any, 'signMessage')
        .mockResolvedValue(mockSignature);
      jest.spyOn(service as any, 'getThreshold').mockResolvedValue(1);
      jest.spyOn(redisClientService, 'llen').mockResolvedValue(1);

      await (service as any).handleTokensLockedEvent(
        1, 
        '0xrecipient',
        '0xtoken',
        BigInt(1000),
        2, 
        { log: { transactionHash: '0xtxhash' } },
      );

      expect(redisClientService.rpush).toHaveBeenCalledWith(
        mockMessage,
        mockSignature,
      );
      expect(queueService.addToQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          message: mockMessage,
          type: 'handleLock',
          recipient: '0xrecipient',
          originTokenAddress: '0xtoken',
          destinationTokenAddress: '0xwrapped',
          amount: '1000',
          destinationChainId: 2,
          originChainId: 1,
        }),
        `jobID: mockedHash`,
      );

      expect(murmur3).toHaveBeenCalledWith('0xtxhash', 42);
    });

    it('should not add job when threshold not met', async () => {
      const mockSignature = '0xsignature';

      jest
        .spyOn(service as any, 'signMessage')
        .mockResolvedValue(mockSignature);
      jest.spyOn(service as any, 'getThreshold').mockResolvedValue(2);
      jest.spyOn(redisClientService, 'llen').mockResolvedValue(1);

      await (service as any).handleTokensLockedEvent(
        1,
        '0xrecipient',
        '0xtoken',
        BigInt(1000),
        2,
        { log: { transactionHash: '0xtxhash' } },
      );

      expect(redisClientService.rpush).toHaveBeenCalled();
      expect(queueService.addToQueue).not.toHaveBeenCalled();
    });
  });

  describe('removeAllEventListeners', () => {
    it('should remove listeners for all networks', async () => {
      const removeSpy = jest.spyOn(service as any, 'removeEventListeners');

      await service.removeAllEventListeners();

      expect(removeSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('handleWrappedTokensBurnedEvent', () => {
    it('should process burn event and add job when threshold met', async () => {
      const mockSignature = '0xsignature';
      const mockMessage = 'mockedHash';

      jest
        .spyOn(service as any, 'signMessage')
        .mockResolvedValue(mockSignature);
      jest.spyOn(service as any, 'getThreshold').mockResolvedValue(1);
      jest.spyOn(redisClientService, 'llen').mockResolvedValue(1);

      await (service as any).handleWrappedTokensBurnedEvent(
        1,
        '0xuser',
        '0xtoken',
        BigInt(1000),
        2,
        { log: { transactionHash: '0xtxhash' } },
      );

      expect(redisClientService.rpush).toHaveBeenCalledWith(
        mockMessage,
        mockSignature,
      );
      expect(queueService.addToQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          message: mockMessage,
          type: 'handleBurn',
          recipient: '0xuser',
          originTokenAddress: '0xtoken',
          destinationTokenAddress: '0xnative',
          amount: '1000',
          destinationChainId: 2,
          originChainId: 1,
        }),
        `jobID: mockedHash`,
      );
    });

    it('should not add job when threshold not met', async () => {
      const mockSignature = '0xsignature';

      jest
        .spyOn(service as any, 'signMessage')
        .mockResolvedValue(mockSignature);
      jest.spyOn(service as any, 'getThreshold').mockResolvedValue(2);
      jest.spyOn(redisClientService, 'llen').mockResolvedValue(1);

      await (service as any).handleWrappedTokensBurnedEvent(
        1,
        '0xuser',
        '0xtoken',
        BigInt(1000),
        2,
        { log: { transactionHash: '0xtxhash' } },
      );

      expect(redisClientService.rpush).toHaveBeenCalled();
      expect(queueService.addToQueue).not.toHaveBeenCalled();
    });
  });

  describe('reconnectWebSocket', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.clearAllMocks();
      jest.spyOn(global, 'setTimeout');
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle successful reconnection', async () => {
      (WebSocketProvider as jest.Mock).mockImplementationOnce(() => ({
        ...mockWebSocketProvider,
        ready: true
      }));

      const setupSpy = jest.spyOn(service as any, 'setupEventListeners');
      
      await (service as any).reconnectWebSocket(1);

      expect(WebSocketProvider).toHaveBeenCalledWith('ws://localhost:8546');
      expect(setupSpy).toHaveBeenCalledWith(1);
      expect(Logger.log).toHaveBeenCalledWith(
        'Successfully reconnected WebSocket for chain 1'
      );
    });

    it('should handle reconnection failure', async () => {
      (WebSocketProvider as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });

      const reconnectPromise = (service as any).reconnectWebSocket(1);
      
      await Promise.resolve();
      
      expect(Logger.error).toHaveBeenCalledWith(
        'Failed to reconnect WebSocket for chain 1: Connection failed'
      );

      expect(setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        mockConfig['websocket.reconnectInterval']
      );

      jest.runOnlyPendingTimers();
      await Promise.resolve(reconnectPromise).catch(() => {});
    });

    it('should retry on failure', async () => {
      (WebSocketProvider as jest.Mock).mockImplementationOnce(() => ({
        ...mockWebSocketProvider,
        ready: false
      }));
      
      const reconnectPromise = (service as any).reconnectWebSocket(1);
      await Promise.resolve();
      
      jest.runOnlyPendingTimers();
      
      expect(WebSocketProvider).toHaveBeenCalledWith('ws://localhost:8546');

      jest.clearAllTimers();
      await Promise.resolve(reconnectPromise).catch(() => {});
    });

    it('should not reconnect if provider is not ready', async () => {
      const setupSpy = jest.spyOn(service as any, 'setupEventListeners');
      
      (WebSocketProvider as jest.Mock).mockImplementationOnce(() => ({
        ...mockWebSocketProvider,
        ready: false
      }));
      
      await (service as any).reconnectWebSocket(1);
      expect(setupSpy).not.toHaveBeenCalled();
    });

    it('should skip setup when network is not found', async () => {
      const setupSpy = jest.spyOn(service as any, 'setupEventListeners');
      const mockConfig = {
        networks: [
          { chainId: 2 } 
        ]
      };
      
      jest.spyOn(configService, 'get').mockImplementation((key) => {
        if (key === 'networks') return mockConfig.networks;
        return null;
      });
      
      await (service as any).reconnectWebSocket(1);
      
      expect(setupSpy).not.toHaveBeenCalled();
    });

    it('should not reconnect if network is found but provider is not ready', async () => {
      const mockNetworksConfig = [{
        chainId: 1,
        wsUrl: 'ws://localhost:8546'
      }];
      
      jest.spyOn(configService, 'get').mockImplementation((key) => {
        if (key === 'networks') return mockNetworksConfig;
        return mockConfig[key];
      });

      (WebSocketProvider as jest.Mock).mockImplementationOnce(() => ({
        ...mockWebSocketProvider,
        ready: false
      }));

      const setupSpy = jest.spyOn(service as any, 'setupEventListeners');
      
      await (service as any).reconnectWebSocket(1);
      
      expect(setupSpy).not.toHaveBeenCalled();
      expect(Logger.log).toHaveBeenCalledWith('Attempting to reconnect WebSocket for chain 1');
      expect(WebSocketProvider).toHaveBeenCalledWith('ws://localhost:8546');
    });
  });

  describe('sendTransaction', () => {
    it('should successfully send transaction', async () => {
      const mockReceipt = { status: 1 };
      const mockTx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      
      mockContractInstance[SmartContractMethods.MINT_WRAPPED_TOKENS] = jest.fn().mockResolvedValue(mockTx);
      
      const result = await (service as any).sendTransaction(
        1,
        SmartContractMethods.MINT_WRAPPED_TOKENS,
        'arg1'
      );
      
      expect(result).toBe(mockReceipt);
    });
  
    it('should throw error when transaction fails', async () => {
      const mockReceipt = { status: 0 };
      const mockTx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      
      mockContractInstance[SmartContractMethods.MINT_WRAPPED_TOKENS] = jest.fn().mockResolvedValue(mockTx);
      
      await expect((service as any).sendTransaction(
        1,
        SmartContractMethods.MINT_WRAPPED_TOKENS,
        'arg1'
      )).rejects.toThrow('Transaction to chain 1 failed');
    });
  });
  describe('mintWrappedTokens', () => {
    it('should successfully mint wrapped tokens', async () => {
      const mockReceipt = { status: 1 };
      const mockTx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContractInstance[SmartContractMethods.MINT_WRAPPED_TOKENS] = jest.fn().mockResolvedValue(mockTx);
      
      await service.mintWrappedTokens(
        'signedMessage',
        ['sig1', 'sig2'],
        '0xrecipient',
        BigInt(1000),
        1,
        '0xwrapped'
      );
  
      expect(mockContractInstance[SmartContractMethods.MINT_WRAPPED_TOKENS]).toHaveBeenCalledWith(
        BigInt(1000),
        '0xrecipient',
        '0xwrapped',
        '0xhexstring',
        ['sig1', 'sig2']
      );
    });
  });
  
  describe('unlockTokens', () => {
    it('should successfully unlock tokens', async () => {
      const mockReceipt = { status: 1 };
      const mockTx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContractInstance[SmartContractMethods.UNLOCK_TOKENS] = jest.fn().mockResolvedValue(mockTx);
      
      await service.unlockTokens(
        'signedMessage',
        ['sig1', 'sig2'],
        '0xrecipient',
        BigInt(1000),
        1,
        '0xnative'
      );
  
      expect(mockContractInstance[SmartContractMethods.UNLOCK_TOKENS]).toHaveBeenCalledWith(
        BigInt(1000),
        '0xrecipient',
        '0xnative',
        '0xhexstring',
        ['sig1', 'sig2']
      );
    });
  });

  describe('staticCall', () => {
    it('should successfully make static call', async () => {
      const result = await (service as any).staticCall(1, 'testMethod', 'arg1');
      expect(result).toBe(42);
      expect(mockContractInstance.getFunction).toHaveBeenCalledWith('testMethod');
    });
  });

  describe('WebSocket event handling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should set up ping interval', async () => {
      const provider = mockWebSocketProvider;
      provider.getBlockNumber.mockResolvedValueOnce(12345);
      
      await service.setupAllEventListeners();
      
      jest.advanceTimersByTime(mockConfig['websocket.keepAliveCheckInterval']);
      await Promise.resolve();
      
      expect(provider.getBlockNumber).toHaveBeenCalled();
      expect(Logger.log).toHaveBeenCalledWith('Pinging for block number: 12345');
    });

    it('should handle websocket errors', async () => {
      const reconnectSpy = jest.spyOn(service as any, 'reconnectWebSocket');
      const provider = mockWebSocketProvider;
      
      await service.setupAllEventListeners();
      
      const error = new Error('WebSocket error');
      provider.on.mock.calls.find(call => call[0] === 'error')[1](error);
      
      expect(Logger.error).toHaveBeenCalledWith('WebSocket error: Error: WebSocket error');
      expect(reconnectSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('error handling', () => {
    it('should handle missing wallet in sendTransaction', async () => {
      service['wallets'] = new Map(); // Clear wallets
      
      await expect(
        service['sendTransaction'](999, SmartContractMethods.MINT_WRAPPED_TOKENS)
      ).rejects.toThrow('No wallet found for chain ID 999');
    });

    it('should handle missing bridge address in sendTransaction', async () => {
      service['bridgeAddresses'] = new Map(); // Clear addresses
      
      await expect(
        service['sendTransaction'](1, SmartContractMethods.MINT_WRAPPED_TOKENS)
      ).rejects.toThrow('No bridge address found for chain ID 1');
    });

    it('should handle missing provider in staticCall', async () => {
      service['networksProviders'] = new Map(); // Clear providers
      
      await expect(
        service['staticCall'](999, 'someMethod')
      ).rejects.toThrow('No provider found for chain ID 999');
    });

    it('should handle missing bridge address in staticCall', async () => {
      service['bridgeAddresses'] = new Map(); // Clear addresses
      
      await expect(
        service['staticCall'](1, 'someMethod')
      ).rejects.toThrow('No bridge address found for chain ID 1');
    });

    it('should handle missing wallet in signMessage', async () => {
      service['wallets'] = new Map(); // Clear wallets
      
      await expect(
        service['signMessage']('message', 999)
      ).rejects.toThrow('No wallet found for chain ID 999');
    });
  });

  describe('event setup error handling', () => {
    it('should handle missing WebSocket provider', async () => {
      service['networksProviders'].set(1, { provider: null, wsProvider: null });
      
      await expect(
        service['setupEventListeners'](1)
      ).rejects.toThrow('No WS provider found for chain ID 1');
    });

    it('should handle event listener removal with missing provider', async () => {
      service['networksProviders'].set(1, { provider: null, wsProvider: null });
      
      await expect(
        service['removeEventListeners'](1)
      ).rejects.toThrow('No WS provider found for chain ID 1');
    });
  });

  describe('setupEventListeners', () => {
    it('should set up contract event listeners', async () => {
      const mockContract = {
        on: jest.fn(),
      };
      
      (Contract as jest.Mock).mockImplementation(() => mockContract);     
      await (service as any).setupEventListeners(1);
      
      expect(mockContract.on).toHaveBeenCalledWith(
        EventSignatures.LOCK_EVENT_SIGNATURE,
        expect.any(Function)
      );
      expect(mockContract.on).toHaveBeenCalledWith(
        EventSignatures.BURN_EVENT_SIGNATURE,
        expect.any(Function)
      );
    });

    it('should set up event listeners with correct callback functions', async () => {
      const mockContract = {
        on: jest.fn(),
      };

      (Contract as jest.Mock).mockImplementation(() => mockContract);      
      await (service as any).setupEventListeners(1);
      
      const lockCallback = mockContract.on.mock.calls.find(
        call => call[0] === EventSignatures.LOCK_EVENT_SIGNATURE
      )[1];
      const burnCallback = mockContract.on.mock.calls.find(
        call => call[0] === EventSignatures.BURN_EVENT_SIGNATURE
      )[1];
      
      const handleLockSpy = jest.spyOn(service as any, 'handleTokensLockedEvent')
        .mockImplementation(() => Promise.resolve());
      const handleBurnSpy = jest.spyOn(service as any, 'handleWrappedTokensBurnedEvent')
        .mockImplementation(() => Promise.resolve());
      
      await lockCallback(
        '0xrecipient',
        '0xtoken',
        BigInt(1000),
        2,
        { log: { transactionHash: '0xtxhash' } }
      );
      
      await burnCallback(
        '0xuser',
        '0xtoken',
        BigInt(1000),
        2,
        { log: { transactionHash: '0xtxhash' } }
      );
      
      expect(handleLockSpy).toHaveBeenCalledWith(
        1,
        '0xrecipient',
        '0xtoken',
        BigInt(1000),
        2,
        { log: { transactionHash: '0xtxhash' } }
      );
      
      expect(handleBurnSpy).toHaveBeenCalledWith(
        1,
        '0xuser',
        '0xtoken',
        BigInt(1000),
        2,
        { log: { transactionHash: '0xtxhash' } }
      );
    });
  });

  describe('signMessage', () => {
    it('should sign message with correct wallet', async () => {
      const mockWallet = {
        signMessage: jest.fn().mockResolvedValue('0xsignature')
      };
      
      service['wallets'].set(1, mockWallet as any);
      
      const result = await (service as any).signMessage('test message', 1);
      
      expect(mockWallet.signMessage).toHaveBeenCalledWith('test message');
      expect(result).toBe('0xsignature');
    });
  });

  describe('getThreshold', () => {
    it('should call staticCall with correct parameters', async () => {
      const staticCallSpy = jest.spyOn(service as any, 'staticCall')
        .mockResolvedValue(3);
      
      const result = await (service as any).getThreshold(1);
      
      expect(staticCallSpy).toHaveBeenCalledWith(1, 'getThreshold');
      expect(result).toBe(3);
    });
  });
});
