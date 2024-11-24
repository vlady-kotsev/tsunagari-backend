import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QueueProcessor } from './queue.processor';
import { QueueService } from './queue.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisClientService } from 'src/redis-client/redis-client.service';
import { EthereumClientService } from 'src/ethereum-client/ethereum-client.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('redis.host', 'localhost'),
          port: configService.get('redis.port', 6379),
          password: configService.get('redis.password'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'default',
    }),
    ClientsModule.registerAsync([
      {
        name: 'TRANSACTIONS_PACKAGE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'transactions',
            protoPath: join(__dirname, configService.get('app.protoPath')),
            url: `${configService.get('app.grpcHost')}:${configService.get('app.grpcPort')}`,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [
    QueueService,
    QueueProcessor,
    ConfigService,
    RedisClientService,
    EthereumClientService,
  ],
  exports: [QueueService],
})
export class QueueModule {}
