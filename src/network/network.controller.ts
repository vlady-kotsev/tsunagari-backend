import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpException,
  HttpStatus,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { NetworkService } from './network.service';
import { CreateNetworkDto } from './dto/create-network.dto';
import { Pagination } from 'nestjs-typeorm-paginate';
import { Network } from './network.entity';

@Controller('network')
export class NetworkController {
  constructor(private networkService: NetworkService) {}

  @Get()
  getAllNetworks(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ): Promise<Pagination<Network>> {
    try {
      return this.networkService.paginate({ page, limit });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  addNetwork(@Body() createNetworkDto: CreateNetworkDto) {
    try {
      return this.networkService.addNetwork(createNetworkDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
