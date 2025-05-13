import { EthereumClientService } from './ethereum-client.service';
import { OnModuleDestroy, OnModuleInit, Logger, Module } from '@nestjs/common';
import { QueueModule } from 'src/queue/queue.module';
import { RedisClientModule } from 'src/redis-client/redis-client.module';
import { ConfigService } from '@nestjs/config';
import { SolanaClientService } from 'src/solana-client/solana-client.service';

@Module({
  imports: [QueueModule, RedisClientModule],
  providers: [EthereumClientService, ConfigService, SolanaClientService],
  exports: [EthereumClientService],
})
export class EthereumClientModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly ethereumClientService: EthereumClientService) {}

  async onModuleInit() {
    try {
      await this.ethereumClientService.setupAllEventListeners();
    } catch (error) {
      Logger.error(`Error setting up event listeners: ${error}`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.ethereumClientService.removeAllEventListeners();
    } catch (error) {
      Logger.error(`Error removing event listeners: ${error}`);
    }
  }
}
