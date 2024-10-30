import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import config from '../config/config.json';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from 'db/data-source';
import { TransactionModule } from './transaction/transactions.module';
import { TokenModule } from './token/token.module';
import { NetworkModule } from './network/network.module';
import { SeederModule } from './seeder/seeder.module';
import { RedisClientModule } from './redis-client/redis-client.module';
import { QueueModule } from './queue/queue.module';
import { EthereumClientModule } from './ethereum-client/ethereum-client.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [() => config],
    }),
    TypeOrmModule.forRootAsync(typeOrmConfig),
    TransactionModule,
    TokenModule,
    NetworkModule,
    SeederModule,
    RedisClientModule,
    QueueModule,
    EthereumClientModule,
  ],
})
export class AppModule {}
