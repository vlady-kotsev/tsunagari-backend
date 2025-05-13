import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { SolanaClientService } from './solana-client.service';
import { ConfigService } from '@nestjs/config';
import { QueueModule } from 'src/queue/queue.module';
import { RedisClientModule } from 'src/redis-client/redis-client.module';

@Module({
  imports: [QueueModule, RedisClientModule],
  providers: [SolanaClientService, ConfigService],
  exports: [SolanaClientService],
})
export class SolanaClientModule implements OnModuleInit {
  constructor(private readonly solanaClientService: SolanaClientService) {}

  async onModuleInit() {
    try {
      await this.solanaClientService.setupEventListeners();
    } catch (error) {
      Logger.error(`Error adding event listeners: ${error}`);
    }
  }
}
