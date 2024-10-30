import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QueueProcessor } from './queue.processor';
import { QueueService } from './queue.service';
import config from '../../config/config.json';
import { ConfigService } from '@nestjs/config';
import { RedisClientService } from 'src/redis-client/redis-client.service';
import { EthereumClientService } from 'src/ethereum-client/ethereum-client.service';
import { TransactionModule } from 'src/transaction/transactions.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: config.queue.name,
    }),
    TransactionModule,
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
