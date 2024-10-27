import { Module } from '@nestjs/common';
import { SeederService } from './seeder.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Network } from 'src/network/network.entity';
import { Token } from 'src/token/token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Network, Token])],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}
