import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisClientModule } from './redis-client/redis-client.module';
import { QueueModule } from './queue/queue.module';
import { EthereumClientModule } from './ethereum-client/ethereum-client.module';
import { join } from 'path';
import { SolanaClientModule } from './solana-client/solana-client.module';

const loadConfig = () => {
  const instanceName = process.env.INSTANCE_NAME || 'default';
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(join(__dirname, `../config/${instanceName}/config.json`));
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [loadConfig],
    }),
    RedisClientModule,
    QueueModule,
    EthereumClientModule,
    SolanaClientModule,
  ],
})
export class AppModule {}
