import { Metadata } from "@grpc/grpc-js";
import { ConfigService } from "@nestjs/config";
import { Observable } from "rxjs";
import { EmptyResponseDto } from "src/transactions/dto/transaction.dto";
import path from "path";
import { of } from "rxjs";
import { CreateTransactionDto } from "src/transactions/dto/transaction.dto";

const CHAIN1_PORT = 8545;
const CHAIN2_PORT = 8546;

class MockConfigService extends ConfigService {
    get(key: string) {
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
            bridgeAddress: '0x0000000000000000000000000000000000000000',
            rpcUrl: `http://localhost:${CHAIN1_PORT}`,
            wsUrl: `ws://localhost:${CHAIN1_PORT}`,
            chainId: 1,
          },
          {
            name: 'chain2',
            bridgeAddress: '0x0000000000000000000000000000000000000000',
            rpcUrl: `http://localhost:${CHAIN2_PORT}`,
            wsUrl: `ws://localhost:${CHAIN2_PORT}`,
            chainId: 2,
          },
        ],
        tokens: {
          '1': {
            '0x0000000000000000000000000000000000000001': {
              name: 'TestToken1',
              symbol: 'TT1',
              wrapped: {
                '2': '0x0000000000000000000000000000000000000002',
              },
            },
          },
          '2': {
            '0x0000000000000000000000000000000000000002': {
              name: 'TestToken2',
              symbol: 'TT2',
              wrapped: {
                '1': '0x0000000000000000000000000000000000000001',
              },
            },
          },
        },
      };
      return key.split('.').reduce((obj, k) => obj?.[k], config);
    }
}

const mockGrpcClient = {
    StoreTransaction: jest
      .fn()
      .mockImplementation(
        (
          data: CreateTransactionDto,
          metadata: Metadata,
        ): Observable<EmptyResponseDto> => {
          console.log('Mock gRPC storeTransaction called with:', data);
          return of({});
        },
      ),
  };


const mockConfigService = new MockConfigService();
export { CHAIN1_PORT, CHAIN2_PORT, mockConfigService, mockGrpcClient };
