import { Module } from '@nestjs/common';
import { EthereumClientService } from './ethereum-client.service';
import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { QueueModule } from 'src/queue/queue.module';
import { RedisClientModule } from 'src/redis-client/redis-client.module';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [QueueModule, RedisClientModule],
  providers: [EthereumClientService, ConfigService],
  exports: [EthereumClientService],
})
export class EthereumClientModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly ethereumClientService: EthereumClientService) {}

  async onModuleInit() {
    await this.ethereumClientService.setupAllEventListeners();
  }

  async onModuleDestroy() {
    await this.ethereumClientService.removeAllEventListeners();
  }
}
