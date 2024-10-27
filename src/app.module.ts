import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import config from './config/config.json';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from 'db/data-source';
import { DataSource } from 'typeorm';
import { TransactionModule } from './transaction/transactions.module';
import { TransactionService } from './transaction/transaction.service';
import { TokenModule } from './token/token.module';
import { NetworkModule } from './network/network.module';
import { SeederModule } from './seeder/seeder.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor(private dataSource: DataSource) {
    console.log(dataSource.driver.database);
  }
}
