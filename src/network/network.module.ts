import { Module } from '@nestjs/common';
import { NetworkService } from './network.service';
import { NetworkController } from './network.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Network } from './network.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Network])],
  providers: [NetworkService],
  controllers: [NetworkController]
})
export class NetworkModule {}
