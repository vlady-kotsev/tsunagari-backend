import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Network } from './network.entity';
import { Repository } from 'typeorm';
import { CreateNetworkDto } from './dto/create-network.dto';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';

@Injectable()
export class NetworkService {
  constructor(
    @InjectRepository(Network)
    private networkRepository: Repository<Network>,
  ) {}

  getAllNetworks() {
    return this.networkRepository.find();
  }

  addNetwork(createNetworkDto: CreateNetworkDto) {
    return this.networkRepository.save(createNetworkDto);
  }

  async paginate(options: IPaginationOptions): Promise<Pagination<Network>> {
    return paginate<Network>(this.networkRepository, options);
  }
}
