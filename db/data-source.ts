import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  TypeOrmModuleAsyncOptions,
  TypeOrmModuleOptions,
} from '@nestjs/typeorm';
import { Network } from 'src/network/network.entity';
import { Token } from 'src/token/token.entity';
import { Transaction } from 'src/transaction/transaction.entity';

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (
    configService: ConfigService,
  ): Promise<TypeOrmModuleOptions> => {
    return {
      type: 'postgres',
      host: configService.get('db.host'),
      port: configService.get('db.port'),
      username: configService.get('db.username'),
      password: configService.get('db.password'),
      database: configService.get('db.database'),
      entities: [Transaction, Token, Network],
      synchronize: true,
      migrations: ['dist/db/migrations/*.js'],
    };
  },
};
